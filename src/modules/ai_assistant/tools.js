const axios = require('axios');
const { Logger } = require('../../utils/logger');
const logger = Logger;
const aiConfig = require('../../config/ai');

const GATEWAY_ALLOWED_PREFIXES = [
  '/api/auth',
  '/api/menus',
  '/api/menus/get',
  '/api/menus/create',
  '/api/companies',
  '/api/companies/get',
  '/api/companies/create',
  '/api/departments',
  '/api/departments/get',
  '/api/departments/create',
  '/api/employees',
  '/api/employees/get',
  '/api/employees/create',
  '/api/roles',
  '/api/roles/get',
  '/api/roles/create',
  '/api/permissions',
  '/api/permissions/get',
  '/api/permissions/create',
  '/api/users',
  '/api/users/get',
  '/api/users/create',
  '/api/titles',
  '/api/titles/get',
  '/api/titles/create',
  '/api/menu-has-permissions',
  '/api/role-has-menu-permissions',
  '/api/customers',
  '/api/customers/get',
  '/api/customers/create',
  '/api/bank_accounts',
  '/api/bank_accounts/get',
  '/api/bank_accounts/create',
  '/api/quotation/customer',
  '/api/quotation/customer/get',
  '/api/quotation/customer/create',
  '/api/quotation/sales',
  '/api/quotation/sales/get',
  '/api/quotation/sales/create',
  '/api/quotation/bank-account',
  '/api/quotation/bank-account/get',
  '/api/quotation/bank-account/create',
  '/api/quotation/item_product',
  '/api/quotation/item_product/get',
  '/api/quotation/item_product/create',
  '/api/quotation/manage-quotation',
  '/api/quotation/manage-quotation/get',
  '/api/quotation/manage-quotation/create',
  '/api/quotation/term_content',
  '/api/quotation/term_content/get',
  '/api/quotation/term_content/create',
  '/api/quotation/componen_product',
  '/api/quotation/componen_product/get',
  '/api/quotation/componen_product/create',
  '/api/quotation/accessory',
  '/api/quotation/accessory/get',
  '/api/quotation/accessory/create',
  '/api/powerbi',
  '/api/powerbi/get',
  '/api/powerbi/create',
  '/api/categories',
  '/api/categories/get',
  '/api/categories/create',
  '/api/interview',
  '/api/interview/companies',
  '/api/interview/companies/get',
  '/api/interview/departments',
  '/api/interview/departments/get',
  '/api/interview/titles',
  '/api/interview/titles/get',
  '/api/interview/islands',
  '/api/interview/islands/get',
  '/api/interview/genders',
  '/api/interview/genders/get',
  '/api/interview/employees',
  '/api/interview/employees/get',
  '/api/candidates',
  '/api/candidates/get',
  '/api/applicants',
  '/api/applicants/get',
  '/api/notes',
  '/api/notes/get',
  '/api/schedule-interviews',
  '/api/schedule-interviews/get',
  '/api/interviews',
  '/api/interviews/get',
  '/api/on-board-documents',
  '/api/on-board-documents/get',
  '/api/background-checks',
  '/api/background-checks/get',
  '/api/public/applicants/get',
  '/api/catalogs',
  '/api/catalogs/get',
  '/api/catalogs/categories',
  '/api/catalogs/categories/get',
  '/api/catalogs/catalogItems',
  '/api/catalogs/catalogItems/get',
  '/api/catalogs/locations',
  '/api/catalogs/locations/get',
  '/api/catalogs/driver_types',
  '/api/catalogs/driver_types/get',
  '/api/catalogs/vehicle_weights',
  '/api/catalogs/vehicle_weights/get',
  '/api/catalogs/brands',
  '/api/catalogs/brands/get',
  '/api/catalogs/world_manufacturing_plants',
  '/api/catalogs/world_manufacturing_plants/get',
  '/api/catalogs/productions',
  '/api/catalogs/productions/get',
  '/api/catalogs/sidebars',
  '/api/catalogs/sidebars/get',
  '/api/catalogs/type_cabine',
  '/api/catalogs/type_cabine/get',
  '/api/catalogs/cabines',
  '/api/catalogs/cabines/get',
  '/api/catalogs/type_engine',
  '/api/catalogs/type_engine/get',
  '/api/catalogs/engines',
  '/api/catalogs/engines/get',
  '/api/catalogs/type_transmission',
  '/api/catalogs/type_transmission/get',
  '/api/catalogs/transmission',
  '/api/catalogs/transmission/get',
  '/api/catalogs/type_axel',
  '/api/catalogs/type_axel/get',
  '/api/catalogs/axel',
  '/api/catalogs/axel/get',
  '/api/catalogs/type_steering',
  '/api/catalogs/type_steering/get',
  '/api/catalogs/steering',
  '/api/catalogs/steering/get',
  '/api/catalogs/all-item-catalogs',
  '/api/catalogs/all-item-catalogs/get',
  '/api/epc',
  '/api/epc/master_category',
  '/api/epc/master_category/get',
  '/api/epc/categories',
  '/api/epc/categories/get',
  '/api/epc/type_category',
  '/api/epc/type_category/get',
  '/api/epc/item_category',
  '/api/epc/item_category/get',
  '/api/epc/dokumen',
  '/api/epc/dokumen/get',
  '/api/epc/dokumen/duplikat',
  '/api/epc/products',
  '/api/epc/products/get',
  '/api/epc/unit',
  '/api/epc/unit/get',
  '/api/public',
  '/api/public/product',
  '/api/public/product/get',
  '/api/public/specification',
  '/api/public/specification/get',
  // Power BI endpoints
  '/api/powerbi/dashboard',
  // CRM endpoints
  '/api/crm/territory',
  '/api/crm/territory/get',
  '/api/crm/iup_management',
  '/api/crm/iup_management/get',
  '/api/crm/segmentation',
  '/api/crm/segmentation/get',
  '/api/crm/iup_customers',
  '/api/crm/iup_customers/get',
  '/api/crm/transactions',
  '/api/crm/transactions/get',
  '/api/crm/employee-data-access',
  '/api/crm/employee-data-access/get',
  // Island endpoint
  '/api/island',
  '/api/island/get',
];

const sanitizePath = (path) => {
  if (!path) return '';
  return path.startsWith('/') ? path : `/${path}`;
};

const isGatewayPathAllowed = (path) => {
  if (!path) return false;
  if (!path.startsWith('/api/')) return false;
  return GATEWAY_ALLOWED_PREFIXES.some((prefix) => path.startsWith(prefix));
};

const buildGatewayUrl = (path) => {
  const base = (aiConfig.API_GATEWAY_BASE_URL || '').replace(/\/$/, '');
  if (!base) {
    throw new Error('API Gateway base URL tidak dikonfigurasi');
  }
  return `${base}${sanitizePath(path)}`;
};

const getDefaultHeaders = (authToken, extraHeaders = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    ...extraHeaders,
  };

  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  return headers;
};

const cleanObject = (obj = {}) => {
  if (!obj || typeof obj !== 'object') return undefined;
  return Object.entries(obj).reduce((acc, [key, value]) => {
    if (
      value === undefined
      || value === null
      || value === ''
      || (typeof value === 'number' && Number.isNaN(value))
    ) {
      return acc;
    }
    acc[key] = value;
    return acc;
  }, {});
};

/**
 * Function tools untuk LangChain Function Calling
 * Tools ini dapat dipanggil oleh AI untuk mengakses data dari microservice
 */

/**
 * Tool: Mencari kandidat dari HR Service
 */
const searchHRCandidates = {
  name: 'search_hr_candidates',
  description: 'Mencari kandidat dari modul HR berdasarkan kriteria tertentu seperti bulan, status, atau keyword pencarian. Gunakan ini untuk pertanyaan tentang kandidat baru, kandidat bulan ini, atau pencarian kandidat.',
  parameters: {
    type: 'object',
    properties: {
      month: {
        type: 'string',
        description: 'Bulan pencarian dalam format YYYY-MM (contoh: 2025-01). Jika tidak disebutkan, cari semua.',
      },
      status: {
        type: 'string',
        description: 'Status kandidat (contoh: active, pending, hired, rejected)',
      },
      keyword: {
        type: 'string',
        description: 'Keyword untuk pencarian nama, email, atau posisi',
      },
      limit: {
        type: 'number',
        description: 'Jumlah maksimal hasil (default: 10)',
      },
    },
  },
  execute: async ({ month, status, keyword, limit = 10 }, authToken) => {
    try {
      const payload = cleanObject({
        month,
        status,
        keyword,
        limit,
      });
      const baseUrl = (aiConfig.API_GATEWAY_BASE_URL || aiConfig.MICROSERVICE_HR_URL || '').replace(/\/$/, '');
      const endpoint = `${baseUrl}${sanitizePath('/api/candidates/get')}`;

      const response = await axios.post(
        endpoint,
        payload || {},
        {
          headers: getDefaultHeaders(authToken),
          timeout: aiConfig.API_GATEWAY_TIMEOUT,
        }
      );

      return {
        success: true,
        data: response.data,
        message: 'Data kandidat berhasil diambil',
      };
    } catch (error) {
      logger.error(`Error fetching HR candidates: ${error.message || error}`);
      return {
        success: false,
        data: null,
        message: error.response?.data?.message || 'Gagal mengambil data kandidat',
      };
    }
  },
};

/**
 * Tool: Mencari karyawan dari HR Service
 */
const searchHREmployees = {
  name: 'search_hr_employees',
  description: 'Mencari data karyawan dari modul HR berdasarkan nama, departemen, atau status.',
  parameters: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Nama karyawan untuk pencarian',
      },
      department: {
        type: 'string',
        description: 'Departemen karyawan',
      },
      status: {
        type: 'string',
        description: 'Status karyawan (active, inactive, on_leave)',
      },
      limit: {
        type: 'number',
        description: 'Jumlah maksimal hasil (default: 10)',
      },
    },
  },
  execute: async ({ name, department, status, limit = 10 }, authToken) => {
    try {
      const payload = cleanObject({
        name,
        department,
        status,
        limit,
      });

      const baseUrl = (aiConfig.API_GATEWAY_BASE_URL || aiConfig.MICROSERVICE_HR_URL || '').replace(/\/$/, '');
      const endpoint = `${baseUrl}${sanitizePath('/api/employees/get')}`;

      const response = await axios.post(
        endpoint,
        payload || {},
        {
          headers: getDefaultHeaders(authToken),
          timeout: aiConfig.API_GATEWAY_TIMEOUT,
        }
      );

      return {
        success: true,
        data: response.data,
        message: 'Data karyawan berhasil diambil',
      };
    } catch (error) {
      logger.error(`Error fetching HR employees: ${error.message || error}`);
      return {
        success: false,
        data: null,
        message: error.response?.data?.message || 'Gagal mengambil data karyawan',
      };
    }
  },
};

/**
 * Tool: Mencari quotation
 */
const searchQuotations = {
  name: 'search_quotations',
  description: 'Mencari data quotation berdasarkan nomor, status, atau periode.',
  parameters: {
    type: 'object',
    properties: {
      quotationNumber: {
        type: 'string',
        description: 'Nomor quotation untuk pencarian',
      },
      status: {
        type: 'string',
        description: 'Status quotation (draft, sent, approved, rejected)',
      },
      startDate: {
        type: 'string',
        description: 'Tanggal mulai dalam format YYYY-MM-DD',
      },
      endDate: {
        type: 'string',
        description: 'Tanggal akhir dalam format YYYY-MM-DD',
      },
      limit: {
        type: 'number',
        description: 'Jumlah maksimal hasil (default: 10)',
      },
    },
  },
  execute: async ({ quotationNumber, status, startDate, endDate, limit = 10 }, authToken) => {
    try {
      const payload = cleanObject({
        quotationNumber,
        status,
        startDate,
        endDate,
        limit,
      });

      const baseUrl = (aiConfig.API_GATEWAY_BASE_URL || aiConfig.MICROSERVICE_QUOTATION_URL || '').replace(/\/$/, '');
      const endpoint = `${baseUrl}${sanitizePath('/api/quotation/manage-quotation/get')}`;

      const response = await axios.post(
        endpoint,
        payload || {},
        {
          headers: getDefaultHeaders(authToken),
          timeout: aiConfig.API_GATEWAY_TIMEOUT,
        }
      );

      return {
        success: true,
        data: response.data,
        message: 'Data quotation berhasil diambil',
      };
    } catch (error) {
      logger.error(`Error fetching quotations: ${error.message || error}`);
      return {
        success: false,
        data: null,
        message: error.response?.data?.message || 'Gagal mengambil data quotation',
      };
    }
  },
};

/**
 * Tool: Mencari produk dari eCatalog
 */
const searchECatalogProducts = {
  name: 'search_ecatalog_products',
  description: 'Mencari produk dari eCatalog berdasarkan nama, kategori, atau keyword.',
  parameters: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Nama produk untuk pencarian',
      },
      category: {
        type: 'string',
        description: 'Kategori produk',
      },
      keyword: {
        type: 'string',
        description: 'Keyword untuk pencarian produk',
      },
      limit: {
        type: 'number',
        description: 'Jumlah maksimal hasil (default: 10)',
      },
    },
  },
  execute: async ({ name, category, keyword, limit = 10 }, authToken) => {
    try {
      const payload = cleanObject({
        name,
        category,
        keyword,
        limit,
      });

      const baseUrl = (aiConfig.API_GATEWAY_BASE_URL || aiConfig.MICROSERVICE_ECATALOG_URL || '').replace(/\/$/, '');
      const endpoint = aiConfig.API_GATEWAY_BASE_URL
        ? `${baseUrl}${sanitizePath('/api/catalogs/catalogItems/get')}`
        : `${baseUrl}${sanitizePath('/api/products')}`;

      const axiosConfig = {
        headers: getDefaultHeaders(authToken),
        timeout: aiConfig.API_GATEWAY_TIMEOUT,
      };

      const response = aiConfig.API_GATEWAY_BASE_URL
        ? await axios.post(endpoint, payload || {}, axiosConfig)
        : await axios.get(endpoint, { ...axiosConfig, params: payload });

      return {
        success: true,
        data: response.data,
        message: 'Data produk berhasil diambil',
      };
    } catch (error) {
      logger.error(`Error fetching eCatalog products: ${error.message || error}`);
      return {
        success: false,
        data: null,
        message: error.response?.data?.message || 'Gagal mengambil data produk',
      };
    }
  },
};

/**
 * Tool: Merangkum data
 */
const summarizeData = {
  name: 'summarize_data',
  description: 'Merangkum dan menganalisis data yang diberikan. Gunakan ini untuk membuat ringkasan dari data yang telah diambil.',
  parameters: {
    type: 'object',
    properties: {
      data: {
        type: 'object',
        description: 'Data yang akan dirangkum',
      },
      summaryType: {
        type: 'string',
        description: 'Jenis ringkasan (count, statistics, key_points)',
        enum: ['count', 'statistics', 'key_points'],
      },
    },
  },
  execute: async ({ data, summaryType = 'key_points' }) => {
    try {
      // Simple summarization logic
      if (summaryType === 'count') {
        const count = Array.isArray(data) ? data.length : (data?.data?.length || 0);
        return {
          success: true,
          data: { count },
          message: `Total data: ${count}`,
        };
      }

      if (summaryType === 'statistics' && Array.isArray(data)) {
        // Simple statistics
        return {
          success: true,
          data: {
            total: data.length,
            message: `Total: ${data.length} item`,
          },
          message: 'Statistik data',
        };
      }

      return {
        success: true,
        data: {
          summary: 'Ringkasan data telah dibuat',
          items: Array.isArray(data) ? data.slice(0, 5) : data,
        },
        message: 'Data berhasil dirangkum',
      };
    } catch (error) {
      logger.error(`Error summarizing data: ${error.message || error}`);
      return {
        success: false,
        data: null,
        message: 'Gagal merangkum data',
      };
    }
  },
};

/**
 * Tool: Power BI Dashboard
 */
const searchPowerBIDashboard = {
  name: 'search_powerbi_dashboard',
  description: 'Mencari data Power BI dashboard berdasarkan status. Gunakan ini untuk pertanyaan tentang dashboard Power BI yang aktif atau tersedia.',
  parameters: {
    type: 'object',
    properties: {
      status: {
        type: 'string',
        description: 'Status dashboard (active, inactive)',
      },
      page: {
        type: 'number',
        description: 'Nomor halaman (default: 1)',
      },
      limit: {
        type: 'number',
        description: 'Jumlah maksimal hasil (default: 1000)',
      },
    },
  },
  execute: async ({ status = 'active', page = 1, limit = 1000 }, authToken) => {
    try {
      const payload = cleanObject({
        page,
        limit,
        status,
      });

      const baseUrl = (aiConfig.API_GATEWAY_BASE_URL || '').replace(/\/$/, '');
      const endpoint = `${baseUrl}${sanitizePath('/api/powerbi/dashboard')}`;

      const response = await axios.post(
        endpoint,
        payload || {},
        {
          headers: getDefaultHeaders(authToken),
          timeout: aiConfig.API_GATEWAY_TIMEOUT,
        }
      );

      return {
        success: true,
        data: response.data,
        message: 'Data Power BI dashboard berhasil diambil',
      };
    } catch (error) {
      logger.error(`Error fetching Power BI dashboard: ${error.message || error}`);
      return {
        success: false,
        data: null,
        message: error.response?.data?.message || 'Gagal mengambil data Power BI dashboard',
      };
    }
  },
};

/**
 * Tool: Power BI Category
 */
const searchPowerBICategory = {
  name: 'search_powerbi_category',
  description: 'Mencari kategori Power BI. Gunakan ini untuk pertanyaan tentang kategori dashboard Power BI.',
  parameters: {
    type: 'object',
    properties: {
      page: {
        type: 'number',
        description: 'Nomor halaman (default: 1)',
      },
      limit: {
        type: 'number',
        description: 'Jumlah maksimal hasil (default: 1000)',
      },
    },
  },
  execute: async ({ page = 1, limit = 1000 }, authToken) => {
    try {
      const payload = cleanObject({
        page,
        limit,
      });

      const baseUrl = (aiConfig.API_GATEWAY_BASE_URL || '').replace(/\/$/, '');
      const endpoint = `${baseUrl}${sanitizePath('/api/categories/get')}`;

      const response = await axios.post(
        endpoint,
        payload || {},
        {
          headers: getDefaultHeaders(authToken),
          timeout: aiConfig.API_GATEWAY_TIMEOUT,
        }
      );

      return {
        success: true,
        data: response.data,
        message: 'Data kategori Power BI berhasil diambil',
      };
    } catch (error) {
      logger.error(`Error fetching Power BI category: ${error.message || error}`);
      return {
        success: false,
        data: null,
        message: error.response?.data?.message || 'Gagal mengambil data kategori Power BI',
      };
    }
  },
};

/**
 * Tool: Power BI Manage
 */
const searchPowerBIManage = {
  name: 'search_powerbi_manage',
  description: 'Mencari data manajemen Power BI. Gunakan ini untuk pertanyaan tentang pengaturan atau manajemen Power BI.',
  parameters: {
    type: 'object',
    properties: {
      page: {
        type: 'number',
        description: 'Nomor halaman (default: 1)',
      },
      limit: {
        type: 'number',
        description: 'Jumlah maksimal hasil (default: 1000)',
      },
    },
  },
  execute: async ({ page = 1, limit = 1000 }, authToken) => {
    try {
      const payload = cleanObject({
        page,
        limit,
      });

      const baseUrl = (aiConfig.API_GATEWAY_BASE_URL || '').replace(/\/$/, '');
      const endpoint = `${baseUrl}${sanitizePath('/api/powerbi/get')}`;

      const response = await axios.post(
        endpoint,
        payload || {},
        {
          headers: getDefaultHeaders(authToken),
          timeout: aiConfig.API_GATEWAY_TIMEOUT,
        }
      );

      return {
        success: true,
        data: response.data,
        message: 'Data manajemen Power BI berhasil diambil',
      };
    } catch (error) {
      logger.error(`Error fetching Power BI manage: ${error.message || error}`);
      return {
        success: false,
        data: null,
        message: error.response?.data?.message || 'Gagal mengambil data manajemen Power BI',
      };
    }
  },
};

/**
 * Tool: Quotation Products (Component Product)
 */
const searchQuotationProducts = {
  name: 'search_quotation_products',
  description: 'Mencari data produk quotation (component product). Gunakan ini untuk pertanyaan tentang produk yang digunakan dalam quotation.',
  parameters: {
    type: 'object',
    properties: {
      search: {
        type: 'string',
        description: 'Keyword pencarian produk',
      },
      page: {
        type: 'number',
        description: 'Nomor halaman (default: 1)',
      },
      limit: {
        type: 'number',
        description: 'Jumlah maksimal hasil (default: 100)',
      },
      sort_order: {
        type: 'string',
        enum: ['asc', 'desc'],
        description: 'Urutan sorting (default: desc)',
      },
    },
  },
  execute: async ({ search, page = 1, limit = 100, sort_order = 'desc' }, authToken) => {
    try {
      const payload = cleanObject({
        page,
        limit,
        sort_order,
        search,
      });

      const baseUrl = (aiConfig.API_GATEWAY_BASE_URL || aiConfig.MICROSERVICE_QUOTATION_URL || '').replace(/\/$/, '');
      const endpoint = `${baseUrl}${sanitizePath('/api/quotation/componen_product/get')}`;

      const response = await axios.post(
        endpoint,
        payload || {},
        {
          headers: getDefaultHeaders(authToken),
          timeout: aiConfig.API_GATEWAY_TIMEOUT,
        }
      );

      return {
        success: true,
        data: response.data,
        message: 'Data produk quotation berhasil diambil',
      };
    } catch (error) {
      logger.error(`Error fetching quotation products: ${error.message || error}`);
      return {
        success: false,
        data: null,
        message: error.response?.data?.message || 'Gagal mengambil data produk quotation',
      };
    }
  },
};

/**
 * Tool: Quotation Accessory
 */
const searchQuotationAccessory = {
  name: 'search_quotation_accessory',
  description: 'Mencari data aksesori quotation. Gunakan ini untuk pertanyaan tentang aksesori yang digunakan dalam quotation.',
  parameters: {
    type: 'object',
    properties: {
      search: {
        type: 'string',
        description: 'Keyword pencarian aksesori',
      },
      page: {
        type: 'number',
        description: 'Nomor halaman (default: 1)',
      },
      limit: {
        type: 'number',
        description: 'Jumlah maksimal hasil (default: 100)',
      },
      sort_order: {
        type: 'string',
        enum: ['asc', 'desc'],
        description: 'Urutan sorting (default: desc)',
      },
    },
  },
  execute: async ({ search, page = 1, limit = 100, sort_order = 'desc' }, authToken) => {
    try {
      const payload = cleanObject({
        page,
        limit,
        sort_order,
        search,
      });

      const baseUrl = (aiConfig.API_GATEWAY_BASE_URL || aiConfig.MICROSERVICE_QUOTATION_URL || '').replace(/\/$/, '');
      const endpoint = `${baseUrl}${sanitizePath('/api/quotation/accessory/get')}`;

      const response = await axios.post(
        endpoint,
        payload || {},
        {
          headers: getDefaultHeaders(authToken),
          timeout: aiConfig.API_GATEWAY_TIMEOUT,
        }
      );

      return {
        success: true,
        data: response.data,
        message: 'Data aksesori quotation berhasil diambil',
      };
    } catch (error) {
      logger.error(`Error fetching quotation accessory: ${error.message || error}`);
      return {
        success: false,
        data: null,
        message: error.response?.data?.message || 'Gagal mengambil data aksesori quotation',
      };
    }
  },
};

/**
 * Tool: Quotation Term Condition
 */
const searchQuotationTermCondition = {
  name: 'search_quotation_term_condition',
  description: 'Mencari data term dan condition quotation. Gunakan ini untuk pertanyaan tentang syarat dan ketentuan quotation.',
  parameters: {
    type: 'object',
    properties: {
      search: {
        type: 'string',
        description: 'Keyword pencarian term condition',
      },
      page: {
        type: 'number',
        description: 'Nomor halaman (default: 1)',
      },
      limit: {
        type: 'number',
        description: 'Jumlah maksimal hasil (default: 100)',
      },
      sort_order: {
        type: 'string',
        enum: ['asc', 'desc'],
        description: 'Urutan sorting (default: desc)',
      },
    },
  },
  execute: async ({ search, page = 1, limit = 100, sort_order = 'desc' }, authToken) => {
    try {
      const payload = cleanObject({
        page,
        limit,
        sort_order,
        search,
      });

      const baseUrl = (aiConfig.API_GATEWAY_BASE_URL || aiConfig.MICROSERVICE_QUOTATION_URL || '').replace(/\/$/, '');
      const endpoint = `${baseUrl}${sanitizePath('/api/quotation/term_content/get')}`;

      const response = await axios.post(
        endpoint,
        payload || {},
        {
          headers: getDefaultHeaders(authToken),
          timeout: aiConfig.API_GATEWAY_TIMEOUT,
        }
      );

      return {
        success: true,
        data: response.data,
        message: 'Data term condition quotation berhasil diambil',
      };
    } catch (error) {
      logger.error(`Error fetching quotation term condition: ${error.message || error}`);
      return {
        success: false,
        data: null,
        message: error.response?.data?.message || 'Gagal mengambil data term condition quotation',
      };
    }
  },
};

/**
 * Tool: Quotation Customer
 */
const searchQuotationCustomer = {
  name: 'search_quotation_customer',
  description: 'Mencari data customer quotation. Gunakan ini untuk pertanyaan tentang customer yang terkait dengan quotation.',
  parameters: {
    type: 'object',
    properties: {
      search: {
        type: 'string',
        description: 'Keyword pencarian customer',
      },
      page: {
        type: 'number',
        description: 'Nomor halaman (default: 1)',
      },
      limit: {
        type: 'number',
        description: 'Jumlah maksimal hasil (default: 100)',
      },
      sort_order: {
        type: 'string',
        enum: ['asc', 'desc'],
        description: 'Urutan sorting (default: desc)',
      },
    },
  },
  execute: async ({ search, page = 1, limit = 100, sort_order = 'desc' }, authToken) => {
    try {
      const payload = cleanObject({
        page,
        limit,
        sort_order,
        search,
      });

      const baseUrl = (aiConfig.API_GATEWAY_BASE_URL || aiConfig.MICROSERVICE_QUOTATION_URL || '').replace(/\/$/, '');
      const endpoint = `${baseUrl}${sanitizePath('/api/customers/get')}`;

      const response = await axios.post(
        endpoint,
        payload || {},
        {
          headers: getDefaultHeaders(authToken),
          timeout: aiConfig.API_GATEWAY_TIMEOUT,
        }
      );

      return {
        success: true,
        data: response.data,
        message: 'Data customer quotation berhasil diambil',
      };
    } catch (error) {
      logger.error(`Error fetching quotation customer: ${error.message || error}`);
      return {
        success: false,
        data: null,
        message: error.response?.data?.message || 'Gagal mengambil data customer quotation',
      };
    }
  },
};

/**
 * Tool: Quotation Bank Account
 */
const searchQuotationBankAccount = {
  name: 'search_quotation_bank_account',
  description: 'Mencari data bank account quotation. Gunakan ini untuk pertanyaan tentang rekening bank yang digunakan dalam quotation.',
  parameters: {
    type: 'object',
    properties: {
      search: {
        type: 'string',
        description: 'Keyword pencarian bank account',
      },
      page: {
        type: 'number',
        description: 'Nomor halaman (default: 1)',
      },
      limit: {
        type: 'number',
        description: 'Jumlah maksimal hasil (default: 100)',
      },
      sort_order: {
        type: 'string',
        enum: ['asc', 'desc'],
        description: 'Urutan sorting (default: desc)',
      },
    },
  },
  execute: async ({ search, page = 1, limit = 100, sort_order = 'desc' }, authToken) => {
    try {
      const payload = cleanObject({
        page,
        limit,
        sort_order,
        search,
      });

      const baseUrl = (aiConfig.API_GATEWAY_BASE_URL || aiConfig.MICROSERVICE_QUOTATION_URL || '').replace(/\/$/, '');
      const endpoint = `${baseUrl}${sanitizePath('/api/bank_accounts/get')}`;

      const response = await axios.post(
        endpoint,
        payload || {},
        {
          headers: getDefaultHeaders(authToken),
          timeout: aiConfig.API_GATEWAY_TIMEOUT,
        }
      );

      return {
        success: true,
        data: response.data,
        message: 'Data bank account quotation berhasil diambil',
      };
    } catch (error) {
      logger.error(`Error fetching quotation bank account: ${error.message || error}`);
      return {
        success: false,
        data: null,
        message: error.response?.data?.message || 'Gagal mengambil data bank account quotation',
      };
    }
  },
};

/**
 * Tool: Quotation Island
 */
const searchQuotationIsland = {
  name: 'search_quotation_island',
  description: 'Mencari data pulau (island) untuk quotation. Gunakan ini untuk pertanyaan tentang pulau yang terkait dengan quotation.',
  parameters: {
    type: 'object',
    properties: {
      search: {
        type: 'string',
        description: 'Keyword pencarian island',
      },
      page: {
        type: 'number',
        description: 'Nomor halaman (default: 1)',
      },
      limit: {
        type: 'number',
        description: 'Jumlah maksimal hasil (default: 100)',
      },
      sort_order: {
        type: 'string',
        enum: ['asc', 'desc'],
        description: 'Urutan sorting (default: desc)',
      },
    },
  },
  execute: async ({ search, page = 1, limit = 100, sort_order = 'desc' }, authToken) => {
    try {
      const payload = cleanObject({
        page,
        limit,
        sort_order,
        search,
      });

      const baseUrl = (aiConfig.API_GATEWAY_BASE_URL || aiConfig.MICROSERVICE_QUOTATION_URL || '').replace(/\/$/, '');
      const endpoint = `${baseUrl}${sanitizePath('/api/island/get')}`;

      const response = await axios.post(
        endpoint,
        payload || {},
        {
          headers: getDefaultHeaders(authToken),
          timeout: aiConfig.API_GATEWAY_TIMEOUT,
        }
      );

      return {
        success: true,
        data: response.data,
        message: 'Data island quotation berhasil diambil',
      };
    } catch (error) {
      logger.error(`Error fetching quotation island: ${error.message || error}`);
      return {
        success: false,
        data: null,
        message: error.response?.data?.message || 'Gagal mengambil data island quotation',
      };
    }
  },
};

/**
 * Tool: CRM Territory Management
 */
const searchCRMTerritory = {
  name: 'search_crm_territory',
  description: 'Mencari data territory management CRM. Gunakan ini untuk pertanyaan tentang wilayah atau territory dalam CRM.',
  parameters: {
    type: 'object',
    properties: {
      search: {
        type: 'string',
        description: 'Keyword pencarian territory',
      },
      page: {
        type: 'number',
        description: 'Nomor halaman (default: 1)',
      },
      limit: {
        type: 'number',
        description: 'Jumlah maksimal hasil (default: 100)',
      },
      sort_order: {
        type: 'string',
        enum: ['asc', 'desc'],
        description: 'Urutan sorting (default: desc)',
      },
      is_admin: {
        type: 'string',
        description: 'Filter admin (true/false)',
      },
    },
  },
  execute: async ({ search, page = 1, limit = 100, sort_order = 'desc', is_admin }, authToken) => {
    try {
      const payload = cleanObject({
        page,
        limit,
        sort_order,
        search,
        is_admin,
      });

      const baseUrl = (aiConfig.API_GATEWAY_BASE_URL || '').replace(/\/$/, '');
      const endpoint = `${baseUrl}${sanitizePath('/api/crm/territory/get')}`;

      const response = await axios.post(
        endpoint,
        payload || {},
        {
          headers: getDefaultHeaders(authToken),
          timeout: aiConfig.API_GATEWAY_TIMEOUT,
        }
      );

      return {
        success: true,
        data: response.data,
        message: 'Data territory CRM berhasil diambil',
      };
    } catch (error) {
      logger.error(`Error fetching CRM territory: ${error.message || error}`);
      return {
        success: false,
        data: null,
        message: error.response?.data?.message || 'Gagal mengambil data territory CRM',
      };
    }
  },
};

/**
 * Tool: CRM IUP Management
 */
const searchCRMIUPManagement = {
  name: 'search_crm_iup_management',
  description: 'Mencari data IUP (Izin Usaha Pertambangan) management CRM. Gunakan ini untuk pertanyaan tentang IUP dalam CRM.',
  parameters: {
    type: 'object',
    properties: {
      search: {
        type: 'string',
        description: 'Keyword pencarian IUP',
      },
      page: {
        type: 'number',
        description: 'Nomor halaman (default: 1)',
      },
      limit: {
        type: 'number',
        description: 'Jumlah maksimal hasil (default: 1000)',
      },
      sort_by: {
        type: 'string',
        description: 'Field untuk sorting (default: updated_at)',
      },
      sort_order: {
        type: 'string',
        enum: ['asc', 'desc'],
        description: 'Urutan sorting (default: desc)',
      },
      status: {
        type: 'string',
        description: 'Status IUP',
      },
      is_admin: {
        type: 'string',
        description: 'Filter admin (true/false)',
      },
      segmentation_id: {
        type: 'string',
        description: 'ID segmentasi',
      },
    },
  },
  execute: async ({ search, page = 1, limit = 1000, sort_by = 'updated_at', sort_order = 'desc', status, is_admin, segmentation_id }, authToken) => {
    try {
      const payload = cleanObject({
        page,
        limit,
        sort_by,
        sort_order,
        search,
        status,
        is_admin,
        segmentation_id,
      });

      const baseUrl = (aiConfig.API_GATEWAY_BASE_URL || '').replace(/\/$/, '');
      const endpoint = `${baseUrl}${sanitizePath('/api/crm/iup_management/get')}`;

      const response = await axios.post(
        endpoint,
        payload || {},
        {
          headers: getDefaultHeaders(authToken),
          timeout: aiConfig.API_GATEWAY_TIMEOUT,
        }
      );

      return {
        success: true,
        data: response.data,
        message: 'Data IUP management CRM berhasil diambil',
      };
    } catch (error) {
      logger.error(`Error fetching CRM IUP management: ${error.message || error}`);
      return {
        success: false,
        data: null,
        message: error.response?.data?.message || 'Gagal mengambil data IUP management CRM',
      };
    }
  },
};

/**
 * Tool: CRM Segmentation
 */
const searchCRMSegmentation = {
  name: 'search_crm_segmentation',
  description: 'Mencari data segmentasi CRM. Gunakan ini untuk pertanyaan tentang segmentasi customer dalam CRM.',
  parameters: {
    type: 'object',
    properties: {
      search: {
        type: 'string',
        description: 'Keyword pencarian segmentasi',
      },
      page: {
        type: 'number',
        description: 'Nomor halaman (default: 1)',
      },
      limit: {
        type: 'number',
        description: 'Jumlah maksimal hasil (default: 100)',
      },
      sort_order: {
        type: 'string',
        enum: ['asc', 'desc'],
        description: 'Urutan sorting (default: desc)',
      },
      is_admin: {
        type: 'string',
        description: 'Filter admin (true/false)',
      },
    },
  },
  execute: async ({ search, page = 1, limit = 100, sort_order = 'desc', is_admin }, authToken) => {
    try {
      const payload = cleanObject({
        page,
        limit,
        sort_order,
        search,
        is_admin,
      });

      const baseUrl = (aiConfig.API_GATEWAY_BASE_URL || '').replace(/\/$/, '');
      const endpoint = `${baseUrl}${sanitizePath('/api/crm/segmentation/get')}`;

      const response = await axios.post(
        endpoint,
        payload || {},
        {
          headers: getDefaultHeaders(authToken),
          timeout: aiConfig.API_GATEWAY_TIMEOUT,
        }
      );

      return {
        success: true,
        data: response.data,
        message: 'Data segmentasi CRM berhasil diambil',
      };
    } catch (error) {
      logger.error(`Error fetching CRM segmentation: ${error.message || error}`);
      return {
        success: false,
        data: null,
        message: error.response?.data?.message || 'Gagal mengambil data segmentasi CRM',
      };
    }
  },
};

/**
 * Tool: CRM IUP Customers
 */
const searchCRMIUPCustomers = {
  name: 'search_crm_iup_customers',
  description: 'Mencari data customer atau contractor IUP CRM. Gunakan ini untuk pertanyaan tentang customer atau contractor yang terkait dengan IUP.',
  parameters: {
    type: 'object',
    properties: {
      search: {
        type: 'string',
        description: 'Keyword pencarian customer',
      },
      page: {
        type: 'number',
        description: 'Nomor halaman (default: 1)',
      },
      limit: {
        type: 'number',
        description: 'Jumlah maksimal hasil (default: 100)',
      },
      sort_order: {
        type: 'string',
        enum: ['asc', 'desc'],
        description: 'Urutan sorting (default: desc)',
      },
      mine_type: {
        type: 'string',
        description: 'Jenis tambang',
      },
      status: {
        type: 'string',
        description: 'Status customer',
      },
      is_admin: {
        type: 'string',
        description: 'Filter admin (true/false)',
      },
    },
  },
  execute: async ({ search, page = 1, limit = 100, sort_order = 'desc', mine_type, status, is_admin }, authToken) => {
    try {
      const payload = cleanObject({
        page,
        limit,
        sort_order,
        search,
        mine_type,
        status,
        is_admin,
      });

      const baseUrl = (aiConfig.API_GATEWAY_BASE_URL || '').replace(/\/$/, '');
      const endpoint = `${baseUrl}${sanitizePath('/api/crm/iup_customers/get')}`;

      const response = await axios.post(
        endpoint,
        payload || {},
        {
          headers: getDefaultHeaders(authToken),
          timeout: aiConfig.API_GATEWAY_TIMEOUT,
        }
      );

      return {
        success: true,
        data: response.data,
        message: 'Data IUP customers CRM berhasil diambil',
      };
    } catch (error) {
      logger.error(`Error fetching CRM IUP customers: ${error.message || error}`);
      return {
        success: false,
        data: null,
        message: error.response?.data?.message || 'Gagal mengambil data IUP customers CRM',
      };
    }
  },
};

/**
 * Tool: CRM Transactions (Activities Management)
 */
const searchCRMTransactions = {
  name: 'search_crm_transactions',
  description: 'Mencari data transaksi atau aktivitas CRM. Gunakan ini untuk pertanyaan tentang transaksi atau aktivitas dalam CRM.',
  parameters: {
    type: 'object',
    properties: {
      search: {
        type: 'string',
        description: 'Keyword pencarian transaksi',
      },
      page: {
        type: 'number',
        description: 'Nomor halaman (default: 1)',
      },
      limit: {
        type: 'number',
        description: 'Jumlah maksimal hasil (default: 100)',
      },
      sort_by: {
        type: 'string',
        description: 'Field untuk sorting (default: updated_at)',
      },
      sort_order: {
        type: 'string',
        enum: ['asc', 'desc'],
        description: 'Urutan sorting (default: desc)',
      },
    },
  },
  execute: async ({ search, page = 1, limit = 100, sort_by = 'updated_at', sort_order = 'desc' }, authToken) => {
    try {
      const payload = cleanObject({
        page,
        limit,
        sort_order,
        sort_by,
        search,
      });

      const baseUrl = (aiConfig.API_GATEWAY_BASE_URL || '').replace(/\/$/, '');
      const endpoint = `${baseUrl}${sanitizePath('/api/crm/transactions/get')}`;

      const response = await axios.post(
        endpoint,
        payload || {},
        {
          headers: getDefaultHeaders(authToken),
          timeout: aiConfig.API_GATEWAY_TIMEOUT,
        }
      );

      return {
        success: true,
        data: response.data,
        message: 'Data transaksi CRM berhasil diambil',
      };
    } catch (error) {
      logger.error(`Error fetching CRM transactions: ${error.message || error}`);
      return {
        success: false,
        data: null,
        message: error.response?.data?.message || 'Gagal mengambil data transaksi CRM',
      };
    }
  },
};

/**
 * Tool: CRM Employee Data Access (User Management)
 */
const searchCRMEmployeeDataAccess = {
  name: 'search_crm_employee_data_access',
  description: 'Mencari data akses employee CRM. Gunakan ini untuk pertanyaan tentang user management atau akses data employee dalam CRM.',
  parameters: {
    type: 'object',
    properties: {
      search: {
        type: 'string',
        description: 'Keyword pencarian employee',
      },
      page: {
        type: 'number',
        description: 'Nomor halaman (default: 1)',
      },
      limit: {
        type: 'number',
        description: 'Jumlah maksimal hasil (default: 100)',
      },
      sort_order: {
        type: 'string',
        enum: ['asc', 'desc'],
        description: 'Urutan sorting (default: desc)',
      },
      is_admin: {
        type: 'string',
        description: 'Filter admin (true/false)',
      },
    },
  },
  execute: async ({ search, page = 1, limit = 100, sort_order = 'desc', is_admin }, authToken) => {
    try {
      const payload = cleanObject({
        page,
        limit,
        sort_order,
        search,
        is_admin,
      });

      const baseUrl = (aiConfig.API_GATEWAY_BASE_URL || '').replace(/\/$/, '');
      const endpoint = `${baseUrl}${sanitizePath('/api/crm/employee-data-access/get')}`;

      const response = await axios.post(
        endpoint,
        payload || {},
        {
          headers: getDefaultHeaders(authToken),
          timeout: aiConfig.API_GATEWAY_TIMEOUT,
        }
      );

      return {
        success: true,
        data: response.data,
        message: 'Data employee data access CRM berhasil diambil',
      };
    } catch (error) {
      logger.error(`Error fetching CRM employee data access: ${error.message || error}`);
      return {
        success: false,
        data: null,
        message: error.response?.data?.message || 'Gagal mengambil data employee data access CRM',
      };
    }
  },
};

/**
 * Tool: Employee Company
 */
const searchEmployeeCompany = {
  name: 'search_employee_company',
  description: 'Mencari data company employee. Gunakan ini untuk pertanyaan tentang perusahaan dalam modul employee.',
  parameters: {
    type: 'object',
    properties: {
      page: {
        type: 'number',
        description: 'Nomor halaman (default: 1)',
      },
      limit: {
        type: 'number',
        description: 'Jumlah maksimal hasil (default: 100)',
      },
      sort_by: {
        type: 'string',
        description: 'Field untuk sorting (default: created_at)',
      },
    },
  },
  execute: async ({ page = 1, limit = 100, sort_by = 'created_at' }, authToken) => {
    try {
      const payload = cleanObject({
        page,
        limit,
        sort_by,
      });

      const baseUrl = (aiConfig.API_GATEWAY_BASE_URL || aiConfig.MICROSERVICE_HR_URL || '').replace(/\/$/, '');
      const endpoint = `${baseUrl}${sanitizePath('/api/companies/get')}`;

      const response = await axios.post(
        endpoint,
        payload || {},
        {
          headers: getDefaultHeaders(authToken),
          timeout: aiConfig.API_GATEWAY_TIMEOUT,
        }
      );

      return {
        success: true,
        data: response.data,
        message: 'Data company employee berhasil diambil',
      };
    } catch (error) {
      logger.error(`Error fetching employee company: ${error.message || error}`);
      return {
        success: false,
        data: null,
        message: error.response?.data?.message || 'Gagal mengambil data company employee',
      };
    }
  },
};

/**
 * Tool: Employee Department
 */
const searchEmployeeDepartment = {
  name: 'search_employee_department',
  description: 'Mencari data department employee. Gunakan ini untuk pertanyaan tentang departemen dalam modul employee.',
  parameters: {
    type: 'object',
    properties: {
      page: {
        type: 'number',
        description: 'Nomor halaman (default: 1)',
      },
      limit: {
        type: 'number',
        description: 'Jumlah maksimal hasil (default: 100)',
      },
      sort_by: {
        type: 'string',
        description: 'Field untuk sorting (default: created_at)',
      },
    },
  },
  execute: async ({ page = 1, limit = 100, sort_by = 'created_at' }, authToken) => {
    try {
      const payload = cleanObject({
        page,
        limit,
        sort_by,
      });

      const baseUrl = (aiConfig.API_GATEWAY_BASE_URL || aiConfig.MICROSERVICE_HR_URL || '').replace(/\/$/, '');
      const endpoint = `${baseUrl}${sanitizePath('/api/departments/get')}`;

      const response = await axios.post(
        endpoint,
        payload || {},
        {
          headers: getDefaultHeaders(authToken),
          timeout: aiConfig.API_GATEWAY_TIMEOUT,
        }
      );

      return {
        success: true,
        data: response.data,
        message: 'Data department employee berhasil diambil',
      };
    } catch (error) {
      logger.error(`Error fetching employee department: ${error.message || error}`);
      return {
        success: false,
        data: null,
        message: error.response?.data?.message || 'Gagal mengambil data department employee',
      };
    }
  },
};

/**
 * Tool: Employee Title
 */
const searchEmployeeTitle = {
  name: 'search_employee_title',
  description: 'Mencari data title/jabatan employee. Gunakan ini untuk pertanyaan tentang jabatan dalam modul employee.',
  parameters: {
    type: 'object',
    properties: {
      page: {
        type: 'number',
        description: 'Nomor halaman (default: 1)',
      },
      limit: {
        type: 'number',
        description: 'Jumlah maksimal hasil (default: 1000)',
      },
    },
  },
  execute: async ({ page = 1, limit = 1000 }, authToken) => {
    try {
      const payload = cleanObject({
        page,
        limit,
      });

      const baseUrl = (aiConfig.API_GATEWAY_BASE_URL || aiConfig.MICROSERVICE_HR_URL || '').replace(/\/$/, '');
      const endpoint = `${baseUrl}${sanitizePath('/api/titles/get')}`;

      const response = await axios.post(
        endpoint,
        payload || {},
        {
          headers: getDefaultHeaders(authToken),
          timeout: aiConfig.API_GATEWAY_TIMEOUT,
        }
      );

      return {
        success: true,
        data: response.data,
        message: 'Data title employee berhasil diambil',
      };
    } catch (error) {
      logger.error(`Error fetching employee title: ${error.message || error}`);
      return {
        success: false,
        data: null,
        message: error.response?.data?.message || 'Gagal mengambil data title employee',
      };
    }
  },
};

/**
 * Convert tools to LangChain format
 */
const getToolsForLangChain = () => {
  return [
    {
      type: 'function',
      function: {
        name: callGatewayEndpoint.name,
        description: callGatewayEndpoint.description,
        parameters: callGatewayEndpoint.parameters,
      },
    },
    {
      type: 'function',
      function: {
        name: searchHRCandidates.name,
        description: searchHRCandidates.description,
        parameters: searchHRCandidates.parameters,
      },
    },
    {
      type: 'function',
      function: {
        name: searchHREmployees.name,
        description: searchHREmployees.description,
        parameters: searchHREmployees.parameters,
      },
    },
    {
      type: 'function',
      function: {
        name: searchQuotations.name,
        description: searchQuotations.description,
        parameters: searchQuotations.parameters,
      },
    },
    {
      type: 'function',
      function: {
        name: searchECatalogProducts.name,
        description: searchECatalogProducts.description,
        parameters: searchECatalogProducts.parameters,
      },
    },
    {
      type: 'function',
      function: {
        name: summarizeData.name,
        description: summarizeData.description,
        parameters: summarizeData.parameters,
      },
    },
    // Power BI Tools
    {
      type: 'function',
      function: {
        name: searchPowerBIDashboard.name,
        description: searchPowerBIDashboard.description,
        parameters: searchPowerBIDashboard.parameters,
      },
    },
    {
      type: 'function',
      function: {
        name: searchPowerBICategory.name,
        description: searchPowerBICategory.description,
        parameters: searchPowerBICategory.parameters,
      },
    },
    {
      type: 'function',
      function: {
        name: searchPowerBIManage.name,
        description: searchPowerBIManage.description,
        parameters: searchPowerBIManage.parameters,
      },
    },
    // Quotation Tools
    {
      type: 'function',
      function: {
        name: searchQuotationProducts.name,
        description: searchQuotationProducts.description,
        parameters: searchQuotationProducts.parameters,
      },
    },
    {
      type: 'function',
      function: {
        name: searchQuotationAccessory.name,
        description: searchQuotationAccessory.description,
        parameters: searchQuotationAccessory.parameters,
      },
    },
    {
      type: 'function',
      function: {
        name: searchQuotationTermCondition.name,
        description: searchQuotationTermCondition.description,
        parameters: searchQuotationTermCondition.parameters,
      },
    },
    {
      type: 'function',
      function: {
        name: searchQuotationCustomer.name,
        description: searchQuotationCustomer.description,
        parameters: searchQuotationCustomer.parameters,
      },
    },
    {
      type: 'function',
      function: {
        name: searchQuotationBankAccount.name,
        description: searchQuotationBankAccount.description,
        parameters: searchQuotationBankAccount.parameters,
      },
    },
    {
      type: 'function',
      function: {
        name: searchQuotationIsland.name,
        description: searchQuotationIsland.description,
        parameters: searchQuotationIsland.parameters,
      },
    },
    // CRM Tools
    {
      type: 'function',
      function: {
        name: searchCRMTerritory.name,
        description: searchCRMTerritory.description,
        parameters: searchCRMTerritory.parameters,
      },
    },
    {
      type: 'function',
      function: {
        name: searchCRMIUPManagement.name,
        description: searchCRMIUPManagement.description,
        parameters: searchCRMIUPManagement.parameters,
      },
    },
    {
      type: 'function',
      function: {
        name: searchCRMSegmentation.name,
        description: searchCRMSegmentation.description,
        parameters: searchCRMSegmentation.parameters,
      },
    },
    {
      type: 'function',
      function: {
        name: searchCRMIUPCustomers.name,
        description: searchCRMIUPCustomers.description,
        parameters: searchCRMIUPCustomers.parameters,
      },
    },
    {
      type: 'function',
      function: {
        name: searchCRMTransactions.name,
        description: searchCRMTransactions.description,
        parameters: searchCRMTransactions.parameters,
      },
    },
    {
      type: 'function',
      function: {
        name: searchCRMEmployeeDataAccess.name,
        description: searchCRMEmployeeDataAccess.description,
        parameters: searchCRMEmployeeDataAccess.parameters,
      },
    },
    // Employee Tools
    {
      type: 'function',
      function: {
        name: searchEmployeeCompany.name,
        description: searchEmployeeCompany.description,
        parameters: searchEmployeeCompany.parameters,
      },
    },
    {
      type: 'function',
      function: {
        name: searchEmployeeDepartment.name,
        description: searchEmployeeDepartment.description,
        parameters: searchEmployeeDepartment.parameters,
      },
    },
    {
      type: 'function',
      function: {
        name: searchEmployeeTitle.name,
        description: searchEmployeeTitle.description,
        parameters: searchEmployeeTitle.parameters,
      },
    },
  ];
};

/**
 * Execute tool by name
 */
const executeTool = async (toolName, parameters, authToken) => {
  const tools = {
    [callGatewayEndpoint.name]: callGatewayEndpoint,
    [searchHRCandidates.name]: searchHRCandidates,
    [searchHREmployees.name]: searchHREmployees,
    [searchQuotations.name]: searchQuotations,
    [searchECatalogProducts.name]: searchECatalogProducts,
    [summarizeData.name]: summarizeData,
    // Power BI Tools
    [searchPowerBIDashboard.name]: searchPowerBIDashboard,
    [searchPowerBICategory.name]: searchPowerBICategory,
    [searchPowerBIManage.name]: searchPowerBIManage,
    // Quotation Tools
    [searchQuotationProducts.name]: searchQuotationProducts,
    [searchQuotationAccessory.name]: searchQuotationAccessory,
    [searchQuotationTermCondition.name]: searchQuotationTermCondition,
    [searchQuotationCustomer.name]: searchQuotationCustomer,
    [searchQuotationBankAccount.name]: searchQuotationBankAccount,
    [searchQuotationIsland.name]: searchQuotationIsland,
    // CRM Tools
    [searchCRMTerritory.name]: searchCRMTerritory,
    [searchCRMIUPManagement.name]: searchCRMIUPManagement,
    [searchCRMSegmentation.name]: searchCRMSegmentation,
    [searchCRMIUPCustomers.name]: searchCRMIUPCustomers,
    [searchCRMTransactions.name]: searchCRMTransactions,
    [searchCRMEmployeeDataAccess.name]: searchCRMEmployeeDataAccess,
    // Employee Tools
    [searchEmployeeCompany.name]: searchEmployeeCompany,
    [searchEmployeeDepartment.name]: searchEmployeeDepartment,
    [searchEmployeeTitle.name]: searchEmployeeTitle,
  };

  const tool = tools[toolName];
  if (!tool) {
    return {
      success: false,
      message: `Tool ${toolName} tidak ditemukan`,
    };
  }

  return await tool.execute(parameters, authToken);
};

const isWriteOperation = (method, path) => {
  const upperMethod = (method || 'GET').toUpperCase();
  const normalizedPath = (path || '').trim().toLowerCase().replace(/\/+$/, '');

  if (upperMethod === 'GET' || upperMethod === 'HEAD' || upperMethod === 'OPTIONS') {
    return false;
  }

  if (upperMethod === 'POST') {
    if (normalizedPath.endsWith('/get')) {
      return false;
    }

    const safePostPatterns = [
      /\/search$/,
      /\/login$/,
      /\/logout$/,
      /\/dashboard$/,
    ];

    return !safePostPatterns.some((pattern) => pattern.test(normalizedPath));
  }

  return true;
};

const callGatewayEndpoint = {
  name: 'call_gateway_endpoint',
  description: 'Mengakses API Gateway menggunakan path dan method tertentu. Gunakan ini untuk membaca atau memodifikasi data di seluruh service yang tersedia (SSO, Quotation, Power BI, Interview, eCatalogue, EPC, dll). Pastikan path yang diberikan sesuai dengan daftar endpoint yang diizinkan.',
  parameters: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Path endpoint yang ingin dipanggil. Contoh: /api/quotation/manage-quotation/get',
      },
      method: {
        type: 'string',
        enum: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
        description: 'HTTP method yang digunakan',
        default: 'GET',
      },
      query: {
        type: 'object',
        description: 'Query string parameters (opsional) dalam format key-value',
      },
      body: {
        type: 'object',
        description: 'Payload JSON untuk request (opsional, gunakan untuk POST/PUT/PATCH)',
      },
      headers: {
        type: 'object',
        description: 'Header tambahan (jika diperlukan). Authorization otomatis ditambahkan.',
      },
    },
    required: ['path'],
  },
  execute: async ({ path, method = 'GET', query, body, headers }, authToken) => {
    try {
      if (!authToken) {
        throw new Error('Token autentikasi tidak tersedia. Kirim Bearer token di header Authorization.');
      }

      const sanitizedPath = sanitizePath(path);
      if (!isGatewayPathAllowed(sanitizedPath)) {
        throw new Error('Path tidak diizinkan atau tidak dikenal dalam API Gateway.');
      }

      if (!aiConfig.AI_ALLOW_WRITE_ACTIONS && isWriteOperation(method, sanitizedPath)) {
        throw new Error('Akses tulis dimatikan. Hanya operasi baca yang diperbolehkan.');
      }

      const upperMethod = method.toUpperCase();
      const url = buildGatewayUrl(sanitizedPath);
      const cleanedQuery = cleanObject(query);
      const cleanedBody = cleanObject(body);

      const axiosConfig = {
        url,
        method: upperMethod,
        headers: getDefaultHeaders(authToken, headers),
        timeout: aiConfig.API_GATEWAY_TIMEOUT,
      };

      if (cleanedQuery) {
        axiosConfig.params = cleanedQuery;
      }

      if (upperMethod !== 'GET' && upperMethod !== 'DELETE') {
        axiosConfig.data = cleanedBody || {};
      } else if (cleanedBody) {
        axiosConfig.data = cleanedBody;
      }

      const response = await axios(axiosConfig);

      return {
        success: true,
        status: response.status,
        data: response.data,
        message: 'Permintaan API Gateway berhasil dieksekusi',
      };
    } catch (error) {
      logger.error(`Error calling gateway endpoint: ${error.message || error}`);
      return {
        success: false,
        status: error.response?.status,
        data: error.response?.data,
        message: error.response?.data?.message || error.message || 'Gagal memanggil API Gateway',
      };
    }
  },
};

module.exports = {
  getToolsForLangChain,
  executeTool,
  callGatewayEndpoint,
  searchHRCandidates,
  searchHREmployees,
  searchQuotations,
  searchECatalogProducts,
  summarizeData,
  // Power BI Tools
  searchPowerBIDashboard,
  searchPowerBICategory,
  searchPowerBIManage,
  // Quotation Tools
  searchQuotationProducts,
  searchQuotationAccessory,
  searchQuotationTermCondition,
  searchQuotationCustomer,
  searchQuotationBankAccount,
  searchQuotationIsland,
  // CRM Tools
  searchCRMTerritory,
  searchCRMIUPManagement,
  searchCRMSegmentation,
  searchCRMIUPCustomers,
  searchCRMTransactions,
  searchCRMEmployeeDataAccess,
  // Employee Tools
  searchEmployeeCompany,
  searchEmployeeDepartment,
  searchEmployeeTitle,
};
