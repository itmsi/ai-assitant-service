const axios = require('axios');
const { Logger } = require('../../../utils/logger');
const logger = Logger;
const aiConfig = require('../../../config/ai');
const { sanitizePath, getDefaultHeaders, cleanObject } = require('./gateway');

/**
 * Tool: Search Companies
 * Endpoint: POST /api/companies/get
 */
const searchSSOCompanies = {
  name: 'search_sso_companies',
  menuKey: 'User Management',
  action: 'read',
  description: 'Mencari data perusahaan/companies dari SSO. Gunakan untuk pertanyaan tentang daftar perusahaan, struktur perusahaan, atau hierarki perusahaan.',
  parameters: {
    type: 'object',
    properties: {
      search: { type: 'string', description: 'Keyword pencarian perusahaan' },
      page: { type: 'number', description: 'Nomor halaman (default: 1)' },
      limit: { type: 'number', description: 'Jumlah maksimal hasil (default: 100)' },
      sort_by: { type: 'string', description: 'Field sorting (default: created_at)' },
      sort_order: { type: 'string', enum: ['asc', 'desc'], description: 'Urutan sorting (default: desc)' },
      company_name: { type: 'string', description: 'Filter exact company name' },
      company_parent_id: { type: 'string', description: 'Filter parent company ID' },
      is_delete: { type: 'string', description: 'Filter deletion status' },
    },
  },
  execute: async (params, authToken) => {
    try {
      const payload = cleanObject({ page: 1, limit: 100, sort_by: 'created_at', sort_order: 'desc', ...params });
      const baseUrl = (aiConfig.API_GATEWAY_BASE_URL || '').replace(/\/$/, '');
      const endpoint = `${baseUrl}${sanitizePath('/api/companies/get')}`;
      const response = await axios.post(endpoint, payload || {}, { headers: getDefaultHeaders(authToken), timeout: aiConfig.API_GATEWAY_TIMEOUT });
      return { success: true, data: response.data, message: 'Data companies berhasil diambil' };
    } catch (error) {
      logger.error(`Error fetching companies: ${error.message || error}`);
      return { success: false, data: null, message: error.response?.data?.message || 'Gagal mengambil data companies' };
    }
  },
};

/**
 * Tool: Search Departments
 * Endpoint: POST /api/departments/get
 */
const searchSSODepartments = {
  name: 'search_sso_departments',
  menuKey: 'User Management',
  action: 'read',
  description: 'Mencari data departemen dari SSO. Gunakan untuk pertanyaan tentang daftar departemen dalam perusahaan.',
  parameters: {
    type: 'object',
    properties: {
      search: { type: 'string', description: 'Keyword pencarian departemen' },
      page: { type: 'number', description: 'Nomor halaman (default: 1)' },
      limit: { type: 'number', description: 'Jumlah maksimal hasil (default: 100)' },
      sort_by: { type: 'string', description: 'Field sorting (default: created_at)' },
      sort_order: { type: 'string', enum: ['asc', 'desc'], description: 'Urutan sorting (default: desc)' },
      company_id: { type: 'string', description: 'Filter by company ID' },
      department_name: { type: 'string', description: 'Filter exact department name' },
      department_parent_id: { type: 'string', description: 'Filter parent department ID' },
      is_delete: { type: 'string', description: 'Filter by deletion status' },
      start_date: { type: 'string', description: 'Filter created from (ISO 8601)' },
      end_date: { type: 'string', description: 'Filter created until (ISO 8601)' },
    },
  },
  execute: async (params, authToken) => {
    try {
      const payload = cleanObject({ page: 1, limit: 100, sort_by: 'created_at', sort_order: 'desc', ...params });
      const baseUrl = (aiConfig.API_GATEWAY_BASE_URL || '').replace(/\/$/, '');
      const endpoint = `${baseUrl}${sanitizePath('/api/departments/get')}`;
      const response = await axios.post(endpoint, payload || {}, { headers: getDefaultHeaders(authToken), timeout: aiConfig.API_GATEWAY_TIMEOUT });
      return { success: true, data: response.data, message: 'Data departments berhasil diambil' };
    } catch (error) {
      logger.error(`Error fetching departments: ${error.message || error}`);
      return { success: false, data: null, message: error.response?.data?.message || 'Gagal mengambil data departments' };
    }
  },
};

/**
 * Tool: Search Titles/Jabatan
 * Endpoint: POST /api/titles/get
 */
const searchSSOTitles = {
  name: 'search_sso_titles',
  menuKey: 'User Management',
  action: 'read',
  description: 'Mencari data title/jabatan dari SSO. Gunakan untuk pertanyaan tentang daftar jabatan atau posisi dalam perusahaan.',
  parameters: {
    type: 'object',
    properties: {
      search: { type: 'string', description: 'Keyword pencarian title/jabatan' },
      page: { type: 'number', description: 'Nomor halaman (default: 1)' },
      limit: { type: 'number', description: 'Jumlah maksimal hasil (default: 100)' },
      sort_by: { type: 'string', description: 'Field sorting (default: created_at)' },
      sort_order: { type: 'string', enum: ['asc', 'desc'], description: 'Urutan sorting (default: desc)' },
      department_id: { type: 'string', description: 'Filter by department ID' },
      title_name: { type: 'string', description: 'Filter exact title name' },
      is_delete: { type: 'string', description: 'Filter by deletion status' },
      start_date: { type: 'string', description: 'Filter created from (ISO 8601)' },
      end_date: { type: 'string', description: 'Filter created until (ISO 8601)' },
    },
  },
  execute: async (params, authToken) => {
    try {
      const payload = cleanObject({ page, limit, sort_by, sort_order, search });
      const baseUrl = (aiConfig.API_GATEWAY_BASE_URL || '').replace(/\/$/, '');
      const endpoint = `${baseUrl}${sanitizePath('/api/titles/get')}`;
      const response = await axios.post(endpoint, payload || {}, { headers: getDefaultHeaders(authToken), timeout: aiConfig.API_GATEWAY_TIMEOUT });
      return { success: true, data: response.data, message: 'Data titles berhasil diambil' };
    } catch (error) {
      logger.error(`Error fetching titles: ${error.message || error}`);
      return { success: false, data: null, message: error.response?.data?.message || 'Gagal mengambil data titles' };
    }
  },
};

/**
 * Tool: Search Menus
 * Endpoint: POST /api/menus/get
 */
const searchSSOMenus = {
  name: 'search_sso_menus',
  menuKey: 'User Management',
  action: 'read',
  description: 'Mencari data menu aplikasi dari SSO. Gunakan untuk pertanyaan tentang daftar menu yang tersedia dalam sistem.',
  parameters: {
    type: 'object',
    properties: {
      search: { type: 'string', description: 'Keyword pencarian menu' },
      page: { type: 'number', description: 'Nomor halaman (default: 1)' },
      limit: { type: 'number', description: 'Jumlah maksimal hasil (default: 100)' },
      sort_by: { type: 'string', description: 'Field sorting (default: created_at)' },
      sort_order: { type: 'string', enum: ['asc', 'desc'], description: 'Urutan sorting (default: desc)' },
      menu_name: { type: 'string', description: 'Filter exact menu name' },
      system_id: { type: 'string', description: 'Filter by system ID' },
    },
  },
  execute: async (params, authToken) => {
    try {
      const payload = cleanObject({ page: 1, limit: 100, sort_by: 'created_at', sort_order: 'desc', ...params });
      const baseUrl = (aiConfig.API_GATEWAY_BASE_URL || '').replace(/\/$/, '');
      const endpoint = `${baseUrl}${sanitizePath('/api/menus/get')}`;
      const response = await axios.post(endpoint, payload || {}, { headers: getDefaultHeaders(authToken), timeout: aiConfig.API_GATEWAY_TIMEOUT });
      return { success: true, data: response.data, message: 'Data menus berhasil diambil' };
    } catch (error) {
      logger.error(`Error fetching menus: ${error.message || error}`);
      return { success: false, data: null, message: error.response?.data?.message || 'Gagal mengambil data menus' };
    }
  },
};

/**
 * Tool: Search Systems
 * Endpoint: POST /api/systems/get
 */
const searchSSOSystems = {
  name: 'search_sso_systems',
  menuKey: 'User Management',
  action: 'read',
  description: 'Mencari data sistem/aplikasi dari SSO. Gunakan untuk pertanyaan tentang daftar sistem atau aplikasi yang terintegrasi.',
  parameters: {
    type: 'object',
    properties: {
      search: { type: 'string', description: 'Keyword pencarian sistem' },
      page: { type: 'number', description: 'Nomor halaman (default: 1)' },
      limit: { type: 'number', description: 'Jumlah maksimal hasil (default: 100)' },
      sort_by: { type: 'string', description: 'Field sorting (default: created_at)' },
      sort_order: { type: 'string', enum: ['asc', 'desc'], description: 'Urutan sorting (default: desc)' },
    },
  },
  execute: async ({ search, page = 1, limit = 100, sort_by = 'created_at', sort_order = 'desc' }, authToken) => {
    try {
      const payload = cleanObject({ page, limit, sort_by, sort_order, search });
      const baseUrl = (aiConfig.API_GATEWAY_BASE_URL || '').replace(/\/$/, '');
      const endpoint = `${baseUrl}${sanitizePath('/api/systems/get')}`;
      const response = await axios.post(endpoint, payload || {}, { headers: getDefaultHeaders(authToken), timeout: aiConfig.API_GATEWAY_TIMEOUT });
      return { success: true, data: response.data, message: 'Data systems berhasil diambil' };
    } catch (error) {
      logger.error(`Error fetching systems: ${error.message || error}`);
      return { success: false, data: null, message: error.response?.data?.message || 'Gagal mengambil data systems' };
    }
  },
};

/**
 * Tool: Search SSO Groups
 * Endpoint: POST /api/sso/group/get
 */
const searchSSOGroups = {
  name: 'search_sso_groups',
  menuKey: 'User Management',
  action: 'read',
  description: 'Mencari data group SSO. Gunakan untuk pertanyaan tentang grup pengguna dalam SSO.',
  parameters: {
    type: 'object',
    properties: {
      search: { type: 'string', description: 'Keyword pencarian group' },
      page: { type: 'number', description: 'Nomor halaman (default: 1)' },
      limit: { type: 'number', description: 'Jumlah maksimal hasil (default: 100)' },
      sort_order: { type: 'string', enum: ['asc', 'desc'], description: 'Urutan sorting (default: desc)' },
    },
  },
  execute: async ({ search, page = 1, limit = 100, sort_order = 'desc' }, authToken) => {
    try {
      const payload = cleanObject({ page, limit, sort_order, search });
      const baseUrl = (aiConfig.API_GATEWAY_BASE_URL || '').replace(/\/$/, '');
      const endpoint = `${baseUrl}${sanitizePath('/api/sso/group/get')}`;
      const response = await axios.post(endpoint, payload || {}, { headers: getDefaultHeaders(authToken), timeout: aiConfig.API_GATEWAY_TIMEOUT });
      return { success: true, data: response.data, message: 'Data groups berhasil diambil' };
    } catch (error) {
      logger.error(`Error fetching SSO groups: ${error.message || error}`);
      return { success: false, data: null, message: error.response?.data?.message || 'Gagal mengambil data groups' };
    }
  },
};

/**
 * Tool: Get SSO User Profile
 * Endpoint: GET /api/auth/sso/profil
 */
const getSSOUserProfile = {
  name: 'get_sso_user_profile',
  menuKey: 'User Management',
  action: 'read',
  description: 'Mendapatkan profil user yang sedang login dari SSO. Gunakan untuk pertanyaan tentang profil user sendiri.',
  parameters: {
    type: 'object',
    properties: {},
  },
  execute: async (params, authToken) => {
    try {
      const baseUrl = (aiConfig.API_GATEWAY_BASE_URL || '').replace(/\/$/, '');
      const endpoint = `${baseUrl}${sanitizePath('/api/auth/sso/profil')}`;
      const response = await axios.get(endpoint, { headers: getDefaultHeaders(authToken), timeout: aiConfig.API_GATEWAY_TIMEOUT });
      return { success: true, data: response.data, message: 'Profil user berhasil diambil' };
    } catch (error) {
      logger.error(`Error fetching user profile: ${error.message || error}`);
      return { success: false, data: null, message: error.response?.data?.message || 'Gagal mengambil profil user' };
    }
  },
};

// ═══════════════════════════════════════════════════════════════
//  CRUD — CREATE
// ═══════════════════════════════════════════════════════════════

/**
 * Tool: Create Company
 * Endpoint: POST /api/companies/create
 */
const createSSOCompany = {
  name: 'create_sso_company',
  menuKey: 'User Management',
  action: 'create',
  description: 'Membuat perusahaan/company baru. Gunakan untuk menambahkan perusahaan baru ke dalam sistem.',
  parameters: {
    type: 'object',
    properties: {
      company_name: { type: 'string', description: 'Nama perusahaan' },
      company_address: { type: 'string', description: 'Alamat perusahaan' },
      company_email: { type: 'string', description: 'Email perusahaan' },
      company_parent_id: { type: 'string', description: 'ID parent company (jika anak perusahaan)' },
    },
    required: ['company_name'],
  },
  execute: async (params, authToken) => {
    try {
      const payload = cleanObject(params);
      const baseUrl = (aiConfig.API_GATEWAY_BASE_URL || '').replace(/\/$/, '');
      const endpoint = `${baseUrl}${sanitizePath('/api/companies/create')}`;
      const response = await axios.post(endpoint, payload, { headers: getDefaultHeaders(authToken), timeout: aiConfig.API_GATEWAY_TIMEOUT });
      return { success: true, data: response.data, message: 'Company berhasil dibuat' };
    } catch (error) {
      logger.error(`Error creating company: ${error.message || error}`);
      return { success: false, data: null, message: error.response?.data?.message || 'Gagal membuat company' };
    }
  },
};

/**
 * Tool: Create Department
 * Endpoint: POST /api/departments/create
 */
const createSSODepartment = {
  name: 'create_sso_department',
  menuKey: 'User Management',
  action: 'create',
  description: 'Membuat departemen baru. Gunakan untuk menambahkan departemen baru dalam perusahaan.',
  parameters: {
    type: 'object',
    properties: {
      department_name: { type: 'string', description: 'Nama departemen' },
      company_id: { type: 'string', description: 'ID perusahaan' },
      department_parent_id: { type: 'string', description: 'ID parent department (jika sub-departemen)' },
    },
    required: ['department_name', 'company_id'],
  },
  execute: async (params, authToken) => {
    try {
      const payload = cleanObject(params);
      const baseUrl = (aiConfig.API_GATEWAY_BASE_URL || '').replace(/\/$/, '');
      const endpoint = `${baseUrl}${sanitizePath('/api/departments/create')}`;
      const response = await axios.post(endpoint, payload, { headers: getDefaultHeaders(authToken), timeout: aiConfig.API_GATEWAY_TIMEOUT });
      return { success: true, data: response.data, message: 'Department berhasil dibuat' };
    } catch (error) {
      logger.error(`Error creating department: ${error.message || error}`);
      return { success: false, data: null, message: error.response?.data?.message || 'Gagal membuat department' };
    }
  },
};

/**
 * Tool: Create Title/Jabatan
 * Endpoint: POST /api/titles/create
 */
const createSSOTitle = {
  name: 'create_sso_title',
  menuKey: 'User Management',
  action: 'create',
  description: 'Membuat title/jabatan baru. Gunakan untuk menambahkan jabatan baru.',
  parameters: {
    type: 'object',
    properties: {
      title_name: { type: 'string', description: 'Nama title/jabatan' },
      department_id: { type: 'string', description: 'ID departemen' },
    },
    required: ['title_name', 'department_id'],
  },
  execute: async (params, authToken) => {
    try {
      const payload = cleanObject(params);
      const baseUrl = (aiConfig.API_GATEWAY_BASE_URL || '').replace(/\/$/, '');
      const endpoint = `${baseUrl}${sanitizePath('/api/titles/create')}`;
      const response = await axios.post(endpoint, payload, { headers: getDefaultHeaders(authToken), timeout: aiConfig.API_GATEWAY_TIMEOUT });
      return { success: true, data: response.data, message: 'Title berhasil dibuat' };
    } catch (error) {
      logger.error(`Error creating title: ${error.message || error}`);
      return { success: false, data: null, message: error.response?.data?.message || 'Gagal membuat title' };
    }
  },
};

/**
 * Tool: Create Menu
 * Endpoint: POST /api/menus/create
 */
const createSSOMenu = {
  name: 'create_sso_menu',
  menuKey: 'User Management',
  action: 'create',
  description: 'Membuat menu aplikasi baru. Gunakan untuk menambahkan menu baru ke dalam sistem.',
  parameters: {
    type: 'object',
    properties: {
      menu_name: { type: 'string', description: 'Nama menu' },
      menu_url: { type: 'string', description: 'URL menu' },
      menu_parent_id: { type: 'string', description: 'ID parent menu (jika submenu)' },
      menu_icon: { type: 'string', description: 'Icon menu' },
      menu_key: { type: 'string', description: 'Key menu' },
      menu_order: { type: 'number', description: 'Urutan menu' },
      system_id: { type: 'string', description: 'ID sistem' },
    },
    required: ['menu_name'],
  },
  execute: async (params, authToken) => {
    try {
      const payload = cleanObject(params);
      const baseUrl = (aiConfig.API_GATEWAY_BASE_URL || '').replace(/\/$/, '');
      const endpoint = `${baseUrl}${sanitizePath('/api/menus/create')}`;
      const response = await axios.post(endpoint, payload, { headers: getDefaultHeaders(authToken), timeout: aiConfig.API_GATEWAY_TIMEOUT });
      return { success: true, data: response.data, message: 'Menu berhasil dibuat' };
    } catch (error) {
      logger.error(`Error creating menu: ${error.message || error}`);
      return { success: false, data: null, message: error.response?.data?.message || 'Gagal membuat menu' };
    }
  },
};

/**
 * Tool: Create System
 * Endpoint: POST /api/systems/create
 */
const createSSOSystem = {
  name: 'create_sso_system',
  menuKey: 'User Management',
  action: 'create',
  description: 'Membuat sistem/aplikasi baru. Gunakan untuk mendaftarkan sistem baru ke SSO.',
  parameters: {
    type: 'object',
    properties: {
      system_name: { type: 'string', description: 'Nama sistem' },
      system_url: { type: 'string', description: 'URL sistem' },
      system_icon: { type: 'string', description: 'Icon sistem' },
      system_order: { type: 'number', description: 'Urutan sistem' },
    },
    required: ['system_name'],
  },
  execute: async (params, authToken) => {
    try {
      const payload = cleanObject(params);
      const baseUrl = (aiConfig.API_GATEWAY_BASE_URL || '').replace(/\/$/, '');
      const endpoint = `${baseUrl}${sanitizePath('/api/systems/create')}`;
      const response = await axios.post(endpoint, payload, { headers: getDefaultHeaders(authToken), timeout: aiConfig.API_GATEWAY_TIMEOUT });
      return { success: true, data: response.data, message: 'System berhasil dibuat' };
    } catch (error) {
      logger.error(`Error creating system: ${error.message || error}`);
      return { success: false, data: null, message: error.response?.data?.message || 'Gagal membuat system' };
    }
  },
};

/**
 * Tool: Create SSO Group
 * Endpoint: POST /api/sso/group/create
 */
const createSSOGroup = {
  name: 'create_sso_group',
  menuKey: 'User Management',
  action: 'create',
  description: 'Membuat grup SSO baru. Gunakan untuk menambahkan grup pengguna baru.',
  parameters: {
    type: 'object',
    properties: {
      group_name: { type: 'string', description: 'Nama grup' },
    },
    required: ['group_name'],
  },
  execute: async (params, authToken) => {
    try {
      const payload = cleanObject(params);
      const baseUrl = (aiConfig.API_GATEWAY_BASE_URL || '').replace(/\/$/, '');
      const endpoint = `${baseUrl}${sanitizePath('/api/sso/group/create')}`;
      const response = await axios.post(endpoint, payload, { headers: getDefaultHeaders(authToken), timeout: aiConfig.API_GATEWAY_TIMEOUT });
      return { success: true, data: response.data, message: 'Group berhasil dibuat' };
    } catch (error) {
      logger.error(`Error creating SSO group: ${error.message || error}`);
      return { success: false, data: null, message: error.response?.data?.message || 'Gagal membuat group' };
    }
  },
};

// ═══════════════════════════════════════════════════════════════
//  CRUD — DELETE
// ═══════════════════════════════════════════════════════════════

/**
 * Tool: Delete Company
 * Endpoint: DELETE /api/companies/{id}
 */
const deleteSSOCompany = {
  name: 'delete_sso_company',
  menuKey: 'User Management',
  action: 'delete',
  description: 'Menghapus perusahaan/company berdasarkan ID.',
  parameters: {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'ID perusahaan yang akan dihapus' },
    },
    required: ['id'],
  },
  execute: async ({ id }, authToken) => {
    try {
      const baseUrl = (aiConfig.API_GATEWAY_BASE_URL || '').replace(/\/$/, '');
      const endpoint = `${baseUrl}${sanitizePath(`/api/companies/${id}`)}`;
      const response = await axios.delete(endpoint, { headers: getDefaultHeaders(authToken), timeout: aiConfig.API_GATEWAY_TIMEOUT });
      return { success: true, data: response.data, message: 'Company berhasil dihapus' };
    } catch (error) {
      logger.error(`Error deleting company: ${error.message || error}`);
      return { success: false, data: null, message: error.response?.data?.message || 'Gagal menghapus company' };
    }
  },
};

/**
 * Tool: Delete Department
 * Endpoint: DELETE /api/departments/{id}
 */
const deleteSSODepartment = {
  name: 'delete_sso_department',
  menuKey: 'User Management',
  action: 'delete',
  description: 'Menghapus departemen berdasarkan ID.',
  parameters: {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'ID departemen yang akan dihapus' },
    },
    required: ['id'],
  },
  execute: async ({ id }, authToken) => {
    try {
      const baseUrl = (aiConfig.API_GATEWAY_BASE_URL || '').replace(/\/$/, '');
      const endpoint = `${baseUrl}${sanitizePath(`/api/departments/${id}`)}`;
      const response = await axios.delete(endpoint, { headers: getDefaultHeaders(authToken), timeout: aiConfig.API_GATEWAY_TIMEOUT });
      return { success: true, data: response.data, message: 'Department berhasil dihapus' };
    } catch (error) {
      logger.error(`Error deleting department: ${error.message || error}`);
      return { success: false, data: null, message: error.response?.data?.message || 'Gagal menghapus department' };
    }
  },
};

/**
 * Tool: Delete Title
 * Endpoint: DELETE /api/titles/{id}
 */
const deleteSSOTitle = {
  name: 'delete_sso_title',
  menuKey: 'User Management',
  action: 'delete',
  description: 'Menghapus title/jabatan berdasarkan ID.',
  parameters: {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'ID title yang akan dihapus' },
    },
    required: ['id'],
  },
  execute: async ({ id }, authToken) => {
    try {
      const baseUrl = (aiConfig.API_GATEWAY_BASE_URL || '').replace(/\/$/, '');
      const endpoint = `${baseUrl}${sanitizePath(`/api/titles/${id}`)}`;
      const response = await axios.delete(endpoint, { headers: getDefaultHeaders(authToken), timeout: aiConfig.API_GATEWAY_TIMEOUT });
      return { success: true, data: response.data, message: 'Title berhasil dihapus' };
    } catch (error) {
      logger.error(`Error deleting title: ${error.message || error}`);
      return { success: false, data: null, message: error.response?.data?.message || 'Gagal menghapus title' };
    }
  },
};

/**
 * Tool: Delete Menu
 * Endpoint: DELETE /api/menus/{menu_id}
 */
const deleteSSOMenu = {
  name: 'delete_sso_menu',
  menuKey: 'User Management',
  action: 'delete',
  description: 'Menghapus menu berdasarkan ID.',
  parameters: {
    type: 'object',
    properties: {
      menu_id: { type: 'string', description: 'ID menu yang akan dihapus' },
    },
    required: ['menu_id'],
  },
  execute: async ({ menu_id }, authToken) => {
    try {
      const baseUrl = (aiConfig.API_GATEWAY_BASE_URL || '').replace(/\/$/, '');
      const endpoint = `${baseUrl}${sanitizePath(`/api/menus/${menu_id}`)}`;
      const response = await axios.delete(endpoint, { headers: getDefaultHeaders(authToken), timeout: aiConfig.API_GATEWAY_TIMEOUT });
      return { success: true, data: response.data, message: 'Menu berhasil dihapus' };
    } catch (error) {
      logger.error(`Error deleting menu: ${error.message || error}`);
      return { success: false, data: null, message: error.response?.data?.message || 'Gagal menghapus menu' };
    }
  },
};

/**
 * Tool: Delete System
 * Endpoint: DELETE /api/systems/{id}
 */
const deleteSSOSystem = {
  name: 'delete_sso_system',
  menuKey: 'User Management',
  action: 'delete',
  description: 'Menghapus sistem berdasarkan ID.',
  parameters: {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'ID sistem yang akan dihapus' },
    },
    required: ['id'],
  },
  execute: async ({ id }, authToken) => {
    try {
      const baseUrl = (aiConfig.API_GATEWAY_BASE_URL || '').replace(/\/$/, '');
      const endpoint = `${baseUrl}${sanitizePath(`/api/systems/${id}`)}`;
      const response = await axios.delete(endpoint, { headers: getDefaultHeaders(authToken), timeout: aiConfig.API_GATEWAY_TIMEOUT });
      return { success: true, data: response.data, message: 'System berhasil dihapus' };
    } catch (error) {
      logger.error(`Error deleting system: ${error.message || error}`);
      return { success: false, data: null, message: error.response?.data?.message || 'Gagal menghapus system' };
    }
  },
};

/**
 * Tool: Delete SSO Group
 * Endpoint: DELETE /api/sso/group/{id}
 */
const deleteSSOGroup = {
  name: 'delete_sso_group',
  menuKey: 'User Management',
  action: 'delete',
  description: 'Menghapus grup SSO berdasarkan ID.',
  parameters: {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'ID grup yang akan dihapus' },
    },
    required: ['id'],
  },
  execute: async ({ id }, authToken) => {
    try {
      const baseUrl = (aiConfig.API_GATEWAY_BASE_URL || '').replace(/\/$/, '');
      const endpoint = `${baseUrl}${sanitizePath(`/api/sso/group/${id}`)}`;
      const response = await axios.delete(endpoint, { headers: getDefaultHeaders(authToken), timeout: aiConfig.API_GATEWAY_TIMEOUT });
      return { success: true, data: response.data, message: 'Group berhasil dihapus' };
    } catch (error) {
      logger.error(`Error deleting SSO group: ${error.message || error}`);
      return { success: false, data: null, message: error.response?.data?.message || 'Gagal menghapus group' };
    }
  },
};

/**
 * Tool: Update Company
 * Endpoint: PUT /api/companies/{id}
 */
const updateSSOCompany = {
  name: 'update_sso_company',
  menuKey: 'User Management',
  action: 'update',
  description: 'Memperbarui data perusahaan/company berdasarkan ID.',
  parameters: {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'ID perusahaan yang akan diupdate' },
      company_name: { type: 'string', description: 'Nama perusahaan' },
      company_address: { type: 'string', description: 'Alamat perusahaan' },
      company_email: { type: 'string', description: 'Email perusahaan' },
      company_parent_id: { type: 'string', description: 'ID parent company' },
    },
    required: ['id'],
  },
  execute: async ({ id, ...rest }, authToken) => {
    try {
      const baseUrl = (aiConfig.API_GATEWAY_BASE_URL || '').replace(/\/$/, '');
      const endpoint = `${baseUrl}${sanitizePath(`/api/companies/${id}`)}`;
      const response = await axios.put(endpoint, cleanObject(rest), { headers: getDefaultHeaders(authToken), timeout: aiConfig.API_GATEWAY_TIMEOUT });
      return { success: true, data: response.data, message: 'Company berhasil diupdate' };
    } catch (error) {
      logger.error(`Error updating company: ${error.message || error}`);
      return { success: false, data: null, message: error.response?.data?.message || 'Gagal mengupdate company' };
    }
  },
};

/**
 * Tool: Update Department
 * Endpoint: PUT /api/departments/{id}
 */
const updateSSODepartment = {
  name: 'update_sso_department',
  menuKey: 'User Management',
  action: 'update',
  description: 'Memperbarui data departemen berdasarkan ID.',
  parameters: {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'ID departemen yang akan diupdate' },
      department_name: { type: 'string', description: 'Nama departemen' },
      company_id: { type: 'string', description: 'ID perusahaan' },
      department_parent_id: { type: 'string', description: 'ID parent department' },
    },
    required: ['id'],
  },
  execute: async ({ id, ...rest }, authToken) => {
    try {
      const baseUrl = (aiConfig.API_GATEWAY_BASE_URL || '').replace(/\/$/, '');
      const endpoint = `${baseUrl}${sanitizePath(`/api/departments/${id}`)}`;
      const response = await axios.put(endpoint, cleanObject(rest), { headers: getDefaultHeaders(authToken), timeout: aiConfig.API_GATEWAY_TIMEOUT });
      return { success: true, data: response.data, message: 'Department berhasil diupdate' };
    } catch (error) {
      logger.error(`Error updating department: ${error.message || error}`);
      return { success: false, data: null, message: error.response?.data?.message || 'Gagal mengupdate department' };
    }
  },
};

/**
 * Tool: Update Title
 * Endpoint: PUT /api/titles/{id}
 */
const updateSSOTitle = {
  name: 'update_sso_title',
  menuKey: 'User Management',
  action: 'update',
  description: 'Memperbarui data title/jabatan berdasarkan ID.',
  parameters: {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'ID title yang akan diupdate' },
      title_name: { type: 'string', description: 'Nama title/jabatan' },
      department_id: { type: 'string', description: 'ID departemen' },
    },
    required: ['id'],
  },
  execute: async ({ id, ...rest }, authToken) => {
    try {
      const baseUrl = (aiConfig.API_GATEWAY_BASE_URL || '').replace(/\/$/, '');
      const endpoint = `${baseUrl}${sanitizePath(`/api/titles/${id}`)}`;
      const response = await axios.put(endpoint, cleanObject(rest), { headers: getDefaultHeaders(authToken), timeout: aiConfig.API_GATEWAY_TIMEOUT });
      return { success: true, data: response.data, message: 'Title berhasil diupdate' };
    } catch (error) {
      logger.error(`Error updating title: ${error.message || error}`);
      return { success: false, data: null, message: error.response?.data?.message || 'Gagal mengupdate title' };
    }
  },
};

/**
 * Tool: Update Menu
 * Endpoint: PUT /api/menus/{menu_id}
 */
const updateSSOMenu = {
  name: 'update_sso_menu',
  menuKey: 'User Management',
  action: 'update',
  description: 'Memperbarui data menu berdasarkan ID.',
  parameters: {
    type: 'object',
    properties: {
      menu_id: { type: 'string', description: 'ID menu yang akan diupdate' },
      menu_name: { type: 'string', description: 'Nama menu' },
      menu_url: { type: 'string', description: 'URL menu' },
      menu_parent_id: { type: 'string', description: 'ID parent menu' },
      menu_icon: { type: 'string', description: 'Icon menu' },
      menu_key: { type: 'string', description: 'Key menu' },
      menu_order: { type: 'number', description: 'Urutan menu' },
      system_id: { type: 'string', description: 'ID sistem' },
    },
    required: ['menu_id'],
  },
  execute: async ({ menu_id, ...rest }, authToken) => {
    try {
      const baseUrl = (aiConfig.API_GATEWAY_BASE_URL || '').replace(/\/$/, '');
      const endpoint = `${baseUrl}${sanitizePath(`/api/menus/${menu_id}`)}`;
      const response = await axios.put(endpoint, cleanObject(rest), { headers: getDefaultHeaders(authToken), timeout: aiConfig.API_GATEWAY_TIMEOUT });
      return { success: true, data: response.data, message: 'Menu berhasil diupdate' };
    } catch (error) {
      logger.error(`Error updating menu: ${error.message || error}`);
      return { success: false, data: null, message: error.response?.data?.message || 'Gagal mengupdate menu' };
    }
  },
};

/**
 * Tool: Update System
 * Endpoint: PUT /api/systems/{id}
 */
const updateSSOSystem = {
  name: 'update_sso_system',
  menuKey: 'User Management',
  action: 'update',
  description: 'Memperbarui data sistem berdasarkan ID.',
  parameters: {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'ID sistem yang akan diupdate' },
      system_name: { type: 'string', description: 'Nama sistem' },
      system_url: { type: 'string', description: 'URL sistem' },
      system_icon: { type: 'string', description: 'Icon sistem' },
      system_order: { type: 'number', description: 'Urutan sistem' },
    },
    required: ['id'],
  },
  execute: async ({ id, ...rest }, authToken) => {
    try {
      const baseUrl = (aiConfig.API_GATEWAY_BASE_URL || '').replace(/\/$/, '');
      const endpoint = `${baseUrl}${sanitizePath(`/api/systems/${id}`)}`;
      const response = await axios.put(endpoint, cleanObject(rest), { headers: getDefaultHeaders(authToken), timeout: aiConfig.API_GATEWAY_TIMEOUT });
      return { success: true, data: response.data, message: 'System berhasil diupdate' };
    } catch (error) {
      logger.error(`Error updating system: ${error.message || error}`);
      return { success: false, data: null, message: error.response?.data?.message || 'Gagal mengupdate system' };
    }
  },
};

/**
 * Tool: Update SSO Group
 * Endpoint: PUT /api/sso/group/{id}
 */
const updateSSOGroup = {
  name: 'update_sso_group',
  menuKey: 'User Management',
  action: 'update',
  description: 'Memperbarui data grup SSO berdasarkan ID.',
  parameters: {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'ID grup yang akan diupdate' },
      group_name: { type: 'string', description: 'Nama grup' },
    },
    required: ['id'],
  },
  execute: async ({ id, ...rest }, authToken) => {
    try {
      const baseUrl = (aiConfig.API_GATEWAY_BASE_URL || '').replace(/\/$/, '');
      const endpoint = `${baseUrl}${sanitizePath(`/api/sso/group/${id}`)}`;
      const response = await axios.put(endpoint, cleanObject(rest), { headers: getDefaultHeaders(authToken), timeout: aiConfig.API_GATEWAY_TIMEOUT });
      return { success: true, data: response.data, message: 'Group berhasil diupdate' };
    } catch (error) {
      logger.error(`Error updating SSO group: ${error.message || error}`);
      return { success: false, data: null, message: error.response?.data?.message || 'Gagal mengupdate group' };
    }
  },
};

module.exports = {
  searchSSOCompanies,
  createSSOCompany,
  updateSSOCompany,
  deleteSSOCompany,
  searchSSODepartments,
  createSSODepartment,
  updateSSODepartment,
  deleteSSODepartment,
  searchSSOTitles,
  createSSOTitle,
  updateSSOTitle,
  deleteSSOTitle,
  searchSSOMenus,
  createSSOMenu,
  updateSSOMenu,
  deleteSSOMenu,
  searchSSOSystems,
  createSSOSystem,
  updateSSOSystem,
  deleteSSOSystem,
  searchSSOGroups,
  createSSOGroup,
  updateSSOGroup,
  deleteSSOGroup,
  getSSOUserProfile,
};
