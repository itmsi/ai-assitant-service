const { baseResponseGeneral } = require('../../utils/exception');
const { processChat, clearConversation } = require('./service');
const { getConversation } = require('../../utils/redis');
const conversationRepo = require('./ai_conversations_repository');
const { Logger } = require('../../utils/logger');
const logger = Logger;

/**
 * Helper: extract userId dari req.user (dari SSO middleware)
 */
const getUserId = (req) => {
  if (!req.user) return 'anonymous';
  return req.user.sub || req.user.userId || req.user.id || req.user.employee_id || req.user.username || 'anonymous';
};

/**
 * Chat endpoint - menerima pesan dari user dan mengembalikan response dari AI
 */
const chat = async (req, res) => {
  try {
    const { message, sessionId, system } = req.body;
    const employee_id = req.body.employee_id || getUserId(req);

    // Validation
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return baseResponseGeneral(res, {
        success: false,
        message: 'Pesan tidak boleh kosong',
      });
    }

    // User info dari SSO middleware (req.user di-set oleh requireSSOToken/optionalSSOToken)
    const userId = employee_id || getUserId(req);
    const authToken = req.authToken || null;
    const isAuthenticated = req.isAuthenticated || false;

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
      authToken,
      system // Pass system modules access list (undefined if not provided)
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

    const userId = getUserId(req);

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

    const userId = getUserId(req);

    // Clear conversation from Redis (if enabled)
    await clearConversation(userId, sessionId);

    // Also clear from database
    const conversationRepo = require('./ai_conversations_repository');
    await conversationRepo.deleteConversation(sessionId);

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

/**
 * List all conversation sessions by logged-in user
 * POST method with optional user_id override in body
 */
const listByUser = async (req, res) => {
  try {
    const userId = req.body?.user_id || getUserId(req);

    if (!userId || userId === 'anonymous') {
      return baseResponseGeneral(res, {
        success: false,
        message: 'User ID tidak ditemukan. Pastikan sudah login SSO atau kirim user_id di body.',
      });
    }

    const conversations = await conversationRepo.getConversationsByUserId(userId);

    return baseResponseGeneral(res, {
      success: true,
      message: 'Daftar riwayat percakapan berhasil diambil',
      data: {
        userId,
        total: conversations.length,
        conversations,
      },
    });
  } catch (error) {
    logger.error(`Error in listByUser handler: ${error.message || error}`);
    return baseResponseGeneral(res.status(500), {
      success: false,
      message: error.message || 'Terjadi kesalahan saat mengambil daftar riwayat',
    });
  }
};

module.exports = {
  chat,
  getHistory,
  clearHistory,
  listByUser,
};
