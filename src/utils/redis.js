const Redis = require('ioredis');
const redisConfig = require('../config/redis');
const { Logger } = require('./logger');
const logger = Logger;

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
 */
const saveConversation = async (userId, sessionId, messages) => {
  const client = getRedisClient();
  if (!client) {
    return false;
  }

  try {
    const key = `${redisConfig.KEY_PREFIX.AI_CONVERSATION}${userId}:${sessionId}`;
    await client.setex(key, redisConfig.TTL.CONVERSATION, JSON.stringify(messages));
    return true;
  } catch (error) {
    logger.error(`Error saving conversation: ${error.message || error}`);
    return false;
  }
};

/**
 * Get conversation history
 */
const getConversation = async (userId, sessionId) => {
  const client = getRedisClient();
  if (!client) {
    return null;
  }

  try {
    const key = `${redisConfig.KEY_PREFIX.AI_CONVERSATION}${userId}:${sessionId}`;
    const data = await client.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    logger.error(`Error getting conversation: ${error.message || error}`);
    return null;
  }
};

/**
 * Delete conversation history
 */
const deleteConversation = async (userId, sessionId) => {
  const client = getRedisClient();
  if (!client) {
    return false;
  }

  try {
    const key = `${redisConfig.KEY_PREFIX.AI_CONVERSATION}${userId}:${sessionId}`;
    await client.del(key);
    return true;
  } catch (error) {
    logger.error(`Error deleting conversation: ${error.message || error}`);
    return false;
  }
};

/**
 * Store user memory (long-term context)
 */
const saveMemory = async (userId, key, value) => {
  const client = getRedisClient();
  if (!client) {
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
