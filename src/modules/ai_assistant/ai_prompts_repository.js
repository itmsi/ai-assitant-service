const db = require('../../config/database');
const { Logger } = require('../../utils/logger');
const logger = Logger;

const TABLE_NAME = 'ai_prompts';

/**
 * Get active prompt by key
 * @param {string} key - Prompt key (e.g., 'system_prompt_default')
 * @returns {Promise<Object|null>} Prompt object or null
 */
const getActivePromptByKey = async (key) => {
  try {
    const prompt = await db(TABLE_NAME)
      .where({ key, is_active: true, deleted_at: null })
      .orderBy('version', 'desc')
      .first();
    
    return prompt;
  } catch (error) {
    logger.error(`Error getting prompt by key ${key}: ${error.message || error}`);
    throw error;
  }
};

/**
 * Get prompt by key (any version, any status)
 * @param {string} key - Prompt key
 * @returns {Promise<Object|null>} Prompt object or null
 */
const getPromptByKey = async (key) => {
  try {
    const prompt = await db(TABLE_NAME)
      .where({ key, deleted_at: null })
      .orderBy('version', 'desc')
      .first();
    
    return prompt;
  } catch (error) {
    logger.error(`Error getting prompt by key ${key}: ${error.message || error}`);
    throw error;
  }
};

/**
 * Get all active prompts
 * @returns {Promise<Array>} Array of active prompts
 */
const getAllActivePrompts = async () => {
  try {
    const prompts = await db(TABLE_NAME)
      .where({ is_active: true, deleted_at: null })
      .orderBy('key', 'asc')
      .orderBy('version', 'desc');
    
    return prompts;
  } catch (error) {
    logger.error(`Error getting all active prompts: ${error.message || error}`);
    throw error;
  }
};

/**
 * Create new prompt
 * @param {Object} data - Prompt data
 * @returns {Promise<Object>} Created prompt
 */
const createPrompt = async (data) => {
  try {
    const [prompt] = await db(TABLE_NAME)
      .insert({
        ...data,
        created_at: db.fn.now(),
        updated_at: db.fn.now(),
      })
      .returning('*');
    
    return prompt;
  } catch (error) {
    logger.error(`Error creating prompt: ${error.message || error}`);
    throw error;
  }
};

/**
 * Update prompt by key
 * @param {string} key - Prompt key
 * @param {Object} data - Update data
 * @returns {Promise<Object>} Updated prompt
 */
const updatePromptByKey = async (key, data) => {
  try {
    const [prompt] = await db(TABLE_NAME)
      .where({ key, deleted_at: null })
      .update({
        ...data,
        updated_at: db.fn.now(),
      })
      .returning('*');
    
    return prompt;
  } catch (error) {
    logger.error(`Error updating prompt by key ${key}: ${error.message || error}`);
    throw error;
  }
};

/**
 * Deactivate prompt by key (soft delete)
 * @param {string} key - Prompt key
 * @returns {Promise<boolean>} Success status
 */
const deactivatePromptByKey = async (key) => {
  try {
    await db(TABLE_NAME)
      .where({ key, deleted_at: null })
      .update({
        is_active: false,
        updated_at: db.fn.now(),
      });
    
    return true;
  } catch (error) {
    logger.error(`Error deactivating prompt by key ${key}: ${error.message || error}`);
    throw error;
  }
};

/**
 * Delete prompt by key (hard delete)
 * @param {string} key - Prompt key
 * @returns {Promise<boolean>} Success status
 */
const deletePromptByKey = async (key) => {
  try {
    await db(TABLE_NAME)
      .where({ key })
      .update({
        deleted_at: db.fn.now(),
        updated_at: db.fn.now(),
      });
    
    return true;
  } catch (error) {
    logger.error(`Error deleting prompt by key ${key}: ${error.message || error}`);
    throw error;
  }
};

module.exports = {
  getActivePromptByKey,
  getPromptByKey,
  getAllActivePrompts,
  createPrompt,
  updatePromptByKey,
  deactivatePromptByKey,
  deletePromptByKey,
};

