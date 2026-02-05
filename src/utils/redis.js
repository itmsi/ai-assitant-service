const Redis = require('ioredis');
const redisConfig = require('../config/redis');
const { Logger } = require('./logger');
const logger = Logger;

// Import database repository for conversation storage
const conversationRepo = require('../modules/ai_assistant/ai_conversations_repository');

let redisClient = null;

/**
 * Initialize Redis connection
 */
const initRedis = () => {
  if (!redisConfig.redis.enabled) {
    logger.warn('Redis is not enabled');
    return null;
  }

  try {
    redisClient = new Redis({
      host: redisConfig.redis.host,
      port: redisConfig.redis.port,
      password: redisConfig.redis.password || undefined,
      db: redisConfig.redis.db,
      retryStrategy: redisConfig.redis.retryStrategy,
      maxRetriesPerRequest: redisConfig.redis.maxRetriesPerRequest,
      enableReadyCheck: redisConfig.redis.enableReadyCheck,
      lazyConnect: redisConfig.redis.lazyConnect,
    });

    redisClient.on('connect', () => {
      logger.info('Redis connected successfully');
    });

    redisClient.on('error', (err) => {
      logger.error(`Redis connection error: ${err.message || err}`);
    });

    redisClient.on('ready', () => {
      logger.info('Redis is ready');
    });

    return redisClient;
  } catch (error) {
    logger.error(`Failed to initialize Redis: ${error.message || error}`);
    return null;
  }
};

/**
 * Get Redis client
 */
const getRedisClient = () => {
  if (!redisClient && redisConfig.redis.enabled) {
    return initRedis();
  }
  return redisClient;
};

/**
 * Store conversation history
 * Now uses database instead of Redis
 */
const saveConversation = async (userId, sessionId, messages) => {
  // Use database repository for conversation storage
  return await conversationRepo.saveConversation(sessionId, userId, messages);
};

/**
 * Get conversation history
 * Now uses database instead of Redis
 */
const getConversation = async (userId, sessionId) => {
  // Use database repository for conversation retrieval
  return await conversationRepo.getConversation(sessionId);
};

/**
 * Delete conversation history
 * Now uses database instead of Redis
 */
const deleteConversation = async (userId, sessionId) => {
  // Use database repository for conversation deletion
  return await conversationRepo.deleteConversation(sessionId);
};

/**
 * Store user memory (long-term context)
 * Still uses Redis if enabled, otherwise skip
 */
const saveMemory = async (userId, key, value) => {
  const client = getRedisClient();
  if (!client) {
    logger.warn('Redis not available, skipping memory save');
    return false;
  }

  try {
    const redisKey = `${redisConfig.KEY_PREFIX.AI_MEMORY}${userId}:${key}`;
    await client.setex(redisKey, redisConfig.TTL.MEMORY, JSON.stringify(value));
    return true;
  } catch (error) {
    logger.error(`Error saving memory: ${error.message || error}`);
    return false;
  }
};

/**
 * Get user memory
 * Still uses Redis if enabled
 */
const getMemory = async (userId, key) => {
  const client = getRedisClient();
  if (!client) {
    return null;
  }

  try {
    const redisKey = `${redisConfig.KEY_PREFIX.AI_MEMORY}${userId}:${key}`;
    const data = await client.get(redisKey);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    logger.error(`Error getting memory: ${error.message || error}`);
    return null;
  }
};

/**
 * Close Redis connection
 */
const closeRedis = async () => {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    logger.info('Redis connection closed');
  }
};

// Log conversation storage method on startup
logger.info('Conversation storage: Using PostgreSQL database');

module.exports = {
  initRedis,
  getRedisClient,
  saveConversation,
  getConversation,
  deleteConversation,
  saveMemory,
  getMemory,
  closeRedis,
};
