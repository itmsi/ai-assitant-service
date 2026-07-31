const { pgCore: db } = require('../../config/database');
const { Logger } = require('../../utils/logger');
const logger = Logger;

const TABLE = 'ai_memories';

/**
 * AI Memories Repository
 * Handle database operations untuk memory pengguna
 */

/**
 * Upsert memory — insert jika belum ada, update jika sudah ada
 * @param {Object} param
 * @param {string} param.userId
 * @param {string} param.type - user_preference | fact | context | session_summary | tool_result
 * @param {string} param.key - normalized key
 * @param {string} param.value - nilai memory
 * @param {number} param.confidence - 0.00 - 1.00
 * @param {string} param.source - chat_extraction | tool_result | admin
 * @param {Object} param.metadata - JSON object tambahan
 * @param {Date|null} param.expiresAt
 * @returns {Promise<Object>} memory yang tersimpan
 */
const upsertMemory = async ({ userId, type, key, value, confidence = 0.80, source = 'chat_extraction', metadata = {}, expiresAt = null }) => {
  try {
    const now = new Date();

    // Cek apakah sudah ada record dengan user_id + key yang sama
    const existing = await db(TABLE)
      .where({ user_id: userId, key })
      .first();

    if (existing) {
      // Update — timpa value dan refresh confidence
      const updateData = {
        value,
        confidence,
        source,
        metadata: db.raw('COALESCE(metadata, ?::jsonb) || ?::jsonb', [JSON.stringify({}), JSON.stringify(metadata)]),
        updated_at: now,
      };
      if (expiresAt) updateData.expires_at = expiresAt;

      await db(TABLE).where({ id: existing.id }).update(updateData);

      logger.debug(`Memory updated: ${userId}/${type}:${key} (confidence: ${confidence})`);
      return { ...existing, ...updateData, metadata: { ...existing.metadata, ...metadata } };
    }

    // Insert baru
    const [saved] = await db(TABLE).insert({
      user_id: userId,
      type,
      key,
      value,
      confidence,
      source,
      metadata: JSON.stringify(metadata),
      created_at: now,
      updated_at: now,
      expires_at: expiresAt,
    }).returning('*');

    logger.debug(`Memory created: ${userId}/${type}:${key} (confidence: ${confidence})`);
    return saved;
  } catch (error) {
    logger.error(`Error upserting memory: ${error.message || error}`);
    throw error;
  }
};

/**
 * Get active (non-expired) memories by user ID
 * @param {string} userId
 * @param {Object} options
 * @param {number} options.limit - max records
 * @param {string} options.type - filter by type
 * @param {number} options.minConfidence - minimum confidence filter
 * @returns {Promise<Array>}
 */
const getActiveByUser = async (userId, { limit = 20, type = null, minConfidence = 0 } = {}) => {
  try {
    let query = db(TABLE)
      .where({ user_id: userId })
      .where(function() {
        this.whereNull('expires_at').orWhere('expires_at', '>', new Date());
      });

    if (type) {
      query = query.andWhere({ type });
    }

    if (minConfidence > 0) {
      query = query.andWhere('confidence', '>=', minConfidence);
    }

    const memories = await query
      .orderBy('confidence', 'desc')
      .orderBy('updated_at', 'desc')
      .limit(limit);

    return memories;
  } catch (error) {
    logger.error(`Error getting active memories: ${error.message || error}`);
    return [];
  }
};

/**
 * Get memory by user ID and key
 * @param {string} userId
 * @param {string} key
 * @returns {Promise<Object|null>}
 */
const getByKey = async (userId, key) => {
  try {
    return await db(TABLE).where({ user_id: userId, key }).first();
  } catch (error) {
    logger.error(`Error getting memory by key: ${error.message || error}`);
    return null;
  }
};

/**
 * Delete memory by ID
 * @param {string} id
 * @returns {Promise<boolean>}
 */
const deleteById = async (id) => {
  try {
    await db(TABLE).where({ id }).delete();
    return true;
  } catch (error) {
    logger.error(`Error deleting memory: ${error.message || error}`);
    return false;
  }
};

/**
 * Delete memories by user ID (for cleanup)
 * @param {string} userId
 * @returns {Promise<number>}
 */
const deleteByUser = async (userId) => {
  try {
    const count = await db(TABLE).where({ user_id: userId }).delete();
    return count;
  } catch (error) {
    logger.error(`Error deleting user memories: ${error.message || error}`);
    return 0;
  }
};

/**
 * Clean up expired memories
 * @returns {Promise<number>}
 */
const cleanupExpired = async () => {
  try {
    const count = await db(TABLE).where('expires_at', '<', new Date()).delete();
    if (count > 0) {
      logger.info(`Cleaned up ${count} expired memories`);
    }
    return count;
  } catch (error) {
    logger.error(`Error cleaning up expired memories: ${error.message || error}`);
    return 0;
  }
};

/**
 * Get all memories for admin: list by user paginated
 * @param {Object} options
 * @param {string} options.userId - optional filter
 * @param {number} options.page
 * @param {number} options.limit
 * @returns {Promise<{data: Array, total: number}>}
 */
const list = async ({ userId = null, page = 1, limit = 50 } = {}) => {
  try {
    let query = db(TABLE);
    let countQuery = db(TABLE);

    if (userId) {
      query = query.where({ user_id: userId });
      countQuery = countQuery.where({ user_id: userId });
    }

    const total = parseInt((await countQuery.count('id as total').first()).total, 10);
    const data = await query
      .orderBy('updated_at', 'desc')
      .offset((page - 1) * limit)
      .limit(limit);

    return { data, total };
  } catch (error) {
    logger.error(`Error listing memories: ${error.message || error}`);
    return { data: [], total: 0 };
  }
};

module.exports = {
  upsertMemory,
  getActiveByUser,
  getByKey,
  deleteById,
  deleteByUser,
  cleanupExpired,
  list,
};
