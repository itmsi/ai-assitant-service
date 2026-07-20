const { baseResponseGeneral } = require('../../utils/exception');
const {
  processChat,
  clearConversation,
  initializeModel,
  getSystemPrompt,
  convertToLangChainMessages,
  summarizeConversation,
  extractToolCalls,
} = require('./service');
const { getConversation, saveConversation } = require('../../utils/redis');
const conversationRepo = require('./ai_conversations_repository');
const { HumanMessage, AIMessage, SystemMessage, ToolMessage } = require('@langchain/core/messages');
const { getToolsForLangChain, executeTool } = require('./tools');
const aiConfig = require('../../config/ai');
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
 * Mendukung:
 * - Streaming token-by-token via SSE
 * - Function calling / tool execution (dengan looping sampai selesai)
 * - Client disconnect handling (mencegah token wastage)
 * - Conversation history dengan summarization
 * - Access control per module
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

  // =========================================
  // Client disconnect handler (P1 Fix)
  // =========================================
  let isClientConnected = true;
  req.on('close', () => {
    isClientConnected = false;
    logger.info(`[Stream] Client disconnected - ${sessionId || 'new session'}`);
  });

  const finalSessionId = sessionId || `session_${userId}_${Date.now()}`;

  try {
    const model = initializeModel();
    let systemPrompt = await getSystemPrompt();

    // Build access control if provided
    if (Array.isArray(system)) {
      systemPrompt += `\n\n*** STRICT ACCESS CONTROL ***\nUser Rights: The user ONLY has access to the following modules: [${system.join(', ')}].\nYou are PROHIBITED from providing any data, information, or assistance related to modules NOT in this list.\n\nCRITICAL RULE: If the user's message mentions a restricted module (e.g., asking about "CRM", "HR", "Employee" when these are not in the list), you must REFUSE IMPLICITLY AND IMMEDIATELY, even if you think you have tools that could answer part of the question. The presence of the restricted word in the context of a data request is grounds for refusal.\n\nRefusal Response:\n"Mohon maaf, Anda tidak memiliki hak akses untuk module tersebut."\n\nDo not explain why. Do not try to bypass this by using similar tools from other modules. STOP and return the refusal response.`;
    }

    // Load conversation history
    let conversationHistory = [];
    try {
      conversationHistory = await getConversation(userId, sessionId) || [];
    } catch { conversationHistory = []; }

    // Summarize if needed — threshold konsisten dengan non-streaming (config-based)
    let summaryText = '';
    const maxHistory = (aiConfig.AI_MAX_CONVERSATION_HISTORY || 10) * 2;
    if (conversationHistory.length > maxHistory) {
      const oldMessages = conversationHistory.slice(0, -6);
      conversationHistory = conversationHistory.slice(-6);
      summaryText = summarizeConversation(oldMessages);
    }

    // Build messages
    const messages = convertToLangChainMessages(conversationHistory, systemPrompt, summaryText);
    messages.push(new HumanMessage(message));

    // =========================================
    // Prepare model with tools (P1 Fix: tool calling support)
    // =========================================
    let modelToUse = model;
    if (aiConfig.AI_ENABLE_FUNCTION_CALLING) {
      const tools = getToolsForLangChain(system);
      try {
        modelToUse = model.bind({ tools });
      } catch (bindError) {
        logger.warn(`[Stream] Failed to bind tools: ${bindError.message}`);
      }
    }

    // =========================================
    // Streaming loop dengan tool calling support
    // =========================================
    let fullResponse = '';
    let toolIterations = 0;
    const MAX_TOOL_ITERATIONS = 10;

    do {
      // Safety: prevent infinite tool loops
      if (toolIterations >= MAX_TOOL_ITERATIONS) {
        logger.warn(`[Stream] Tool iteration limit reached (${MAX_TOOL_ITERATIONS}) for session ${finalSessionId}`);
        break;
      }
      toolIterations++;

      if (!isClientConnected) break;

      // Stream model response
      let stream;
      try {
        stream = await modelToUse.stream(messages);
      } catch (streamError) {
        logger.error(`[Stream] Failed to start stream: ${streamError.message}`);
        if (!res.headersSent) throw streamError;
        res.write(`3:${JSON.stringify({ error: streamError.message, sessionId: finalSessionId })}\n\n`);
        return res.end();
      }

      const streamChunks = [];
      let iterationResponse = '';

      for await (const chunk of stream) {
        if (!isClientConnected) break;

        streamChunks.push(chunk);

        // Stream text content immediately
        const text = typeof chunk.content === 'string' ? chunk.content : '';
        if (text) {
          iterationResponse += text;
          res.write(`0:${JSON.stringify(text)}\n\n`);
        }
      }

      if (!isClientConnected) break;

      fullResponse += iterationResponse;

      // If no chunks at all, stop
      if (streamChunks.length === 0) break;

      // Merge all chunks to check for tool calls
      const mergedMessage = streamChunks.reduce((acc, chunk) => acc.concat(chunk));

      // Extract tool calls from merged message (P1 Fix: tool calling)
      let toolCalls = extractToolCalls(mergedMessage);

      // Fallback: check tool_call_chunks directly jika extractToolCalls tidak menemukan
      if (toolCalls.length === 0 && mergedMessage.tool_call_chunks?.length > 0) {
        toolCalls = mergedMessage.tool_call_chunks
          .filter((tc) => tc.name)
          .map((tc) => {
            let args = {};
            try {
              args = tc.args ? JSON.parse(tc.args) : {};
            } catch { /* args partial — parse gagal */ }
            return {
              id: tc.id || `tc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
              name: tc.name,
              args,
            };
          });
      }

      if (toolCalls.length === 0) {
        // No tool calls — streaming selesai untuk iterasi ini
        messages.push(mergedMessage);
        break;
      }

      // Tool calls detected — notify client
      logger.info(`[Stream] Tool calls detected: ${toolCalls.map((t) => t.name).join(', ')} (iteration ${toolIterations})`);
      res.write(`2:${JSON.stringify({
        toolCalls: toolCalls.map((t) => ({ name: t.name, id: t.id })),
        count: toolCalls.length,
        iteration: toolIterations,
        sessionId: finalSessionId,
      })}\n\n`);

      // Add assistant message with tool calls ke conversation
      messages.push(mergedMessage);

      // Execute tool calls
      for (const toolCall of toolCalls) {
        if (!isClientConnected) break;

        try {
          logger.info(`[Stream] Executing tool: ${toolCall.name}`, toolCall.args);
          const result = await executeTool(toolCall.name, toolCall.args || {}, authToken);

          messages.push(new ToolMessage({
            content: JSON.stringify(result, null, 2),
            tool_call_id: toolCall.id,
          }));
        } catch (toolError) {
          logger.error(`[Stream] Tool ${toolCall.name} error: ${toolError.message}`);
          messages.push(new ToolMessage({
            content: JSON.stringify({ success: false, message: `Error: ${toolError.message}` }),
            tool_call_id: toolCall.id,
          }));
        }
      }

      // Loop: stream lagi dengan hasil tool execution
    } while (isClientConnected);

    // Client disconnected — akhiri tanpa save
    if (!isClientConnected) {
      try { res.end(); } catch { /* ignore */ }
      logger.info(`[Stream] Session ${finalSessionId}: ended due to client disconnect`);
      return;
    }

    // =========================================
    // Done signal
    // =========================================
    res.write(`d:${JSON.stringify({ finishReason: 'stop', usage: {}, sessionId: finalSessionId })}\n\n`);
    res.end();

    // =========================================
    // Save conversation — only ONCE (P1 Fix: double save)
    // =========================================
    const historyCopy = [
      ...conversationHistory,
      { role: 'user', content: message, timestamp: new Date().toISOString() },
      { role: 'assistant', content: fullResponse, timestamp: new Date().toISOString() },
    ];

    try {
      await saveConversation(userId, finalSessionId, historyCopy);
      // saveConversation dari redis.js sudah mendelegasikan ke conversationRepo.saveConversation()
      // Tidak perlu panggil repo.saveConversation() lagi — sudah otomatis
      logger.info(`[Stream] Conversation saved: ${finalSessionId} (${historyCopy.length} messages)`);
    } catch (saveError) {
      // Log error instead of silent catch (P1 Fix: hidden errors)
      logger.warn(`[Stream] Failed to save conversation ${finalSessionId}: ${saveError.message}`);
    }

  } catch (error) {
    if (!isClientConnected) {
      logger.info(`[Stream] Session ${finalSessionId}: aborted — client disconnected`);
      return;
    }

    logger.error(`[Stream] Error for session ${finalSessionId}: ${error.message}`);

    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: error.message }));
    } else {
      try {
        res.write(`3:${JSON.stringify({ error: error.message, sessionId: finalSessionId })}\n\n`);
        res.end();
      } catch { /* ignore write errors after stream end */ }
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
