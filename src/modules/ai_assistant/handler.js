const { baseResponse, errorResponse } = require('../../utils/response');
const { processChat, clearConversation } = require('./service');
const { getConversation } = require('../../utils/redis');
const { Logger } = require('../../utils/logger');
const logger = Logger;
const jwtDecode = require('jwt-decode');

/**
 * Chat endpoint - menerima pesan dari user dan mengembalikan response dari AI
 */
const chat = async (req, res) => {
  try {
    const { message, sessionId } = req.body;

    // Validation
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return errorResponse(res, { message: 'Pesan tidak boleh kosong' }, 400);
    }

    // Get user info from JWT token
    let userId = 'anonymous';
    let authToken = null;

    if (req.headers.authorization) {
      try {
        const token = req.headers.authorization.split(' ')[1];
        const decoded = jwtDecode(token);
        userId = decoded.sub || decoded.userId || decoded.id || 'anonymous';
        authToken = token;
      } catch (error) {
        logger.warn('Invalid JWT token, using anonymous user');
      }
    }

    // Generate session ID if not provided
    const finalSessionId = sessionId || `session_${userId}_${Date.now()}`;

    // Process chat
    const result = await processChat(
      message.trim(),
      userId,
      finalSessionId,
      authToken
    );

    return baseResponse(res, {
      data: {
        message: result.message,
        sessionId: finalSessionId,
        conversationHistory: result.conversationHistory,
      },
      message: 'Chat berhasil diproses',
    });
  } catch (error) {
    logger.error(`Error in chat handler: ${error.message || error}`);
    return errorResponse(res, {
      message: error.message || 'Terjadi kesalahan saat memproses chat',
    }, 500);
  }
};

/**
 * Get conversation history
 */
const getHistory = async (req, res) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      return errorResponse(res, { message: 'Session ID tidak boleh kosong' }, 400);
    }

    // Get user info from JWT token
    let userId = 'anonymous';
    if (req.headers.authorization) {
      try {
        const token = req.headers.authorization.split(' ')[1];
        const decoded = jwtDecode(token);
        userId = decoded.sub || decoded.userId || decoded.id || 'anonymous';
      } catch (error) {
        logger.warn('Invalid JWT token, using anonymous user');
      }
    }

    // Get conversation history
    const history = await getConversation(userId, sessionId);

    return baseResponse(res, {
      data: {
        sessionId,
        conversationHistory: history || [],
      },
      message: 'Riwayat percakapan berhasil diambil',
    });
  } catch (error) {
    logger.error(`Error in getHistory handler: ${error.message || error}`);
    return errorResponse(res, {
      message: error.message || 'Terjadi kesalahan saat mengambil riwayat',
    }, 500);
  }
};

/**
 * Clear conversation history
 */
const clearHistory = async (req, res) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      return errorResponse(res, { message: 'Session ID tidak boleh kosong' }, 400);
    }

    // Get user info from JWT token
    let userId = 'anonymous';
    if (req.headers.authorization) {
      try {
        const token = req.headers.authorization.split(' ')[1];
        const decoded = jwtDecode(token);
        userId = decoded.sub || decoded.userId || decoded.id || 'anonymous';
      } catch (error) {
        logger.warn('Invalid JWT token, using anonymous user');
      }
    }

    // Clear conversation
    await clearConversation(userId, sessionId);

    return baseResponse(res, {
      data: { sessionId },
      message: 'Riwayat percakapan berhasil dihapus',
    });
  } catch (error) {
    logger.error(`Error in clearHistory handler: ${error.message || error}`);
    return errorResponse(res, {
      message: error.message || 'Terjadi kesalahan saat menghapus riwayat',
    }, 500);
  }
};

module.exports = {
  chat,
  getHistory,
  clearHistory,
};
