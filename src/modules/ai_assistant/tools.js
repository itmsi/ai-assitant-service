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
  description: 'Mencari data quotation/transaksi quotation berdasarkan nomor, status, periode, atau keyword. Gunakan ini untuk pertanyaan tentang transaksi quotation, quotation management, grand total quotation, nama customer quotation, jumlah quotation keseluruhan, dll. Tool ini mengakses endpoint POST /api/quotation/manage-quotation/get. Response dari endpoint berisi data quotation dengan informasi seperti manage_quotation_grand_total (grand total), customer_name (nama customer), quotation_number, status, quotation_for, dan field lainnya. Response juga berisi pagination object dengan struktur: { page, limit, total, totalPages }. Field "total" di dalam pagination menunjukkan jumlah quotation keseluruhan. **PENTING**: Untuk pertanyaan "berapa jumlah quotation yang ada keseluruhan" atau "berapa total quotation" atau "berapa jumlah transaksi quotation", gunakan tool ini dan ambil nilai dari response.data.pagination.total. JANGAN menghitung dari array data (response.data.data atau response.data), karena array data hanya berisi data untuk halaman tertentu (misalnya 10 data untuk page 1), bukan total keseluruhan. Langsung ambil nilai dari response.data.pagination.total saja. Contoh: jika response.data.pagination = { page: 1, limit: 10, total: 36, totalPages: 4 }, maka jawabannya adalah 36 dari pagination.total.',
  parameters: {
    type: 'object',
    properties: {
      search: {
        type: 'string',
        description: 'Keyword pencarian quotation (nomor quotation, nama customer, dll)',
      },
      page: {
        type: 'number',
        description: 'Nomor halaman (default: 1)',
      },
      limit: {
        type: 'number',
        description: 'Jumlah maksimal hasil (default: 10)',
      },
      sort_order: {
        type: 'string',
        enum: ['asc', 'desc'],
        description: 'Urutan sorting (default: desc)',
      },
      quotation_for: {
        type: 'string',
        description: 'Filter quotation_for',
      },
      quotationNumber: {
        type: 'string',
        description: 'Nomor quotation untuk pencarian (alternatif untuk search)',
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
    },
  },
  execute: async ({ search, page = 1, limit = 10, sort_order = 'desc', quotation_for, quotationNumber, status, startDate, endDate }, authToken) => {
    try {
      const payload = cleanObject({
        page,
        limit,
        sort_order,
        search: search || quotationNumber || '',
        quotation_for: quotation_for || '',
        status,
        startDate,
        endDate,
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
  description: 'Mencari data IUP (Izin Usaha Pertambangan) management CRM. Gunakan ini untuk pertanyaan tentang IUP dalam CRM. Tool ini mengakses endpoint /api/crm/iup_management/get untuk mendapatkan data IUP. Response dari endpoint ini berisi summary statistics seperti total_iup, total_iup_aktif, total_contractor, total_iup_have_contractor, total_iup_no_contractor yang dapat digunakan untuk menjawab pertanyaan tentang jumlah IUP. Untuk pertanyaan "berapa jumlah IUP yang ada", gunakan tool ini dan ambil nilai dari response.data.total_iup atau response.data.total_iup_aktif.',
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
        description: 'Jumlah maksimal hasil (default: 100)',
      },
      sort_by: {
        type: 'string',
        description: 'Field untuk sorting (default: created_at)',
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
        description: 'Filter admin (default: true)',
      },
      employee_id: {
        type: 'string',
        description: 'ID employee untuk filter',
      },
      segmentation_id: {
        type: 'string',
        description: 'ID segmentasi',
      },
    },
  },
  execute: async ({ search, page = 1, limit = 100, sort_by = 'created_at', sort_order = 'desc', status, is_admin = 'true', employee_id, segmentation_id }, authToken) => {
    try {
      const payload = cleanObject({
        page,
        limit,
        sort_by,
        sort_order,
        search: search || '',
        status: status || '',
        is_admin: is_admin || 'true',
        employee_id: employee_id || null,
        segmentation_id: segmentation_id || null,
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
 * Tool: Menghitung Grand Total Quotation
 */
const calculateQuotationGrandTotal = {
  name: 'calculate_quotation_grand_total',
  description: 'Menghitung total grand total dari semua quotation. Gunakan ini untuk pertanyaan tentang total quotation keseluruhan atau per customer. Tool ini akan mengambil data quotation dan menjumlahkan field manage_quotation_grand_total. Jika customerName diberikan, akan menghitung total per customer tersebut.',
  parameters: {
    type: 'object',
    properties: {
      customerName: {
        type: 'string',
        description: 'Nama customer untuk filter (opsional). Jika tidak diberikan, akan menghitung total keseluruhan.',
      },
      startDate: {
        type: 'string',
        description: 'Tanggal mulai dalam format YYYY-MM-DD (opsional)',
      },
      endDate: {
        type: 'string',
        description: 'Tanggal akhir dalam format YYYY-MM-DD (opsional)',
      },
      status: {
        type: 'string',
        description: 'Status quotation untuk filter (opsional)',
      },
    },
  },
  execute: async ({ customerName, startDate, endDate, status }, authToken) => {
    try {
      const payload = cleanObject({
        customerName,
        startDate,
        endDate,
        status,
        limit: 10000, // Ambil semua data untuk perhitungan
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

      const quotations = response.data?.data || response.data || [];
      let total = 0;
      let count = 0;

      quotations.forEach((quotation) => {
        const grandTotal = parseFloat(quotation.manage_quotation_grand_total) || 0;
        if (!isNaN(grandTotal)) {
          total += grandTotal;
          count++;
        }
      });

      return {
        success: true,
        data: {
          total: total,
          count: count,
          currency: 'IDR',
          filter: {
            customerName,
            startDate,
            endDate,
            status,
          },
        },
        message: `Total grand total quotation: ${total.toLocaleString('id-ID')} (dari ${count} quotation)`,
      };
    } catch (error) {
      logger.error(`Error calculating quotation grand total: ${error.message || error}`);
      return {
        success: false,
        data: null,
        message: error.response?.data?.message || 'Gagal menghitung grand total quotation',
      };
    }
  },
};

/**
 * Tool: Menghitung Total Produk Quotation
 */
const calculateQuotationProductTotal = {
  name: 'calculate_quotation_product_total',
  description: 'Menghitung total harga produk dari quotation. Gunakan ini untuk pertanyaan tentang total produk quotation. Tool ini akan mengambil data component_product dan menjumlahkan component_product_price.',
  parameters: {
    type: 'object',
    properties: {
      productName: {
        type: 'string',
        description: 'Nama produk untuk filter (opsional). Jika tidak diberikan, akan menghitung total semua produk.',
      },
      limit: {
        type: 'number',
        description: 'Jumlah maksimal data yang diambil (default: 10000)',
      },
    },
  },
  execute: async ({ productName, limit = 10000 }, authToken) => {
    try {
      const payload = cleanObject({
        search: productName,
        limit,
        sort_order: 'desc',
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

      const products = response.data?.data || response.data || [];
      let total = 0;
      let count = 0;

      products.forEach((product) => {
        const price = parseFloat(product.component_product_price) || 0;
        if (!isNaN(price)) {
          total += price;
          count++;
        }
      });

      return {
        success: true,
        data: {
          total: total,
          count: count,
          currency: 'IDR',
          filter: {
            productName,
          },
        },
        message: `Total harga produk quotation: ${total.toLocaleString('id-ID')} (dari ${count} produk)`,
      };
    } catch (error) {
      logger.error(`Error calculating quotation product total: ${error.message || error}`);
      return {
        success: false,
        data: null,
        message: error.response?.data?.message || 'Gagal menghitung total produk quotation',
      };
    }
  },
};

/**
 * Tool: Menghitung Total Aksesori Quotation
 */
const calculateQuotationAccessoryTotal = {
  name: 'calculate_quotation_accessory_total',
  description: 'Menghitung total harga aksesori dari quotation. Gunakan ini untuk pertanyaan tentang total aksesori quotation. Tool ini akan mengambil data accessory dan menjumlahkan component_accessory_price.',
  parameters: {
    type: 'object',
    properties: {
      accessoryName: {
        type: 'string',
        description: 'Nama aksesori untuk filter (opsional). Jika tidak diberikan, akan menghitung total semua aksesori.',
      },
      limit: {
        type: 'number',
        description: 'Jumlah maksimal data yang diambil (default: 10000)',
      },
    },
  },
  execute: async ({ accessoryName, limit = 10000 }, authToken) => {
    try {
      const payload = cleanObject({
        search: accessoryName,
        limit,
        sort_order: 'desc',
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

      const accessories = response.data?.data || response.data || [];
      let total = 0;
      let count = 0;

      accessories.forEach((accessory) => {
        const price = parseFloat(accessory.component_accessory_price) || 0;
        if (!isNaN(price)) {
          total += price;
          count++;
        }
      });

      return {
        success: true,
        data: {
          total: total,
          count: count,
          currency: 'IDR',
          filter: {
            accessoryName,
          },
        },
        message: `Total harga aksesori quotation: ${total.toLocaleString('id-ID')} (dari ${count} aksesori)`,
      };
    } catch (error) {
      logger.error(`Error calculating quotation accessory total: ${error.message || error}`);
      return {
        success: false,
        data: null,
        message: error.response?.data?.message || 'Gagal menghitung total aksesori quotation',
      };
    }
  },
};

/**
 * Tool: Menghitung Total Term & Condition Quotation
 */
const calculateQuotationTermConditionTotal = {
  name: 'calculate_quotation_term_condition_total',
  description: 'Menghitung total harga term & condition dari quotation. Gunakan ini untuk pertanyaan tentang total term & condition quotation. Tool ini akan mengambil data term_content dan menjumlahkan component_term_condition_price.',
  parameters: {
    type: 'object',
    properties: {
      termConditionName: {
        type: 'string',
        description: 'Nama term & condition untuk filter (opsional). Jika tidak diberikan, akan menghitung total semua term & condition.',
      },
      limit: {
        type: 'number',
        description: 'Jumlah maksimal data yang diambil (default: 10000)',
      },
    },
  },
  execute: async ({ termConditionName, limit = 10000 }, authToken) => {
    try {
      const payload = cleanObject({
        search: termConditionName,
        limit,
        sort_order: 'desc',
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

      const termConditions = response.data?.data || response.data || [];
      let total = 0;
      let count = 0;

      termConditions.forEach((termCondition) => {
        const price = parseFloat(termCondition.component_term_condition_price) || 0;
        if (!isNaN(price)) {
          total += price;
          count++;
        }
      });

      return {
        success: true,
        data: {
          total: total,
          count: count,
          currency: 'IDR',
          filter: {
            termConditionName,
          },
        },
        message: `Total harga term & condition quotation: ${total.toLocaleString('id-ID')} (dari ${count} term & condition)`,
      };
    } catch (error) {
      logger.error(`Error calculating quotation term condition total: ${error.message || error}`);
      return {
        success: false,
        data: null,
        message: error.response?.data?.message || 'Gagal menghitung total term & condition quotation',
      };
    }
  },
};

/**
 * Tool: Menghitung Total Customer Quotation
 */
const calculateQuotationCustomerTotal = {
  name: 'calculate_quotation_customer_total',
  description: 'Menghitung total harga customer dari quotation. Gunakan ini untuk pertanyaan tentang total customer quotation. Tool ini akan mengambil data customer dan menjumlahkan customer_price.',
  parameters: {
    type: 'object',
    properties: {
      customerName: {
        type: 'string',
        description: 'Nama customer untuk filter (opsional). Jika tidak diberikan, akan menghitung total semua customer.',
      },
      limit: {
        type: 'number',
        description: 'Jumlah maksimal data yang diambil (default: 10000)',
      },
    },
  },
  execute: async ({ customerName, limit = 10000 }, authToken) => {
    try {
      const payload = cleanObject({
        search: customerName,
        limit,
        sort_order: 'desc',
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

      const customers = response.data?.data || response.data || [];
      let total = 0;
      let count = 0;

      customers.forEach((customer) => {
        const price = parseFloat(customer.customer_price) || 0;
        if (!isNaN(price)) {
          total += price;
          count++;
        }
      });

      return {
        success: true,
        data: {
          total: total,
          count: count,
          currency: 'IDR',
          filter: {
            customerName,
          },
        },
        message: `Total harga customer quotation: ${total.toLocaleString('id-ID')} (dari ${count} customer)`,
      };
    } catch (error) {
      logger.error(`Error calculating quotation customer total: ${error.message || error}`);
      return {
        success: false,
        data: null,
        message: error.response?.data?.message || 'Gagal menghitung total customer quotation',
      };
    }
  },
};

/**
 * Tool: Menghitung Total Bank Account Quotation
 */
const calculateQuotationBankAccountTotal = {
  name: 'calculate_quotation_bank_account_total',
  description: 'Menghitung total harga bank account dari quotation. Gunakan ini untuk pertanyaan tentang total bank account quotation. Tool ini akan mengambil data bank_account dan menjumlahkan bank_account_price.',
  parameters: {
    type: 'object',
    properties: {
      bankAccountName: {
        type: 'string',
        description: 'Nama bank account untuk filter (opsional). Jika tidak diberikan, akan menghitung total semua bank account.',
      },
      limit: {
        type: 'number',
        description: 'Jumlah maksimal data yang diambil (default: 10000)',
      },
    },
  },
  execute: async ({ bankAccountName, limit = 10000 }, authToken) => {
    try {
      const payload = cleanObject({
        search: bankAccountName,
        limit,
        sort_order: 'desc',
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

      const bankAccounts = response.data?.data || response.data || [];
      let total = 0;
      let count = 0;

      bankAccounts.forEach((bankAccount) => {
        const price = parseFloat(bankAccount.bank_account_price) || 0;
        if (!isNaN(price)) {
          total += price;
          count++;
        }
      });

      return {
        success: true,
        data: {
          total: total,
          count: count,
          currency: 'IDR',
          filter: {
            bankAccountName,
          },
        },
        message: `Total harga bank account quotation: ${total.toLocaleString('id-ID')} (dari ${count} bank account)`,
      };
    } catch (error) {
      logger.error(`Error calculating quotation bank account total: ${error.message || error}`);
      return {
        success: false,
        data: null,
        message: error.response?.data?.message || 'Gagal menghitung total bank account quotation',
      };
    }
  },
};

/**
 * Tool: Menghitung Total Pulau Quotation
 */
const calculateQuotationIslandTotal = {
  name: 'calculate_quotation_island_total',
  description: 'Menghitung total harga pulau dari quotation. Gunakan ini untuk pertanyaan tentang total pulau quotation. Tool ini akan mengambil data island dan menjumlahkan island_price.',
  parameters: {
    type: 'object',
    properties: {
      islandName: {
        type: 'string',
        description: 'Nama pulau untuk filter (opsional). Jika tidak diberikan, akan menghitung total semua pulau.',
      },
      limit: {
        type: 'number',
        description: 'Jumlah maksimal data yang diambil (default: 10000)',
      },
    },
  },
  execute: async ({ islandName, limit = 10000 }, authToken) => {
    try {
      const payload = cleanObject({
        search: islandName,
        limit,
        sort_order: 'desc',
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

      const islands = response.data?.data || response.data || [];
      let total = 0;
      let count = 0;

      islands.forEach((island) => {
        const price = parseFloat(island.island_price) || 0;
        if (!isNaN(price)) {
          total += price;
          count++;
        }
      });

      return {
        success: true,
        data: {
          total: total,
          count: count,
          currency: 'IDR',
          filter: {
            islandName,
          },
        },
        message: `Total harga pulau quotation: ${total.toLocaleString('id-ID')} (dari ${count} pulau)`,
      };
    } catch (error) {
      logger.error(`Error calculating quotation island total: ${error.message || error}`);
      return {
        success: false,
        data: null,
        message: error.response?.data?.message || 'Gagal menghitung total pulau quotation',
      };
    }
  },
};

/**
 * Tool: Menghitung Jumlah IUP
 */
const calculateIUPCount = {
  name: 'calculate_iup_count',
  description: 'Menghitung jumlah IUP berdasarkan filter tertentu. Gunakan ini untuk pertanyaan tentang jumlah IUP, status IUP, atau IUP berdasarkan hierarchy territory (island → group → area → zona). Tool ini akan mengambil data dari iup_management dan menghitung jumlahnya. Filter berdasarkan hierarchy territory: island_name (pulau) → group_name (group, BUKAN segmentasi!) → iup_zone_name (area) → area_name (zona). Segmentation adalah kategori bisnis terpisah (NIKEL, BATUBARA, dll), bukan bagian dari territory hierarchy.',
  parameters: {
    type: 'object',
    properties: {
      status: {
        type: 'string',
        description: 'Status IUP untuk filter (opsional, contoh: aktif, nonaktif)',
      },
      islandName: {
        type: 'string',
        description: 'Nama pulau untuk filter (opsional). Island adalah level teratas dalam territory hierarchy.',
      },
      areaName: {
        type: 'string',
        description: 'Nama area (iup_zone_name) untuk filter (opsional). Area adalah bagian dari Group dalam territory hierarchy. Contoh: "MOROWALI", "LAHAT".',
      },
      zoneName: {
        type: 'string',
        description: 'Nama zona (area_name) untuk filter (opsional). Zona adalah bagian dari Area dalam territory hierarchy. Contoh: "3", "8".',
      },
      groupName: {
        type: 'string',
        description: 'Nama group untuk filter (opsional). Group adalah bagian dari territory hierarchy (island → group → area → zona), BUKAN segmentasi. Contoh: "G1", "G2", "G3".',
      },
      segmentationName: {
        type: 'string',
        description: 'Nama segmentasi untuk filter (opsional). Segmentation adalah kategori bisnis terpisah (NIKEL, BATUBARA, EMAS, dll), BUKAN bagian dari territory hierarchy. Beda dengan Group yang merupakan bagian dari territory.',
      },
      limit: {
        type: 'number',
        description: 'Jumlah maksimal data yang diambil (default: 10000)',
      },
    },
  },
  execute: async ({ status, islandName, areaName, zoneName, groupName, segmentationName, limit = 10000 }, authToken) => {
    try {
      const payload = cleanObject({
        status,
        limit,
        sort_by: 'updated_at',
        sort_order: 'desc',
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

      const iups = response.data?.data || response.data || [];
      let filteredIups = iups;

      // Apply filters
      if (islandName) {
        filteredIups = filteredIups.filter((iup) => 
          iup.island_name && iup.island_name.toUpperCase().includes(islandName.toUpperCase())
        );
      }
      if (areaName) {
        filteredIups = filteredIups.filter((iup) => 
          iup.iup_zone_name && iup.iup_zone_name.toUpperCase().includes(areaName.toUpperCase())
        );
      }
      if (zoneName) {
        filteredIups = filteredIups.filter((iup) => 
          iup.area_name && iup.area_name.toString().includes(zoneName)
        );
      }
      if (groupName) {
        filteredIups = filteredIups.filter((iup) => 
          iup.group_name && iup.group_name.toUpperCase().includes(groupName.toUpperCase())
        );
      }
      if (segmentationName) {
        filteredIups = filteredIups.filter((iup) => 
          iup.segmentation_name && iup.segmentation_name.toUpperCase().includes(segmentationName.toUpperCase())
        );
      }

      return {
        success: true,
        data: {
          count: filteredIups.length,
          total: iups.length,
          filter: {
            status,
            islandName,
            areaName,
            zoneName,
            groupName,
            segmentationName,
          },
        },
        message: `Jumlah IUP: ${filteredIups.length} (dari total ${iups.length} IUP)`,
      };
    } catch (error) {
      logger.error(`Error calculating IUP count: ${error.message || error}`);
      return {
        success: false,
        data: null,
        message: error.response?.data?.message || 'Gagal menghitung jumlah IUP',
      };
    }
  },
};

/**
 * Tool: Menghitung Jumlah Contractor
 */
const calculateContractorCount = {
  name: 'calculate_contractor_count',
  description: 'Menghitung jumlah contractor berdasarkan filter tertentu. Gunakan ini untuk pertanyaan tentang jumlah contractor, contractor berdasarkan hierarchy territory (island → group → area → zona → iup). Tool ini akan mengambil data dari iup_customers dan menghitung jumlahnya berdasarkan island_name, group_name, iup_zone_name (area), area_name (zona), atau iup_name. Filter berdasarkan hierarchy territory: island_name (pulau) → group_name (group, BUKAN segmentasi!) → iup_zone_name (area) → area_name (zona) → iup_name. Contoh: "berapa jumlah contractor di pulau Kalimantan?" → gunakan dengan islandName="KALIMANTAN" atau "Kalimantan".',
  parameters: {
    type: 'object',
    properties: {
      islandName: {
        type: 'string',
        description: 'Nama pulau untuk filter (opsional). Contoh: "KALIMANTAN", "SUMATERA", "JAWA", "SULAWESI". Gunakan uppercase untuk hasil yang lebih akurat.',
      },
      iupName: {
        type: 'string',
        description: 'Nama IUP untuk filter (opsional). IUP adalah level terbawah dalam territory hierarchy.',
      },
      areaName: {
        type: 'string',
        description: 'Nama area (iup_zone_name) untuk filter (opsional). Area adalah bagian dari Group dalam territory hierarchy. Contoh: "MOROWALI", "LAHAT".',
      },
      zoneName: {
        type: 'string',
        description: 'Nama zona (area_name) untuk filter (opsional). Zona adalah bagian dari Area dalam territory hierarchy. Contoh: "3", "8".',
      },
      groupName: {
        type: 'string',
        description: 'Nama group untuk filter (opsional). Group adalah bagian dari territory hierarchy (island → group → area → zona), BUKAN segmentasi. Contoh: "G1", "G2", "G3".',
      },
      segmentationName: {
        type: 'string',
        description: 'Nama segmentasi untuk filter (opsional). Segmentation adalah kategori bisnis terpisah (NIKEL, BATUBARA, EMAS, dll), BUKAN bagian dari territory hierarchy. Beda dengan Group yang merupakan bagian dari territory.',
      },
      status: {
        type: 'string',
        description: 'Status contractor untuk filter (opsional, contoh: active)',
      },
      limit: {
        type: 'number',
        description: 'Jumlah maksimal data yang diambil (default: 10000 untuk memastikan semua data terambil)',
      },
    },
  },
  execute: async ({ islandName, iupName, areaName, zoneName, groupName, segmentationName, status, limit = 10000 }, authToken) => {
    try {
      // Use high limit to ensure we get all data for accurate filtering
      const requestLimit = limit || 10000;
      
      const payload = cleanObject({
        page: 1,
        limit: requestLimit,
        sort_order: 'desc',
        search: '',
        mine_type: '',
        status: status || '',
        is_admin: 'true',
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

      // Handle response structure: { success: true, data: [...], pagination: { total: ... } }
      const responseData = response.data?.data || response.data || [];
      const pagination = response.data?.pagination || {};
      const totalFromPagination = pagination.total || null;

      // Convert to array if needed
      const contractors = Array.isArray(responseData) ? responseData : [];
      logger.debug(`Retrieved ${contractors.length} contractors from API, total from pagination: ${totalFromPagination}`);
      
      let filteredContractors = contractors;

      // Apply filters on client-side (since API might not support all filters)
      if (islandName) {
        const islandNameUpper = islandName.toUpperCase().trim();
        const beforeFilter = filteredContractors.length;
        filteredContractors = filteredContractors.filter((contractor) => {
          const contractorIsland = contractor.island_name ? contractor.island_name.toUpperCase().trim() : '';
          // Exact match untuk hasil yang akurat (misalnya "KALIMANTAN" harus exact match dengan "KALIMANTAN")
          return contractorIsland === islandNameUpper;
        });
        logger.debug(`Filtered by islandName "${islandName}": ${beforeFilter} -> ${filteredContractors.length} contractors`);
      }
      if (iupName) {
        filteredContractors = filteredContractors.filter((contractor) => 
          contractor.iup_name && contractor.iup_name.toUpperCase().includes(iupName.toUpperCase())
        );
      }
      if (areaName) {
        filteredContractors = filteredContractors.filter((contractor) => 
          contractor.iup_zone_name && contractor.iup_zone_name.toUpperCase().includes(areaName.toUpperCase())
        );
      }
      if (zoneName) {
        filteredContractors = filteredContractors.filter((contractor) => 
          contractor.area_name && contractor.area_name.toString().includes(zoneName)
        );
      }
      if (groupName) {
        filteredContractors = filteredContractors.filter((contractor) => 
          contractor.group_name && contractor.group_name.toUpperCase().includes(groupName.toUpperCase())
        );
      }
      if (segmentationName) {
        filteredContractors = filteredContractors.filter((contractor) => 
          contractor.segmentation_name_en && contractor.segmentation_name_en.toUpperCase().includes(segmentationName.toUpperCase())
        );
      }

      // Calculate filtered count
      const filteredCount = filteredContractors.length;
      const totalCount = totalFromPagination !== null ? totalFromPagination : contractors.length;

      // Build message based on filters
      let message = '';
      if (islandName || iupName || areaName || zoneName || groupName || segmentationName || status) {
        // If filtering by island, provide clear message
        if (islandName) {
          message = `Jumlah contractor di pulau ${islandName}: ${filteredCount}`;
          if (totalFromPagination !== null) {
            message += ` (dari total ${totalCount} contractor di seluruh sistem)`;
          }
        } else {
          message = `Jumlah contractor dengan filter yang diberikan: ${filteredCount}`;
          if (totalFromPagination !== null) {
            message += ` (dari total ${totalCount} contractor di sistem)`;
          }
        }
      } else {
        message = `Jumlah contractor: ${totalCount}`;
      }

      return {
        success: true,
        data: {
          count: filteredCount,
          total: totalCount,
          totalFromPagination: totalFromPagination,
          filter: {
            islandName,
            iupName,
            areaName,
            zoneName,
            groupName,
            segmentationName,
            status,
          },
        },
        message: message,
      };
    } catch (error) {
      logger.error(`Error calculating contractor count: ${error.message || error}`);
      return {
        success: false,
        data: null,
        message: error.response?.data?.message || 'Gagal menghitung jumlah contractor',
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
    // Quotation Aggregation Tools
    {
      type: 'function',
      function: {
        name: calculateQuotationGrandTotal.name,
        description: calculateQuotationGrandTotal.description,
        parameters: calculateQuotationGrandTotal.parameters,
      },
    },
    {
      type: 'function',
      function: {
        name: calculateQuotationProductTotal.name,
        description: calculateQuotationProductTotal.description,
        parameters: calculateQuotationProductTotal.parameters,
      },
    },
    {
      type: 'function',
      function: {
        name: calculateQuotationAccessoryTotal.name,
        description: calculateQuotationAccessoryTotal.description,
        parameters: calculateQuotationAccessoryTotal.parameters,
      },
    },
    {
      type: 'function',
      function: {
        name: calculateQuotationTermConditionTotal.name,
        description: calculateQuotationTermConditionTotal.description,
        parameters: calculateQuotationTermConditionTotal.parameters,
      },
    },
    {
      type: 'function',
      function: {
        name: calculateQuotationCustomerTotal.name,
        description: calculateQuotationCustomerTotal.description,
        parameters: calculateQuotationCustomerTotal.parameters,
      },
    },
    {
      type: 'function',
      function: {
        name: calculateQuotationBankAccountTotal.name,
        description: calculateQuotationBankAccountTotal.description,
        parameters: calculateQuotationBankAccountTotal.parameters,
      },
    },
    {
      type: 'function',
      function: {
        name: calculateQuotationIslandTotal.name,
        description: calculateQuotationIslandTotal.description,
        parameters: calculateQuotationIslandTotal.parameters,
      },
    },
    // CRM Aggregation Tools
    {
      type: 'function',
      function: {
        name: calculateIUPCount.name,
        description: calculateIUPCount.description,
        parameters: calculateIUPCount.parameters,
      },
    },
    {
      type: 'function',
      function: {
        name: calculateContractorCount.name,
        description: calculateContractorCount.description,
        parameters: calculateContractorCount.parameters,
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
    // Quotation Aggregation Tools
    [calculateQuotationGrandTotal.name]: calculateQuotationGrandTotal,
    [calculateQuotationProductTotal.name]: calculateQuotationProductTotal,
    [calculateQuotationAccessoryTotal.name]: calculateQuotationAccessoryTotal,
    [calculateQuotationTermConditionTotal.name]: calculateQuotationTermConditionTotal,
    [calculateQuotationCustomerTotal.name]: calculateQuotationCustomerTotal,
    [calculateQuotationBankAccountTotal.name]: calculateQuotationBankAccountTotal,
    [calculateQuotationIslandTotal.name]: calculateQuotationIslandTotal,
    // CRM Aggregation Tools
    [calculateIUPCount.name]: calculateIUPCount,
    [calculateContractorCount.name]: calculateContractorCount,
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
  // Quotation Aggregation Tools
  calculateQuotationGrandTotal,
  calculateQuotationProductTotal,
  calculateQuotationAccessoryTotal,
  calculateQuotationTermConditionTotal,
  calculateQuotationCustomerTotal,
  calculateQuotationBankAccountTotal,
  calculateQuotationIslandTotal,
  // CRM Aggregation Tools
  calculateIUPCount,
  calculateContractorCount,
};
