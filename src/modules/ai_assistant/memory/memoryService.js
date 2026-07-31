/**
 * Memory Service
 *
 * Orchestrator untuk fitur memory:
 * - Extract memory dari chat (async, setelah respond)
 * - Save memory ke PostgreSQL + cache ke Redis (best-effort)
 * - Retrieve memory relevan untuk context injection
 * - Conflict resolution (confidence-based)
 */

const { Logger } = require('../../../utils/logger');
const logger = Logger;
const memoryRepo = require('../ai_memories_repository');
const { extractMemories } = require('./memoryExtractor');

// Redis — optional, best-effort
let redisClient = null;
try {
  const { getRedisClient } = require('../../../utils/redis');
  redisClient = getRedisClient();
} catch (err) {
  // Redis not available — no problem
}

const CONFIDENCE_THRESHOLD = parseFloat(process.env.AI_MEMORY_CONFIDENCE_THRESHOLD || '0.60');
const REDIS_MEMORY_TTL = parseInt(process.env.REDIS_MEMORY_TTL || '604800', 10); // 7 days default
const MEMORY_CACHE_TTL = 900; // 15 menit untuk hot cache
const MAX_MEMORIES_INJECT = 7; // max memory yang di-inject ke prompt

// ============================================================
// SAVE — ekstrak + simpan memory dari chat
// ============================================================

/**
 * Extract dan simpan memory dari pesan user
 * Dipanggil async setelah response balik ke user (tidak nge-block)
 *
 * @param {string} message - Pesan user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Saved memories
 */
const runExtraction = async (message, userId) => {
  if (!message || !userId) {
    return [];
  }

  try {
    // 1. Extract via keyword filter + LLM kecil
    // Feedback learning (dari executeTool) jalan terpisah — mereka simpan memory
    // dari hasil tool. LLM extractor simpan memory dari chat user.
    // Keduanya komplementer, tidak perlu salah satu di-skip.
    const extracted = await extractMemories(message);

    if (extracted.length === 0) {
      return [];
    }

    // 2. Simpan ke database
    const saved = [];
    for (const mem of extracted) {
      if (mem.action === 'delete') {
        // Handle delete action
        const existing = await memoryRepo.getByKey(userId, mem.key);
        if (existing) {
          await memoryRepo.deleteById(existing.id);
          logger.info(`[Memory] Deleted: userId=${userId} key="${mem.key}"`);
        }
        continue;
      }

      // Upsert — conflict resolution by confidence
      const existing = await memoryRepo.getByKey(userId, mem.key);
      if (existing && existing.confidence >= mem.confidence) {
        logger.info(`[Memory] Skipped: key="${mem.key}" — existing confidence ${existing.confidence} ≥ new ${mem.confidence}`);
        saved.push(existing);
        continue;
      }

      if (existing) {
        logger.info(`[Memory] Updating: key="${mem.key}" — "${existing.value}" → "${mem.value}" (${existing.confidence} → ${mem.confidence})`);
      } else {
        logger.info(`[Memory] Creating: key="${mem.key}" value="${mem.value}"`);
      }

      const savedMem = await memoryRepo.upsertMemory({
        userId,
        type: mem.type,
        key: mem.key,
        value: mem.value,
        confidence: mem.confidence,
        source: 'chat_extraction',
      });

      saved.push(savedMem);

      // Cache ke Redis (best-effort)
      await cacheToRedis(userId, savedMem);
    }

    // Invalidate Redis cache untuk user ini agar retrieval dapet data baru
    await invalidateUserCache(userId);

    return saved;
  } catch (error) {
    logger.error(`[MemoryService] runExtraction error: ${error.message || error}`);
    return []; // Fail safe
  }
};

// ============================================================
// RETRIEVE — ambil memory relevan untuk injeksi prompt
// ============================================================

/**
 * Ambil memory relevan untuk user
 * Priority: Redis cache → PostgreSQL
 *
 * @param {string} userId
 * @returns {Promise<Array>}
 */
const getRelevantMemories = async (userId) => {
  if (!userId) return [];

  try {
    // 1. Coba Redis dulu (hot cache)
    const cached = await getFromRedis(userId);
    if (cached && cached.length > 0) {
      logger.debug(`[MemoryService] Retrieved ${cached.length} memories from Redis cache`);
      return cached.slice(0, MAX_MEMORIES_INJECT);
    }

    // 2. Fallback ke PostgreSQL
    const memories = await memoryRepo.getActiveByUser(userId, {
      limit: MAX_MEMORIES_INJECT,
      minConfidence: CONFIDENCE_THRESHOLD,
    });

    if (memories.length > 0) {
      logger.debug(`[MemoryService] Retrieved ${memories.length} memories from PostgreSQL`);
      // Cache ke Redis (best-effort) untuk下次
      await cacheUserMemories(userId, memories);
    }

    return memories;
  } catch (error) {
    logger.error(`[MemoryService] getRelevantMemories error: ${error.message || error}`);
    return [];
  }
};

/**
 * Format memories jadi teks untuk disisipkan ke system prompt
 * @param {Array} memories
 * @returns {string}
 */
const formatMemoriesForPrompt = (memories) => {
  if (!memories || memories.length === 0) return '';

  const lines = memories.map((m) => {
    const prefix = m.type === 'user_preference' ? '⚙️' : m.type === 'fact' ? '📌' : '📝';
    return `${prefix} ${m.key}: ${m.value}`;
  });

  return `\n\n📋 **YANG SAYA KETAHUI TENTANG ANDA:**\n${lines.join('\n')}`;
};

// ============================================================
// ADMIN — CRUD untuk dashboard
// ============================================================

/**
 * Upsert memory — insert jika baru, update jika sudah ada (confidence-based)
 * Admin / tool result / extraction semuanya lewat sini
 */
const upsertMemory = async (data) => {
  return await memoryRepo.upsertMemory(data);
};

/**
 * Update memory paksa — timpa nilai lama tanpa peduli confidence
 * Dipakai ketika user EXPLICITLY mengubah sesuatu (update_ tool, admin manual)
 */
const updateMemory = async (data) => {
  // Cari existing dulu
  const existing = await memoryRepo.getByKey(data.userId, data.key);

  if (existing) {
    // Force update: overwrite value, set confidence tinggi
    return await memoryRepo.upsertMemory({
      ...data,
      confidence: Math.max(data.confidence || 0.85, 0.85), // minimal 0.85 untuk update eksplisit
      metadata: { ...(data.metadata || {}), previousValue: existing.value, updatedBy: 'user_action' },
    });
  }

  // Belum ada → insert biasa
  return await memoryRepo.upsertMemory(data);
};

/**
 * List memories (admin)
 */
const listMemories = async (filters) => {
  return await memoryRepo.list(filters);
};

/**
 * Delete memory by ID (admin)
 */
const deleteMemory = async (id) => {
  return await memoryRepo.deleteById(id);
};

/**
 * Cleanup expired memories
 */
const cleanupExpired = async () => {
  return await memoryRepo.cleanupExpired();
};

// ============================================================
// AUTO-PROVISION — simpan data profil user dari token
// ============================================================

/**
 * Simpan data profil user dari token SSO ke memory (hanya sekali).
 * Field yang dikenal: name, email, employee_id, company, dll.
 * @param {Object} user - req.user dari SSO middleware
 * @param {string} userId - User ID
 * @returns {Promise<boolean>}
 */
const provisionUserProfile = async (user, userId) => {
  if (!user || !userId) return false;

  try {
    // Cek apakah sudah pernah di-provision (cek memory user_name)
    const existing = await memoryRepo.getByKey(userId, 'user_name');
    if (existing) {
      return false; // Udah pernah, skip
    }

    // Mapping field umum dari token SSO / JWT
    const profileFields = [
      { key: 'user_name', fields: ['name', 'employee_name', 'full_name', 'preferred_username', 'username', 'sub'] },
      { key: 'user_email', fields: ['email', 'employee_email'] },
      { key: 'user_employee_id', fields: ['employee_id', 'employeeId'] },
      { key: 'user_company', fields: ['company', 'company_name', 'perusahaan'] },
    ];

    const saved = [];
    for (const { key, fields } of profileFields) {
      let value = null;
      for (const f of fields) {
        if (user[f] && typeof user[f] === 'string' && user[f].length > 0) {
          value = user[f];
          break;
        }
      }
      if (value) {
        const mem = await memoryRepo.upsertMemory({
          userId,
          type: 'fact',
          key,
          value,
          confidence: 0.95,
          source: 'sso_token',
        });
        saved.push(mem);
      }
    }

    if (saved.length > 0) {
      logger.info(`[Memory] Auto-provisioned ${saved.length} profile memories for user ${userId}`);
      await invalidateUserCache(userId);
    }

    return saved.length > 0;
  } catch (error) {
    logger.debug(`[Memory] Auto-provision skipped: ${error.message}`);
    return false;
  }
};

// ============================================================
// REDIS HELPERS — best-effort caching
// ============================================================

const cacheToRedis = async (userId, memory) => {
  if (!redisClient) return;
  try {
    const redisKey = `ai:memory:${userId}:${memory.key}`;
    await redisClient.setex(redisKey, REDIS_MEMORY_TTL, JSON.stringify(memory));
  } catch (err) {
    // Redis unavailable — skip
  }
};

const getFromRedis = async (userId) => {
  if (!redisClient) return null;
  try {
    // Get all memory keys for this user
    const keys = await redisClient.keys(`ai:memory:${userId}:*`);
    if (!keys || keys.length === 0) return null;

    const values = await redisClient.mget(...keys);
    return values
      .filter(v => v)
      .map(v => JSON.parse(v))
      .filter(m => m && (!m.expires_at || new Date(m.expires_at) > new Date()))
      .sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
  } catch (err) {
    return null;
  }
};

const cacheUserMemories = async (userId, memories) => {
  if (!redisClient || !memories) return;
  try {
    for (const mem of memories) {
      const redisKey = `ai:memory:${userId}:${mem.key}`;
      await redisClient.setex(redisKey, MEMORY_CACHE_TTL, JSON.stringify(mem));
    }
  } catch (err) {
    // Redis unavailable — skip
  }
};

const invalidateUserCache = async (userId) => {
  if (!redisClient) return;
  try {
    const keys = await redisClient.keys(`ai:memory:${userId}:*`);
    if (keys && keys.length > 0) {
      await redisClient.del(...keys);
    }
  } catch (err) {
    // Redis unavailable — skip
  }
};

module.exports = {
  runExtraction,
  getRelevantMemories,
  formatMemoriesForPrompt,
  upsertMemory,
  updateMemory,
  listMemories,
  deleteMemory,
  cleanupExpired,
  provisionUserProfile,
};
