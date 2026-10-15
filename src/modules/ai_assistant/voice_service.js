const path = require('path');
const dns = require('dns').promises;
const net = require('net');
const axios = require('axios');
const OpenAI = require('openai');
const aiConfig = require('../../config/ai');
const { getProviderConfig } = require('./service');
const { Logger } = require('../../utils/logger');

const logger = Logger;

const SUPPORTED_EXTENSIONS = ['.mp3', '.mp4', '.mpeg', '.mpga', '.m4a', '.wav', '.webm', '.ogg', '.flac'];

const MIME_EXTENSION = {
  'audio/mpeg': '.mp3',
  'audio/mp3': '.mp3',
  'audio/mp4': '.m4a',
  'audio/x-m4a': '.m4a',
  'audio/wav': '.wav',
  'audio/x-wav': '.wav',
  'audio/webm': '.webm',
  'audio/ogg': '.ogg',
  'audio/flac': '.flac',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
};

class VoiceError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

const isPrivateIp = (ip) => {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    return a === 10
      || a === 127
      || a === 0
      || (a === 169 && b === 254)
      || (a === 172 && b >= 16 && b <= 31)
      || (a === 192 && b === 168);
  }
  const lower = ip.toLowerCase();
  return lower === '::1' || lower.startsWith('fc') || lower.startsWith('fd') || lower.startsWith('fe80');
};

/**
 * Validasi URL (cegah SSRF): hanya http/https, host publik, dan sesuai allowlist jika di-set
 */
const assertSafeUrl = async (rawUrl) => {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new VoiceError('audio_url tidak valid');
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new VoiceError('audio_url harus menggunakan http atau https');
  }

  const allowed = aiConfig.STT_ALLOWED_HOSTS;
  if (allowed.length > 0 && !allowed.includes(parsed.hostname)) {
    throw new VoiceError(`Host ${parsed.hostname} tidak diizinkan`, 403);
  }

  const addresses = net.isIP(parsed.hostname)
    ? [{ address: parsed.hostname }]
    : await dns.lookup(parsed.hostname, { all: true }).catch(() => {
      throw new VoiceError('Host audio_url tidak dapat di-resolve');
    });

  // Host internal hanya boleh jika secara eksplisit ada di allowlist
  if (allowed.length === 0 && addresses.some((a) => isPrivateIp(a.address))) {
    throw new VoiceError('audio_url mengarah ke alamat internal', 403);
  }

  return parsed;
};

/**
 * Share link Nextcloud/ownCloud (https://host/s/<token>) adalah halaman HTML.
 * Ubah ke link download langsung (https://host/s/<token>/download).
 */
const toDirectDownloadUrl = (parsed) => {
  if (/^\/s\/[A-Za-z0-9]+\/?$/.test(parsed.pathname)) {
    const direct = new URL(parsed.toString());
    direct.pathname = `${direct.pathname.replace(/\/$/, '')}/download`;
    return direct;
  }
  return parsed;
};

const filenameFromDisposition = (disposition) => {
  if (!disposition) return null;
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
};

const resolveFilename = (parsed, contentType, disposition) => {
  const candidates = [filenameFromDisposition(disposition), parsed.pathname];
  for (const candidate of candidates) {
    const ext = path.extname(candidate || '').toLowerCase();
    if (SUPPORTED_EXTENSIONS.includes(ext)) {
      return `audio${ext}`;
    }
  }
  const mime = (contentType || '').split(';')[0].trim().toLowerCase();
  if (MIME_EXTENSION[mime]) {
    return `audio${MIME_EXTENSION[mime]}`;
  }
  throw new VoiceError(
    `Format audio tidak didukung. Gunakan: ${SUPPORTED_EXTENSIONS.join(', ')}`,
    415,
  );
};

/**
 * Download audio dari URL ke memory dengan batas ukuran
 */
const downloadAudio = async (audioUrl) => {
  const parsed = toDirectDownloadUrl(await assertSafeUrl(audioUrl));
  const maxBytes = aiConfig.STT_MAX_FILE_MB * 1024 * 1024;

  let response;
  try {
    response = await axios.get(parsed.toString(), {
      responseType: 'arraybuffer',
      timeout: aiConfig.STT_DOWNLOAD_TIMEOUT,
      maxContentLength: maxBytes,
      maxBodyLength: maxBytes,
      maxRedirects: 3,
    });
  } catch (error) {
    if (error.code === 'ERR_BAD_RESPONSE' || /maxContentLength/i.test(error.message)) {
      throw new VoiceError(`Ukuran file melebihi ${aiConfig.STT_MAX_FILE_MB}MB`, 413);
    }
    const status = error.response?.status;
    throw new VoiceError(
      `Gagal mengunduh audio${status ? ` (HTTP ${status})` : `: ${error.message}`}`,
      502,
    );
  }

  const buffer = Buffer.from(response.data);
  if (buffer.length === 0) {
    throw new VoiceError('File audio kosong');
  }

  return {
    buffer,
    filename: resolveFilename(
      parsed,
      response.headers['content-type'],
      response.headers['content-disposition'],
    ),
    sizeBytes: buffer.length,
  };
};

const LANGUAGE_NAMES = {
  indonesian: 'id', english: 'en', chinese: 'zh', mandarin: 'zh', japanese: 'ja', korean: 'ko',
  malay: 'ms', javanese: 'jv', sundanese: 'su', arabic: 'ar', hindi: 'hi', thai: 'th',
  vietnamese: 'vi', french: 'fr', german: 'de', spanish: 'es', portuguese: 'pt', russian: 'ru',
  dutch: 'nl', italian: 'it', turkish: 'tr',
};

/**
 * Samakan kode bahasa ke ISO-639-1 huruf kecil (id, en, zh).
 * Menerima nama penuh ("indonesian") atau varian ("zh-CN").
 */
const normalizeLanguage = (value) => {
  if (!value || typeof value !== 'string') return null;
  const v = value.trim().toLowerCase();
  if (LANGUAGE_NAMES[v]) return LANGUAGE_NAMES[v];
  const base = v.split(/[-_]/)[0];
  return /^[a-z]{2}$/.test(base) ? base : null;
};

const getClient = () => {
  const config = getProviderConfig();
  return {
    config,
    openai: new OpenAI({ apiKey: config.apiKey, baseURL: config.baseURL }),
  };
};

/**
 * Speech-to-text via OpenAI-compatible /audio/transcriptions
 */
const transcribeViaChat = async ({ buffer, filename }, { language } = {}) => {
  const { openai } = getClient();
  const ext = path.extname(filename).replace('.', '').toLowerCase();

  const instruction = [
    'Transkripkan SELURUH ucapan pada audio ini persis apa adanya (verbatim), sesuai bahasa yang diucapkan.',
    language ? `Bahasa audio: ${language}.` : '',
    'Jangan meringkas, menerjemahkan, atau menambah komentar.',
    'Format balasan: baris pertama HANYA berisi kode bahasa ISO-639-1 yang diucapkan dalam format [LANG:xx] (contoh [LANG:id], [LANG:en]),',
    'lalu mulai baris berikutnya berisi teks transkrip saja.',
    'Hanya tulis kata yang benar-benar jelas diucapkan manusia. JANGAN menebak atau mengarang kata.',
    'Jika audio hanya berisi noise, dengung, angin, musik, bunyi benda, napas, atau suara yang tidak jelas sebagai kata,',
    'atau tidak ada ucapan manusia yang dapat dipahami, balas persis dengan: [NO_SPEECH]',
  ].filter(Boolean).join(' ');

  const completion = await openai.chat.completions.create({
    model: aiConfig.STT_MODEL,
    temperature: 0,
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: instruction },
        { type: 'input_audio', input_audio: { data: buffer.toString('base64'), format: ext } },
      ],
    }],
  });

  const raw = (completion.choices?.[0]?.message?.content || '').trim();
  const match = raw.match(/^\s*\[LANG:\s*([a-zA-Z-]{2,10})\s*\]\s*/);
  const text = (match ? raw.slice(match[0].length) : raw).trim();
  return {
    text: text === '[NO_SPEECH]' || raw === '[NO_SPEECH]' ? '' : text,
    language: normalizeLanguage(language || (match && match[1])),
    duration: null,
    segments: [],
  };
};

const transcribe = async ({ buffer, filename }, { language, prompt } = {}) => {
  if (aiConfig.STT_MODE === 'chat') {
    return transcribeViaChat({ buffer, filename }, { language });
  }

  const { openai } = getClient();
  const file = await OpenAI.toFile(buffer, filename);

  const params = {
    file,
    model: aiConfig.STT_MODEL,
    response_format: 'verbose_json',
  };
  if (language) params.language = language;
  if (prompt) params.prompt = prompt;

  const result = await openai.audio.transcriptions.create(params);

  return {
    text: (result.text || '').trim(),
    language: normalizeLanguage(language || result.language),
    duration: result.duration ?? null,
    segments: Array.isArray(result.segments)
      ? result.segments.map((s) => ({
        start: s.start,
        end: s.end,
        text: (s.text || '').trim(),
      }))
      : [],
  };
};

/**
 * Terjemahkan teks ke bahasa target (kode ISO-639-1)
 */
const translateText = async (text, { from, to }) => {
  const { openai, config } = getClient();

  const completion = await openai.chat.completions.create({
    model: aiConfig.STT_ANALYSIS_MODEL || config.model,
    temperature: 0,
    messages: [
      {
        role: 'system',
        content: [
          `Terjemahkan teks user${from ? ` dari bahasa "${from}"` : ''} ke bahasa dengan kode ISO-639-1 "${to}".`,
          'Pertahankan makna, nama orang/perusahaan, dan angka apa adanya.',
          'Balas HANYA dengan hasil terjemahan, tanpa penjelasan atau tanda kutip tambahan.',
        ].join(' '),
      },
      { role: 'user', content: text },
    ],
  });

  return (completion.choices?.[0]?.message?.content || '').trim();
};

/**
 * Analisis transkrip dengan LLM, output JSON terstruktur
 */
const analyzeTranscript = async (transcript, { instruction, outputLanguage = 'id' } = {}) => {
  const { openai, config } = getClient();

  const systemPrompt = [
    'Kamu adalah analis percakapan suara untuk Motor Sights International (MSI).',
    `Tulis seluruh hasil analisis dalam bahasa dengan kode "${outputLanguage}".`,
    'Balas HANYA dengan JSON valid (tanpa markdown) dengan struktur:',
    '{',
    '  "summary": string,',
    '  "key_points": string[],',
    '  "action_items": [{ "task": string, "owner": string|null, "due": string|null }],',
    '  "topics": string[],',
    '  "sentiment": "positive" | "neutral" | "negative" | "mixed",',
    '  "participants": string[],',
    '  "custom_answer": string|null',
    '}',
    'Jangan mengarang informasi yang tidak ada di transkrip. Gunakan [] atau null jika tidak ada.',
    instruction
      ? 'Jawab instruksi tambahan dari user pada field "custom_answer".'
      : 'Isi "custom_answer" dengan null.',
  ].join('\n');

  const userContent = instruction
    ? `Instruksi tambahan: ${instruction}\n\nTranskrip:\n${transcript}`
    : `Transkrip:\n${transcript}`;

  const completion = await openai.chat.completions.create({
    model: aiConfig.STT_ANALYSIS_MODEL || config.model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
    temperature: 0.2,
    response_format: { type: 'json_object' },
  });

  const raw = completion.choices?.[0]?.message?.content || '{}';
  try {
    return JSON.parse(raw);
  } catch {
    logger.warn('[Voice] Analisis bukan JSON valid, mengembalikan raw');
    return { summary: raw, key_points: [], action_items: [], topics: [], sentiment: 'neutral', participants: [], custom_answer: null };
  }
};

module.exports = {
  VoiceError,
  downloadAudio,
  transcribe,
  translateText,
  normalizeLanguage,
  analyzeTranscript,
  SUPPORTED_EXTENSIONS,
};
