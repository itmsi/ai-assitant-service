const axios = require('axios');
const { Logger } = require('../../utils/logger');
const logger = Logger;
const aiConfig = require('../../config/ai');

const GATEWAY_ALLOWED_PREFIXES = [
  '/api/auth',
  '/api/menus',
  '/api/companies',
  '/api/departments',
  '/api/employees',
  '/api/roles',
  '/api/permissions',
  '/api/users',
  '/api/titles',
  '/api/menu-has-permissions',
  '/api/role-has-menu-permissions',
  '/api/customers',
  '/api/bank_accounts',
  '/api/quotation',
  '/api/powerbi',
  '/api/categories',
  '/api/interview',
  '/api/candidates',
  '/api/applicants',
  '/api/schedule-interviews',
  '/api/on-board-documents',
  '/api/background-checks',
  '/api/catalogs',
  '/api/driver_types',
  '/api/vehicle_weights',
  '/api/brands',
  '/api/world_manufacturing_plants',
  '/api/productions',
  '/api/type_cabine',
  '/api/cabines',
  '/api/type_engine',
  '/api/engines',
  '/api/type_transmission',
  '/api/transmission',
  '/api/type_axel',
  '/api/axel',
  '/api/type_steering',
  '/api/steering',
  '/api/catalogs/all-item-catalogs',
  '/api/epc',
  '/api/public',
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
      const params = {
        month,
        status,
        keyword,
        limit,
      };

      const baseUrl = aiConfig.API_GATEWAY_BASE_URL
        ? buildGatewayUrl('/api/candidates')
        : `${(aiConfig.MICROSERVICE_HR_URL || '').replace(/\/$/, '')}/api/candidates`;

      const response = await axios.get(baseUrl, {
        headers: getDefaultHeaders(authToken),
        params,
        timeout: aiConfig.API_GATEWAY_TIMEOUT,
      });

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
      const params = {
        name,
        department,
        status,
        limit,
      };

      const baseUrl = aiConfig.API_GATEWAY_BASE_URL
        ? buildGatewayUrl('/api/employees')
        : `${(aiConfig.MICROSERVICE_HR_URL || '').replace(/\/$/, '')}/api/employees`;

      const response = await axios.get(baseUrl, {
        headers: getDefaultHeaders(authToken),
        params,
        timeout: aiConfig.API_GATEWAY_TIMEOUT,
      });

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
      const params = {
        quotationNumber,
        status,
        startDate,
        endDate,
        limit,
      };

      const baseUrl = aiConfig.API_GATEWAY_BASE_URL
        ? buildGatewayUrl('/api/quotation/manage-quotation')
        : `${(aiConfig.MICROSERVICE_QUOTATION_URL || '').replace(/\/$/, '')}/api/quotations`;

      const response = await axios.get(baseUrl, {
        headers: getDefaultHeaders(authToken),
        params,
        timeout: aiConfig.API_GATEWAY_TIMEOUT,
      });

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
      const params = {
        name,
        category,
        keyword,
        limit,
      };

      const baseUrl = aiConfig.API_GATEWAY_BASE_URL
        ? buildGatewayUrl('/api/catalogs/catalogItems')
        : `${(aiConfig.MICROSERVICE_ECATALOG_URL || '').replace(/\/$/, '')}/api/products`;

      const response = await axios.get(baseUrl, {
        headers: getDefaultHeaders(authToken),
        params,
        timeout: aiConfig.API_GATEWAY_TIMEOUT,
      });

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

const cleanObject = (obj = {}) => {
  if (!obj || typeof obj !== 'object') return undefined;
  return Object.entries(obj).reduce((acc, [key, value]) => {
    if (value === undefined || value === null || value === '') {
      return acc;
    }
    acc[key] = value;
    return acc;
  }, {});
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

      const url = buildGatewayUrl(sanitizedPath);
      const upperMethod = method.toUpperCase();
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
};
