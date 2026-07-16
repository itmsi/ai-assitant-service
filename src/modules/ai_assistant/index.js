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

module.exports = router;
