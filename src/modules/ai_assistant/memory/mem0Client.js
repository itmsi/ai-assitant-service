/**
 * Mem0 Client — facade untuk memori Mem0
 *
 * Mode dipilih via env MEM0_MODE (config/ai.js):
 * - 'server'  (default) → REST server self-hosted (Docker/production, Postgres+pgvector)
 * - 'library'           → embedded mem0ai SDK (lokal tanpa Docker/Postgres)
 *
 * Keduanya punya method yang sama, jadi memoryService.js tidak perlu tahu mode.
 */

const aiConfig = require('../../../config/ai');
const { Logger } = require('../../../utils/logger');
const logger = Logger;

if (aiConfig.MEM0_MODE === 'library') {
  logger.info('[Mem0Client] MEM0_MODE=library — menggunakan embedded mem0ai SDK (tanpa server)');
  module.exports = require('./mem0LibraryClient');
  return;
}

const axios = require('axios');

const BASE_URL = (aiConfig.MEM0_BASE_URL || 'http://localhost:8000').replace(/\/+$/, '');

const client = axios.create({
  baseURL: BASE_URL,
  timeout: aiConfig.MEM0_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    ...(aiConfig.MEM0_API_KEY ? { 'X-API-Key': aiConfig.MEM0_API_KEY } : {}),
  },
});

const handleError = (action, error) => {
  const detail = error?.response?.data
    ? JSON.stringify(error.response.data)
    : (error.message || String(error));
  logger.error(`[Mem0Client] ${action} failed: ${detail}`);
  const err = new Error(`Mem0 ${action} error: ${detail}`);
  err.status = error?.response?.status || null;
  throw err;
};

const Mem0Client = {
  /**
   * Tambah memory — Mem0 melakukan extraction + ADD/UPDATE/DELETE inference
   * @param {Object} param
   * @param {string} param.userId
   * @param {Array<{role:string, content:string}>} param.messages
   * @param {Object} param.metadata - metadata tambahan (key, type, confidence, source, dll)
   * @param {boolean} param.infer - true → LLM extract; false → simpan content apa adanya
   * @returns {Promise<{results: Array<{id:string, memory:string, event:string}>}>}
   */
  async add({ userId, agentId = null, messages, metadata = {}, infer = true }) {
    try {
      const body = { messages, metadata, infer };
      if (userId) body.user_id = userId;
      if (agentId) body.agent_id = agentId;
      const { data } = await client.post('/memories', body);
      return data;
    } catch (error) {
      handleError('add', error);
    }
  },

  /**
   * Semantic search memory
   * @returns {Promise<{results: Array<{id:string, memory:string, score:number, metadata?:Object, user_id?:string}>}>}
   */
  async search({ query, userId = null, agentId = null, limit = 25, filters = null }) {
    try {
      const body = { query, limit };
      if (userId) body.user_id = userId;
      if (agentId) body.agent_id = agentId;
      if (filters) body.filters = filters;
      const { data } = await client.post('/search', body);
      return data;
    } catch (error) {
      handleError('search', error);
    }
  },

  /**
   * Get semua memory user (atau agent/run)
   * @returns {Promise<{results: Array<Object>}>}
   */
  async getAll({ userId = null, agentId = null, limit = null }) {
    try {
      const params = {};
      if (userId) params.user_id = userId;
      if (agentId) params.agent_id = agentId;
      if (limit) params.limit = limit;
      const { data } = await client.get('/memories', { params });
      return data;
    } catch (error) {
      handleError('getAll', error);
    }
  },

  /** Get satu memory by ID */
  async get(memoryId) {
    try {
      const { data } = await client.get(`/memories/${memoryId}`);
      return data;
    } catch (error) {
      handleError('get', error);
    }
  },

  /** Update text memory by ID (body: { text }) */
  async update(memoryId, text) {
    try {
      const { data } = await client.put(`/memories/${memoryId}`, { text });
      return data;
    } catch (error) {
      handleError('update', error);
    }
  },

  /** Delete satu memory by ID */
  async remove(memoryId) {
    try {
      await client.delete(`/memories/${memoryId}`);
      return true;
    } catch (error) {
      handleError('remove', error);
    }
  },

  /** Delete semua memory untuk identifier */
  async removeAll({ userId = null, agentId = null }) {
    try {
      const params = {};
      if (userId) params.user_id = userId;
      if (agentId) params.agent_id = agentId;
      await client.delete('/memories', { params });
      return true;
    } catch (error) {
      handleError('removeAll', error);
    }
  },

  /**
   * Daftar entities (user_id / agent_id / run_id) — untuk admin list & cleanup
   * @returns {Promise<{entities: Array<{entity_type:string, entity_id:string, memory_count:number}>}>}
   */
  async listEntities() {
    try {
      const { data } = await client.get('/entities');
      return data;
    } catch (error) {
      handleError('listEntities', error);
    }
  },
};

module.exports = Mem0Client;
