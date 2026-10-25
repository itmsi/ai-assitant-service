const { ChatOpenAI } = require('@langchain/openai');
const { HumanMessage, AIMessage, SystemMessage, ToolMessage } = require('@langchain/core/messages');
const aiConfig = require('../../config/ai');
const { Logger } = require('../../utils/logger');
const logger = Logger;
const { getConversation, saveConversation } = require('../../utils/redis');
const { getToolsForLangChain, executeTool } = require('./tools');
const { getActivePromptByKey } = require('./ai_prompts_repository');
const modelRouter = require('./model_router');

// Cache untuk system prompt (untuk menghindari query berulang)
let systemPromptCache = {
  content: null,
  key: null,
  timestamp: null,
  // Singkat agar perubahan prompt dari UI admin cepat berlaku di semua container
  TTL: parseInt(process.env.AI_CONFIG_CACHE_TTL_MS || '15000', 10),
};

/**
 * Get system prompt from database with fallback
 * @param {string} key - Prompt key (default: 'system_prompt_default')
 * @returns {Promise<string>} System prompt content
 */
const getSystemPrompt = async (key = null) => {
  // Key prompt chat bisa diganti dari UI admin (ai_settings.chat_prompt_key)
  const settings = await modelRouter.getSettings();
  const promptKey = key || settings.chat_prompt_key || aiConfig.AI_SYSTEM_PROMPT_KEY;

  // Check cache first
  if (
    systemPromptCache.content &&
    systemPromptCache.key === promptKey &&
    systemPromptCache.timestamp &&
    Date.now() - systemPromptCache.timestamp < systemPromptCache.TTL
  ) {
    logger.debug('Using cached system prompt');
    return systemPromptCache.content;
  }

  try {
    // Try to get from database
    const prompt = await getActivePromptByKey(promptKey);

    if (prompt && prompt.content) {
      // Update cache
      systemPromptCache = {
        content: prompt.content,
        key: promptKey,
        timestamp: Date.now(),
        TTL: systemPromptCache.TTL,
      };

      logger.info(`System prompt loaded from database (key: ${promptKey}, version: ${prompt.version})`);
      return prompt.content;
    }
  } catch (error) {
    logger.warn(`Failed to load system prompt from database: ${error.message || error}. Using fallback.`);
  }

  // Fallback to config
  const fallbackPrompt = aiConfig.AI_SYSTEM_PROMPT_FALLBACK;
  logger.info('Using fallback system prompt from config');

  // Update cache with fallback
  systemPromptCache = {
    content: fallbackPrompt,
    key: promptKey,
    timestamp: Date.now(),
    TTL: systemPromptCache.TTL,
  };

  return fallbackPrompt;
};

/**
 * Clear system prompt cache (useful for testing or when prompt is updated)
 */
const clearSystemPromptCache = () => {
  systemPromptCache = {
    content: null,
    key: null,
    timestamp: null,
    TTL: systemPromptCache.TTL,
  };
  logger.info('System prompt cache cleared');
};

/**
 * Initialize AI model (provider & model dari database, lihat model_router)
 */
const initializeModel = async () => {
  if (!aiConfig.AI_ENABLED) {
    throw new Error('AI Assistant is not enabled');
  }

  const { model, candidate } = await modelRouter.getLangChainModel('chat');
  if (!candidate.apiKey) {
    throw new Error(`API key provider ${candidate.providerCode} belum dikonfigurasi`);
  }
  logger.debug(`Chat model: ${candidate.providerCode}/${candidate.model}`);

  // Return model without binding tools here
  // We'll handle tools manually during invoke
  return model;
};

/**
 * Summarize older conversation messages into a concise text
 * Extracts key user questions and assistant responses
 */
const summarizeConversation = (messages) => {
  if (!messages || messages.length === 0) return '';

  const userMessages = messages.filter(m => m.role === 'user').map(m => m.content);
  const assistantMessages = messages.filter(m => m.role === 'assistant').map(m => m.content);

  let summary = '';
  
  // First user message (conversation starter)
  if (userMessages.length > 0) {
    const first = userMessages[0].substring(0, 150);
    summary += `Topik awal: "${first}${userMessages[0].length > 150 ? '...' : ''}"`;
  }

  // Key questions asked
  if (userMessages.length > 1) {
    const questions = userMessages.slice(1).filter(m => m.includes('?') || m.length < 200);
    if (questions.length > 0) {
      summary += ` | Pertanyaan: ${questions.length} pertanyaan diajukan`;
    }
  }

  summary += ` | Total ${messages.length} pesan sebelumnya diringkas.`;

  return summary;
};

/**
 * Convert conversation history from Redis to LangChain messages
 * @param {Array} conversationHistory - Conversation history from Redis
 * @param {string} systemPrompt - System prompt content
 * @param {string} summaryText - Optional summary of older conversation
 */
const convertToLangChainMessages = (conversationHistory, systemPrompt, summaryText) => {
  const messages = [];

  // Add system message with optional summary
  let finalPrompt = systemPrompt;
  if (summaryText) {
    finalPrompt += `\n\n**Ringkasan Percakapan Sebelumnya:**\n${summaryText}`;
  }
  messages.push(new SystemMessage(finalPrompt));

  // Convert conversation history
  if (conversationHistory && Array.isArray(conversationHistory)) {
    conversationHistory.forEach((msg) => {
      if (msg.role === 'user') {
        messages.push(new HumanMessage(msg.content));
      } else if (msg.role === 'assistant') {
        messages.push(new AIMessage(msg.content));
      }
    });
  }

  return messages;
};

/**
 * Convert messages from Redis/conversation history to OpenAI API format (plain JSON)
 * @param {Array} conversationHistory - Conversation history from Redis
 * @param {string} systemPrompt - System prompt content
 * @param {string} summaryText - Optional summary of older conversation
 * @returns {Array} Messages in OpenAI API format [{ role, content }, ...]
 */
const convertToOpenAIMessages = (conversationHistory, systemPrompt, summaryText) => {
  const messages = [];

  // Add system message with optional summary
  let finalPrompt = systemPrompt;
  if (summaryText) {
    finalPrompt += `\n\n**Ringkasan Percakapan Sebelumnya:**\n${summaryText}`;
  }
  messages.push({ role: 'system', content: finalPrompt });

  // Convert conversation history
  if (conversationHistory && Array.isArray(conversationHistory)) {
    conversationHistory.forEach((msg) => {
      if (msg.role === 'user') {
        messages.push({ role: 'user', content: msg.content });
      } else if (msg.role === 'assistant') {
        // Check if this message has tool_calls (from a previous assistant response)
        if (msg.tool_calls && msg.tool_calls.length > 0) {
          messages.push({
            role: 'assistant',
            content: msg.content || null,
            tool_calls: msg.tool_calls.map(tc => ({
              id: tc.id,
              type: 'function',
              function: {
                name: tc.function?.name || tc.name,
                arguments: typeof tc.function?.arguments === 'string' 
                  ? tc.function.arguments 
                  : JSON.stringify(tc.function?.arguments || tc.args || {}),
              },
            })),
          });
        } else {
          messages.push({ role: 'assistant', content: msg.content });
        }
      } else if (msg.role === 'tool') {
        messages.push({
          role: 'tool',
          content: msg.content,
          tool_call_id: msg.tool_call_id,
        });
      }
    });
  }

  return messages;
};

/**
 * Get AI provider configuration for raw API calls
 */
const getProviderConfig = () => {
  if (aiConfig.AI_MODEL_PROVIDER === 'sumopod') {
    return {
      apiKey: aiConfig.SUMOPOD_API_KEY,
      baseURL: (aiConfig.SUMOPOD_BASE_URL || '').replace(/\/+$/, ''),
      model: aiConfig.SUMOPOD_MODEL,
      temperature: aiConfig.SUMOPOD_TEMPERATURE,
      maxTokens: aiConfig.SUMOPOD_MAX_TOKENS,
    };
  }
  // Default: OpenAI
  return {
    apiKey: aiConfig.OPENAI_API_KEY,
    baseURL: 'https://api.openai.com/v1',
    model: aiConfig.OPENAI_MODEL,
    temperature: aiConfig.OPENAI_TEMPERATURE,
    maxTokens: aiConfig.OPENAI_MAX_TOKENS,
  };
};

/**
 * Raw streaming chat completion via OpenAI SDK (bypasses @langchain/openai v0.0.20 bug)
 * 
 * @param {Array} openaiMessages - Messages in OpenAI API format
 * @param {Array} tools - Tools from getToolsForLangChain (already in OpenAI format)
 * @yields {{ type: 'text', content: string } | { type: 'tool_calls', toolCalls: Array }}
 */
async function* rawStreamChatCompletion(openaiMessages, tools) {
  // Provider/model/temperature/max_tokens diambil dari DB, dengan fallback antar model
  const stream = modelRouter.streamChatCompletion('chat', {
    messages: openaiMessages,
    tools: tools && tools.length > 0 ? tools : undefined,
  });

  const toolCallAccum = {}; // { [index]: { id, type, function: { name, arguments } } }

  for await (const chunk of stream) {
    const delta = chunk.choices?.[0]?.delta;
    if (!delta) continue;

    // Text content
    if (delta.content) {
      yield { type: 'text', content: delta.content };
    }

    // Tool calls (accumulated by index across chunks)
    if (delta.tool_calls) {
      for (const tc of delta.tool_calls) {
        const index = tc.index;
        if (!toolCallAccum[index]) {
          toolCallAccum[index] = {
            id: tc.id || '',
            type: 'function',
            function: { name: '', arguments: '' },
          };
        }
        if (tc.id) toolCallAccum[index].id = tc.id;
        if (tc.function?.name) toolCallAccum[index].function.name += tc.function.name;
        if (tc.function?.arguments) toolCallAccum[index].function.arguments += tc.function.arguments;
      }
    }
  }

  // Yield accumulated tool calls after stream ends
  const toolCalls = Object.values(toolCallAccum)
    .filter(tc => tc.function.name)
    .map(tc => {
      let args = {};
      try { args = JSON.parse(tc.function.arguments || '{}'); } catch { args = {}; }
      return {
        id: tc.id || `tc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        name: tc.function.name,
        args,
      };
    });

  if (toolCalls.length > 0) {
    yield { type: 'tool_calls', toolCalls };
  }
}

/**
 * LangChain version: Convert LangChain messages to conversation history format
 */
const convertFromLangChainMessages = (messages) => {
  return messages
    .filter((msg) => msg instanceof HumanMessage || msg instanceof AIMessage)
    .map((msg) => ({
      role: msg instanceof HumanMessage ? 'user' : 'assistant',
      content: msg.content,
      timestamp: new Date().toISOString(),
    }));
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
 * Process AI chat with function calling support
 */
const processChat = async (userMessage, userId, sessionId, authToken, allowedModules) => {
  try {
    if (!aiConfig.AI_ENABLED) {
      throw new Error('AI Assistant is not enabled');
    }

    // Get system prompt from database (with fallback)
    let systemPrompt = await getSystemPrompt();

    // Append allowed modules instruction if provided (even if empty array)
    if (Array.isArray(allowedModules)) {
      const modulesList = allowedModules.join(', ');
      systemPrompt += `\n\n📋 **ACCESS CONTROL**\nThe user has access to these modules: [${modulesList}].\n✅ You MAY fetch data and use tools from these modules.\n❌ You MUST NOT access data or use tools from any module NOT in this list.\n\nWhen the user asks about something, check if their request falls under one of their allowed modules. If YES → proceed normally and use the available tools. If NO (the request is clearly about a module NOT in their list) → politely refuse.`;
    }

    // 🔥 Inject user memories ke system prompt (jika ada)
    // Mem0 semantic search — pakai pesan user sebagai query agar relevan
    try {
      const memoryService = require('./memory/memoryService');
      const memories = await memoryService.getRelevantMemories(userId, userMessage);
      if (memories && memories.length > 0) {
        const memoryText = memoryService.formatMemoriesForPrompt(memories);
        systemPrompt += memoryText;
        logger.info(`[Memory] Injected ${memories.length} memories into prompt`);
      }
    } catch (err) {
      // Memory module tidak tersedia — skip, system prompt tetap utuh
      logger.debug(`[Memory] Injection skipped: ${err.message}`);
    }

    // Get conversation history (fallback to empty array if Redis not available)
    let conversationHistory = [];
    try {
      conversationHistory = await getConversation(userId, sessionId) || [];
      if (conversationHistory && conversationHistory.length > 0) {
        logger.info(`Loaded conversation history: ${conversationHistory.length} messages for userId: ${userId}, sessionId: ${sessionId}`);
      } else {
        logger.debug(`No conversation history found for userId: ${userId}, sessionId: ${sessionId} - starting new conversation`);
      }
    } catch (error) {
      logger.warn(`Failed to get conversation history from Redis, using empty array: ${error.message || error}`);
      conversationHistory = [];
    }

    // Summarize older conversation to save tokens
    let summaryText = '';
    const maxHistoryBeforeSummary = aiConfig.AI_MAX_CONVERSATION_HISTORY * 2; // 20 messages
    if (conversationHistory.length > maxHistoryBeforeSummary) {
      const keepDetailed = 6; // keep last 3 pairs (6 messages) in full detail
      const oldMessages = conversationHistory.slice(0, -keepDetailed);
      const recentMessages = conversationHistory.slice(-keepDetailed);
      
      summaryText = summarizeConversation(oldMessages);
      conversationHistory = recentMessages;
      logger.info(`Conversation summarized: ${oldMessages.length} old messages compressed, keeping ${recentMessages.length} recent messages`);
    }

    // Convert to LangChain messages with system prompt from database
    const messages = convertToLangChainMessages(conversationHistory, systemPrompt, summaryText);
    messages.push(new HumanMessage(userMessage));

    // Tools di-bind jika function calling aktif
    const tools = aiConfig.AI_ENABLE_FUNCTION_CALLING ? getToolsForLangChain(allowedModules) : [];

    // Invoke model (provider/model dari DB, fallback ke model berikutnya jika gagal)
    const invoked = await modelRouter.invokeLangChain('chat', messages, {
      bind: tools.length ? { tools } : null,
    });
    let { response } = invoked;
    let toolCalls = extractToolCalls(response);

    // Handle function calls if any
    while (toolCalls.length > 0) {
      logger.info(`Function calls detected: ${toolCalls.length}`);

      // Add AI response to messages
      messages.push(response);

      // Execute function calls and create tool messages
      for (const toolCall of toolCalls) {
        try {
          const toolName = toolCall.name;
          const toolArgs = toolCall.args || {};

          logger.info(`Executing tool: ${toolName}`, toolArgs);

          const result = await executeTool(toolName, toolArgs, authToken, null, userId);

          // Create ToolMessage with results
          const toolMessage = new ToolMessage({
            content: JSON.stringify(result, null, 2),
            tool_call_id: toolCall.id,
          });

          messages.push(toolMessage);
        } catch (error) {
          logger.error(`Error executing tool ${toolCall.name}: ${error.message || error}`);

          // Create ToolMessage with error
          const toolMessage = new ToolMessage({
            content: JSON.stringify({
              success: false,
              message: `Error: ${error.message}`,
            }),
            tool_call_id: toolCall.id,
          });

          messages.push(toolMessage);
        }
      }

      // Get final response from model with tool results
      response = await modelRouter.invokeLangChainWith('chat', invoked, messages);
      toolCalls = extractToolCalls(response);
    }

    // Extract response content
    let responseContent = getMessageContent(response);

    // Update conversation history
    conversationHistory.push({
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString(),
    });
    conversationHistory.push({
      role: 'assistant',
      content: responseContent,
      timestamp: new Date().toISOString(),
    });

    if (!responseContent) {
      responseContent = JSON.stringify(
        {
          type: response?._getType?.() || response?.type || 'unknown',
          message: 'Model tidak memberikan jawaban teks. Silakan ulangi pertanyaan atau laporkan ke admin.',
        },
        null,
        2
      );
    }

    // Limit conversation history
    if (conversationHistory.length > aiConfig.AI_MAX_CONVERSATION_HISTORY * 2) {
      conversationHistory = conversationHistory.slice(-aiConfig.AI_MAX_CONVERSATION_HISTORY * 2);
    }

    // Save conversation history to Redis (if available)
    try {
      await saveConversation(userId, sessionId, conversationHistory);
    } catch (error) {
      logger.warn(`Failed to save conversation history to Redis: ${error.message || error}`);
      // Continue without saving to Redis
    }

    // Also save to database for persistence
    try {
      const conversationRepo = require('./ai_conversations_repository');
      await conversationRepo.saveConversation(sessionId, userId, conversationHistory);
    } catch (error) {
      logger.warn(`Failed to save conversation history to database: ${error.message || error}`);
      // Continue without saving to database
    }

    return {
      success: true,
      message: responseContent,
      conversationHistory,
    };
  } catch (error) {
    logger.error(`Error processing AI chat: ${error.message || error}`);
    throw error;
  }
};

/**
 * Clear conversation history
 */
const clearConversation = async (userId, sessionId) => {
  const { deleteConversation } = require('../../utils/redis');
  return await deleteConversation(userId, sessionId);
};

module.exports = {
  processChat,
  clearConversation,
  initializeModel,
  getSystemPrompt,
  clearSystemPromptCache,
  convertToLangChainMessages,
  summarizeConversation,
  extractToolCalls,
  convertToOpenAIMessages,
  getProviderConfig,
  rawStreamChatCompletion,
};
