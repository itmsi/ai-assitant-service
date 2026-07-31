/**
 * Memory Extractor
 *
 * Menentukan apakah suatu pesan user mengandung informasi yang layak
 * disimpan sebagai memory, lalu mengekstraknya via LLM model kecil.
 *
 * Alur:
 * 1. Keyword filter (cepat, tanpa LLM) — gate pertama
 * 2. Jika lolos → panggil LLM model kecil untuk extract structured facts
 * 3. Parse JSON response → validasi confidence → return
 */

const { Logger } = require('../../../utils/logger');
const logger = Logger;

// ============================================================
// Config (bisa dipindah ke config/ai.js nanti)
// ============================================================
const EXTRACTOR_MODEL = process.env.AI_MEMORY_EXTRACTOR_MODEL || 'gpt-4o-mini';
const CONFIDENCE_THRESHOLD = parseFloat(process.env.AI_MEMORY_CONFIDENCE_THRESHOLD || '0.60');
const AI_ENABLED = process.env.AI_ENABLED === 'true';

// ============================================================
// Keyword Filter — gate pertama sebelum panggil LLM
// ============================================================
const EXTRACT_KEYWORDS = [
  'default', 'favorit', 'preferensi', 'biasanya', 'mulai sekarang',
  'saya mau', 'saya ingin', 'jangan', 'tolong ingat',
  'customer', 'warehouse', 'gudang', 'kebijakan',
  'ingat', 'simpan', 'catat', 'ubah', 'ganti',
  'nama saya', 'email saya', 'no telepon', 'alamat',
  'setiap hari', 'setiap bulan', 'langganan',
  // Action words — user melakukan sesuatu yang bisa jadi memory
  'buat', 'bikin', 'tambah', 'input', 'register', 'daftar',
  'employee', 'karyawan', 'vendor', 'supplier',
  'quotation', 'order', 'project', 'kontrak', 'contract',
  'pelanggan', 'client', 'baru', 'rekanan',
  // Query verbs — user mencari/melihat data
  'tampil', 'tampilkan', 'lihat', 'lihatkan', 'cari',
  'tunjuk', 'tunjukkan', 'data', 'info', 'informasi',
  'list', 'daftar', 'semua', 'detail',
];

/**
 * Quick keyword check — tanpa biaya token LLM
 * @param {string} message
 * @returns {boolean} true jika perlu lanjut ke LLM extractor
 */
const shouldExtract = (message) => {
  if (!message || typeof message !== 'string') return false;

  const lower = message.toLowerCase();

  // Skip pesan yang jelas tidak mengandung informasi
  const skipPatterns = [
    /^halo/i, /^hai/i, /^hi/i, /^hey/i,
    /^terima kasih/i, /^makasih/i, /^thanks/i,
    /^iya/i, /^ya/i, /^ok/i, /^oke/i, /^baik/i,
    /^selamat (pagi|siang|sore|malam)/i,
    /^test/i, /^tes/i, /^coba/i,
    /^apa kabar/i,
  ];

  for (const pattern of skipPatterns) {
    if (pattern.test(lower)) {
      logger.debug(`[MemoryExtractor] Skip — matched skip pattern: ${pattern}`);
      return false;
    }
  }

  // Check keywords
  for (const keyword of EXTRACT_KEYWORDS) {
    if (lower.includes(keyword)) {
      logger.debug(`[MemoryExtractor] Keyword match: "${keyword}" in message`);
      return true;
    }
  }

  // Check untuk kalimat informatif (ada subjek + objek meaningful)
  // Minimal 3 kata dan mengandung kata kerja umum
  const words = lower.split(/\s+/).filter(w => w.length > 0);
  const infoVerbs = [
    'adalah', 'merupakan', 'berada', 'bekerja', 'tinggal',
    'punya', 'memiliki', 'menggunakan', 'pakai',
    'buat', 'membuat', 'menjadi', 'ingin',
    'tampil', 'tampilkan', 'lihat', 'lihatkan', 'tunjuk', 'tunjukkan',
    'cari', 'data', 'info',
  ];
  const hasInfoVerb = words.some(w => infoVerbs.includes(w));

  if (words.length >= 3 && hasInfoVerb) {
    logger.debug('[MemoryExtractor] Potential info sentence detected');
    return true;
  }

  return false;
};

// ============================================================
// Extractor System Prompt — untuk LLM kecil
// ============================================================
const EXTRACTOR_SYSTEM_PROMPT = `You are a memory extraction system. Your job is to extract structured facts from user messages.

Analyze the user message and determine if it contains any factual information, preferences, or important context worth remembering.

Return ONLY a valid JSON array (no markdown, no explanation). Each item in the array has this structure:

{
  "extracted": true/false,
  "action": "upsert" | "delete",
  "type": "user_preference" | "fact" | "context",
  "key": "normalized_camelCase_key",
  "value": "the value to remember",
  "confidence": 0.00-1.00
}

RULES:
- If NO meaningful info found → return [{"extracted": false}]
- "Halo", "terima kasih", "baik", small talk → return [{"extracted": false}]
- User states a preference (saya suka, saya mau, preferensi) → extract as user_preference
- User provides factual info (nama, alamat, perusahaan) → extract as fact
- User gives context (sedang mengerjakan, saat ini) → extract as context
- "Jangan" or negative preference → extract as user_preference with value containing "jangan"
- Confidence < 0.60 means the extraction is uncertain — set extracted: false
- Key must be in camelCase, descriptive (e.g. "defaultWarehouse", "favoriteCustomer", "currentProject")
- Value must be concise string`;

// ============================================================
// Memory Extractor — main function
// ============================================================

/**
 * Extract structured memories from a user message
 * @param {string} message - Pesan dari user
 * @returns {Promise<Array>} Array of memory objects, atau [] jika tidak ada
 */
const extractMemories = async (message) => {
  try {
    // Gate 1: keyword filter
    if (!shouldExtract(message)) {
      return [];
    }

    // Gate 2: jika AI tidak aktif, skip LLM call
    if (!AI_ENABLED) {
      logger.warn('[MemoryExtractor] AI disabled, skipping LLM extraction');
      return [];
    }

    // Panggil LLM kecil untuk extract
    const memories = await callExtractorModel(message);

    // Filter hasil — hanya yang valid dan confidence >= threshold
    const validMemories = (memories || [])
      .filter(m => m.extracted === true && m.confidence >= CONFIDENCE_THRESHOLD)
      .map(m => ({
        action: m.action || 'upsert',
        type: m.type || 'fact',
        key: m.key,
        value: m.value,
        confidence: m.confidence,
      }));

    if (validMemories.length > 0) {
      logger.info(`[Memory] LLM extracted ${validMemories.length} memories`);
    } else {
      const rawCount = (memories || []).length;
      logger.info(`[Memory] LLM called — ${rawCount} items, none passed threshold ${CONFIDENCE_THRESHOLD}`);
    }

    return validMemories;
  } catch (error) {
    logger.error(`[MemoryExtractor] Error: ${error.message || error}`);
    return []; // Fail safe — jangan sampai nge-block chat
  }
};

/**
 * Call the small LLM model for extraction
 * Uses OpenAI-compatible API (support Sumopod too)
 * @param {string} message
 * @returns {Promise<Array>}
 */
const callExtractorModel = async (message) => {
  const OpenAI = require('openai');
  const aiConfig = require('../../../config/ai');

  // Tentukan provider & config untuk model kecil
  const provider = aiConfig.AI_MODEL_PROVIDER || 'openai';
  const baseURL = provider === 'sumopod'
    ? (aiConfig.SUMOPOD_BASE_URL || '').replace(/\/+$/, '')
    : 'https://api.openai.com/v1';
  const apiKey = provider === 'sumopod' ? aiConfig.SUMOPOD_API_KEY : aiConfig.OPENAI_API_KEY;

  if (!apiKey) {
    logger.warn('[MemoryExtractor] No API key configured, skipping extraction');
    return [];
  }

  const openai = new OpenAI({ apiKey, baseURL });

  const response = await openai.chat.completions.create({
    model: EXTRACTOR_MODEL,
    messages: [
      { role: 'system', content: EXTRACTOR_SYSTEM_PROMPT },
      { role: 'user', content: `User message: ${message}` },
    ],
    temperature: 0.1, // Low temperature for consistent extraction
    max_tokens: 500,
  });

  const content = response.choices?.[0]?.message?.content?.trim();
  if (!content) return [];

  // Parse JSON — handle possible markdown wrapping
  let parsed;
  try {
    // Remove markdown code block if present
    const jsonStr = content.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
    parsed = JSON.parse(jsonStr);
  } catch (parseError) {
    logger.warn(`[MemoryExtractor] Failed to parse LLM response: ${parseError.message}`);
    logger.debug(`[MemoryExtractor] Raw response: ${content}`);
    return [];
  }

  return Array.isArray(parsed) ? parsed : [parsed];
};

module.exports = {
  extractMemories,
  shouldExtract,
  EXTRACT_KEYWORDS,
};
