const axios = require('axios');
const { Logger } = require('../../../utils/logger');
const logger = Logger;
const aiConfig = require('../../../config/ai');
const { sanitizePath, getDefaultHeaders, cleanObject } = require('./gateway');

const searchQuotations = {
  name: 'search_quotations',
  menuKey: 'manage_quotation',
  action: 'read',
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

const searchQuotationProducts = {
  name: 'search_quotation_products',
  menuKey: 'manage_quotation',
  action: 'read',
  description: 'Mencari data produk quotation (component product). Gunakan ini untuk pertanyaan tentang produk yang digunakan dalam quotation.',
  parameters: {
    type: 'object',
    properties: {
      search: { type: 'string', description: 'Keyword pencarian produk' },
      page: { type: 'number', description: 'Nomor halaman (default: 1)' },
      limit: { type: 'number', description: 'Jumlah maksimal hasil (default: 100)' },
      sort_order: { type: 'string', enum: ['asc', 'desc'], description: 'Urutan sorting (default: desc)' },
    },
  },
  execute: async ({ search, page = 1, limit = 100, sort_order = 'desc' }, authToken) => {
    try {
      const payload = cleanObject({ page, limit, sort_order, search });
      const baseUrl = (aiConfig.API_GATEWAY_BASE_URL || aiConfig.MICROSERVICE_QUOTATION_URL || '').replace(/\/$/, '');
      const endpoint = `${baseUrl}${sanitizePath('/api/quotation/componen_product/get')}`;
      const response = await axios.post(endpoint, payload || {}, { headers: getDefaultHeaders(authToken), timeout: aiConfig.API_GATEWAY_TIMEOUT });
      return { success: true, data: response.data, message: 'Data produk quotation berhasil diambil' };
    } catch (error) {
      logger.error(`Error fetching quotation products: ${error.message || error}`);
      return { success: false, data: null, message: error.response?.data?.message || 'Gagal mengambil data produk quotation' };
    }
  },
};

const searchQuotationAccessory = {
  name: 'search_quotation_accessory',
  menuKey: 'manage_quotation',
  action: 'read',
  description: 'Mencari data aksesori quotation. Gunakan ini untuk pertanyaan tentang aksesori yang digunakan dalam quotation.',
  parameters: {
    type: 'object',
    properties: {
      search: { type: 'string', description: 'Keyword pencarian aksesori' },
      page: { type: 'number', description: 'Nomor halaman (default: 1)' },
      limit: { type: 'number', description: 'Jumlah maksimal hasil (default: 100)' },
      sort_order: { type: 'string', enum: ['asc', 'desc'], description: 'Urutan sorting (default: desc)' },
    },
  },
  execute: async ({ search, page = 1, limit = 100, sort_order = 'desc' }, authToken) => {
    try {
      const payload = cleanObject({ page, limit, sort_order, search });
      const baseUrl = (aiConfig.API_GATEWAY_BASE_URL || aiConfig.MICROSERVICE_QUOTATION_URL || '').replace(/\/$/, '');
      const endpoint = `${baseUrl}${sanitizePath('/api/quotation/accessory/get')}`;
      const response = await axios.post(endpoint, payload || {}, { headers: getDefaultHeaders(authToken), timeout: aiConfig.API_GATEWAY_TIMEOUT });
      return { success: true, data: response.data, message: 'Data aksesori quotation berhasil diambil' };
    } catch (error) {
      logger.error(`Error fetching quotation accessory: ${error.message || error}`);
      return { success: false, data: null, message: error.response?.data?.message || 'Gagal mengambil data aksesori quotation' };
    }
  },
};

const searchQuotationTermCondition = {
  name: 'search_quotation_term_condition',
  menuKey: 'manage_quotation',
  action: 'read',
  description: 'Mencari data term dan condition quotation. Gunakan ini untuk pertanyaan tentang syarat dan ketentuan quotation.',
  parameters: {
    type: 'object',
    properties: {
      search: { type: 'string', description: 'Keyword pencarian term condition' },
      page: { type: 'number', description: 'Nomor halaman (default: 1)' },
      limit: { type: 'number', description: 'Jumlah maksimal hasil (default: 100)' },
      sort_order: { type: 'string', enum: ['asc', 'desc'], description: 'Urutan sorting (default: desc)' },
    },
  },
  execute: async ({ search, page = 1, limit = 100, sort_order = 'desc' }, authToken) => {
    try {
      const payload = cleanObject({ page, limit, sort_order, search });
      const baseUrl = (aiConfig.API_GATEWAY_BASE_URL || aiConfig.MICROSERVICE_QUOTATION_URL || '').replace(/\/$/, '');
      const endpoint = `${baseUrl}${sanitizePath('/api/quotation/term_content/get')}`;
      const response = await axios.post(endpoint, payload || {}, { headers: getDefaultHeaders(authToken), timeout: aiConfig.API_GATEWAY_TIMEOUT });
      return { success: true, data: response.data, message: 'Data term condition quotation berhasil diambil' };
    } catch (error) {
      logger.error(`Error fetching quotation term condition: ${error.message || error}`);
      return { success: false, data: null, message: error.response?.data?.message || 'Gagal mengambil data term condition quotation' };
    }
  },
};

const searchQuotationCustomer = {
  name: 'search_quotation_customer',
  menuKey: 'manage_quotation',
  action: 'read',
  description: 'Mencari data customer quotation. Gunakan ini untuk pertanyaan tentang customer yang terkait dengan quotation.',
  parameters: {
    type: 'object',
    properties: {
      search: { type: 'string', description: 'Keyword pencarian customer' },
      page: { type: 'number', description: 'Nomor halaman (default: 1)' },
      limit: { type: 'number', description: 'Jumlah maksimal hasil (default: 100)' },
      sort_order: { type: 'string', enum: ['asc', 'desc'], description: 'Urutan sorting (default: desc)' },
    },
  },
  execute: async ({ search, page = 1, limit = 100, sort_order = 'desc' }, authToken) => {
    try {
      const payload = cleanObject({ page, limit, sort_order, search });
      const baseUrl = (aiConfig.API_GATEWAY_BASE_URL || aiConfig.MICROSERVICE_QUOTATION_URL || '').replace(/\/$/, '');
      const endpoint = `${baseUrl}${sanitizePath('/api/customers/get')}`;
      const response = await axios.post(endpoint, payload || {}, { headers: getDefaultHeaders(authToken), timeout: aiConfig.API_GATEWAY_TIMEOUT });
      return { success: true, data: response.data, message: 'Data customer quotation berhasil diambil' };
    } catch (error) {
      logger.error(`Error fetching quotation customer: ${error.message || error}`);
      return { success: false, data: null, message: error.response?.data?.message || 'Gagal mengambil data customer quotation' };
    }
  },
};

const searchQuotationBankAccount = {
  name: 'search_quotation_bank_account',
  menuKey: 'manage_quotation',
  action: 'read',
  description: 'Mencari data bank account quotation. Gunakan ini untuk pertanyaan tentang rekening bank yang digunakan dalam quotation.',
  parameters: {
    type: 'object',
    properties: {
      search: { type: 'string', description: 'Keyword pencarian bank account' },
      page: { type: 'number', description: 'Nomor halaman (default: 1)' },
      limit: { type: 'number', description: 'Jumlah maksimal hasil (default: 100)' },
      sort_order: { type: 'string', enum: ['asc', 'desc'], description: 'Urutan sorting (default: desc)' },
    },
  },
  execute: async ({ search, page = 1, limit = 100, sort_order = 'desc' }, authToken) => {
    try {
      const payload = cleanObject({ page, limit, sort_order, search });
      const baseUrl = (aiConfig.API_GATEWAY_BASE_URL || aiConfig.MICROSERVICE_QUOTATION_URL || '').replace(/\/$/, '');
      const endpoint = `${baseUrl}${sanitizePath('/api/bank_accounts/get')}`;
      const response = await axios.post(endpoint, payload || {}, { headers: getDefaultHeaders(authToken), timeout: aiConfig.API_GATEWAY_TIMEOUT });
      return { success: true, data: response.data, message: 'Data bank account quotation berhasil diambil' };
    } catch (error) {
      logger.error(`Error fetching quotation bank account: ${error.message || error}`);
      return { success: false, data: null, message: error.response?.data?.message || 'Gagal mengambil data bank account quotation' };
    }
  },
};

const searchQuotationIsland = {
  name: 'search_quotation_island',
  menuKey: 'manage_quotation',
  action: 'read',
  description: 'Mencari data pulau (island) KHUSUS untuk keperluan Quotation. JANGAN gunakan tool ini jika user bertanya tentang Island dalam konteks CRM atau module lain. Hanya gunakan jika konteksnya adalah Quotation.',
  parameters: {
    type: 'object',
    properties: {
      search: { type: 'string', description: 'Keyword pencarian island' },
      page: { type: 'number', description: 'Nomor halaman (default: 1)' },
      limit: { type: 'number', description: 'Jumlah maksimal hasil (default: 100)' },
      sort_order: { type: 'string', enum: ['asc', 'desc'], description: 'Urutan sorting (default: desc)' },
    },
  },
  execute: async ({ search, page = 1, limit = 100, sort_order = 'desc' }, authToken) => {
    try {
      const payload = cleanObject({ page, limit, sort_order, search });
      const baseUrl = (aiConfig.API_GATEWAY_BASE_URL || aiConfig.MICROSERVICE_QUOTATION_URL || '').replace(/\/$/, '');
      const endpoint = `${baseUrl}${sanitizePath('/api/island/get')}`;
      const response = await axios.post(endpoint, payload || {}, { headers: getDefaultHeaders(authToken), timeout: aiConfig.API_GATEWAY_TIMEOUT });
      return { success: true, data: response.data, message: 'Data island quotation berhasil diambil' };
    } catch (error) {
      logger.error(`Error fetching quotation island: ${error.message || error}`);
      return { success: false, data: null, message: error.response?.data?.message || 'Gagal mengambil data island quotation' };
    }
  },
};

module.exports = {
  searchQuotations,
  searchQuotationProducts,
  searchQuotationAccessory,
  searchQuotationTermCondition,
  searchQuotationCustomer,
  searchQuotationBankAccount,
  searchQuotationIsland,
};
