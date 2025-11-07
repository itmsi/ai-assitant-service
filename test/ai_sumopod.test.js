const path = require('node:path');
const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const { config: loadEnv } = require('dotenv');
let baseUrl;

before(() => {
  const envPath = path.resolve(__dirname, '..', '.env');
  loadEnv({ path: envPath });

  baseUrl = (process.env.SUMOPOD_BASE_URL || '').replace(/\/$/, '');
});

test('sumopod API tersedia dan mengembalikan hasil chat', { timeout: 60000 }, async (t) => {
  if (!process.env.SUMOPOD_API_KEY || !baseUrl) {
    t.skip('Kredensial Sumopod tidak tersedia di environment');
    return;
  }

  const headers = {
    Authorization: `Bearer ${process.env.SUMOPOD_API_KEY}`,
    'Content-Type': 'application/json',
  };

  const modelsResponse = await fetch(`${baseUrl}/models`, {
    method: 'GET',
    headers,
  });

  const modelsPayload = await modelsResponse.json();

  assert.ok(modelsResponse.ok, `Gagal mengambil daftar model: ${modelsResponse.status} ${JSON.stringify(modelsPayload)}`);
  const availableModels = Array.isArray(modelsPayload?.data) ? modelsPayload.data : [];
  assert.ok(availableModels.length > 0, 'Daftar model Sumopod kosong');

  const availableModelIds = availableModels
    .map((item) => item?.id || item?.model || item)
    .filter((id) => typeof id === 'string' && id.trim().length > 0);

  assert.ok(availableModelIds.length > 0, 'Tidak menemukan ID model valid pada daftar Sumopod');

  const preferredFromEnv = process.env.SUMOPOD_MODEL || process.env.OPENAI_MODEL;

  const priorityModels = [
    'gpt-4o',
    'gpt-4o-mini',
    'gpt-4.1',
    'gpt-4.1-mini',
    'gpt-5-chat',
    'claude-3-7-sonnet',
    'claude-3-5-sonnet',
    'claude-3-5-haiku',
  ];

  const chatModelCandidate = priorityModels.find((preferred) => availableModelIds.includes(preferred))
    || availableModelIds.find((id) => /chat|gpt|llama|mistral|mixtral|claude|sonnet/i.test(id)
      && !/tts|whisper|embedding|transcribe|image|vision/i.test(id)
      && !id.includes('/'));

  let preferredModel = preferredFromEnv;

  if (!preferredModel || !availableModelIds.includes(preferredModel)) {
    preferredModel = chatModelCandidate || availableModelIds[0];
  }

  if (!/gpt|llama|mistral|mixtral|chat|claude|sonnet/i.test(preferredModel)
    || /tts|whisper|embedding|transcribe|image|vision/i.test(preferredModel)
    || preferredModel.includes('/')) {
    t.skip(`Model chat cocok tidak ditemukan (model yang tersedia: ${availableModelIds.join(', ')})`);
    return;
  }

  if (!preferredModel) {
    t.skip('Tidak ada model Sumopod yang tersedia untuk diuji');
    return;
  }

  const chatResponse = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: preferredModel,
      messages: [
        { role: 'system', content: 'Kamu adalah asisten yang selalu menjawab singkat dalam bahasa Indonesia.' },
        { role: 'user', content: 'Sebutkan satu alasan kenapa AI bermanfaat.' }
      ],
      max_tokens: 200,
      temperature: /gpt-5/i.test(preferredModel) ? 1 : 0.7,
    }),
  });

  const chatPayload = await chatResponse.json();
  assert.ok(chatResponse.ok, `Permintaan chat gagal: ${chatResponse.status} ${JSON.stringify(chatPayload)}`);

  const choices = chatPayload?.choices || [];
  assert.ok(Array.isArray(choices) && choices.length > 0, 'Respons chat tidak memiliki pilihan jawaban');

  const content = choices[0]?.message?.content || '';
  assert.equal(typeof content, 'string', 'Konten respons bukan string');
  assert.ok(content.trim().length > 0, 'Konten respons kosong');
});

