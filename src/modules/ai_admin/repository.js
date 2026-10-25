/**
 * Repository UI admin AI: provider, model, prompt, settings, dan statistik log
 */

const { pgCore: db } = require('../../config/database');
const { resolveKey } = require('../ai_assistant/model_router');

// =============================================
// Providers
// =============================================

// API key tidak pernah dikirim utuh ke browser
const maskProvider = (row) => {
  const { api_key: apiKey, ...rest } = row;
  const key = resolveKey(row);
  return {
    ...rest,
    model_count: row.model_count !== undefined ? Number(row.model_count) : undefined,
    has_key: Boolean(key),
    key_source: apiKey ? 'database' : (key ? 'env' : null),
    key_preview: key ? `…${key.slice(-4)}` : null,
  };
};

const listProviders = async () => {
  const rows = await db('ai_providers as p')
    .leftJoin('ai_models as m', 'm.provider_id', 'p.id')
    .groupBy('p.id')
    .orderBy('p.name', 'asc')
    .select('p.*', db.raw('count(m.id) as model_count'));
  return rows.map(maskProvider);
};

const getProviderRaw = (id) => db('ai_providers').where({ id }).first();

const createProvider = async (data) => {
  const [row] = await db('ai_providers').insert(data).returning('*');
  return maskProvider(row);
};

const updateProvider = async (id, data) => {
  const [row] = await db('ai_providers')
    .where({ id })
    .update({ ...data, updated_at: db.fn.now() })
    .returning('*');
  return row ? maskProvider(row) : null;
};

const deleteProvider = (id) => db('ai_providers').where({ id }).del();

// =============================================
// Models
// =============================================

const listModels = async () => {
  const rows = await db('ai_models as m')
    .join('ai_providers as p', 'p.id', 'm.provider_id')
    .orderBy([{ column: 'm.priority', order: 'asc' }, { column: 'm.created_at', order: 'asc' }])
    .select(
      'm.*',
      'p.name as provider_name',
      'p.code as provider_code',
      'p.enabled as provider_enabled',
      'p.requires_key',
      'p.api_key',
      'p.api_key_env',
    );
  return rows.map(({ api_key: apiKey, api_key_env: apiKeyEnv, requires_key: requiresKey, ...rest }) => ({
    ...rest,
    provider_has_key: !requiresKey || Boolean(resolveKey({ api_key: apiKey, api_key_env: apiKeyEnv })),
  }));
};

const getModel = (id) => db('ai_models').where({ id }).first();

const listModelIdsByProvider = async (providerId) => {
  const rows = await db('ai_models').where({ provider_id: providerId }).select('model_id');
  return new Set(rows.map((r) => r.model_id));
};

const createModels = (rows) => db('ai_models')
  .insert(rows)
  .onConflict(['provider_id', 'model_id'])
  .ignore()
  .returning('*');

const updateModel = async (id, data) => {
  const [row] = await db('ai_models')
    .where({ id })
    .update({ ...data, updated_at: db.fn.now() })
    .returning('*');
  return row;
};

const deleteModel = (id) => db('ai_models').where({ id }).del();

// =============================================
// Prompts (tabel ai_prompts yang sudah ada + riwayat di ai_prompt_histories)
// =============================================

const listPrompts = () => db('ai_prompts')
  .whereNull('deleted_at')
  .orderBy('key', 'asc')
  .select('id', 'key', 'version', 'is_active', 'description', 'content', 'created_at', 'updated_at');

const getPrompt = (key) => db('ai_prompts').where({ key }).whereNull('deleted_at').first();

// Termasuk yang sudah di-soft-delete (kolom key unik di DB)
const getPromptAny = (key) => db('ai_prompts').where({ key }).first();

const bumpVersion = (version) => {
  const parts = String(version || '1.0.0').split('.').map((n) => parseInt(n, 10));
  if (parts.length !== 3 || parts.some(Number.isNaN)) return '1.0.0';
  parts[2] += 1;
  return parts.join('.');
};

const createPrompt = async (data) => {
  const existing = await getPromptAny(data.key);
  if (existing && !existing.deleted_at) {
    const error = new Error(`Prompt dengan key "${data.key}" sudah ada`);
    error.status = 409;
    throw error;
  }
  if (existing) {
    // Hidupkan kembali key yang pernah dihapus
    const [row] = await db('ai_prompts')
      .where({ key: data.key })
      .update({ ...data, deleted_at: null, updated_at: db.fn.now() })
      .returning('*');
    return row;
  }
  const [row] = await db('ai_prompts').insert(data).returning('*');
  return row;
};

/**
 * Update prompt. Jika isi berubah, isi lama disimpan ke riwayat dan versi naik otomatis
 */
const updatePrompt = (key, data, changedBy) => db.transaction(async (trx) => {
  const current = await trx('ai_prompts').where({ key }).whereNull('deleted_at').forUpdate().first();
  if (!current) return null;

  const patch = { ...data };
  const contentChanged = data.content !== undefined && data.content !== current.content;
  if (contentChanged) {
    await trx('ai_prompt_histories').insert({
      prompt_key: key,
      content: current.content,
      version: current.version,
      changed_by: changedBy,
    });
    if (!data.version) patch.version = bumpVersion(current.version);
  }

  const [row] = await trx('ai_prompts')
    .where({ key })
    .update({ ...patch, updated_at: trx.fn.now() })
    .returning('*');
  return row;
});

const listPromptHistory = (key) => db('ai_prompt_histories')
  .where({ prompt_key: key })
  .orderBy('created_at', 'desc')
  .limit(50)
  .select('id', 'version', 'changed_by', 'created_at', 'content');

const getPromptHistory = (key, id) => db('ai_prompt_histories').where({ prompt_key: key, id }).first();

const deletePrompt = (key) => db('ai_prompts')
  .where({ key })
  .update({ deleted_at: db.fn.now(), is_active: false, updated_at: db.fn.now() });

// =============================================
// Settings
// =============================================

const getSettings = async () => {
  const rows = await db('ai_settings').select('key', 'value', 'updated_at');
  return rows.reduce((acc, row) => ({ ...acc, [row.key]: row.value }), {});
};

const setSetting = (key, value) => db('ai_settings')
  .insert({ key, value: JSON.stringify(value), updated_at: db.fn.now() })
  .onConflict('key')
  .merge();

// =============================================
// Monitoring
// =============================================

const RANGES = {
  '1h': { interval: '1 hour', bucket: 'minute' },
  '24h': { interval: '24 hours', bucket: 'hour' },
  '7d': { interval: '7 days', bucket: 'day' },
  '30d': { interval: '30 days', bucket: 'day' },
};

const getOverview = async (range) => {
  const { interval, bucket } = RANGES[range] || RANGES['24h'];
  const since = db.raw(`now() - interval '${interval}'`);

  const [totals, byModel, timeline, recentErrors, transcriptions, conversations] = await Promise.all([
    db('ai_logs').where('created_at', '>=', since).first(
      db.raw('count(*)::int as total'),
      db.raw('count(*) filter (where success)::int as success'),
      db.raw('round(avg(latency_ms) filter (where success))::int as avg_latency_ms'),
      db.raw('coalesce(sum(prompt_tokens), 0)::bigint as prompt_tokens'),
      db.raw('coalesce(sum(completion_tokens), 0)::bigint as completion_tokens'),
    ),
    db('ai_logs').where('created_at', '>=', since)
      .groupBy('purpose', 'provider_code', 'model_id')
      .orderBy('total', 'desc')
      .select(
        'purpose', 'provider_code', 'model_id',
        db.raw('count(*)::int as total'),
        db.raw('count(*) filter (where success)::int as success'),
        db.raw('round(avg(latency_ms) filter (where success))::int as avg_latency_ms'),
        db.raw('max(created_at) as last_used_at'),
      ),
    db('ai_logs').where('created_at', '>=', since)
      .groupByRaw('1')
      .orderByRaw('1')
      .select(
        db.raw(`date_trunc('${bucket}', created_at) as bucket`),
        db.raw('count(*) filter (where success)::int as success'),
        db.raw('count(*) filter (where not success)::int as failed'),
      ),
    db('ai_logs').where('success', false).orderBy('created_at', 'desc').limit(10)
      .select('id', 'purpose', 'provider_code', 'model_id', 'error', 'created_at'),
    db('ai_transcriptions').where('created_at', '>=', since)
      .groupBy('status').select('status', db.raw('count(*)::int as total')),
    db('ai_conversations').where('updated_at', '>=', since).first(db.raw('count(*)::int as total')),
  ]);

  return {
    range: RANGES[range] ? range : '24h',
    bucket,
    totals,
    by_model: byModel,
    timeline,
    recent_errors: recentErrors,
    transcriptions,
    conversations: conversations?.total || 0,
  };
};

const listLogs = async ({ page, limit, purpose, success, model }) => {
  const query = db('ai_logs');
  if (purpose) query.where({ purpose });
  if (success === 'true' || success === 'false') query.where({ success: success === 'true' });
  if (model) query.where('model_id', 'ilike', `%${model}%`);

  const [{ total }] = await query.clone().count('* as total');
  const rows = await query.orderBy('id', 'desc').limit(limit).offset((page - 1) * limit).select('*');
  return { rows, total: Number(total), page, limit };
};

module.exports = {
  listProviders,
  getProviderRaw,
  createProvider,
  updateProvider,
  deleteProvider,
  listModels,
  getModel,
  listModelIdsByProvider,
  createModels,
  updateModel,
  deleteModel,
  listPrompts,
  getPrompt,
  createPrompt,
  updatePrompt,
  listPromptHistory,
  getPromptHistory,
  deletePrompt,
  getSettings,
  setSetting,
  getOverview,
  listLogs,
};
