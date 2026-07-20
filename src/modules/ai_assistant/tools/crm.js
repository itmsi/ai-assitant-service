const axios = require('axios');
const { Logger } = require('../../../utils/logger');
const logger = Logger;
const aiConfig = require('../../../config/ai');
const { sanitizePath, getDefaultHeaders, cleanObject } = require('./gateway');

const searchCRMTerritory = {
  name: 'search_crm_territory',
  menuKey: 'iup_management_crm',
  action: 'read',
  description: 'Mencari data territory management CRM. Gunakan ini untuk pertanyaan tentang wilayah atau territory dalam CRM.',
  parameters: {
    type: 'object',
    properties: {
      search: { type: 'string', description: 'Keyword pencarian territory' },
      page: { type: 'number', description: 'Nomor halaman (default: 1)' },
      limit: { type: 'number', description: 'Jumlah maksimal hasil (default: 100)' },
      sort_order: { type: 'string', enum: ['asc', 'desc'], description: 'Urutan sorting (default: desc)' },
      is_admin: { type: 'string', description: 'Filter admin (true/false)' },
    },
  },
  execute: async ({ search, page = 1, limit = 100, sort_order = 'desc', is_admin }, authToken) => {
    try {
      const payload = cleanObject({ page, limit, sort_order, search, is_admin });
      const baseUrl = (aiConfig.API_GATEWAY_BASE_URL || '').replace(/\/$/, '');
      const endpoint = `${baseUrl}${sanitizePath('/api/crm/territory/get')}`;
      const response = await axios.post(endpoint, payload || {}, { headers: getDefaultHeaders(authToken), timeout: aiConfig.API_GATEWAY_TIMEOUT });
      return { success: true, data: response.data, message: 'Data territory CRM berhasil diambil' };
    } catch (error) {
      logger.error(`Error fetching CRM territory: ${error.message || error}`);
      return { success: false, data: null, message: error.response?.data?.message || 'Gagal mengambil data territory CRM' };
    }
  },
};

const searchCRMIUPManagement = {
  name: 'search_crm_iup_management',
  menuKey: 'iup_management_crm',
  action: 'read',
  description: 'Mencari data IUP (Izin Usaha Pertambangan) management CRM. Gunakan ini untuk pertanyaan tentang IUP dalam CRM. Tool ini mengakses endpoint /api/crm/iup_management/get untuk mendapatkan data IUP. Response dari endpoint ini berisi summary statistics seperti total_iup, total_iup_aktif, total_contractor, total_iup_have_contractor, total_iup_no_contractor.',
  parameters: {
    type: 'object',
    properties: {
      search: { type: 'string', description: 'Keyword pencarian IUP' },
      page: { type: 'number', description: 'Nomor halaman (default: 1)' },
      limit: { type: 'number', description: 'Jumlah maksimal hasil (default: 100)' },
      sort_by: { type: 'string', description: 'Field untuk sorting (default: created_at)' },
      sort_order: { type: 'string', enum: ['asc', 'desc'], description: 'Urutan sorting (default: desc)' },
      status: { type: 'string', description: 'Status IUP' },
      is_admin: { type: 'string', description: 'Filter admin (default: true)' },
      employee_id: { type: 'string', description: 'ID employee untuk filter' },
      segmentation_id: { type: 'string', description: 'ID segmentasi' },
    },
  },
  execute: async ({ search, page = 1, limit = 100, sort_by = 'created_at', sort_order = 'desc', status, is_admin = 'true', employee_id, segmentation_id }, authToken) => {
    try {
      const payload = cleanObject({ page, limit, sort_by, sort_order, search: search || '', status: status || '', is_admin: is_admin || 'true', employee_id: employee_id || null, segmentation_id: segmentation_id || null });
      const baseUrl = (aiConfig.API_GATEWAY_BASE_URL || '').replace(/\/$/, '');
      const endpoint = `${baseUrl}${sanitizePath('/api/crm/iup_management/get')}`;
      const response = await axios.post(endpoint, payload || {}, { headers: getDefaultHeaders(authToken), timeout: aiConfig.API_GATEWAY_TIMEOUT });
      return { success: true, data: response.data, message: 'Data IUP management CRM berhasil diambil' };
    } catch (error) {
      logger.error(`Error fetching CRM IUP management: ${error.message || error}`);
      return { success: false, data: null, message: error.response?.data?.message || 'Gagal mengambil data IUP management CRM' };
    }
  },
};

const searchCRMSegmentation = {
  name: 'search_crm_segmentation',
  menuKey: 'iup_management_crm',
  action: 'read',
  description: 'Mencari data segmentasi CRM. Gunakan ini untuk pertanyaan tentang segmentasi customer dalam CRM.',
  parameters: {
    type: 'object',
    properties: {
      search: { type: 'string', description: 'Keyword pencarian segmentasi' },
      page: { type: 'number', description: 'Nomor halaman (default: 1)' },
      limit: { type: 'number', description: 'Jumlah maksimal hasil (default: 100)' },
      sort_order: { type: 'string', enum: ['asc', 'desc'], description: 'Urutan sorting (default: desc)' },
      is_admin: { type: 'string', description: 'Filter admin (true/false)' },
    },
  },
  execute: async ({ search, page = 1, limit = 100, sort_order = 'desc', is_admin }, authToken) => {
    try {
      const payload = cleanObject({ page, limit, sort_order, search, is_admin });
      const baseUrl = (aiConfig.API_GATEWAY_BASE_URL || '').replace(/\/$/, '');
      const endpoint = `${baseUrl}${sanitizePath('/api/crm/segmentation/get')}`;
      const response = await axios.post(endpoint, payload || {}, { headers: getDefaultHeaders(authToken), timeout: aiConfig.API_GATEWAY_TIMEOUT });
      return { success: true, data: response.data, message: 'Data segmentasi CRM berhasil diambil' };
    } catch (error) {
      logger.error(`Error fetching CRM segmentation: ${error.message || error}`);
      return { success: false, data: null, message: error.response?.data?.message || 'Gagal mengambil data segmentasi CRM' };
    }
  },
};

const searchCRMIUPCustomers = {
  name: 'search_crm_iup_customers',
  menuKey: 'contractors_crm',
  action: 'read',
  description: 'Mencari data customer atau contractor IUP CRM. Gunakan ini untuk pertanyaan tentang customer atau contractor yang terkait dengan IUP.',
  parameters: {
    type: 'object',
    properties: {
      search: { type: 'string', description: 'Keyword pencarian customer' },
      page: { type: 'number', description: 'Nomor halaman (default: 1)' },
      limit: { type: 'number', description: 'Jumlah maksimal hasil (default: 100)' },
      sort_order: { type: 'string', enum: ['asc', 'desc'], description: 'Urutan sorting (default: desc)' },
      mine_type: { type: 'string', description: 'Jenis tambang' },
      status: { type: 'string', description: 'Status customer' },
      is_admin: { type: 'string', description: 'Filter admin (true/false)' },
    },
  },
  execute: async ({ search, page = 1, limit = 100, sort_order = 'desc', mine_type, status, is_admin }, authToken) => {
    try {
      const payload = cleanObject({ page, limit, sort_order, search, mine_type, status, is_admin });
      const baseUrl = (aiConfig.API_GATEWAY_BASE_URL || '').replace(/\/$/, '');
      const endpoint = `${baseUrl}${sanitizePath('/api/crm/iup_customers/get')}`;
      const response = await axios.post(endpoint, payload || {}, { headers: getDefaultHeaders(authToken), timeout: aiConfig.API_GATEWAY_TIMEOUT });
      return { success: true, data: response.data, message: 'Data IUP customers CRM berhasil diambil' };
    } catch (error) {
      logger.error(`Error fetching CRM IUP customers: ${error.message || error}`);
      return { success: false, data: null, message: error.response?.data?.message || 'Gagal mengambil data IUP customers CRM' };
    }
  },
};

const searchCRMTransactions = {
  name: 'search_crm_transactions',
  menuKey: 'iup_management_crm',
  action: 'read',
  description: 'Mencari data transaksi atau aktivitas CRM. Gunakan ini untuk pertanyaan tentang transaksi atau aktivitas dalam CRM.',
  parameters: {
    type: 'object',
    properties: {
      search: { type: 'string', description: 'Keyword pencarian transaksi' },
      page: { type: 'number', description: 'Nomor halaman (default: 1)' },
      limit: { type: 'number', description: 'Jumlah maksimal hasil (default: 100)' },
      sort_by: { type: 'string', description: 'Field untuk sorting (default: updated_at)' },
      sort_order: { type: 'string', enum: ['asc', 'desc'], description: 'Urutan sorting (default: desc)' },
    },
  },
  execute: async ({ search, page = 1, limit = 100, sort_by = 'updated_at', sort_order = 'desc' }, authToken) => {
    try {
      const payload = cleanObject({ page, limit, sort_order, sort_by, search });
      const baseUrl = (aiConfig.API_GATEWAY_BASE_URL || '').replace(/\/$/, '');
      const endpoint = `${baseUrl}${sanitizePath('/api/crm/transactions/get')}`;
      const response = await axios.post(endpoint, payload || {}, { headers: getDefaultHeaders(authToken), timeout: aiConfig.API_GATEWAY_TIMEOUT });
      return { success: true, data: response.data, message: 'Data transaksi CRM berhasil diambil' };
    } catch (error) {
      logger.error(`Error fetching CRM transactions: ${error.message || error}`);
      return { success: false, data: null, message: error.response?.data?.message || 'Gagal mengambil data transaksi CRM' };
    }
  },
};

const searchCRMEmployeeDataAccess = {
  name: 'search_crm_employee_data_access',
  menuKey: 'iup_management_crm',
  action: 'read',
  description: 'Mencari data akses employee CRM. Gunakan ini untuk pertanyaan tentang user management atau akses data employee dalam CRM.',
  parameters: {
    type: 'object',
    properties: {
      search: { type: 'string', description: 'Keyword pencarian employee' },
      page: { type: 'number', description: 'Nomor halaman (default: 1)' },
      limit: { type: 'number', description: 'Jumlah maksimal hasil (default: 100)' },
      sort_order: { type: 'string', enum: ['asc', 'desc'], description: 'Urutan sorting (default: desc)' },
      is_admin: { type: 'string', description: 'Filter admin (true/false)' },
    },
  },
  execute: async ({ search, page = 1, limit = 100, sort_order = 'desc', is_admin }, authToken) => {
    try {
      const payload = cleanObject({ page, limit, sort_order, search, is_admin });
      const baseUrl = (aiConfig.API_GATEWAY_BASE_URL || '').replace(/\/$/, '');
      const endpoint = `${baseUrl}${sanitizePath('/api/crm/employee-data-access/get')}`;
      const response = await axios.post(endpoint, payload || {}, { headers: getDefaultHeaders(authToken), timeout: aiConfig.API_GATEWAY_TIMEOUT });
      return { success: true, data: response.data, message: 'Data employee data access CRM berhasil diambil' };
    } catch (error) {
      logger.error(`Error fetching CRM employee data access: ${error.message || error}`);
      return { success: false, data: null, message: error.response?.data?.message || 'Gagal mengambil data employee data access CRM' };
    }
  },
};

const searchCRMIsland = {
  name: 'search_crm_island',
  menuKey: 'iup_management_crm',
  action: 'read',
  description: 'Mencari data island dari CRM. Gunakan ini untuk pertanyaan tentang island di dalam CRM.',
  parameters: {
    type: 'object',
    properties: {
      search: { type: 'string', description: 'Keyword pencarian island' },
      page: { type: 'number', description: 'Nomor halaman (default: 1)' },
      limit: { type: 'number', description: 'Jumlah maksimal hasil (default: 100)' },
      sort_by: { type: 'string', description: 'Field untuk sorting (default: created_at)' },
      sort_order: { type: 'string', enum: ['asc', 'desc'], description: 'Urutan sorting (default: desc)' },
    },
  },
  execute: async ({ search, page = 1, limit = 100, sort_by = 'created_at', sort_order = 'desc' }, authToken) => {
    try {
      const payload = cleanObject({ page, limit, sort_order, sort_by, search });
      const baseUrl = (aiConfig.API_GATEWAY_BASE_URL || '').replace(/\/$/, '');
      const endpoint = `${baseUrl}${sanitizePath('/api/crm/island/get')}`;
      const response = await axios.post(endpoint, payload || {}, { headers: getDefaultHeaders(authToken), timeout: aiConfig.API_GATEWAY_TIMEOUT });
      return { success: true, data: response.data, message: 'Data island CRM berhasil diambil' };
    } catch (error) {
      logger.error(`Error fetching CRM island: ${error.message || error}`);
      return { success: false, data: null, message: error.response?.data?.message || 'Gagal mengambil data island CRM' };
    }
  },
};

module.exports = {
  searchCRMTerritory,
  searchCRMIUPManagement,
  searchCRMSegmentation,
  searchCRMIUPCustomers,
  searchCRMTransactions,
  searchCRMEmployeeDataAccess,
  searchCRMIsland,
};
