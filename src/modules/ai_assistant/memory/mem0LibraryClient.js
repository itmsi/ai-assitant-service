/**
 * Mem0 Library Client — embedded mem0ai SDK (mode lokal TANPA Docker server)
 *
 * Dipakai saat MEM0_MODE=library (local development).
 * Vector store:
 *   - 'memory'   (default) → in-memory (MemoryVectorStore), data hilang saat restart
 *   - 'pgvector' → persistent di Postgres + extension vector (MEM0_VECTOR_STORE=pgvector)
 * History: SQLite (storages/mem0/history.db) → riwayat operation tersimpan.
 *
 * API method SAMA dengan mem0Client.js (REST server), jadi memoryService.js
 * tidak perlu tahu mode mana yang aktif:
 * - add / search / getAll / get / update / remove / removeAll / listEntities
 *
 * Catatan: butuh LLM + embedder key (default Sumopod / OPENAI_API_KEY).
 * Tanpa key, semua operasi gagal graceful (memoryService fail-safe ke []).
 */

const fs = require('fs');
const path = require('path');
const aiConfig = require('../../../config/ai');
const { Logger } = require('../../../utils/logger');
const logger = Logger;

let memoryInstance = null;
let initError = null;

// Emulasi GET /entities — daftar userId yang pernah menyentuh mem0 (untuk listMemories/cleanupExpired)
const seenUsers = new Set();

const ensureHistoryDir = () => {
  try {
    const dbPath = aiConfig.MEM0_HISTORY_DB_PATH || 'storages/mem0/history.db';
    const dir = path.dirname(path.resolve(dbPath));
    fs.mkdirSync(dir, { recursive: true });
    return dbPath;
  } catch (err) {
    logger.debug(`[Mem0Library] Cannot create history dir: ${err.message}`);
    return null;
  }
};

/**
 * Bangun konfigurasi vector store untuk mem0ai SDK.
 * MEM0_VECTOR_STORE=memory   → in-memory (RAM), data hilang saat restart
 * MEM0_VECTOR_STORE=pgvector → Postgres + extension vector (persistent)
 */
const buildVectorStoreConfig = () => {
  const mode = aiConfig.MEM0_VECTOR_STORE || 'memory';

  if (mode === 'pgvector') {
    const pg = aiConfig.MEM0_PG || {};
    const connectionString = pg.connectionString;
    const config = {
      collectionName: 'memories',
      dimension: 1536, // text-embedding-3-small
      embeddingModelDims: 1536, // dipakai PGVector.createCol → vector(dims)
      ...(pg.hnsw ? { hnsw: true } : {}),
    };
    if (connectionString) {
      config.connectionString = connectionString;
    } else {
      config.host = pg.host || 'localhost';
      config.port = pg.port || 5432;
      config.user = pg.user || 'postgres';
      config.password = pg.password || '';
      config.dbname = pg.dbname || 'ai_assistant';
    }
    return { provider: 'pgvector', config };
  }

  return {
    provider: 'memory',
    config: { collectionName: 'memories', dimension: 1536 },
  };
};

/** Lazy init SDK — konstruksi Memory() tidak async, init vektor store ditunda sampai call pertama */
const getMemory = () => {
  if (memoryInstance) return memoryInstance;
  if (initError) throw initError;

  try {
    const { Memory } = require('mem0ai/oss');

    const historyDbPath = ensureHistoryDir();

    // Base URL LLM & embedder — mengikuti provider aktif (Sumopod default di project ini)
    const llmBaseUrl = aiConfig.MEM0_LLM_BASE_URL || '';
    const embedderBaseUrl = aiConfig.MEM0_EMBEDDER_BASE_URL || llmBaseUrl || undefined;
    const apiKey = aiConfig.MEM0_LLM_API_KEY || aiConfig.OPENAI_API_KEY || '';

    memoryInstance = new Memory({
      embedder: {
        provider: 'openai',
        config: {
          apiKey,
          model: aiConfig.MEM0_EMBEDDER_MODEL || 'text-embedding-3-small',
          ...(embedderBaseUrl ? { baseURL: embedderBaseUrl } : {}),
        },
      },
      llm: {
        provider: 'openai',
        config: {
          apiKey,
          model: aiConfig.MEM0_LLM_MODEL || 'gpt-4o-mini',
          ...(llmBaseUrl ? { baseURL: llmBaseUrl } : {}),
        },
      },
      vectorStore: buildVectorStoreConfig(),
      ...(historyDbPath
        ? { historyStore: { provider: 'sqlite', config: { historyDbPath } } }
        : { disableHistory: true }),
    });

    logger.info(`[Mem0Library] mem0ai SDK initialized (vector store: ${aiConfig.MEM0_VECTOR_STORE || 'memory'}, SQLite history)`);
    return memoryInstance;
  } catch (error) {
    initError = error;
    logger.error(`[Mem0Library] Init failed: ${error.message}`);
    throw error;
  }
};

const handleError = (action, error) => {
  const detail = error?.message || String(error);
  logger.error(`[Mem0Library] ${action} failed: ${detail}`);
  const err = new Error(`Mem0(library) ${action} error: ${detail}`);
  err.status = error?.status || null;
  throw err;
};

const Mem0LibraryClient = {
  /** Tambah memory — Mem0 melakukan extraction + ADD/UPDATE/DELETE inference */
  async add({ userId, agentId = null, messages, metadata = {}, infer = true }) {
    try {
      if (userId) seenUsers.add(userId);
      if (agentId) seenUsers.add(agentId);

      const config = { metadata, infer };
      if (userId) config.userId = userId;
      if (agentId) config.agentId = agentId;

      const res = await getMemory().add(messages, config);
      return res; // { results: MemoryItem[] }
    } catch (error) {
      handleError('add', error);
    }
  },

  /** Semantic search memory */
  async search({ query, userId = null, agentId = null, limit = 25, filters = null }) {
    try {
      if (userId) seenUsers.add(userId);

      const config = { topK: limit };
      if (userId) config.filters = { user_id: userId };
      else if (agentId) config.filters = { agent_id: agentId };
      else if (filters) config.filters = filters;

      const res = await getMemory().search(query, config);
      return res; // { results: MemoryItem[] }
    } catch (error) {
      handleError('search', error);
    }
  },

  /** Get semua memory user (atau agent) */
  async getAll({ userId = null, agentId = null, limit = null }) {
    try {
      if (userId) seenUsers.add(userId);

      const config = {};
      if (limit) config.topK = limit;
      if (userId) config.filters = { user_id: userId };
      else if (agentId) config.filters = { agent_id: agentId };

      const res = await getMemory().getAll(config);
      return res; // { results: MemoryItem[] }
    } catch (error) {
      handleError('getAll', error);
    }
  },

  /** Get satu memory by ID */
  async get(memoryId) {
    try {
      return await getMemory().get(memoryId); // MemoryItem | null
    } catch (error) {
      handleError('get', error);
    }
  },

  /** Update text memory by ID */
  async update(memoryId, text) {
    try {
      return await getMemory().update(memoryId, { text: String(text) });
    } catch (error) {
      handleError('update', error);
    }
  },

  /** Delete satu memory by ID */
  async remove(memoryId) {
    try {
      await getMemory().delete(memoryId);
      return true;
    } catch (error) {
      handleError('remove', error);
    }
  },

  /** Delete semua memory untuk identifier */
  async removeAll({ userId = null, agentId = null }) {
    try {
      const config = {};
      if (userId) config.userId = userId;
      if (agentId) config.agentId = agentId;
      await getMemory().deleteAll(config);
      return true;
    } catch (error) {
      handleError('removeAll', error);
    }
  },

  /**
   * Daftar entities — emulasi dari userId yang terlihat sejak proses start.
   * (SDK tidak punya endpoint /entities; cukup untuk listMemories & cleanupExpired di lokal)
   */
  async listEntities() {
    try {
      const entities = [...seenUsers].map((id) => ({
        entity_type: 'user',
        entity_id: id,
        memory_count: 0,
      }));
      return { entities };
    } catch (error) {
      handleError('listEntities', error);
    }
  },
};

module.exports = Mem0LibraryClient;
