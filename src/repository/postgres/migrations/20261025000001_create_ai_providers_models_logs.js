/**
 * Migration: Konfigurasi AI berbasis database (provider, model, settings, riwayat prompt, log)
 * Provider/model/prompt bisa diubah dari UI admin tanpa rebuild.
 * Seed awal diambil dari .env saat migrasi dijalankan, sehingga perilaku awal sama dengan sebelumnya.
 */

const PURPOSE_CHAT = 'chat';
const PURPOSE_ANALYSIS = 'analysis';

const toNumber = (value, fallback = null) => {
  const n = Number(value);
  return Number.isFinite(n) && value !== '' && value !== undefined ? n : fallback;
};

exports.up = async function(knex) {
  await knex.schema.createTable('ai_providers', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    // Kode unik (huruf kecil), dipakai di log
    table.string('code', 50).notNullable().unique();
    table.string('name', 100).notNullable();
    // Base URL OpenAI-compatible, tanpa /chat/completions (contoh: https://api.openai.com/v1)
    table.string('base_url', 500).notNullable();
    // API key langsung (disimpan di DB) atau nama variabel .env yang berisi key
    table.text('api_key').nullable();
    table.string('api_key_env', 100).nullable();
    table.boolean('requires_key').notNullable().defaultTo(true);
    table.boolean('enabled').notNullable().defaultTo(true);
    table.jsonb('extra_headers').notNullable().defaultTo('{}');
    table.text('notes').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('ai_models', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('provider_id').notNullable().references('id').inTable('ai_providers').onDelete('CASCADE');
    // ID model persis seperti di provider (contoh: gpt-5.4)
    table.string('model_id', 200).notNullable();
    table.string('label', 200).nullable();
    // Kegunaan model: ["chat"] = asisten chat, ["analysis"] = terjemahan/ringkasan/analisis transkrip
    table.jsonb('purposes').notNullable().defaultTo(JSON.stringify([PURPOSE_CHAT]));
    table.boolean('enabled').notNullable().defaultTo(true);
    // Urutan fallback: priority kecil dicoba lebih dulu
    table.integer('priority').notNullable().defaultTo(100);
    // NULL = tidak dikirim ke provider (pakai default provider)
    table.float('temperature').nullable();
    table.integer('max_tokens').nullable();
    table.integer('timeout_ms').notNullable().defaultTo(120000);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.unique(['provider_id', 'model_id']);
    table.index(['enabled', 'priority'], 'idx_ai_models_enabled_priority');
  });

  // Pengaturan runtime key-value (contoh: chat_prompt_key, use_fallback)
  await knex.schema.createTable('ai_settings', (table) => {
    table.string('key', 100).primary();
    table.jsonb('value').notNullable();
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // Riwayat isi prompt sebelum diubah, untuk rollback dari UI
  await knex.schema.createTable('ai_prompt_histories', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('prompt_key', 100).notNullable();
    table.text('content').notNullable();
    table.string('version', 20).nullable();
    table.string('changed_by', 100).nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index(['prompt_key', 'created_at'], 'idx_ai_prompt_histories_key_created');
  });

  // Log setiap panggilan model AI (untuk dashboard monitoring)
  await knex.schema.createTable('ai_logs', (table) => {
    table.bigIncrements('id').primary();
    table.string('purpose', 30).notNullable();
    table.string('provider_code', 50).notNullable();
    table.string('model_id', 200).notNullable();
    table.boolean('success').notNullable();
    table.boolean('streaming').notNullable().defaultTo(false);
    table.integer('latency_ms').nullable();
    table.integer('prompt_tokens').nullable();
    table.integer('completion_tokens').nullable();
    table.text('error').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index(['created_at'], 'idx_ai_logs_created_at');
    table.index(['purpose', 'created_at'], 'idx_ai_logs_purpose_created');
  });

  // =============================================
  // Seed dari .env (konfigurasi yang berjalan saat ini)
  // =============================================
  const env = process.env;
  const activeProvider = env.AI_MODEL_PROVIDER || 'openai';

  const [sumopod] = await knex('ai_providers').insert({
    code: 'sumopod',
    name: 'Sumopod',
    base_url: (env.SUMOPOD_BASE_URL || 'https://ai.sumopod.com/v1').replace(/\/+$/, ''),
    api_key_env: 'SUMOPOD_API_KEY',
    enabled: activeProvider === 'sumopod',
    notes: 'Seed dari .env (SUMOPOD_*)',
  }).returning('*');

  const [openai] = await knex('ai_providers').insert({
    code: 'openai',
    name: 'OpenAI',
    base_url: 'https://api.openai.com/v1',
    api_key_env: 'OPENAI_API_KEY',
    enabled: activeProvider === 'openai',
    notes: 'Seed dari .env (OPENAI_*)',
  }).returning('*');

  const models = [];
  const sumopodModel = env.SUMOPOD_MODEL || env.OPENAI_MODEL || 'gpt-5.4';
  const analysisModel = env.STT_ANALYSIS_MODEL || '';

  // Model analisis khusus (STT_ANALYSIS_MODEL) ada di provider aktif, sama seperti perilaku lama
  const analysisProvider = activeProvider === 'openai' ? openai : sumopod;
  if (analysisModel) {
    models.push({
      provider_id: analysisProvider.id,
      model_id: analysisModel,
      label: 'Analisis transkrip (seed STT_ANALYSIS_MODEL)',
      purposes: JSON.stringify([PURPOSE_ANALYSIS]),
      priority: 10,
    });
  }

  models.push({
    provider_id: sumopod.id,
    model_id: sumopodModel,
    label: 'Model utama Sumopod (seed SUMOPOD_MODEL)',
    // Tanpa STT_ANALYSIS_MODEL, analisis memakai model chat (perilaku lama)
    purposes: JSON.stringify(analysisModel && analysisProvider.id === sumopod.id
      ? [PURPOSE_CHAT]
      : [PURPOSE_CHAT, PURPOSE_ANALYSIS]),
    priority: 10,
    temperature: toNumber(env.SUMOPOD_TEMPERATURE ?? env.OPENAI_TEMPERATURE, 0.85),
    max_tokens: toNumber(env.SUMOPOD_MAX_TOKENS ?? env.OPENAI_MAX_TOKENS, 16000),
  });

  models.push({
    provider_id: openai.id,
    model_id: env.OPENAI_MODEL || 'gpt-4o',
    label: 'Model OpenAI (seed OPENAI_MODEL)',
    purposes: JSON.stringify([PURPOSE_CHAT, PURPOSE_ANALYSIS]),
    priority: 100,
    temperature: toNumber(env.OPENAI_TEMPERATURE, 0.85),
    max_tokens: toNumber(env.OPENAI_MAX_TOKENS, null),
  });

  await knex('ai_models').insert(models).onConflict(['provider_id', 'model_id']).ignore();

  await knex('ai_settings').insert([
    { key: 'chat_prompt_key', value: JSON.stringify(env.AI_SYSTEM_PROMPT_KEY || 'system_prompt_default') },
    // true = jika model gagal, lanjut ke model berikutnya sesuai priority
    { key: 'use_fallback', value: JSON.stringify(true) },
  ]);
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('ai_logs');
  await knex.schema.dropTableIfExists('ai_prompt_histories');
  await knex.schema.dropTableIfExists('ai_settings');
  await knex.schema.dropTableIfExists('ai_models');
  await knex.schema.dropTableIfExists('ai_providers');
};
