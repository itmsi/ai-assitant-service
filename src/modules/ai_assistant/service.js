const { ChatOpenAI } = require('@langchain/openai');
const { HumanMessage, AIMessage, SystemMessage, ToolMessage } = require('@langchain/core/messages');
const aiConfig = require('../../config/ai');
const { Logger } = require('../../utils/logger');
const logger = Logger;
const { getConversation, saveConversation } = require('../../utils/redis');
const { getToolsForLangChain, executeTool } = require('./tools');
const { getActivePromptByKey } = require('./ai_prompts_repository');

// Cache untuk system prompt (untuk menghindari query berulang)
let systemPromptCache = {
  content: null,
  key: null,
  timestamp: null,
  TTL: 5 * 60 * 1000, // 5 menit cache
};

/**
 * Get system prompt from database with fallback
 * @param {string} key - Prompt key (default: 'system_prompt_default')
 * @returns {Promise<string>} System prompt content
 */
const getSystemPrompt = async (key = null) => {
  const promptKey = key || aiConfig.AI_SYSTEM_PROMPT_KEY;

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
    TTL: 5 * 60 * 1000,
  };
  logger.info('System prompt cache cleared');
};

/**
 * Initialize AI model
 */
const initializeModel = () => {
  if (!aiConfig.AI_ENABLED) {
    throw new Error('AI Assistant is not enabled');
  }

  if (aiConfig.AI_MODEL_PROVIDER === 'openai') {
    if (!aiConfig.OPENAI_API_KEY) {
      throw new Error('OpenAI API key is not configured');
    }

    const model = new ChatOpenAI({
      modelName: aiConfig.OPENAI_MODEL,
      temperature: aiConfig.OPENAI_TEMPERATURE,
      maxTokens: aiConfig.OPENAI_MAX_TOKENS,
      openAIApiKey: aiConfig.OPENAI_API_KEY,
    });

    // Return model without binding tools here
    // We'll handle tools manually during invoke
    return model;
  }

  if (aiConfig.AI_MODEL_PROVIDER === 'sumopod') {
    if (!aiConfig.SUMOPOD_API_KEY) {
      throw new Error('Sumopod API key belum dikonfigurasi');
    }

    if (!aiConfig.SUMOPOD_BASE_URL) {
      throw new Error('Sumopod base URL belum dikonfigurasi');
    }

    const model = new ChatOpenAI({
      modelName: aiConfig.SUMOPOD_MODEL,
      temperature: aiConfig.SUMOPOD_TEMPERATURE,
      maxTokens: aiConfig.SUMOPOD_MAX_TOKENS,
      openAIApiKey: aiConfig.SUMOPOD_API_KEY,
      configuration: {
        basePath: aiConfig.SUMOPOD_BASE_URL,
        baseURL: aiConfig.SUMOPOD_BASE_URL,
      },
    });

    return model;
  }

  // Support for Ollama (future implementation)
  if (aiConfig.AI_MODEL_PROVIDER === 'ollama') {
    throw new Error('Ollama provider belum diimplementasikan. Silakan gunakan OpenAI.');
  }

  throw new Error(`Unsupported AI model provider: ${aiConfig.AI_MODEL_PROVIDER}`);
};

/**
 * Convert conversation history from Redis to LangChain messages
 * @param {Array} conversationHistory - Conversation history from Redis
 * @param {string} systemPrompt - System prompt content
 */
const convertToLangChainMessages = (conversationHistory, systemPrompt) => {
  const messages = [];

  // Add system message
  messages.push(new SystemMessage(systemPrompt));

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
 * Convert LangChain messages to conversation history format
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
    // Initialize model
    const model = initializeModel();

    // Get system prompt from database (with fallback)
    let systemPrompt = await getSystemPrompt();

    // Append allowed modules instruction if provided (even if empty array)
    if (Array.isArray(allowedModules)) {
      const modulesList = allowedModules.join(', ');
      systemPrompt += `\n\n*** STRICT ACCESS CONTROL ***\nUser Rights: The user ONLY has access to the following modules: [${modulesList}].\nYou are PROHIBITED from providing any data, information, or assistance related to modules NOT in this list.\n\nCRITICAL RULE: If the user's message mentions a restricted module (e.g., asking about "CRM", "HR", "Employee" when these are not in the list), you must REFUSE IMPLICITLY AND IMMEDIATELY, even if you think you have tools that could answer part of the question. The presence of the restricted word in the context of a data request is grounds for refusal.\n\nRefusal Response:\n"Mohon maaf, Anda tidak memiliki hak akses untuk module tersebut."\n\nDo not explain why. Do not try to bypass this by using similar tools from other modules. STOP and return the refusal response.`;
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

    // Convert to LangChain messages with system prompt from database
    const messages = convertToLangChainMessages(conversationHistory, systemPrompt);
    messages.push(new HumanMessage(userMessage));

    // Prepare model with tools if function calling is enabled
    let modelToUse = model;
    let tools = [];

    if (aiConfig.AI_ENABLE_FUNCTION_CALLING) {
      tools = getToolsForLangChain(allowedModules);
      // Convert tools to format compatible with ChatOpenAI
      // For LangChain 0.1.x, we pass tools in bind or use .bind()
      try {
        // Try using bind with tools parameter
        modelToUse = model.bind({
          tools: tools,
        });
      } catch (error) {
        logger.warn(`Failed to bind tools, continuing without function calling: ${error.message}`);
        // Continue without tools if binding fails
      }
    }

    // Invoke model
    let response = await modelToUse.invoke(messages);
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

          const result = await executeTool(toolName, toolArgs, authToken);

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
      response = await model.invoke(messages);
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
};
