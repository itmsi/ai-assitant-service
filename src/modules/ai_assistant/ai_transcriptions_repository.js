const crypto = require('crypto');
const { pgCore: db } = require('../../config/database');
const { Logger } = require('../../utils/logger');
const logger = Logger;

/**
 * AI Transcriptions Repository
 * Handle database operations untuk riwayat speech-to-text
 */

const parseJson = (value) => {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

/**
 * Kunci cache dari parameter yang memengaruhi hasil
 */
const buildRequestHash = ({
  userId, audioUrl, language, outputLanguage, analyze, instruction, summarize,
}) => {
  const parts = [
    userId || '',
    audioUrl,
    (language || '').toLowerCase(),
    (outputLanguage || '').toLowerCase(),
    analyze === true,
    analyze === true ? (instruction || '').trim() : '',
  ];
  // Hanya ditambahkan saat aktif, agar hash (dan cache) request lama tanpa summary tetap sama
  if (summarize === true) parts.push('summarize');
  return crypto.createHash('sha256').update(JSON.stringify(parts)).digest('hex');
};

const toRecord = (row) => (row ? {
  id: row.id,
  user_id: row.user_id,
  audio_url: row.audio_url,
  size_bytes: row.size_bytes,
  language: row.language,
  output_language: row.output_language,
  translated: row.translated,
  transcript: row.transcript,
  translation: row.translation,
  segments: parseJson(row.segments) || [],
  summary: row.summary,
  analysis: parseJson(row.analysis),
  duration: row.duration,
  stt_model: row.stt_model,
  processing_ms: row.processing_ms,
  status: row.status,
  error_message: row.error_message,
  params: parseJson(row.params),
  created_at: row.created_at,
  finished_at: row.finished_at,
} : null);

/**
 * Simpan hasil transkripsi. Gagal simpan tidak boleh menggagalkan request.
 * @returns {Promise<Object|null>} record tersimpan, atau null jika gagal
 */
const saveTranscription = async (data) => {
  try {
    const [row] = await db('ai_transcriptions')
      .insert({
        user_id: data.userId || null,
        audio_url: data.audioUrl,
        size_bytes: data.sizeBytes ?? null,
        request_hash: data.requestHash,
        language: data.language || null,
        output_language: data.outputLanguage || null,
        translated: Boolean(data.translated),
        transcript: data.transcript,
        translation: data.translation || null,
        segments: JSON.stringify(data.segments || []),
        summary: data.summary || null,
        analysis: data.analysis ? JSON.stringify(data.analysis) : null,
        duration: data.duration ?? null,
        stt_model: data.sttModel || null,
        processing_ms: data.processingMs ?? null,
      })
      .returning('*');
    return toRecord(row);
  } catch (error) {
    logger.error(`Error saving transcription to DB: ${error.message || error}`);
    return null;
  }
};

/**
 * Cari hasil sebelumnya yang masih dalam TTL
 */
const findCached = async (requestHash, ttlHours) => {
  try {
    const since = new Date(Date.now() - ttlHours * 60 * 60 * 1000);
    const row = await db('ai_transcriptions')
      .where({ request_hash: requestHash, status: 'success' })
      .andWhere('created_at', '>=', since)
      .orderBy('created_at', 'desc')
      .first();
    return toRecord(row);
  } catch (error) {
    logger.error(`Error reading transcription cache: ${error.message || error}`);
    return null;
  }
};

const getById = async (id) => {
  try {
    const row = await db('ai_transcriptions').where({ id }).first();
    return toRecord(row);
  } catch (error) {
    logger.error(`Error getting transcription by id: ${error.message || error}`);
    return null;
  }
};

/**
 * Daftar riwayat per user (tanpa segments/analysis penuh, transkrip dipotong untuk preview)
 */
const listByUser = async (userId, { page = 1, limit = 20 } = {}) => {
  const offset = (page - 1) * limit;
  const [{ count }] = await db('ai_transcriptions').where({ user_id: userId }).count('id as count');
  const rows = await db('ai_transcriptions')
    .where({ user_id: userId })
    .orderBy('created_at', 'desc')
    .limit(limit)
    .offset(offset)
    .select(
      'id', 'status', 'audio_url', 'size_bytes', 'language', 'output_language', 'translated',
      'duration', 'processing_ms', 'created_at',
      db.raw('LEFT(transcript, 150) AS transcript_preview'),
    );

  return { total: Number(count), page, limit, items: rows };
};

/**
 * Buat job antrian (status pending). Hasil diisi worker lewat markDone.
 */
const createPending = async ({ userId, audioUrl, requestHash, params }) => {
  const [row] = await db('ai_transcriptions')
    .insert({
      user_id: userId || null,
      audio_url: audioUrl,
      request_hash: requestHash,
      status: 'pending',
      params: JSON.stringify(params),
      transcript: null,
    })
    .returning('*');
  return toRecord(row);
};

/**
 * Job yang sama (request identik) yang masih menunggu/diproses — dipakai agar retry client tidak menggandakan job
 */
const findActive = async (requestHash, withinMinutes = 60) => {
  try {
    const since = new Date(Date.now() - withinMinutes * 60 * 1000);
    const row = await db('ai_transcriptions')
      .where({ request_hash: requestHash })
      .whereIn('status', ['pending', 'processing'])
      .andWhere('created_at', '>=', since)
      .orderBy('created_at', 'desc')
      .first();
    return toRecord(row);
  } catch (error) {
    logger.error(`Error finding active transcription: ${error.message || error}`);
    return null;
  }
};

/**
 * Ambil job untuk dikerjakan worker. pending/processing boleh (processing = redelivery setelah worker crash);
 * success/failed berarti sudah selesai → null (pesan duplikat diabaikan).
 */
const claimForProcessing = async (id) => {
  const [row] = await db('ai_transcriptions')
    .where({ id })
    .whereIn('status', ['pending', 'processing'])
    .update({ status: 'processing', started_at: db.fn.now() })
    .returning('*');
  return toRecord(row);
};

const markDone = async (id, data) => {
  await db('ai_transcriptions')
    .where({ id })
    .update({
      status: 'success',
      error_message: null,
      size_bytes: data.sizeBytes ?? null,
      language: data.language || null,
      output_language: data.outputLanguage || null,
      translated: Boolean(data.translated),
      transcript: data.transcript,
      translation: data.translation || null,
      segments: JSON.stringify(data.segments || []),
      summary: data.summary || null,
      analysis: data.analysis ? JSON.stringify(data.analysis) : null,
      duration: data.duration ?? null,
      stt_model: data.sttModel || null,
      processing_ms: data.processingMs ?? null,
      finished_at: db.fn.now(),
    });
};

const markFailed = async (id, message) => {
  try {
    await db('ai_transcriptions')
      .where({ id })
      .update({
        status: 'failed',
        error_message: String(message || 'Unknown error').slice(0, 1000),
        finished_at: db.fn.now(),
      });
  } catch (error) {
    logger.error(`Error marking transcription failed: ${error.message || error}`);
  }
};

module.exports = {
  createPending,
  findActive,
  claimForProcessing,
  markDone,
  markFailed,
  buildRequestHash,
  saveTranscription,
  findCached,
  getById,
  listByUser,
};
