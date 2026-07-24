/**
 * Socket.IO Handler untuk AI Assistant
 * 
 * Menangani event chat:send dari client dan melakukan streaming
 * response menggunakan Socket.IO events.
 * 
 * Menggunakan raw OpenAI API call (fetch) untuk menghindari
 * bug serialisasi tool di @langchain/openai v0.0.20.
 */

const {
  getSystemPrompt,
  convertToOpenAIMessages,
  summarizeConversation,
  rawStreamChatCompletion,
} = require('./service');
const { getConversation, saveConversation } = require('../../utils/redis');
const { getToolsForLangChain, executeTool } = require('./tools');
const aiConfig = require('../../config/ai');
const { Logger } = require('../../utils/logger');
const { verifyTokenWithSSO, decodeJWT } = require('./middleware/sso');
const logger = Logger;

/**
 * Register Socket.IO event handlers
 * @param {import('socket.io').Server} io - Socket.IO server instance
 */
const registerSocketHandlers = (io) => {
  // =============================================
  // Socket.IO Authentication Middleware
  // Verifikasi token saat handshake — sebelum connection diterima
  // =============================================
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;

    if (!token) {
      // Tanpa token tetap boleh connect, tapi jadi anonymous
      socket.data.user = null;
      socket.data.authToken = null;
      socket.data.isAuthenticated = false;
      logger.info(`[Socket] ${socket.id} connecting without token (anonymous)`);
      return next();
    }

    // Coba verifikasi ke SSO server dulu, fallback ke JWT decode
    const ssoResult = await verifyTokenWithSSO(token);

    if (ssoResult === null) {
      // SSO server unreachable — fallback JWT decode
      const jwtResult = decodeJWT(token);
      if (jwtResult.valid) {
        socket.data.user = jwtResult.user;
        socket.data.authToken = token;
        socket.data.isAuthenticated = true;
        socket.data.authMethod = 'jwt-fallback';
        logger.info(`[Socket] ${socket.id} authenticated via JWT fallback: ${jwtResult.user.sub || jwtResult.user.userId || 'unknown'}`);
        return next();
      }
      // JWT juga gagal — reject
      logger.warn(`[Socket] ${socket.id} authentication failed (JWT): ${jwtResult.error}`);
      return next(new Error(`Autentikasi gagal: ${jwtResult.error}`));
    }

    if (!ssoResult.valid) {
      logger.warn(`[Socket] ${socket.id} authentication failed (SSO): ${ssoResult.error}`);
      return next(new Error(`Token SSO tidak valid: ${ssoResult.error}`));
    }

    // Sukses via SSO server
    socket.data.user = ssoResult.user;
    socket.data.authToken = token;
    socket.data.isAuthenticated = true;
    socket.data.authMethod = 'sso-server';
    logger.info(`[Socket] ${socket.id} authenticated via SSO server: ${ssoResult.user.sub || ssoResult.user.userId || ssoResult.user.employee_id || 'unknown'}`);
    next();
  });

  io.on('connection', (socket) => {
    const authStatus = socket.data.isAuthenticated
      ? `authenticated (${socket.data.authMethod})`
      : 'anonymous';
    logger.info(`[Socket] Client connected: ${socket.id} (${authStatus})`);

    // isClientConnected di scope connection — shared semua chat:send dari socket ini
    let isClientConnected = true;

    socket.on('disconnect', () => {
      isClientConnected = false;
      logger.info(`[Socket] Client disconnected: ${socket.id}`);
    });

    socket.on('chat:send', async (payload) => {
      const { message, sessionId, system, userId: payloadUserId } = payload || {};
      // Token dari handshake auth, bukan dari payload message
      const authToken = socket.data.authToken;

      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        socket.emit('chat:error', { message: 'Pesan tidak boleh kosong' });
        return;
      }

      const userId = payloadUserId || socket.data.user?.sub || socket.data.user?.userId || socket.data.user?.employee_id || 'anonymous';
      let finalSessionId = sessionId || `session_${userId}_${Date.now()}`;

      try {
        let systemPrompt = await getSystemPrompt();

        // Build access control if provided
        if (Array.isArray(system)) {
          systemPrompt += `\n\n📋 **ACCESS CONTROL**\nUser memiliki akses ke module-module ini: [${system.join(', ')}].\n✅ Kamu BOLEH mengambil data dan menggunakan tools dari module-module tersebut.\n❌ Kamu TIDAK BOLEH mengakses data atau menggunakan tools dari module di luar daftar.\n\nJika user bertanya tentang sesuatu, cek apakah permintaannya termasuk dalam module yang diizinkan. Jika YA → lanjutkan normal dan gunakan tools yang tersedia. Jika TIDAK (permintaan jelas tentang module di luar daftar) → tolak dengan sopan.`;
        }

        // Load conversation history
        let conversationHistory = [];
        try {
          conversationHistory = await getConversation(userId, sessionId) || [];
        } catch { conversationHistory = []; }

        // Summarize if needed
        let summaryText = '';
        const maxHistory = (aiConfig.AI_MAX_CONVERSATION_HISTORY || 10) * 2;
        if (conversationHistory.length > maxHistory) {
          const oldMessages = conversationHistory.slice(0, -6);
          conversationHistory = conversationHistory.slice(-6);
          summaryText = summarizeConversation(oldMessages);
        }

        // Get tools definitions
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
          if (toolIterations >= MAX_TOOL_ITERATIONS) {
            logger.warn(`[Socket] Tool iteration limit reached (${MAX_TOOL_ITERATIONS}) for session ${finalSessionId}`);
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
                socket.emit('chat:chunk', { text: chunk.content });
              } else if (chunk.type === 'tool_calls') {
                toolCalls = chunk.toolCalls;
              }
            }
          } catch (streamError) {
            logger.error(`[Socket] Failed to start stream: ${streamError.message}`);
            socket.emit('chat:error', { message: streamError.message, sessionId: finalSessionId });
            return;
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

          // Tool calls detected
          logger.info(`[Socket] Tool calls detected: ${toolCalls.map((t) => t.name).join(', ')} (iteration ${toolIterations})`);

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
              logger.info(`[Socket] Executing tool: ${toolCall.name}`, toolCall.args);

              const result = await executeTool(toolCall.name, toolCall.args || {}, authToken);

              openaiMessages.push({
                role: 'tool',
                content: JSON.stringify(result, null, 2),
                tool_call_id: toolCall.id,
              });
            } catch (toolError) {
              logger.error(`[Socket] Tool ${toolCall.name} error: ${toolError.message}`);
              openaiMessages.push({
                role: 'tool',
                content: JSON.stringify({ success: false, message: `Error: ${toolError.message}` }),
                tool_call_id: toolCall.id,
              });
            }
          }
        } while (isClientConnected);

        if (!isClientConnected) {
          logger.info(`[Socket] Session ${finalSessionId}: ended due to client disconnect`);
          return;
        }

        // Done signal
        socket.emit('chat:done', {
          finishReason: 'stop',
          sessionId: finalSessionId,
        });

        // Save conversation (using plain format for history)
        const historyCopy = [
          ...conversationHistory,
          { role: 'user', content: message, timestamp: new Date().toISOString() },
          { role: 'assistant', content: fullResponse, timestamp: new Date().toISOString() },
        ];

        try {
          await saveConversation(userId, finalSessionId, historyCopy);
          logger.info(`[Socket] Conversation saved: ${finalSessionId} (${historyCopy.length} messages)`);
        } catch (saveError) {
          logger.warn(`[Socket] Failed to save conversation ${finalSessionId}: ${saveError.message}`);
        }

      } catch (error) {
        logger.error(`[Socket] Error for session ${finalSessionId}: ${error.message}`);
        socket.emit('chat:error', {
          message: error.message,
          sessionId: finalSessionId,
        });
      }
    });
  });
};

module.exports = { registerSocketHandlers };
