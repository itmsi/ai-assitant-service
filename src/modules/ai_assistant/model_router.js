/**
 * Model Router — memilih provider & model AI dari database (ai_providers, ai_models)
 *
 * - Kandidat diurutkan per purpose ('chat' | 'analysis') berdasarkan priority
 * - Jika model gagal, lanjut ke model berikutnya (setting use_fallback)
 * - Model yang error diistirahatkan sementara (cooldown per proses)
 * - Setiap panggilan dicatat ke ai_logs untuk dashboard monitoring
 * - Jika DB tidak tersedia / belum ada model aktif, fallback ke konfigurasi .env (perilaku lama)
 *
 * Konfigurasi di-cache singkat (AI_CONFIG_CACHE_TTL_MS, default 15 detik) sehingga perubahan dari UI
 * berlaku di semua container tanpa restart.
 */

const OpenAI = require('openai');
const { ChatOpenAI } = require('@langchain/openai');
const aiConfig = require('../../config/ai');
const { pgCore: db } = require('../../config/database');
const { Logger } = require('../../utils/logger');
const logger = Logger;

const PURPOSES = ['chat', 'analysis'];
const CACHE_TTL_MS = parseInt(process.env.AI_CONFIG_CACHE_TTL_MS || '15000', 10);

const cache = new Map(); // key → { value, expires }
const cooldown = new Map(); // model key → timestamp boleh dipakai lagi

const cached = async (key, loader) => {
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.value;
  const value = await loader();
  cache.set(key, { value, expires: Date.now() + CACHE_TTL_MS });
  return value;
};

const clearCache = () => {
  cache.clear();
};

const resolveKey = (provider) => {
  if (provider.api_key) return provider.api_key;
  if (provider.api_key_env) return process.env[provider.api_key_env] || null;
  return null;
};

/**
 * Pengaturan runtime dari ai_settings (chat_prompt_key, use_fallback)
 */
const getSettings = () => cached('settings', async () => {
  const defaults = {
    chat_prompt_key: aiConfig.AI_SYSTEM_PROMPT_KEY,
    use_fallback: true,
  };
  try {
    const rows = await db('ai_settings').select('key', 'value');
    return rows.reduce((acc, row) => ({ ...acc, [row.key]: row.value }), defaults);
  } catch (error) {
    logger.warn(`[ModelRouter] Gagal membaca ai_settings, memakai default: ${error.message}`);
    return defaults;
  }
});

// Kandidat dari .env, dipakai jika DB belum siap atau tidak ada model aktif
const envCandidate = (purpose) => {
  const sumopod = aiConfig.AI_MODEL_PROVIDER === 'sumopod';
  const model = sumopod ? aiConfig.SUMOPOD_MODEL : aiConfig.OPENAI_MODEL;
  return {
    key: `env:${purpose}`,
    source: 'env',
    providerCode: sumopod ? 'sumopod' : 'openai',
    baseURL: sumopod ? (aiConfig.SUMOPOD_BASE_URL || '').replace(/\/+$/, '') : 'https://api.openai.com/v1',
    apiKey: sumopod ? aiConfig.SUMOPOD_API_KEY : aiConfig.OPENAI_API_KEY,
    model: purpose === 'analysis' && aiConfig.STT_ANALYSIS_MODEL ? aiConfig.STT_ANALYSIS_MODEL : model,
    temperature: sumopod ? aiConfig.SUMOPOD_TEMPERATURE : aiConfig.OPENAI_TEMPERATURE,
    maxTokens: (sumopod ? aiConfig.SUMOPOD_MAX_TOKENS : aiConfig.OPENAI_MAX_TOKENS) || null,
    timeoutMs: 120000,
    extraHeaders: {},
  };
};

const toCandidate = (row) => ({
  key: row.model_pk,
  source: 'db',
  modelPk: row.model_pk,
  providerCode: row.provider_code,
  providerName: row.provider_name,
  baseURL: (row.base_url || '').replace(/\/+$/, ''),
  apiKey: resolveKey(row),
  requiresKey: row.requires_key,
  model: row.model_id,
  temperature: row.temperature,
  maxTokens: row.max_tokens,
  timeoutMs: row.timeout_ms || 120000,
  extraHeaders: row.extra_headers || {},
});

const MODEL_QUERY_COLUMNS = [
  'm.id as model_pk', 'm.model_id', 'm.temperature', 'm.max_tokens', 'm.timeout_ms',
  'p.code as provider_code', 'p.name as provider_name', 'p.base_url', 'p.api_key',
  'p.api_key_env', 'p.requires_key', 'p.extra_headers',
];

/**
 * Daftar kandidat aktif untuk satu purpose, urut priority (tanpa memperhitungkan cooldown)
 */
const loadCandidates = (purpose) => cached(`candidates:${purpose}`, async () => {
  try {
    const rows = await db('ai_models as m')
      .join('ai_providers as p', 'p.id', 'm.provider_id')
      .where('m.enabled', true)
      .andWhere('p.enabled', true)
      .whereRaw('m.purposes @> ?::jsonb', [JSON.stringify([purpose])])
      .orderBy([{ column: 'm.priority', order: 'asc' }, { column: 'm.created_at', order: 'asc' }])
      .select(MODEL_QUERY_COLUMNS);

    const list = rows.map(toCandidate).filter((c) => !c.requiresKey || c.apiKey);
    if (list.length) return list;
    logger.warn(`[ModelRouter] Tidak ada model aktif (dengan API key) untuk purpose "${purpose}", memakai .env`);
  } catch (error) {
    logger.warn(`[ModelRouter] Gagal membaca model dari DB, memakai .env: ${error.message}`);
  }
  return [envCandidate(purpose)];
});

/**
 * Kandidat untuk satu model tertentu (dipakai tombol "Tes" di UI), tanpa filter enabled
 */
const getCandidateByModelPk = async (modelPk) => {
  const row = await db('ai_models as m')
    .join('ai_providers as p', 'p.id', 'm.provider_id')
    .where('m.id', modelPk)
    .first(MODEL_QUERY_COLUMNS);
  return row ? toCandidate(row) : null;
};

const getCandidates = async (purpose) => {
  if (!PURPOSES.includes(purpose)) throw new Error(`Purpose AI tidak dikenal: ${purpose}`);
  const [all, settings] = await Promise.all([loadCandidates(purpose), getSettings()]);
  const now = Date.now();
  const ready = all.filter((c) => (cooldown.get(c.key) || 0) < now);
  // Semua sedang cooldown → tetap coba semuanya daripada langsung gagal
  const list = ready.length ? ready : all;
  return settings.use_fallback === false ? list.slice(0, 1) : list;
};

const createClient = (candidate) => new OpenAI({
  apiKey: candidate.apiKey || 'no-key',
  baseURL: candidate.baseURL,
  timeout: candidate.timeoutMs,
  maxRetries: 1,
  defaultHeaders: candidate.extraHeaders,
});

const logCall = (candidate, purpose, data) => {
  db('ai_logs').insert({
    purpose,
    provider_code: candidate.providerCode,
    model_id: candidate.model,
    success: data.success,
    streaming: Boolean(data.streaming),
    latency_ms: data.latencyMs,
    prompt_tokens: data.usage?.prompt_tokens ?? null,
    completion_tokens: data.usage?.completion_tokens ?? null,
    error: data.error ? String(data.error).slice(0, 2000) : null,
  }).catch((error) => logger.debug(`[ModelRouter] Gagal menulis ai_logs: ${error.message}`));
};

// 401/403/404 kemungkinan key/model salah → istirahat 10 menit; selain itu (429/5xx/timeout) 60 detik
const markFailed = (candidate, error) => {
  if (candidate.source !== 'db') return;
  const status = error?.status;
  const pause = [401, 403, 404].includes(status) ? 600000 : 60000;
  cooldown.set(candidate.key, Date.now() + pause);
};

const describeError = (error) => {
  const status = error?.status ? `HTTP ${error.status}: ` : '';
  return `${status}${error?.message || error}`;
};

// Parameter model (temperature/max_tokens) hanya dikirim jika belum ditentukan pemanggil & terisi di DB
const buildParams = (candidate, params) => {
  const body = { ...params, model: candidate.model };
  if (body.temperature === undefined && candidate.temperature !== null && candidate.temperature !== undefined) {
    body.temperature = candidate.temperature;
  }
  if (body.max_tokens === undefined && candidate.maxTokens) {
    body.max_tokens = candidate.maxTokens;
  }
  return body;
};

/**
 * Chat completion (non-streaming) dengan fallback antar model
 * @param {string} purpose - 'chat' | 'analysis'
 * @param {Object} params - parameter OpenAI chat.completions.create (tanpa model)
 * @param {Object} [options] - { candidates } untuk memaksa kandidat tertentu
 */
const chatCompletion = async (purpose, params, options = {}) => {
  const candidates = options.candidates || await getCandidates(purpose);
  let lastError;

  for (const candidate of candidates) {
    const started = Date.now();
    try {
      const completion = await createClient(candidate).chat.completions.create(buildParams(candidate, params));
      logCall(candidate, purpose, { success: true, latencyMs: Date.now() - started, usage: completion.usage });
      completion.routedModel = { provider: candidate.providerCode, model: candidate.model };
      return completion;
    } catch (error) {
      lastError = error;
      markFailed(candidate, error);
      logCall(candidate, purpose, { success: false, latencyMs: Date.now() - started, error: describeError(error) });
      logger.warn(`[ModelRouter] ${purpose} ${candidate.providerCode}/${candidate.model} gagal: ${describeError(error)}`);
    }
  }
  throw lastError || new Error('Tidak ada model AI yang tersedia');
};

/**
 * Chat completion streaming. Fallback ke model berikutnya hanya jika gagal sebelum chunk pertama
 * diterima (setelah teks terkirim ke client, error dilempar apa adanya).
 * @yields chunk mentah dari OpenAI SDK
 */
async function* streamChatCompletion(purpose, params) {
  const candidates = await getCandidates(purpose);
  let lastError;

  for (const candidate of candidates) {
    const started = Date.now();
    let stream;
    try {
      stream = await createClient(candidate).chat.completions.create({
        ...buildParams(candidate, params),
        stream: true,
      });
    } catch (error) {
      lastError = error;
      markFailed(candidate, error);
      logCall(candidate, purpose, { success: false, streaming: true, latencyMs: Date.now() - started, error: describeError(error) });
      logger.warn(`[ModelRouter] stream ${candidate.providerCode}/${candidate.model} gagal: ${describeError(error)}`);
      continue;
    }

    try {
      for await (const chunk of stream) {
        yield chunk;
      }
      logCall(candidate, purpose, { success: true, streaming: true, latencyMs: Date.now() - started });
      return;
    } catch (error) {
      markFailed(candidate, error);
      logCall(candidate, purpose, { success: false, streaming: true, latencyMs: Date.now() - started, error: describeError(error) });
      throw error;
    }
  }
  throw lastError || new Error('Tidak ada model AI yang tersedia');
}

const buildLangChainModel = (candidate, overrides = {}) => {
  const temperature = overrides.temperature ?? candidate.temperature;
  return new ChatOpenAI({
    modelName: candidate.model,
    ...(temperature !== null && temperature !== undefined ? { temperature } : {}),
    ...(candidate.maxTokens ? { maxTokens: candidate.maxTokens } : {}),
    openAIApiKey: candidate.apiKey || 'no-key',
    timeout: candidate.timeoutMs,
    configuration: {
      basePath: candidate.baseURL,
      baseURL: candidate.baseURL,
      defaultHeaders: candidate.extraHeaders,
    },
  });
};

const langChainUsage = (response) => {
  const usage = response?.response_metadata?.tokenUsage;
  return usage ? { prompt_tokens: usage.promptTokens, completion_tokens: usage.completionTokens } : null;
};

/**
 * Model LangChain (ChatOpenAI) dari kandidat pertama, untuk jalur yang masih memakai LangChain
 * @param {string} purpose
 * @param {Object} [overrides] - mis. { temperature: 0 }
 */
const getLangChainModel = async (purpose, overrides = {}) => {
  const [candidate] = await getCandidates(purpose);
  return { model: buildLangChainModel(candidate, overrides), candidate };
};

/**
 * Invoke model LangChain tertentu dan catat ke ai_logs (dipakai untuk panggilan lanjutan setelah tool call)
 */
const invokeLangChainWith = async (purpose, { model, candidate }, messages) => {
  const started = Date.now();
  try {
    const response = await model.invoke(messages);
    logCall(candidate, purpose, { success: true, latencyMs: Date.now() - started, usage: langChainUsage(response) });
    return response;
  } catch (error) {
    markFailed(candidate, error);
    logCall(candidate, purpose, { success: false, latencyMs: Date.now() - started, error: describeError(error) });
    throw error;
  }
};

/**
 * Invoke LangChain dengan fallback antar model. Model yang berhasil ikut dikembalikan
 * agar panggilan lanjutan (mis. setelah tool call) memakai model yang sama.
 * @param {Object} [options] - { overrides: { temperature }, bind: opsi model.bind (mis. { tools }) }
 */
const invokeLangChain = async (purpose, messages, { overrides, bind } = {}) => {
  const candidates = await getCandidates(purpose);
  let lastError;

  for (const candidate of candidates) {
    const model = buildLangChainModel(candidate, overrides);
    const runnable = bind ? model.bind(bind) : model;
    try {
      const response = await invokeLangChainWith(purpose, { model: runnable, candidate }, messages);
      return { response, model, candidate };
    } catch (error) {
      lastError = error;
      logger.warn(`[ModelRouter] ${purpose} ${candidate.providerCode}/${candidate.model} gagal: ${describeError(error)}`);
    }
  }
  throw lastError || new Error('Tidak ada model AI yang tersedia');
};

/**
 * Status cooldown untuk dashboard
 */
const getCooldowns = () => {
  const now = Date.now();
  return [...cooldown.entries()]
    .filter(([, until]) => until > now)
    .map(([key, until]) => ({ model_pk: key, until: new Date(until).toISOString() }));
};

module.exports = {
  PURPOSES,
  getSettings,
  getCandidates,
  getCandidateByModelPk,
  chatCompletion,
  streamChatCompletion,
  getLangChainModel,
  invokeLangChain,
  invokeLangChainWith,
  logCall,
  clearCache,
  resolveKey,
  getCooldowns,
};
