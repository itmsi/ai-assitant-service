const { baseResponseGeneral } = require('../../utils/exception');
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
      return baseResponseGeneral(res, {
        success: false,
        message: 'Pesan tidak boleh kosong',
      });
    }

    // Get user info from JWT token
    let userId = 'anonymous';
    let authToken = null;
    let isAuthenticated = false;

    if (req.headers.authorization) {
      try {
        const token = req.headers.authorization.split(' ')[1];
        const decoded = jwtDecode(token);
        userId = decoded.sub || decoded.userId || decoded.id || 'anonymous';
        authToken = token;
        isAuthenticated = userId !== 'anonymous';
      } catch (error) {
        logger.warn('Invalid JWT token, using anonymous user');
      }
    }

    // Generate session ID if not provided
    let finalSessionId = sessionId;

    if (!finalSessionId) {
      if (isAuthenticated) {
        finalSessionId = `session_${userId}`;
      } else {
        finalSessionId = `session_guest_${Date.now()}`;
      }
    }

    // Process chat
    const result = await processChat(
      message.trim(),
      userId,
      finalSessionId,
      authToken
    );

    return baseResponseGeneral(res, {
      success: true,
      message: 'Chat berhasil diproses',
      data: {
        message: result.message,
        sessionId: finalSessionId,
        conversationHistory: result.conversationHistory,
      },
    });
  } catch (error) {
    logger.error(`Error in chat handler: ${error.message || error}`);
    return baseResponseGeneral(res.status(500), {
      success: false,
      message: error.message || 'Terjadi kesalahan saat memproses chat',
    });
  }
};

/**
 * Get conversation history
 */
const getHistory = async (req, res) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      return baseResponseGeneral(res, {
        success: false,
        message: 'Session ID tidak boleh kosong',
      });
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

    return baseResponseGeneral(res, {
      success: true,
      message: 'Riwayat percakapan berhasil diambil',
      data: {
        sessionId,
        conversationHistory: history || [],
      },
    });
  } catch (error) {
    logger.error(`Error in getHistory handler: ${error.message || error}`);
    return baseResponseGeneral(res.status(500), {
      success: false,
      message: error.message || 'Terjadi kesalahan saat mengambil riwayat',
    });
  }
};

/**
 * Clear conversation history
 */
const clearHistory = async (req, res) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      return baseResponseGeneral(res, {
        success: false,
        message: 'Session ID tidak boleh kosong',
      });
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

    return baseResponseGeneral(res, {
      success: true,
      message: 'Riwayat percakapan berhasil dihapus',
      data: { sessionId },
    });
  } catch (error) {
    logger.error(`Error in clearHistory handler: ${error.message || error}`);
    return baseResponseGeneral(res.status(500), {
      success: false,
      message: error.message || 'Terjadi kesalahan saat menghapus riwayat',
    });
  }
};

module.exports = {
  chat,
  getHistory,
  clearHistory,
};
