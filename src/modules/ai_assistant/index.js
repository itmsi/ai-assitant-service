const express = require('express');
const router = express.Router();
const handler = require('./handler');
const { optionalSSOToken } = require('./middleware/sso');
let memoryRoutes = null;
try {
  memoryRoutes = require('./memory/index');
} catch (err) {
  // Memory routes belum siap
}

console.log('AI Assistant routes initialized');
// Optional: Add token verification if needed
// const { verifyToken } = require('../../middlewares');

/**
 * @route   POST /api/mosa/ai-assistant/chat
 * @desc    Send message to AI Assistant
 * @access  Protected (SSO token optional - anonymous jika tanpa token)
 * @body    { message: string, sessionId?: string }
 * @header  Authorization: Bearer <SSO_TOKEN>
 */
router.post(
  '/chat',
  optionalSSOToken,
  handler.chat
);

/**
 * @route   GET /api/mosa/ai-assistant/history/:sessionId
 * @desc    Get conversation history by session ID
 * @access  Protected (SSO token optional)
 * @header  Authorization: Bearer <SSO_TOKEN>
 */
router.get(
  '/history/:sessionId',
  optionalSSOToken,
  handler.getHistory
);

/**
 * @route   DELETE /api/mosa/ai-assistant/history/:sessionId
 * @desc    Clear conversation history by session ID
 * @access  Protected (SSO token optional)
 * @header  Authorization: Bearer <SSO_TOKEN>
 */
router.delete(
  '/history/:sessionId',
  optionalSSOToken,
  handler.clearHistory
);

/**
 * @route   POST /api/mosa/ai-assistant/history/list
 * @desc    Get all conversation sessions by logged-in user
 * @access  Protected (SSO token optional — fallback ke body user_id)
 * @body    { user_id?: string }
 * @header  Authorization: Bearer <SSO_TOKEN>
 */
router.post(
  '/history/list',
  optionalSSOToken,
  handler.listByUser
);

/**
 * @route   POST /api/mosa/ai-assistant/chat/stream
 * @desc    Chat with streaming response (SSE)
 * @access  Protected (SSO token optional)
 * @body    { message: string, sessionId?: string, system?: string[], userId?: string }
 */
router.post(
  '/chat/stream',
  optionalSSOToken,
  handler.chatStream
);

/**
 * @route   POST /api/mosa/ai-assistant/speech-to-text
 * @desc    Speech-to-text: ubah audio dari URL menjadi teks
 * @access  Protected (SSO token optional)
 * @body    {
 *            audio_url: string,            // wajib, link file audio (mp3/m4a/wav/webm/ogg/flac/mp4)
 *            language?: string,            // ISO-639-1 (id/en/zh), auto-detect jika kosong
 *            analyze?: boolean,            // default false (transkrip saja); true = tambah analisis AI
 *            instruction?: string,         // pertanyaan/instruksi analisis tambahan
 *            output_language?: string,     // bahasa output; diterjemahkan jika beda dari bahasa terdeteksi
 *            include_segments?: boolean    // sertakan segmen bertimestamp
 *          }
 */
router.post(
  '/speech-to-text',
  optionalSSOToken,
  handler.speechToText
);

/**
 * @route   GET /api/mosa/ai-assistant/speech-to-text/history
 * @desc    Riwayat speech-to-text milik user
 * @query   page?, limit? (maks 100)
 */
router.get(
  '/speech-to-text/history',
  optionalSSOToken,
  handler.listTranscriptions
);

/**
 * @route   GET /api/mosa/ai-assistant/speech-to-text/:id
 * @desc    Detail satu hasil speech-to-text
 */
router.get(
  '/speech-to-text/:id',
  optionalSSOToken,
  handler.getTranscription
);

/**
 * Memory routes — admin CRUD untuk user memories
 * /api/mosa/ai-assistant/memory
 */
if (memoryRoutes) {
  router.use('/memory', memoryRoutes);
  console.log('Memory routes registered');
}

module.exports = router;
