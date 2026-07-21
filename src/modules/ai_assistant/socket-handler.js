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
const logger = Logger;

/**
 * Register Socket.IO event handlers
 * @param {import('socket.io').Server} io - Socket.IO server instance
 */
const registerSocketHandlers = (io) => {
  io.on('connection', (socket) => {
    logger.info(`[Socket] Client connected: ${socket.id}`);

    // isClientConnected di scope connection — shared semua chat:send dari socket ini
    let isClientConnected = true;

    socket.on('disconnect', () => {
      isClientConnected = false;
      logger.info(`[Socket] Client disconnected: ${socket.id}`);
    });

    socket.on('chat:send', async (payload) => {
      const { message, sessionId, system, userId: payloadUserId, token } = payload || {};

      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        socket.emit('chat:error', { message: 'Pesan tidak boleh kosong' });
        return;
      }

      const userId = payloadUserId || 'anonymous';
      const authToken = token || null;
      let finalSessionId = sessionId || `session_${userId}_${Date.now()}`;

      try {
        let systemPrompt = await getSystemPrompt();

        // Build access control if provided
        if (Array.isArray(system)) {
          systemPrompt += `\n\n*** STRICT ACCESS CONTROL ***\nUser Rights: The user ONLY has access to the following modules: [${system.join(', ')}].\nYou are PROHIBITED from providing any data, information, or assistance related to modules NOT in this list.\n\nCRITICAL RULE: If the user's message mentions a restricted module (e.g., asking about \"CRM\", \"HR\", \"Employee\" when these are not in the list), you must REFUSE IMPLICITLY AND IMMEDIATELY, even if you think you have tools that could answer part of the question. The presence of the restricted word in the context of a data request is grounds for refusal.\n\nRefusal Response:\n\"Mohon maaf, Anda tidak memiliki hak akses untuk module tersebut.\"\n\nDo not explain why. Do not try to bypass this by using similar tools from other modules. STOP and return the refusal response.`;
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
