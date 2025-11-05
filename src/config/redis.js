module.exports = {
  redis: {
    enabled: process.env.REDIS_ENABLED === 'true',
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || '',
    db: parseInt(process.env.REDIS_DB || '0'),
    // Connection options
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: true,
  },
  
  // Redis key prefixes
  KEY_PREFIX: {
    AI_CONVERSATION: 'ai:conversation:',
    AI_MEMORY: 'ai:memory:',
  },
  
  // TTL in seconds
  TTL: {
    CONVERSATION: parseInt(process.env.REDIS_CONVERSATION_TTL || '86400'), // 24 hours
    MEMORY: parseInt(process.env.REDIS_MEMORY_TTL || '604800'), // 7 days
  }
}
