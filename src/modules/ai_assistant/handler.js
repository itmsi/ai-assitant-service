const { baseResponseGeneral } = require('../../utils/exception');
const { processChat, clearConversation, initializeModel, getSystemPrompt } = require('./service');
const { getConversation, saveConversation } = require('../../utils/redis');
const { convertToLangChainMessages } = require('./service');
const conversationRepo = require('./ai_conversations_repository');
const { HumanMessage, AIMessage, SystemMessage } = require('@langchain/core/messages');
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
    const employee_id = req.body.employee_id || req.body.userId || getUserId(req);

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
      // Always create unique session per chat (timestamp-based) so 1 user can have many sessions
      finalSessionId = `session_${userId}_${Date.now()}`;
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
        success: true,
        message: 'User tidak terautentikasi, tidak ada riwayat',
        data: { userId: 'anonymous', total: 0, conversations: [] },
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

/**
 * Streaming chat endpoint using SSE (Server-Sent Events)
 */
const chatStream = async (req, res) => {
  const { message, sessionId, system } = req.body;
  const userId = req.body.employee_id || req.body.userId || getUserId(req);
  const authToken = req.authToken || null;

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ success: false, message: 'Pesan tidak boleh kosong' }));
  }

  // SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  try {
    const model = initializeModel();
    let systemPrompt = await getSystemPrompt();

    // Build access control if provided
    if (Array.isArray(system)) {
      systemPrompt += `\n\n*** STRICT ACCESS CONTROL ***\nUser Rights: The user ONLY has access to the following modules: [${system.join(', ')}].\n...`;
    }

    // Load conversation history
    let conversationHistory = [];
    try {
      conversationHistory = await getConversation(userId, sessionId || 'stream') || [];
    } catch { conversationHistory = []; }

    // Summarize if needed
    let summaryText = '';
    const maxHistory = 20;
    if (conversationHistory.length > maxHistory) {
      const { summarizeConversation } = require('./service');
      const oldMessages = conversationHistory.slice(0, -6);
      conversationHistory = conversationHistory.slice(-6);
      summaryText = summarizeConversation(oldMessages);
    }

    // Build messages
    const messages = convertToLangChainMessages(conversationHistory, systemPrompt, summaryText);
    messages.push(new HumanMessage(message));

    // Stream model response
    let fullResponse = '';
    const stream = await model.stream(messages);

    for await (const chunk of stream) {
      const text = typeof chunk.content === 'string' ? chunk.content : '';
      if (text) {
        fullResponse += text;
        res.write(`0:${JSON.stringify(text)}\n\n`);
      }
    }

    // Done signal
    res.write(`d:${JSON.stringify({ finishReason: 'stop', usage: {} })}\n\n`);
    res.end();

    // Save conversation to DB (fire & forget)
    const finalSessionId = sessionId || `session_${userId}_${Date.now()}`;
    conversationHistory.push({ role: 'user', content: message, timestamp: new Date().toISOString() });
    conversationHistory.push({ role: 'assistant', content: fullResponse, timestamp: new Date().toISOString() });

    try {
      await saveConversation(userId, finalSessionId, conversationHistory);
      const repo = require('./ai_conversations_repository');
      await repo.saveConversation(finalSessionId, userId, conversationHistory);
    } catch { /* silent */ }

  } catch (error) {
    logger.error(`Stream error: ${error.message}`);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: error.message }));
    } else {
      res.write(`3:${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    }
  }
};

module.exports = {
  chat,
  getHistory,
  clearHistory,
  listByUser,
  chatStream,
};
