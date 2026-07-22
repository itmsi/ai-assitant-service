const axios = require('axios');
const { Logger } = require('../../../utils/logger');
const logger = Logger;
const aiConfig = require('../../../config/ai');
const { sanitizePath, getDefaultHeaders, cleanObject } = require('./gateway');

const searchECatalogProducts = {
  name: 'search_ecatalog_products',
  description: 'Mencari produk dari eCatalog berdasarkan nama, kategori, atau keyword.',
  parameters: {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Nama produk untuk pencarian' },
      category: { type: 'string', description: 'Kategori produk' },
      keyword: { type: 'string', description: 'Keyword untuk pencarian produk' },
      limit: { type: 'number', description: 'Jumlah maksimal hasil (default: 10)' },
    },
  },
  execute: async ({ name, category, keyword, limit = 10 }, authToken) => {
    try {
      const payload = cleanObject({ name, category, keyword, limit });
      const baseUrl = (aiConfig.API_GATEWAY_BASE_URL || aiConfig.MICROSERVICE_ECATALOG_URL || '').replace(/\/$/, '');
      const endpoint = aiConfig.API_GATEWAY_BASE_URL
        ? `${baseUrl}${sanitizePath('/api/catalogs/catalogItems/get')}`
        : `${baseUrl}${sanitizePath('/api/products')}`;
      const axiosConfig = { headers: getDefaultHeaders(authToken), timeout: aiConfig.API_GATEWAY_TIMEOUT };
      const response = aiConfig.API_GATEWAY_BASE_URL
        ? await axios.post(endpoint, payload || {}, axiosConfig)
        : await axios.get(endpoint, { ...axiosConfig, params: payload });
      return { success: true, data: response.data, message: 'Data produk berhasil diambil' };
    } catch (error) {
      logger.error(`Error fetching eCatalog products: ${error.message || error}`);
      return { success: false, data: null, message: error.response?.data?.message || 'Gagal mengambil data produk' };
    }
  },
};

module.exports = { searchECatalogProducts };
