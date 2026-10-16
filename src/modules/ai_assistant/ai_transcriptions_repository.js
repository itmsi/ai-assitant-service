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
const buildRequestHash = ({ userId, audioUrl, language, outputLanguage, analyze, instruction }) => crypto
  .createHash('sha256')
  .update(JSON.stringify([
    userId || '',
    audioUrl,
    (language || '').toLowerCase(),
    (outputLanguage || '').toLowerCase(),
    analyze === true,
    analyze === true ? (instruction || '').trim() : '',
  ]))
  .digest('hex');

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
  analysis: parseJson(row.analysis),
  duration: row.duration,
  stt_model: row.stt_model,
  processing_ms: row.processing_ms,
  created_at: row.created_at,
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
      .where({ request_hash: requestHash })
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
      'id', 'audio_url', 'size_bytes', 'language', 'output_language', 'translated',
      'duration', 'processing_ms', 'created_at',
      db.raw('LEFT(transcript, 150) AS transcript_preview'),
    );

  return { total: Number(count), page, limit, items: rows };
};

module.exports = {
  buildRequestHash,
  saveTranscription,
  findCached,
  getById,
  listByUser,
};
