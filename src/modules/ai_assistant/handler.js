const { baseResponseGeneral } = require('../../utils/exception');
const {
  processChat,
  clearConversation,
  getSystemPrompt,
  convertToOpenAIMessages,
  summarizeConversation,
  rawStreamChatCompletion,
} = require('./service');
const { getConversation, saveConversation } = require('../../utils/redis');
const conversationRepo = require('./ai_conversations_repository');
const { getToolsForLangChain, executeTool } = require('./tools');
const aiConfig = require('../../config/ai');
const { Logger } = require('../../utils/logger');
const logger = Logger;

// Memory Service — async extraction setelah chat response
let memoryService = null;
try {
  memoryService = require('./memory/memoryService');
} catch (err) {
  // Memory module belum tersedia — skip
}

/**
 * Helper: extract userId dari req.user (dari SSO middleware)
 * Returns null jika tidak ada token/user yang valid
 */
const getUserId = (req) => {
  if (!req.user) return null;
  return req.user.sub || req.user.userId || req.user.id || req.user.employee_id || req.user.username || null;
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

    // 🔥 Auto-provision profile memories dari token (hanya sekali per user)
    if (memoryService && req.user && userId) {
      await memoryService.provisionUserProfile(req.user, userId);
    }

    // Process chat
    const result = await processChat(
      message.trim(),
      userId,
      finalSessionId,
      authToken,
      system // Pass system modules access list (undefined if not provided)
    );

    // Kirim response ke user duluan
    baseResponseGeneral(res, {
      success: true,
      message: 'Chat berhasil diproses',
      data: {
        message: result.message,
        sessionId: finalSessionId,
        conversationHistory: result.conversationHistory,
      },
    });

    // 🔥 Async memory extraction — fire & forget, tidak nge-block response user
    if (memoryService && userId) {
      memoryService.runExtraction(message.trim(), userId)
        .then(saved => {
          if (saved.length > 0) {
            logger.info(`[Memory] ✅ ${saved.length} memories saved for user ${userId}`);
          } else {
            logger.info(`[Memory] ⏭️  Nothing to save for user ${userId}`);
          }
        })
        .catch(err => {
          logger.warn(`[Memory] Async extraction error: ${err.message}`);
        });
    }

    return;
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

    if (!userId) {
      return baseResponseGeneral(res, {
        success: false,
        message: 'User tidak terautentikasi — token tidak valid atau tidak ada',
      });
    }

    let conversations = await conversationRepo.getConversationsByUserId(userId);

    // Extract first message content from each conversation for sidebar preview
    conversations = conversations.map((conv) => {
      const item = { ...conv };
      
      // Parse messages to get first user message
      if (item.messages) {
        try {
          const messages = typeof item.messages === 'string'
            ? JSON.parse(item.messages)
            : item.messages;
          
          // Find first user message
          const firstUserMsg = Array.isArray(messages)
            ? messages.find((m) => m.role === 'user')
            : null;
          
          item.first_message = firstUserMsg
            ? firstUserMsg.content.substring(0, 100)
            : '';
        } catch {
          item.first_message = '';
        }
        delete item.messages; // Remove raw messages from response
      } else {
        item.first_message = '';
      }
      
      return item;
    });

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
 * Extract tool calls from model response
 * (masih digunakan oleh processChat di service.js via LangChain path)
 */
const extractToolCalls = (message) => {
  if (!message) return [];

  const rawToolCalls = [];

  if (Array.isArray(message.tool_calls)) {
    rawToolCalls.push(...message.tool_calls);
  }

  if (Array.isArray(message.additional_kwargs?.tool_calls)) {
    rawToolCalls.push(...message.additional_kwargs.tool_calls);
  }

  if (message.tool_call) {
    rawToolCalls.push(message.tool_call);
  }

  if (message.additional_kwargs?.function_call) {
    rawToolCalls.push(message.additional_kwargs.function_call);
  }

  if (message.function_call) {
    rawToolCalls.push(message.function_call);
  }

  return rawToolCalls
    .map((call, index) => normalizeToolCall(call, index))
    .filter((call) => call && call.name);
};

const normalizeToolCall = (toolCall, index = 0) => {
  if (!toolCall) return null;

  const generatedId = `tool_call_${Date.now()}_${index}`;

  if (toolCall.id || toolCall.tool_call_id) {
    return {
      id: toolCall.id || toolCall.tool_call_id,
      name:
        toolCall.name
        || toolCall.function?.name
        || toolCall.additional_kwargs?.function_call?.name,
      args: parseToolArguments(
        toolCall.args
        || toolCall.function?.arguments
        || toolCall.additional_kwargs?.function_call?.arguments
        || toolCall.arguments
      ),
    };
  }

  return {
    id: generatedId,
    name:
      toolCall.name
      || toolCall.function?.name
      || toolCall.additional_kwargs?.function_call?.name,
    args: parseToolArguments(
      toolCall.args
      || toolCall.function?.arguments
      || toolCall.additional_kwargs?.function_call?.arguments
      || toolCall.arguments
    ),
  };
};

const parseToolArguments = (args) => {
  if (!args) return {};

  if (typeof args === 'object') {
    return args;
  }

  try {
    return JSON.parse(args);
  } catch (error) {
    logger.warn(`Failed to parse tool arguments: ${error.message || error}`);
    return {};
  }
};

const getMessageContent = (message) => {
  if (!message) return '';

  const { content } = message;

  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') return part;
        if (typeof part?.text === 'string') return part.text;
        if (typeof part?.content === 'string') return part.content;
        if (Array.isArray(part?.content)) {
          return part.content
            .map((nested) => (typeof nested === 'string' ? nested : nested?.text || ''))
            .filter(Boolean)
            .join('\n');
        }
        return '';
      })
      .filter(Boolean)
      .join('\n')
      .trim();
  }

  if (content && typeof content === 'object' && typeof content.text === 'string') {
    return content.text;
  }

  return '';
};

/**
 * Streaming chat endpoint using SSE (Server-Sent Events)
 * Menggunakan raw OpenAI API call (bukan LangChain) untuk menghindari
 * bug serialisasi tool di @langchain/openai v0.0.20.
 *
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
  // Client disconnect handler
  // =========================================
  let isClientConnected = true;
  req.on('close', () => {
    isClientConnected = false;
    logger.info(`[Stream] Client disconnected - ${sessionId || 'new session'}`);
  });

  const finalSessionId = sessionId || `session_${userId}_${Date.now()}`;

  try {
    // 🔥 Auto-provision profile memories dari token (hanya sekali per user)
    if (memoryService && req.user && userId) {
      try {
        await memoryService.provisionUserProfile(req.user, userId);
      } catch (err) {
        logger.debug(`[Memory] Stream auto-provision skipped: ${err.message}`);
      }
    }

    let systemPrompt = await getSystemPrompt();

    // 🔥 Inject user memories ke prompt (jika ada)
    try {
      const memoryService = require('./memory/memoryService');
      const memories = await memoryService.getRelevantMemories(userId);
      if (memories && memories.length > 0) {
        const memoryText = memoryService.formatMemoriesForPrompt(memories);
        systemPrompt += memoryText;
        logger.info(`[Memory] Stream: Injected ${memories.length} memories into prompt`);
      }
    } catch (err) {
      logger.debug(`[Memory] Stream injection skipped: ${err.message}`);
    }

    // Build access control if provided
    if (Array.isArray(system)) {
      systemPrompt += `\n\n📋 **ACCESS CONTROL**\nThe user has access to these modules: [${system.join(', ')}].\n✅ You MAY fetch data and use tools from these modules.\n❌ You MUST NOT access data or use tools from any module NOT in this list.\n\nWhen the user asks about something, check if their request falls under one of their allowed modules. If YES → proceed normally and use the available tools. If NO (the request is clearly about a module NOT in their list) → politely refuse.\n\nExample of refusal (only use this if the user explicitly asks about a restricted module):\n"Mohon maaf, Anda tidak memiliki hak akses untuk module tersebut."`;
    }

    // Load conversation history
    let conversationHistory = [];
    try {
      conversationHistory = await getConversation(userId, finalSessionId) || [];
    } catch { conversationHistory = []; }

    // Summarize if needed
    let summaryText = '';
    const maxHistory = (aiConfig.AI_MAX_CONVERSATION_HISTORY || 10) * 2;
    if (conversationHistory.length > maxHistory) {
      const oldMessages = conversationHistory.slice(0, -6);
      conversationHistory = conversationHistory.slice(-6);
      summaryText = summarizeConversation(oldMessages);
    }

    // Get tools definitions (if function calling enabled)
    const tools = aiConfig.AI_ENABLE_FUNCTION_CALLING
      ? getToolsForLangChain(system)
      : [];

    // =========================================
    // Streaming loop dengan tool calling support
    // Menggunakan raw API call (bukan LangChain)
    // =========================================
    let fullResponse = '';
    let toolIterations = 0;
    const MAX_TOOL_ITERATIONS = 10;

    // Build initial messages as plain OpenAI-format array
    const openaiMessages = convertToOpenAIMessages(conversationHistory, systemPrompt, summaryText);
    openaiMessages.push({ role: 'user', content: message });

    do {
      // Safety: prevent infinite tool loops
      if (toolIterations >= MAX_TOOL_ITERATIONS) {
        logger.warn(`[Stream] Tool iteration limit reached (${MAX_TOOL_ITERATIONS}) for session ${finalSessionId}`);
        break;
      }
      toolIterations++;

      if (!isClientConnected) break;

      // Stream via raw API call (no LangChain)
      let iterationResponse = '';
      let toolCalls = [];

      try {
        const stream = rawStreamChatCompletion(openaiMessages, tools);

        for await (const chunk of stream) {
          if (!isClientConnected) break;

          if (chunk.type === 'text') {
            iterationResponse += chunk.content;
            res.write(`0:${JSON.stringify(chunk.content)}\n\n`);
          } else if (chunk.type === 'tool_calls') {
            toolCalls = chunk.toolCalls;
          }
        }
      } catch (streamError) {
        logger.error(`[Stream] Failed to start stream: ${streamError.message}`);
        res.write(`3:${JSON.stringify({ error: streamError.message, sessionId: finalSessionId })}\n\n`);
        return res.end();
      }

      if (!isClientConnected) break;

      fullResponse += iterationResponse;

      if (toolCalls.length === 0) {
        // No tool calls — add assistant message and finish
        openaiMessages.push({
          role: 'assistant',
          content: iterationResponse || '',
        });
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

      // Add assistant message with tool calls
      openaiMessages.push({
        role: 'assistant',
        content: iterationResponse || null,
        tool_calls: toolCalls.map(tc => ({
          id: tc.id,
          type: 'function',
          function: {
            name: tc.name,
            arguments: JSON.stringify(tc.args || {}),
          },
        })),
      });

      // Execute tool calls
      for (const toolCall of toolCalls) {
        if (!isClientConnected) break;

        try {
          logger.info(`[Stream] Executing tool: ${toolCall.name}`, toolCall.args);
          const result = await executeTool(toolCall.name, toolCall.args || {}, authToken, null, userId);

          openaiMessages.push({
            role: 'tool',
            content: JSON.stringify(result, null, 2),
            tool_call_id: toolCall.id,
          });
        } catch (toolError) {
          logger.error(`[Stream] Tool ${toolCall.name} error: ${toolError.message}`);
          openaiMessages.push({
            role: 'tool',
            content: JSON.stringify({ success: false, message: `Error: ${toolError.message}` }),
            tool_call_id: toolCall.id,
          });
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
    // Save conversation — only ONCE
    // =========================================
    const historyCopy = [
      ...conversationHistory,
      { role: 'user', content: message, timestamp: new Date().toISOString() },
      { role: 'assistant', content: fullResponse, timestamp: new Date().toISOString() },
    ];

    try {
      await saveConversation(userId, finalSessionId, historyCopy);
      logger.info(`[Stream] Conversation saved: ${finalSessionId} (${historyCopy.length} messages)`);
    } catch (saveError) {
      logger.warn(`[Stream] Failed to save conversation ${finalSessionId}: ${saveError.message}`);
    }

    // 🔥 Async memory extraction — fire & forget setelah stream selesai
    if (memoryService && userId) {
      memoryService.runExtraction(message.trim(), userId)
        .then(saved => {
          if (saved.length > 0) {
            logger.info(`[Memory] ✅ Stream: ${saved.length} memories saved for user ${userId}`);
          } else {
            logger.info(`[Memory] ⏭️  Stream: nothing to save for user ${userId}`);
          }
        })
        .catch(err => {
          logger.warn(`[Memory] Stream extraction error: ${err.message}`);
        });
    }

  } catch (error) {
    if (!isClientConnected) {
      logger.info(`[Stream] Session ${finalSessionId}: aborted — client disconnected`);
      return;
    }

    logger.error(`[Stream] Error for session ${finalSessionId}: ${error.message}`);

    logger.error('Stream error: ' + error.message);
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
  extractToolCalls,
};
