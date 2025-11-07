const { ChatOpenAI } = require('@langchain/openai');
const { HumanMessage, AIMessage, SystemMessage, ToolMessage } = require('@langchain/core/messages');
const aiConfig = require('../../config/ai');
const { Logger } = require('../../utils/logger');
const logger = Logger;
const { getConversation, saveConversation } = require('../../utils/redis');
const { getToolsForLangChain, executeTool } = require('./tools');

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
 */
const convertToLangChainMessages = (conversationHistory) => {
  const messages = [];
  
  // Add system message
  messages.push(new SystemMessage(aiConfig.AI_SYSTEM_PROMPT));

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

/**
 * Process AI chat with function calling support
 */
const processChat = async (userMessage, userId, sessionId, authToken) => {
  try {
    // Initialize model
    const model = initializeModel();

    // Get conversation history (fallback to empty array if Redis not available)
    let conversationHistory = [];
    try {
      conversationHistory = await getConversation(userId, sessionId) || [];
    } catch (error) {
      logger.warn(`Failed to get conversation history from Redis, using empty array: ${error.message || error}`);
      conversationHistory = [];
    }

    // Convert to LangChain messages
    const messages = convertToLangChainMessages(conversationHistory);
    messages.push(new HumanMessage(userMessage));

    // Prepare model with tools if function calling is enabled
    let modelToUse = model;
    let tools = [];
    
    if (aiConfig.AI_ENABLE_FUNCTION_CALLING) {
      tools = getToolsForLangChain();
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

    // Handle function calls if any
    if (response.tool_calls && response.tool_calls.length > 0) {
      logger.info(`Function calls detected: ${response.tool_calls.length}`);

      // Add AI response to messages
      messages.push(response);

      // Execute function calls and create tool messages
      for (const toolCall of response.tool_calls) {
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
    }

    // Extract response content
    let responseContent = response.content;
    
    // If response has tool calls, we need to handle it differently
    if (response.tool_calls && response.tool_calls.length > 0) {
      // This is a tool calling response, we need to execute and get final answer
      // This case is already handled above
    }

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

    // Limit conversation history
    if (conversationHistory.length > aiConfig.AI_MAX_CONVERSATION_HISTORY * 2) {
      conversationHistory = conversationHistory.slice(-aiConfig.AI_MAX_CONVERSATION_HISTORY * 2);
    }

    // Save conversation history (ignore error if Redis not available)
    try {
      await saveConversation(userId, sessionId, conversationHistory);
    } catch (error) {
      logger.warn(`Failed to save conversation history to Redis: ${error.message || error}`);
      // Continue without saving - conversation will still work but without memory
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
};
