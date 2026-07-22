const axios = require('axios');
const { Logger } = require('../../../utils/logger');
const logger = Logger;
const aiConfig = require('../../../config/ai');
const { sanitizePath, getDefaultHeaders, cleanObject } = require('./gateway');

const searchEmployeeCompany = {
  name: 'search_employee_company',
  description: 'Mencari data company employee. Gunakan ini untuk pertanyaan tentang perusahaan dalam modul employee.',
  parameters: {
    type: 'object',
    properties: {
      page: { type: 'number', description: 'Nomor halaman (default: 1)' },
      limit: { type: 'number', description: 'Jumlah maksimal hasil (default: 100)' },
      sort_by: { type: 'string', description: 'Field untuk sorting (default: created_at)' },
    },
  },
  execute: async ({ page = 1, limit = 100, sort_by = 'created_at' }, authToken) => {
    try {
      const payload = cleanObject({ page, limit, sort_by });
      const baseUrl = (aiConfig.API_GATEWAY_BASE_URL || aiConfig.MICROSERVICE_HR_URL || '').replace(/\/$/, '');
      const endpoint = `${baseUrl}${sanitizePath('/api/companies/get')}`;
      const response = await axios.post(endpoint, payload || {}, { headers: getDefaultHeaders(authToken), timeout: aiConfig.API_GATEWAY_TIMEOUT });
      return { success: true, data: response.data, message: 'Data company employee berhasil diambil' };
    } catch (error) {
      logger.error(`Error fetching employee company: ${error.message || error}`);
      return { success: false, data: null, message: error.response?.data?.message || 'Gagal mengambil data company employee' };
    }
  },
};

const searchEmployeeDepartment = {
  name: 'search_employee_department',
  description: 'Mencari data department employee. Gunakan ini untuk pertanyaan tentang departemen dalam modul employee.',
  parameters: {
    type: 'object',
    properties: {
      page: { type: 'number', description: 'Nomor halaman (default: 1)' },
      limit: { type: 'number', description: 'Jumlah maksimal hasil (default: 100)' },
      sort_by: { type: 'string', description: 'Field untuk sorting (default: created_at)' },
    },
  },
  execute: async ({ page = 1, limit = 100, sort_by = 'created_at' }, authToken) => {
    try {
      const payload = cleanObject({ page, limit, sort_by });
      const baseUrl = (aiConfig.API_GATEWAY_BASE_URL || aiConfig.MICROSERVICE_HR_URL || '').replace(/\/$/, '');
      const endpoint = `${baseUrl}${sanitizePath('/api/departments/get')}`;
      const response = await axios.post(endpoint, payload || {}, { headers: getDefaultHeaders(authToken), timeout: aiConfig.API_GATEWAY_TIMEOUT });
      return { success: true, data: response.data, message: 'Data department employee berhasil diambil' };
    } catch (error) {
      logger.error(`Error fetching employee department: ${error.message || error}`);
      return { success: false, data: null, message: error.response?.data?.message || 'Gagal mengambil data department employee' };
    }
  },
};

const searchEmployeeTitle = {
  name: 'search_employee_title',
  description: 'Mencari data title/jabatan employee. Gunakan ini untuk pertanyaan tentang jabatan dalam modul employee.',
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
      const baseUrl = (aiConfig.API_GATEWAY_BASE_URL || aiConfig.MICROSERVICE_HR_URL || '').replace(/\/$/, '');
      const endpoint = `${baseUrl}${sanitizePath('/api/titles/get')}`;
      const response = await axios.post(endpoint, payload || {}, { headers: getDefaultHeaders(authToken), timeout: aiConfig.API_GATEWAY_TIMEOUT });
      return { success: true, data: response.data, message: 'Data title employee berhasil diambil' };
    } catch (error) {
      logger.error(`Error fetching employee title: ${error.message || error}`);
      return { success: false, data: null, message: error.response?.data?.message || 'Gagal mengambil data title employee' };
    }
  },
};

module.exports = { searchEmployeeCompany, searchEmployeeDepartment, searchEmployeeTitle };
