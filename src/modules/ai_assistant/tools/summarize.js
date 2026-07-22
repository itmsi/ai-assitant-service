const { Logger } = require('../../../utils/logger');
const logger = Logger;

const summarizeData = {
  name: 'summarize_data',
  description: 'Merangkum dan menganalisis data yang diberikan. Gunakan ini untuk membuat ringkasan dari data yang telah diambil.',
  parameters: {
    type: 'object',
    properties: {
      data: { type: 'object', description: 'Data yang akan dirangkum' },
      summaryType: { type: 'string', description: 'Jenis ringkasan (count, statistics, key_points)', enum: ['count', 'statistics', 'key_points'] },
    },
  },
  execute: async ({ data, summaryType = 'key_points' }) => {
    try {
      if (summaryType === 'count') {
        const count = Array.isArray(data) ? data.length : (data?.data?.length || 0);
        return { success: true, data: { count }, message: `Total data: ${count}` };
      }
      if (summaryType === 'statistics' && Array.isArray(data)) {
        return { success: true, data: { total: data.length, message: `Total: ${data.length} item` }, message: 'Statistik data' };
      }
      return { success: true, data: { summary: 'Ringkasan data telah dibuat', items: Array.isArray(data) ? data.slice(0, 5) : data }, message: 'Data berhasil dirangkum' };
    } catch (error) {
      logger.error(`Error summarizing data: ${error.message || error}`);
      return { success: false, data: null, message: 'Gagal merangkum data' };
    }
  },
};

module.exports = { summarizeData };
