const axios = require('axios');
const { Logger } = require('../../../utils/logger');
const logger = Logger;
const aiConfig = require('../../../config/ai');

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
  GATEWAY_ALLOWED_PREFIXES,
  sanitizePath,
  isGatewayPathAllowed,
  buildGatewayUrl,
  getDefaultHeaders,
  cleanObject,
  isWriteOperation,
  callGatewayEndpoint,
};
