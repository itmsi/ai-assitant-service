/**
 * Memory Tools — Ekspos memory sebagai MCP tools
 *
 * Tools ini bisa dipanggil oleh MCP client (Claude, VS Code, dll)
 * untuk mengelola memory pengguna secara langsung.
 *
 * Juga digunakan oleh feedback learning: setelah tool dieksekusi,
 * hasilnya dianalisis untuk membentuk memory baru.
 */

const { Logger } = require('../../../utils/logger');
const logger = Logger;

let memoryService = null;
try {
  memoryService = require('../memory/memoryService');
} catch (err) {
  logger.warn(`[MemoryTools] Memory service not available: ${err.message}`);
}

// ============================================================
// Tool: memory_save — Simpan memory baru
// ============================================================
const memorySave = {
  name: 'memory_save',
  description: 'Menyimpan fakta atau preferensi pengguna ke memori. Gunakan ketika user memberikan informasi personal, preferensi, atau fakta yang perlu diingat untuk sesi berikutnya. Contoh: nama, gudang favorit, customer penting, kebijakan, pengaturan default.',
  parameters: {
    type: 'object',
    properties: {
      userId: { type: 'string', description: 'User ID pemilik memory' },
      type: { type: 'string', description: 'Tipe memory: user_preference | fact | context', enum: ['user_preference', 'fact', 'context'] },
      key: { type: 'string', description: 'Key unik dalam camelCase, misal: defaultWarehouse, favoriteCustomer, currentProject' },
      value: { type: 'string', description: 'Nilai memory yang ingin disimpan' },
      confidence: { type: 'number', description: 'Tingkat keyakinan 0.00-1.00, default 0.80' },
    },
    required: ['userId', 'key', 'value'],
  },
  execute: async ({ userId, type = 'fact', key, value, confidence = 0.80 }) => {
    try {
      if (!memoryService) {
        return { success: false, message: 'Memory service tidak tersedia' };
      }

      const saved = await memoryService.upsertMemory({
        userId,
        type,
        key,
        value,
        confidence: parseFloat(confidence),
        source: 'tool_result',
      });

      logger.info(`[MemoryTools] Saved memory via tool: ${userId}/${type}:${key}`);
      return { success: true, data: saved, message: `Memory ${key} berhasil disimpan` };
    } catch (error) {
      logger.error(`[MemoryTools] Save error: ${error.message}`);
      return { success: false, message: `Gagal menyimpan memory: ${error.message}` };
    }
  },
};

// ============================================================
// Tool: memory_search — Cari memory berdasarkan key
// ============================================================
const memorySearch = {
  name: 'memory_search',
  description: 'Mencari memory pengguna yang tersimpan. Gunakan untuk melihat apa yang sistem ingat tentang user, seperti preferensi, fakta, atau konteks.',
  parameters: {
    type: 'object',
    properties: {
      userId: { type: 'string', description: 'User ID pemilik memory' },
      type: { type: 'string', description: 'Filter berdasarkan tipe (opsional)', enum: ['user_preference', 'fact', 'context', ''] },
    },
    required: ['userId'],
  },
  execute: async ({ userId, type = '' }) => {
    try {
      if (!memoryService) {
        return { success: false, message: 'Memory service tidak tersedia' };
      }

      const memories = await memoryService.getRelevantMemories(userId);
      const filtered = type ? memories.filter(m => m.type === type) : memories;

      return {
        success: true,
        data: filtered,
        message: `${filtered.length} memory ditemukan`,
      };
    } catch (error) {
      logger.error(`[MemoryTools] Search error: ${error.message}`);
      return { success: false, message: `Gagal mencari memory: ${error.message}` };
    }
  },
};

// ============================================================
// Tool: memory_delete — Hapus memory
// ============================================================
const memoryDelete = {
  name: 'memory_delete',
  description: 'Menghapus memory pengguna berdasarkan ID. Gunakan ketika user ingin melupakan sesuatu atau memperbaiki memory yang salah.',
  parameters: {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'ID memory yang akan dihapus' },
    },
    required: ['id'],
  },
  execute: async ({ id }) => {
    try {
      if (!memoryService) {
        return { success: false, message: 'Memory service tidak tersedia' };
      }

      const deleted = await memoryService.deleteMemory(id);
      return {
        success: deleted,
        message: deleted ? 'Memory berhasil dihapus' : 'Memory tidak ditemukan',
      };
    } catch (error) {
      logger.error(`[MemoryTools] Delete error: ${error.message}`);
      return { success: false, message: `Gagal menghapus memory: ${error.message}` };
    }
  },
};

// ============================================================
// Helper — extract meaningful value dari tool params/result
// ============================================================

/**
 * Cari field bernama/berakhiran 'name' di object (params atau result)
 */
const findNameField = (obj) => {
  if (!obj || typeof obj !== 'object') return null;
  // Langsung cari field 'name'
  if (obj.name) return obj.name;
  // Cari field *_name
  const nameKey = Object.keys(obj).find(k => k.endsWith('_name') && typeof obj[k] === 'string' && obj[k].length > 0);
  if (nameKey) return obj[nameKey];
  return null;
};

/**
 * Ekstrak pasangan key-value meaningful dari params (skip id, page, limit, sort)
 */
const extractMeaningfulParams = (params, skipKeys = []) => {
  if (!params || typeof params !== 'object') return [];
  const skip = new Set(['id', 'page', 'limit', 'sort_order', 'sort_by', ...skipKeys]);
  return Object.entries(params)
    .filter(([k, v]) => !skip.has(k) && v !== undefined && v !== null && v !== '')
    .map(([k, v]) => ({ key: k, value: String(v).substring(0, 100) }));
};

/**
 * Cari field descriptive pertama di result.data (name, *_name, atau field string pertama)
 * Auto-unwrap nested data: { data: { name: "X" } } → "X"
 */
const findDescriptiveValue = (data) => {
  if (!data || typeof data !== 'object') return null;
  // Handle nested data wrapping (API sering balikin { data: { ... } })
  const target = data.data && typeof data.data === 'object' && !Array.isArray(data.data) ? data.data : data;
  const name = findNameField(target);
  if (name) return name;
  // Cari field string pertama yang panjang > 3
  const strKey = Object.keys(target).find(k => typeof target[k] === 'string' && target[k].length > 3 && !['id', 'status', 'message'].includes(k));
  return strKey ? target[strKey] : null;
};

// ============================================================
// Feedback Learning — Ekstrak memory dari hasil tool
// ============================================================

/**
 * Pola untuk mendeteksi hasil tool yang mengandung informasi memory
 */
const FEEDBACK_PATTERNS = [
  // Search — simpan query yang dicari user
  { match: (toolName) => toolName.startsWith('search_'), extract: (toolName, params, result) => {
    const meaningful = extractMeaningfulParams(params, ['page', 'limit', 'sort_order', 'sort_by']);
    if (meaningful.length > 0) {
      const domain = toolName.replace('search_', '');
      // Simpan setiap meaningful param sebagai memory terpisah
      return meaningful.map(({ key, value }) => ({
        type: 'context',
        key: `searched_${domain}_${key}`,
        value,
        confidence: 0.65,
      }));
    }
    return [];
  }},

  // Get — user melihat detail suatu entitas
  { match: (toolName) => toolName.startsWith('get_'), extract: (toolName, params, result) => {
    if (result?.success && result?.data) {
      const domain = toolName.replace('get_', '');
      const value = findDescriptiveValue(result.data);
      if (value) {
        return [{
          type: 'context',
          key: `viewed_${domain}`,
          value,
          confidence: 0.70,
        }];
      }
    }
    return [];
  }},

  // Create — user membuat data baru
  // Simpan nama + SEMUA meaningful params (konsisten dengan Update)
  { match: (toolName) => toolName.startsWith('create_'), extract: (toolName, params, result) => {
    if (result?.success) {
      const domain = toolName.replace('create_', '');
      const memories = [];

      // 1. Cari nama dari result.data dulu, lalu params
      const name = findNameField(result.data) || findNameField(params);
      if (name) {
        memories.push({
          type: 'fact',
          key: `created_${domain}`,
          value: name,
          confidence: 0.75,
        });
      }

      // 2. Simpan semua meaningful params (skip id, page, limit, sort)
      const meaningful = extractMeaningfulParams(params);

      // Filter: skip param *_name yang value-nya sama dengan name (hindari duplikat)
      const paramMemories = meaningful
        .filter(({ key, value }) => !(name && key.endsWith('_name') && value === name))
        .map(({ key, value }) => ({
          type: 'fact',
          key: `created_${domain}_${key}`,
          value,
          confidence: 0.65,
        }));

      memories.push(...paramMemories);

      return memories;
    }
    return [];
  }},

  // Update — user mengubah data (force overwrite via updateMemory)
  // Simpan field apa yang diubah (bukan id)
  { match: (toolName) => toolName.startsWith('update_'), extract: (toolName, params, result) => {
    if (result?.success) {
      const domain = toolName.replace('update_', '');
      const meaningful = extractMeaningfulParams(params, ['id']);

      if (meaningful.length > 0) {
        return meaningful.map(({ key, value }) => ({
          type: 'user_preference',
          key: `updated_${domain}_${key}`,
          value,
          confidence: 0.90,
        }));
      }

      // Fallback: cari descriptive value dari result
      const value = findDescriptiveValue(result.data);
      if (value) {
        return [{
          type: 'user_preference',
          key: `updated_${domain}`,
          value,
          confidence: 0.85,
        }];
      }
    }
    return [];
  }},

  // Customer 360
  { match: (toolName) => toolName === 'getCRMCustomer360', extract: (toolName, params, result) => {
    if (result?.success && result?.data) {
      const d = result.data;
      const name = d.customer_name || d.name || findDescriptiveValue(d);
      if (name) {
        return [{ type: 'context', key: 'lastViewedCustomer', value: name, confidence: 0.85 }];
      }
    }
    return [];
  }},

  // Calculate — perhitungan keuangan
  { match: (toolName) => toolName.startsWith('calculate_'), extract: (toolName, params, result) => {
    if (result?.success) {
      const domain = toolName.replace('calculate_', '');
      // Simpan params meaningful yang dipakai untuk kalkulasi
      const meaningful = extractMeaningfulParams(params);
      if (meaningful.length > 0) {
        return meaningful.map(({ key, value }) => ({
          type: 'context',
          key: `calculated_${domain}_${key}`,
          value,
          confidence: 0.60,
        }));
      }
    }
    return [];
  }},
];

/**
 * Analyze tool execution result and extract memories
 * Dipanggil setelah executeTool() selesai
 *
 * @param {string} toolName
 * @param {Object} parameters
 * @param {Object} result
 * @param {string} userId
 * @returns {Promise<Array>} Saved memories
 */
const analyzeToolResult = async (toolName, parameters, result, userId) => {
  if (!memoryService || !userId || !result) {
    return [];
  }

  try {
    // Cari pattern yang cocok
    for (const pattern of FEEDBACK_PATTERNS) {
      if (pattern.match(toolName)) {
        const extracted = pattern.extract(toolName, parameters, result);
        if (extracted.length > 0) {
          const saved = [];
          for (const mem of extracted) {
            const isUpdate = toolName.startsWith('update_');
            // update_ → force overwrite pakai updateMemory
            // selain update_ → confidence-based upsert
            const s = isUpdate
              ? await memoryService.updateMemory({
                  userId,
                  type: mem.type,
                  key: mem.key,
                  value: mem.value,
                  confidence: mem.confidence,
                  source: 'tool_result',
                })
              : await memoryService.upsertMemory({
                  userId,
                  type: mem.type,
                  key: mem.key,
                  value: mem.value,
                  confidence: mem.confidence,
                  source: 'tool_result',
                });
            saved.push(s);
          }
          if (saved.length > 0) {
            logger.info(`[Memory] Feedback from tool '${toolName}': ${saved.length} memories`);
          }
          return saved;
        }
      }
    }
  } catch (error) {
    logger.debug(`[MemoryFeedback] Skip for ${toolName}: ${error.message}`);
  }

  return [];
};

module.exports = {
  memorySave,
  memorySearch,
  memoryDelete,
  analyzeToolResult,
};
