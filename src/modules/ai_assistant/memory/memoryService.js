/**
 * Memory Service — di-backend oleh Mem0 (self-hosted REST server)
 *
 * Menggantikan custom memory (ai_memories_repository + memoryExtractor):
 * - Extraction & conflict resolution (ADD/UPDATE/DELETE inference) dilakukan Mem0
 * - Storage di Postgres + pgvector milik Mem0 (bukan table ai_memories)
 * - Semantic search via POST /search
 *
 * Public API dipertahankan agar MCP tools, admin routes, dan prompt injection
 * tidak berubah:
 * - runExtraction(message, userId)
 * - getRelevantMemories(userId, query?)
 * - formatMemoriesForPrompt(memories)
 * - upsertMemory / updateMemory / listMemories / deleteMemory / cleanupExpired
 * - provisionUserProfile(user, userId)
 */

const { Logger } = require('../../../utils/logger');
const logger = Logger;
const aiConfig = require('../../../config/ai');
const mem0 = require('./mem0Client');

// Redis — optional, best-effort hot cache
let redisClient = null;
try {
  const { getRedisClient } = require('../../../utils/redis');
  redisClient = getRedisClient();
} catch (err) {
  // Redis not available — no problem
}

const MEMORY_CACHE_TTL = aiConfig.MEM0_CACHE_TTL; // 15 menit hot cache
const MAX_MEMORIES_INJECT = aiConfig.MEM0_MAX_INJECT; // max memory yang di-inject ke prompt

// ============================================================
// HELPERS — normalisasi memory Mem0 → bentuk internal
// ============================================================

const normalize = (m, userId) => {
  if (!m) return null;
  const metadata = m.metadata || {};
  return {
    id: m.id,
    userId: m.user_id || userId,
    key: metadata.key || null,
    value: m.memory != null ? m.memory : (m.text || ''),
    type: metadata.type || 'fact',
    confidence: typeof m.score === 'number' ? m.score : (metadata.confidence != null ? Number(metadata.confidence) : 0.8),
    source: metadata.source || 'mem0',
    metadata,
    expiresAt: metadata.expires_at || null,
    createdAt: m.created_at || null,
    updatedAt: m.updated_at || null,
  };
};

const isExpired = (m) => {
  const exp = m && m.metadata && m.metadata.expires_at;
  if (!exp) return false;
  const t = Date.parse(exp);
  return !Number.isNaN(t) && t <= Date.now();
};

/** Cari memory user berdasarkan metadata.key (emulasi unique key per user) */
const findByKey = async (userId, key) => {
  try {
    const res = await mem0.getAll({ userId });
    return (res.results || []).find((m) => m && m.metadata && m.metadata.key === key) || null;
  } catch (error) {
    logger.debug(`[MemoryService] findByKey error: ${error.message}`);
    return null;
  }
};

const buildMetadata = ({ key, type, confidence, source, metadata = {}, expiresAt = null }) => {
  const meta = { ...metadata, key, type, source, confidence };
  if (expiresAt) meta.expires_at = new Date(expiresAt).toISOString();
  return meta;
};

// ============================================================
// SAVE — ekstrak + simpan memory dari chat (Mem0 inference)
// ============================================================

/**
 * Extract dan simpan memory dari pesan user.
 * Extraction (ADD/UPDATE/DELETE inference) dikerjakan oleh Mem0.
 * Dipanggil async setelah response balik ke user (tidak nge-block).
 *
 * @param {string} message - Pesan user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Saved memories
 */
const runExtraction = async (message, userId) => {
  if (!message || !userId || !aiConfig.MEM0_ENABLED) {
    return [];
  }

  try {
    const res = await mem0.add({
      userId,
      messages: [{ role: 'user', content: message }],
      metadata: { source: 'chat_extraction' },
    });

    const results = res.results || [];
    const saved = results
      .filter((r) => r && r.event !== 'NOOP')
      .map((r) => normalize(r, userId))
      .filter(Boolean);

    if (saved.length > 0) {
      const events = results.map((r) => r.event).filter(Boolean).join(',');
      logger.info(`[Memory] runExtraction: ${saved.length} memories (${events}) for user ${userId}`);
      await invalidateUserCache(userId);
    }

    return saved;
  } catch (error) {
    logger.error(`[MemoryService] runExtraction error: ${error.message || error}`);
    return []; // Fail safe — jangan block chat
  }
};

// ============================================================
// RETRIEVE — semantic search + injeksi ke prompt
// ============================================================

/**
 * Ambil memory relevan untuk user.
 * Priority: Redis cache → Mem0 semantic search (atau getAll jika tanpa query).
 *
 * @param {string} userId - User ID
 * @param {string} [query=''] - Pesan user terbaru sebagai query semantic search
 * @returns {Promise<Array>}
 */
const getRelevantMemories = async (userId, query = '') => {
  if (!userId || !aiConfig.MEM0_ENABLED) return [];

  try {
    // 1. Coba Redis dulu (hot cache)
    const cached = await getFromRedis(userId);
    if (cached && cached.length > 0) {
      logger.debug(`[MemoryService] Retrieved ${cached.length} memories from Redis cache`);
      return cached.slice(0, MAX_MEMORIES_INJECT);
    }

    // 2. Mem0 semantic search; fallback ke getAll kalau tidak ada query
    let results = [];
    if (query && typeof query === 'string' && query.trim()) {
      const res = await mem0.search({ query: query.trim(), userId, limit: 25 });
      results = res.results || [];
    } else {
      const res = await mem0.getAll({ userId });
      results = res.results || [];
    }

    const memories = results
      .map((m) => normalize(m, userId))
      .filter((m) => m && !isExpired(m))
      .sort((a, b) => (b.confidence || 0) - (a.confidence || 0))
      .slice(0, MAX_MEMORIES_INJECT);

    if (memories.length > 0) {
      logger.debug(`[MemoryService] Retrieved ${memories.length} memories from Mem0`);
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
    return `${prefix} ${m.key ? `${m.key}: ` : ''}${m.value}`;
  });

  return `\n\n📋 **YANG SAYA KETAHUI TENTANG ANDA:**\n${lines.join('\n')}`;
};

// ============================================================
// CRUD — admin dashboard, MCP tools, feedback learning
// ============================================================

/**
 * Upsert memory — emulasi unique key per user via metadata.key.
 * - Sudah ada & confidence existing >= baru → skip
 * - Sudah ada & confidence baru lebih tinggi → update via PUT
 * - Belum ada → add (infer=false, simpan value apa adanya)
 */
const upsertMemory = async ({ userId, type = 'fact', key, value, confidence = 0.8, source = 'chat_extraction', metadata = {}, expiresAt = null }) => {
  if (!userId || !key || value == null) return null;

  try {
    const existing = await findByKey(userId, key);
    const memMetadata = buildMetadata({ key, type, confidence, source, metadata, expiresAt });

    if (existing) {
      const existingConf = existing.metadata && existing.metadata.confidence != null
        ? Number(existing.metadata.confidence)
        : 0;

      if (existingConf >= confidence) {
        logger.info(`[Memory] Skipped: key="${key}" — existing confidence ${existingConf} ≥ new ${confidence}`);
        return normalize(existing, userId);
      }

      const updated = await mem0.update(existing.id, String(value));
      await invalidateUserCache(userId);
      logger.info(`[Memory] Updated: key="${key}" "${existing.value || existing.memory}" → "${value}"`);
      return normalize(updated, userId) || { ...normalize(existing, userId), value, metadata: memMetadata };
    }

    const res = await mem0.add({
      userId,
      messages: [{ role: 'user', content: String(value) }],
      metadata: memMetadata,
      infer: false, // nilai sudah final, jangan di-extract ulang
    });
    await invalidateUserCache(userId);
    const r = (res.results || [])[0];
    logger.info(`[Memory] Created: key="${key}" value="${value}"`);
    return normalize(r, userId);
  } catch (error) {
    logger.error(`[MemoryService] upsertMemory error: ${error.message || error}`);
    throw error;
  }
};

/**
 * Update memory paksa — timpa nilai lama tanpa peduli confidence.
 * Dipakai ketika user EXPLICITLY mengubah sesuatu (update_ tool, admin manual).
 */
const updateMemory = async ({ userId, type = 'fact', key, value, confidence = 0.95, source = 'admin', metadata = {} }) => {
  if (!userId || !key || value == null) {
    throw new Error('userId, key, dan value wajib diisi');
  }

  try {
    const existing = await findByKey(userId, key);
    const finalConfidence = Math.max(confidence, 0.85); // minimal 0.85 untuk update eksplisit
    const memMetadata = buildMetadata({ key, type, confidence: finalConfidence, source, metadata });

    if (existing) {
      memMetadata.previousValue = existing.value || existing.memory;
      memMetadata.updatedBy = 'user_action';
      const updated = await mem0.update(existing.id, String(value));
      await invalidateUserCache(userId);
      logger.info(`[Memory] Force updated: key="${key}" "${existing.value || existing.memory}" → "${value}"`);
      return normalize(updated, userId) || { ...normalize(existing, userId), value, metadata: memMetadata };
    }

    const res = await mem0.add({
      userId,
      messages: [{ role: 'user', content: String(value) }],
      metadata: memMetadata,
      infer: false,
    });
    await invalidateUserCache(userId);
    return normalize((res.results || [])[0], userId);
  } catch (error) {
    logger.error(`[MemoryService] updateMemory error: ${error.message || error}`);
    throw error;
  }
};

/**
 * List memories (admin) — per user, atau semua user via /entities
 * @param {Object} filters
 * @param {string|null} filters.userId
 * @param {number} filters.page
 * @param {number} filters.limit
 * @returns {Promise<{total:number, page:number, limit:number, data:Array}>}
 */
const listMemories = async ({ userId = null, page = 1, limit = 50 } = {}) => {
  try {
    let all = [];

    if (userId) {
      const res = await mem0.getAll({ userId });
      all = (res.results || []).map((m) => normalize(m, userId)).filter(Boolean);
    } else {
      // Scan semua user via /entities (bounded, aman untuk dashboard)
      const entities = await mem0.listEntities();
      const userIds = (entities.entities || entities.results || [])
        .filter((e) => e.entity_type === 'user' && e.entity_id)
        .map((e) => e.entity_id)
        .slice(0, 100);

      for (const uid of userIds) {
        try {
          const res = await mem0.getAll({ userId: uid });
          all.push(...(res.results || []).map((m) => normalize(m, uid)).filter(Boolean));
        } catch (err) {
          logger.debug(`[MemoryService] listMemories skip user ${uid}: ${err.message}`);
        }
      }
    }

    const total = all.length;
    const start = (page - 1) * limit;
    return { total, page, limit, data: all.slice(start, start + limit) };
  } catch (error) {
    logger.error(`[MemoryService] listMemories error: ${error.message || error}`);
    return { total: 0, page, limit, data: [] };
  }
};

/**
 * Delete memory by ID (admin / memory_delete tool)
 * @param {string} id - Mem0 memory ID
 * @returns {Promise<boolean>}
 */
const deleteMemory = async (id) => {
  try {
    await mem0.remove(id);
    return true;
  } catch (error) {
    if (error.status === 404) {
      logger.debug(`[MemoryService] deleteMemory: memory ${id} not found`);
      return false;
    }
    logger.error(`[MemoryService] deleteMemory error: ${error.message || error}`);
    return false;
  }
};

/**
 * Get satu memory by ID (admin / memory_get tool)
 * @param {string} id - Mem0 memory ID
 * @returns {Promise<Object|null>}
 */
const getMemoryById = async (id) => {
  try {
    const res = await mem0.get(id);
    return normalize(res, null);
  } catch (error) {
    if (error.status === 404) {
      logger.debug(`[MemoryService] getMemoryById: memory ${id} not found`);
      return null;
    }
    logger.error(`[MemoryService] getMemoryById error: ${error.message || error}`);
    return null;
  }
};

/**
 * Update memory by ID — timpa teks memory langsung (admin)
 * @param {string} id - Mem0 memory ID
 * @param {Object} param
 * @param {string} param.text - Teks memory baru
 * @returns {Promise<Object|null>}
 */
const updateMemoryById = async (id, { text } = {}) => {
  if (!id || !text) {
    throw new Error('id dan text wajib diisi');
  }

  try {
    const updated = await mem0.update(id, String(text));
    logger.info(`[Memory] Updated by ID: ${id} → "${text}"`);
    return normalize(updated, null) || { id, value: text };
  } catch (error) {
    logger.error(`[MemoryService] updateMemoryById error: ${error.message || error}`);
    throw error;
  }
};

/**
 * Semantic search memories lintas user (admin dashboard)
 * @param {Object} param
 * @param {string} param.query - Query pencarian
 * @param {string|null} param.userId - Opsional, filter per user
 * @param {number} param.limit
 * @returns {Promise<{total:number, limit:number, data:Array}>}
 */
const searchMemories = async ({ query, userId = null, limit = 25 } = {}) => {
  if (!query || !String(query).trim()) {
    throw new Error('query wajib diisi');
  }

  try {
    const res = await mem0.search({
      query: String(query).trim(),
      userId,
      limit: parseInt(limit || '25', 10),
    });
    const data = (res.results || []).map((m) => normalize(m, userId)).filter(Boolean);
    return { total: data.length, limit: data.length, data };
  } catch (error) {
    logger.error(`[MemoryService] searchMemories error: ${error.message || error}`);
    throw error;
  }
};

/**
 * Cleanup expired memories — scan semua user via /entities,
 * hapus memory yang metadata.expires_at <= sekarang.
 * @returns {Promise<number>} jumlah yang dihapus
 */
const cleanupExpired = async () => {
  let deleted = 0;
  try {
    const entities = await mem0.listEntities();
    const userIds = (entities.entities || entities.results || [])
      .filter((e) => e.entity_type === 'user' && e.entity_id)
      .map((e) => e.entity_id)
      .slice(0, 100);

    for (const uid of userIds) {
      try {
        const res = await mem0.getAll({ userId: uid });
        let userDeleted = 0;
        for (const m of res.results || []) {
          if (isExpired(m)) {
            await mem0.remove(m.id);
            userDeleted++;
          }
        }
        if (userDeleted > 0) {
          deleted += userDeleted;
          await invalidateUserCache(uid);
        }
      } catch (err) {
        logger.debug(`[MemoryService] cleanupExpired skip user ${uid}: ${err.message}`);
      }
    }

    logger.info(`[MemoryService] cleanupExpired: ${deleted} expired memories removed`);
    return deleted;
  } catch (error) {
    logger.error(`[MemoryService] cleanupExpired error: ${error.message || error}`);
    return 0;
  }
};

// ============================================================
// AUTO-PROVISION — simpan data profil user dari token SSO
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
    const existing = await findByKey(userId, 'user_name');
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
        const res = await mem0.add({
          userId,
          messages: [{ role: 'user', content: value }],
          metadata: { key, type: 'fact', source: 'sso_token', confidence: 0.95 },
          infer: false,
        });
        const r = (res.results || [])[0];
        saved.push(normalize(r, userId));
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
// REDIS HELPERS — best-effort hot cache
// ============================================================

const getUserCacheKey = (userId) => `ai:memory:${userId}`;

const cacheUserMemories = async (userId, memories) => {
  if (!redisClient || !memories || memories.length === 0) return;
  try {
    await redisClient.setex(getUserCacheKey(userId), MEMORY_CACHE_TTL, JSON.stringify(memories));
  } catch (err) {
    // Redis unavailable — skip
  }
};

const getFromRedis = async (userId) => {
  if (!redisClient) return null;
  try {
    const raw = await redisClient.get(getUserCacheKey(userId));
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    return null;
  }
};

const invalidateUserCache = async (userId) => {
  if (!redisClient) return;
  try {
    await redisClient.del(getUserCacheKey(userId));
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
  getMemoryById,
  updateMemoryById,
  searchMemories,
  cleanupExpired,
  provisionUserProfile,
};
