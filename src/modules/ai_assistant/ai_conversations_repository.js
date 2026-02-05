const { pgCore: db } = require('../../config/database');
const { Logger } = require('../../utils/logger');
const logger = Logger;

/**
 * AI Conversations Repository
 * Handle database operations untuk conversation history
 */

/**
 * Save or update conversation history
 * @param {string} sessionId - Session ID
 * @param {string} userId - User ID (optional)
 * @param {Array} messages - Array of conversation messages
 * @returns {Promise<boolean>}
 */
const saveConversation = async (sessionId, userId, messages) => {
  try {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000)); // 7 days TTL

    // Check if conversation exists
    const existing = await db('ai_conversations')
      .where({ session_id: sessionId })
      .first();

    if (existing) {
      // Update existing conversation
      await db('ai_conversations')
        .where({ session_id: sessionId })
        .update({
          messages: JSON.stringify(messages),
          message_count: messages.length,
          last_message_at: now,
          updated_at: now,
          expires_at: expiresAt,
        });
      
      logger.debug(`Conversation updated in DB: ${sessionId} (${messages.length} messages)`);
    } else {
      // Insert new conversation
      await db('ai_conversations').insert({
        session_id: sessionId,
        user_id: userId,
        messages: JSON.stringify(messages),
        message_count: messages.length,
        last_message_at: now,
        created_at: now,
        updated_at: now,
        expires_at: expiresAt,
      });
      
      logger.debug(`Conversation created in DB: ${sessionId} (${messages.length} messages)`);
    }

    return true;
  } catch (error) {
    logger.error(`Error saving conversation to DB: ${error.message || error}`);
    return false;
  }
};

/**
 * Get conversation history by session ID
 * @param {string} sessionId - Session ID
 * @returns {Promise<Array|null>}
 */
const getConversation = async (sessionId) => {
  try {
    const conversation = await db('ai_conversations')
      .where({ session_id: sessionId })
      .first();

    if (!conversation) {
      logger.debug(`Conversation not found in DB: ${sessionId}`);
      return null;
    }

    // Parse messages from JSON
    const messages = typeof conversation.messages === 'string' 
      ? JSON.parse(conversation.messages) 
      : conversation.messages;

    logger.debug(`Conversation loaded from DB: ${sessionId} (${messages.length} messages)`);
    return messages;
  } catch (error) {
    logger.error(`Error getting conversation from DB: ${error.message || error}`);
    return null;
  }
};

/**
 * Delete conversation by session ID
 * @param {string} sessionId - Session ID
 * @returns {Promise<boolean>}
 */
const deleteConversation = async (sessionId) => {
  try {
    await db('ai_conversations')
      .where({ session_id: sessionId })
      .delete();

    logger.debug(`Conversation deleted from DB: ${sessionId}`);
    return true;
  } catch (error) {
    logger.error(`Error deleting conversation from DB: ${error.message || error}`);
    return false;
  }
};

/**
 * Clean up expired conversations (untuk cron job)
 * @returns {Promise<number>} Number of deleted conversations
 */
const cleanupExpiredConversations = async () => {
  try {
    const count = await db('ai_conversations')
      .where('expires_at', '<', new Date())
      .delete();

    if (count > 0) {
      logger.info(`Cleaned up ${count} expired conversations`);
    }
    
    return count;
  } catch (error) {
    logger.error(`Error cleaning up expired conversations: ${error.message || error}`);
    return 0;
  }
};

module.exports = {
  saveConversation,
  getConversation,
  deleteConversation,
  cleanupExpiredConversations,
};
