const express = require('express');
const router = express.Router();
const handler = require('./handler');

console.log('AI Assistant routes initialized');
// Optional: Add token verification if needed
// const { verifyToken } = require('../../middlewares');

/**
 * @route   POST /api/ai-assistant/chat
 * @desc    Send message to AI Assistant
 * @access  Public (add verifyToken middleware for protected)
 * @body    { message: string, sessionId?: string }
 */
router.post(
  '/chat',
  handler.chat
);

/**
 * @route   GET /api/ai-assistant/history/:sessionId
 * @desc    Get conversation history by session ID
 * @access  Public (add verifyToken middleware for protected)
 */
router.get(
  '/history/:sessionId',
  handler.getHistory
);

/**
 * @route   DELETE /api/ai-assistant/history/:sessionId
 * @desc    Clear conversation history by session ID
 * @access  Public (add verifyToken middleware for protected)
 */
router.delete(
  '/history/:sessionId',
  handler.clearHistory
);

module.exports = router;
