const axios = require('axios');
const { Logger } = require('../../../utils/logger');
const logger = Logger;
const aiConfig = require('../../../config/ai');
const { sanitizePath, getDefaultHeaders, cleanObject } = require('./gateway');

const searchPowerBIDashboard = {
  name: 'search_powerbi_dashboard',
  description: 'Mencari data Power BI dashboard berdasarkan status. Gunakan ini untuk pertanyaan tentang dashboard Power BI yang aktif atau tersedia.',
  parameters: {
    type: 'object',
    properties: {
      status: { type: 'string', description: 'Status dashboard (active, inactive)' },
      page: { type: 'number', description: 'Nomor halaman (default: 1)' },
      limit: { type: 'number', description: 'Jumlah maksimal hasil (default: 1000)' },
    },
  },
  execute: async ({ status = 'active', page = 1, limit = 1000 }, authToken) => {
    try {
      const payload = cleanObject({ page, limit, status });
      const baseUrl = (aiConfig.API_GATEWAY_BASE_URL || '').replace(/\/$/, '');
      const endpoint = `${baseUrl}${sanitizePath('/api/powerbi/dashboard')}`;
      const response = await axios.post(endpoint, payload || {}, { headers: getDefaultHeaders(authToken), timeout: aiConfig.API_GATEWAY_TIMEOUT });
      return { success: true, data: response.data, message: 'Data Power BI dashboard berhasil diambil' };
    } catch (error) {
      logger.error(`Error fetching Power BI dashboard: ${error.message || error}`);
      return { success: false, data: null, message: error.response?.data?.message || 'Gagal mengambil data Power BI dashboard' };
    }
  },
};

const searchPowerBICategory = {
  name: 'search_powerbi_category',
  description: 'Mencari kategori Power BI. Gunakan ini untuk pertanyaan tentang kategori dashboard Power BI.',
  parameters: {
    type: 'object',
    properties: {
      page: { type: 'number', description: 'Nomor halaman (default: 1)' },
      limit: { type: 'number', description: 'Jumlah maksimal hasil (default: 1000)' },
    },
  },
  execute: async ({ page = 1, limit = 1000 }, authToken) => {
    try {
      const payload = cleanObject({ page, limit });
      const baseUrl = (aiConfig.API_GATEWAY_BASE_URL || '').replace(/\/$/, '');
      const endpoint = `${baseUrl}${sanitizePath('/api/categories/get')}`;
      const response = await axios.post(endpoint, payload || {}, { headers: getDefaultHeaders(authToken), timeout: aiConfig.API_GATEWAY_TIMEOUT });
      return { success: true, data: response.data, message: 'Data kategori Power BI berhasil diambil' };
    } catch (error) {
      logger.error(`Error fetching Power BI category: ${error.message || error}`);
      return { success: false, data: null, message: error.response?.data?.message || 'Gagal mengambil data kategori Power BI' };
    }
  },
};

const searchPowerBIManage = {
  name: 'search_powerbi_manage',
  description: 'Mencari data manajemen Power BI. Gunakan ini untuk pertanyaan tentang pengaturan atau manajemen Power BI.',
  parameters: {
    type: 'object',
    properties: {
      page: { type: 'number', description: 'Nomor halaman (default: 1)' },
      limit: { type: 'number', description: 'Jumlah maksimal hasil (default: 1000)' },
    },
  },
  execute: async ({ page = 1, limit = 1000 }, authToken) => {
    try {
      const payload = cleanObject({ page, limit });
      const baseUrl = (aiConfig.API_GATEWAY_BASE_URL || '').replace(/\/$/, '');
      const endpoint = `${baseUrl}${sanitizePath('/api/powerbi/get')}`;
      const response = await axios.post(endpoint, payload || {}, { headers: getDefaultHeaders(authToken), timeout: aiConfig.API_GATEWAY_TIMEOUT });
      return { success: true, data: response.data, message: 'Data manajemen Power BI berhasil diambil' };
    } catch (error) {
      logger.error(`Error fetching Power BI manage: ${error.message || error}`);
      return { success: false, data: null, message: error.response?.data?.message || 'Gagal mengambil data manajemen Power BI' };
    }
  },
};

module.exports = { searchPowerBIDashboard, searchPowerBICategory, searchPowerBIManage };
