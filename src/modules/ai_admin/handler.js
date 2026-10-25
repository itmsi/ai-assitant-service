/**
 * Handler UI admin AI — provider, model, prompt, settings, monitoring
 * Setiap perubahan langsung membersihkan cache lokal; container lain mengikuti dalam AI_CONFIG_CACHE_TTL_MS
 */

const axios = require('axios');
const repo = require('./repository');
const auth = require('./auth');
const modelRouter = require('../ai_assistant/model_router');
const { clearSystemPromptCache } = require('../ai_assistant/service');
const { Logger } = require('../../utils/logger');
const logger = Logger;

const PURPOSES = modelRouter.PURPOSES;

const badRequest = (message) => Object.assign(new Error(message), { status: 400 });
const notFound = (message) => Object.assign(new Error(message), { status: 404 });

const ok = (res, data, message = 'OK', code = 200) => res.status(code).json({ success: true, message, data });

// Bungkus handler async agar error masuk ke respons JSON
const wrap = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (error) {
    // 23505 = unique violation, 22P02 = format UUID tidak valid, 23503 = foreign key tidak ada
    const pgErrors = {
      23505: [409, 'Data dengan kode/ID yang sama sudah ada'],
      '22P02': [400, 'Format ID tidak valid'],
      23503: [400, 'Data referensi (provider) tidak ditemukan'],
    };
    // Database tidak bisa dihubungi (pg_hba, password salah, server mati) → 503 dengan pesan jelas
    const dbDown = ['28000', '28P01', '3D000', 'ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'EAI_AGAIN'].includes(error.code)
      || /pg_hba\.conf|Connection terminated|timeout acquiring a connection/i.test(error.message || '');
    const [pgStatus, pgMessage] = dbDown
      ? [503, `Database tidak bisa dihubungi: ${error.message}`]
      : (pgErrors[error.code] || []);
    const status = error.status || pgStatus || 500;
    if (status >= 500) logger.error(`[AI Admin] ${req.method} ${req.originalUrl}: ${error.message || error}`);
    res.status(status).json({
      success: false,
      // Error tak terduga tidak dibocorkan detailnya; error yang sengaja dilempar (punya status) ditampilkan
      message: pgMessage || (error.status ? error.message : 'Terjadi kesalahan internal server'),
    });
  }
};

const invalidate = () => {
  modelRouter.clearCache();
  clearSystemPromptCache();
};

const pick = (body, fields) => fields.reduce((acc, field) => {
  if (body[field] !== undefined) acc[field] = body[field];
  return acc;
}, {});

const optionalNumber = (value, field, { min, max, integer } = {}) => {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n) || (integer && !Number.isInteger(n))) throw badRequest(`${field} harus berupa angka`);
  if ((min !== undefined && n < min) || (max !== undefined && n > max)) {
    throw badRequest(`${field} harus di antara ${min} dan ${max}`);
  }
  return n;
};

// =============================================
// Auth
// =============================================

const login = wrap(async (req, res) => {
  const token = auth.login(req.body?.username, req.body?.password);
  ok(res, { token, username: process.env.ADMIN_USERNAME });
});

const me = wrap(async (req, res) => ok(res, req.admin));

// =============================================
// Providers
// =============================================

const PROVIDER_FIELDS = ['code', 'name', 'base_url', 'api_key_env', 'requires_key', 'enabled', 'extra_headers', 'notes'];

const parseProvider = (body, { partial }) => {
  const data = pick(body, PROVIDER_FIELDS);

  if (!partial || data.code !== undefined) {
    data.code = String(data.code || '').trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9_-]{0,49}$/.test(data.code)) {
      throw badRequest('Kode provider wajib diisi: huruf kecil, angka, - atau _ (maks 50)');
    }
  }
  if (!partial || data.name !== undefined) {
    data.name = String(data.name || '').trim();
    if (!data.name) throw badRequest('Nama provider wajib diisi');
  }
  if (!partial || data.base_url !== undefined) {
    data.base_url = String(data.base_url || '').trim().replace(/\/+$/, '');
    if (!/^https?:\/\/[^\s]+$/i.test(data.base_url)) throw badRequest('Base URL harus diawali http:// atau https://');
    data.base_url = data.base_url.replace(/\/chat\/completions$/i, '');
  }
  if (data.api_key_env !== undefined) {
    data.api_key_env = String(data.api_key_env || '').trim() || null;
    if (data.api_key_env && !/^[A-Za-z_][A-Za-z0-9_]*$/.test(data.api_key_env)) {
      throw badRequest('Nama variabel env API key tidak valid');
    }
  }
  if (data.extra_headers !== undefined) {
    const headers = data.extra_headers || {};
    if (typeof headers !== 'object' || Array.isArray(headers)
      || Object.values(headers).some((v) => typeof v !== 'string')) {
      throw badRequest('Extra headers harus objek JSON berisi string, contoh {"X-Title":"MSI"}');
    }
    data.extra_headers = JSON.stringify(headers);
  }
  ['requires_key', 'enabled'].forEach((field) => {
    if (data[field] !== undefined) data[field] = Boolean(data[field]);
  });

  // API key: isi = simpan ke DB, clear_api_key = hapus, kosong/tidak dikirim = tidak berubah
  if (body.clear_api_key === true) data.api_key = null;
  else if (typeof body.api_key === 'string' && body.api_key.trim()) data.api_key = body.api_key.trim();

  return data;
};

const listProviders = wrap(async (req, res) => ok(res, await repo.listProviders()));

const createProvider = wrap(async (req, res) => {
  const provider = await repo.createProvider(parseProvider(req.body || {}, { partial: false }));
  invalidate();
  ok(res, provider, 'Provider ditambahkan', 201);
});

const updateProvider = wrap(async (req, res) => {
  const provider = await repo.updateProvider(req.params.id, parseProvider(req.body || {}, { partial: true }));
  if (!provider) throw notFound('Provider tidak ditemukan');
  invalidate();
  ok(res, provider, 'Provider diperbarui');
});

const deleteProvider = wrap(async (req, res) => {
  const deleted = await repo.deleteProvider(req.params.id);
  if (!deleted) throw notFound('Provider tidak ditemukan');
  invalidate();
  ok(res, null, 'Provider beserta modelnya dihapus');
});

/**
 * Ambil daftar model dari endpoint GET {base_url}/models milik provider
 */
const listRemoteModels = wrap(async (req, res) => {
  const provider = await repo.getProviderRaw(req.params.id);
  if (!provider) throw notFound('Provider tidak ditemukan');
  const key = modelRouter.resolveKey(provider);

  let response;
  try {
    response = await axios.get(`${provider.base_url.replace(/\/+$/, '')}/models`, {
      headers: { ...(key ? { Authorization: `Bearer ${key}` } : {}), ...(provider.extra_headers || {}) },
      timeout: 20000,
    });
  } catch (error) {
    const status = error.response?.status;
    const detail = error.response?.data?.error?.message || error.message;
    throw Object.assign(new Error(`Gagal mengambil daftar model${status ? ` (HTTP ${status})` : ''}: ${detail}`), { status: 502 });
  }

  const items = Array.isArray(response.data?.data) ? response.data.data : (Array.isArray(response.data) ? response.data : []);
  const existing = await repo.listModelIdsByProvider(provider.id);
  const models = items
    .map((m) => (typeof m === 'string' ? m : m.id))
    .filter(Boolean)
    .sort()
    .map((id) => ({ id, exists: existing.has(id) }));
  ok(res, models);
});

// =============================================
// Models
// =============================================

const parseModel = (body, { partial }) => {
  const data = pick(body, ['provider_id', 'model_id', 'label', 'purposes', 'enabled', 'priority', 'temperature', 'max_tokens', 'timeout_ms']);

  if (!partial || data.provider_id !== undefined) {
    if (!data.provider_id) throw badRequest('Provider wajib dipilih');
  }
  if (!partial || data.model_id !== undefined) {
    data.model_id = String(data.model_id || '').trim();
    if (!data.model_id) throw badRequest('Model ID wajib diisi');
  }
  if (data.label !== undefined) data.label = String(data.label || '').trim() || null;
  if (!partial || data.purposes !== undefined) {
    const purposes = Array.isArray(data.purposes) ? [...new Set(data.purposes)] : ['chat'];
    if (!purposes.length || purposes.some((p) => !PURPOSES.includes(p))) {
      throw badRequest(`Kegunaan model harus salah satu dari: ${PURPOSES.join(', ')}`);
    }
    data.purposes = JSON.stringify(purposes);
  }
  if (data.enabled !== undefined) data.enabled = Boolean(data.enabled);
  data.priority = optionalNumber(data.priority, 'Priority', { min: 0, max: 100000, integer: true });
  if (data.priority === null) data.priority = 100;
  data.temperature = optionalNumber(data.temperature, 'Temperature', { min: 0, max: 2 });
  data.max_tokens = optionalNumber(data.max_tokens, 'Max tokens', { min: 1, max: 2000000, integer: true });
  data.timeout_ms = optionalNumber(data.timeout_ms, 'Timeout', { min: 1000, max: 600000, integer: true });
  if (data.timeout_ms === null) data.timeout_ms = 120000;

  Object.keys(data).forEach((k) => data[k] === undefined && delete data[k]);
  return data;
};

const listModels = wrap(async (req, res) => ok(res, await repo.listModels()));

// Body bisa satu objek atau array (tambah banyak dari "Sync model")
const createModels = wrap(async (req, res) => {
  const items = Array.isArray(req.body) ? req.body : [req.body || {}];
  if (!items.length || items.length > 200) throw badRequest('Jumlah model harus 1 sampai 200');
  const rows = items.map((item) => parseModel(item, { partial: false }));
  const created = await repo.createModels(rows);
  invalidate();
  ok(res, created, `${created.length} model ditambahkan`, 201);
});

const updateModel = wrap(async (req, res) => {
  const model = await repo.updateModel(req.params.id, parseModel(req.body || {}, { partial: true }));
  if (!model) throw notFound('Model tidak ditemukan');
  invalidate();
  ok(res, model, 'Model diperbarui');
});

const deleteModel = wrap(async (req, res) => {
  const deleted = await repo.deleteModel(req.params.id);
  if (!deleted) throw notFound('Model tidak ditemukan');
  invalidate();
  ok(res, null, 'Model dihapus');
});

/**
 * Tes satu model dengan prompt singkat (tidak memakai fallback)
 */
const testModel = wrap(async (req, res) => {
  const candidate = await modelRouter.getCandidateByModelPk(req.params.id);
  if (!candidate) throw notFound('Model tidak ditemukan');
  if (candidate.requiresKey && !candidate.apiKey) throw badRequest('Provider model ini belum punya API key');

  const started = Date.now();
  try {
    const completion = await modelRouter.chatCompletion('test', {
      messages: [{ role: 'user', content: req.body?.message || 'Balas hanya dengan kata: OK' }],
    }, { candidates: [candidate] });
    ok(res, {
      ok: true,
      ms: Date.now() - started,
      text: (completion.choices?.[0]?.message?.content || '').trim().slice(0, 500),
      usage: completion.usage || null,
    });
  } catch (error) {
    ok(res, { ok: false, ms: Date.now() - started, error: `${error.status ? `HTTP ${error.status}: ` : ''}${error.message}` });
  }
});

// =============================================
// Prompts
// =============================================

const PROMPT_KEY_RE = /^[a-z0-9][a-z0-9_.-]{0,99}$/;

const parsePrompt = (body, { partial }) => {
  const data = pick(body, ['key', 'content', 'description', 'is_active', 'version']);
  if (!partial) {
    data.key = String(data.key || '').trim();
    if (!PROMPT_KEY_RE.test(data.key)) throw badRequest('Key prompt: huruf kecil, angka, titik, - atau _ (maks 100)');
  } else {
    delete data.key;
  }
  if (!partial || data.content !== undefined) {
    if (typeof data.content !== 'string' || !data.content.trim()) throw badRequest('Isi prompt wajib diisi');
  }
  if (data.description !== undefined) data.description = String(data.description || '').trim().slice(0, 255) || null;
  if (data.is_active !== undefined) data.is_active = Boolean(data.is_active);
  if (data.version !== undefined) {
    data.version = String(data.version || '').trim() || undefined;
    if (data.version && !/^\d+\.\d+\.\d+$/.test(data.version)) throw badRequest('Versi harus format x.y.z');
  }
  Object.keys(data).forEach((k) => data[k] === undefined && delete data[k]);
  return data;
};

const listPrompts = wrap(async (req, res) => {
  const [prompts, settings] = await Promise.all([repo.listPrompts(), modelRouter.getSettings()]);
  ok(res, prompts.map((p) => ({ ...p, used_for_chat: p.key === settings.chat_prompt_key })));
});

const createPrompt = wrap(async (req, res) => {
  const data = parsePrompt(req.body || {}, { partial: false });
  const prompt = await repo.createPrompt({ version: '1.0.0', is_active: true, ...data });
  invalidate();
  ok(res, prompt, 'Prompt ditambahkan', 201);
});

const updatePrompt = wrap(async (req, res) => {
  const settings = await modelRouter.getSettings();
  const data = parsePrompt(req.body || {}, { partial: true });
  if (data.is_active === false && req.params.key === settings.chat_prompt_key) {
    throw badRequest('Prompt ini sedang dipakai chat. Pilih prompt chat lain di Pengaturan sebelum menonaktifkan');
  }
  const prompt = await repo.updatePrompt(req.params.key, data, req.admin?.username);
  if (!prompt) throw notFound('Prompt tidak ditemukan');
  invalidate();
  ok(res, prompt, 'Prompt disimpan');
});

const deletePrompt = wrap(async (req, res) => {
  const settings = await modelRouter.getSettings();
  if (req.params.key === settings.chat_prompt_key) {
    throw badRequest('Prompt ini sedang dipakai chat dan tidak bisa dihapus');
  }
  const deleted = await repo.deletePrompt(req.params.key);
  if (!deleted) throw notFound('Prompt tidak ditemukan');
  invalidate();
  ok(res, null, 'Prompt dihapus');
});

const listPromptHistory = wrap(async (req, res) => ok(res, await repo.listPromptHistory(req.params.key)));

const restorePrompt = wrap(async (req, res) => {
  const history = await repo.getPromptHistory(req.params.key, req.params.historyId);
  if (!history) throw notFound('Riwayat prompt tidak ditemukan');
  const prompt = await repo.updatePrompt(req.params.key, { content: history.content }, req.admin?.username);
  if (!prompt) throw notFound('Prompt tidak ditemukan');
  invalidate();
  ok(res, prompt, `Prompt dikembalikan ke versi ${history.version || '-'}`);
});

// =============================================
// Settings
// =============================================

const getSettings = wrap(async (req, res) => ok(res, await modelRouter.getSettings()));

const updateSettings = wrap(async (req, res) => {
  const body = req.body || {};
  if (body.chat_prompt_key !== undefined) {
    const prompt = await repo.getPrompt(String(body.chat_prompt_key));
    if (!prompt || !prompt.is_active) throw badRequest('Prompt chat harus prompt yang ada dan aktif');
    await repo.setSetting('chat_prompt_key', prompt.key);
  }
  if (body.use_fallback !== undefined) {
    await repo.setSetting('use_fallback', Boolean(body.use_fallback));
  }
  invalidate();
  ok(res, await modelRouter.getSettings(), 'Pengaturan disimpan');
});

// =============================================
// Monitoring
// =============================================

const overview = wrap(async (req, res) => {
  modelRouter.clearCache();
  const [stats, chat, analysis, settings] = await Promise.all([
    repo.getOverview(req.query.range),
    modelRouter.getCandidates('chat'),
    modelRouter.getCandidates('analysis'),
    modelRouter.getSettings(),
  ]);
  const describe = (list) => list.map((c) => ({
    provider: c.providerCode, model: c.model, source: c.source, has_key: Boolean(c.apiKey),
  }));
  ok(res, {
    ...stats,
    active: { chat: describe(chat), analysis: describe(analysis) },
    settings,
    cooldowns: modelRouter.getCooldowns(),
  });
});

const listLogs = wrap(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page || '1', 10) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(req.query.limit || '50', 10) || 50));
  ok(res, await repo.listLogs({
    page, limit, purpose: req.query.purpose, success: req.query.success, model: req.query.model,
  }));
});

module.exports = {
  login,
  me,
  listProviders,
  createProvider,
  updateProvider,
  deleteProvider,
  listRemoteModels,
  listModels,
  createModels,
  updateModel,
  deleteModel,
  testModel,
  listPrompts,
  createPrompt,
  updatePrompt,
  deletePrompt,
  listPromptHistory,
  restorePrompt,
  getSettings,
  updateSettings,
  overview,
  listLogs,
};
