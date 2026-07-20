const express = require('express');
const router = express.Router();
const handler = require('./handler');
const { optionalSSOToken } = require('./middleware/sso');

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

module.exports = router;
