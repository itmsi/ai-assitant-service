const axios = require('axios');
const { Logger } = require('../../../utils/logger');
const logger = Logger;
const aiConfig = require('../../../config/ai');
const { sanitizePath, getDefaultHeaders, cleanObject } = require('./gateway');

// ═══════════════════════════════════════════════════════════════
//  Quotation entity configurations
//  Semua endpoint diakses via gateway: /api/quotation/<entity>/...
// ═══════════════════════════════════════════════════════════════

const ENTITIES = {
  customer:           { path: '/api/quotation/customer',           menuKey: 'manage_quotation' },
  sales:              { path: '/api/quotation/sales',              menuKey: 'manage_quotation' },
  bankAccount:        { path: '/api/quotation/bank-account',       menuKey: 'manage_quotation' },
  manageQuotation:    { path: '/api/quotation/manage-quotation',   menuKey: 'manage_quotation' },
  termContent:        { path: '/api/quotation/term_content',       menuKey: 'manage_quotation' },
  componentProduct:   { path: '/api/quotation/componen_product',   menuKey: 'manage_quotation' },
  accessory:          { path: '/api/quotation/accessory',          menuKey: 'manage_quotation' },
};

// ═══════════════════════════════════════════════════════════════
//  Helper: Build Quotation Tool
// ═══════════════════════════════════════════════════════════════

const buildSearchParams = (extra = []) => {
  const base = {
    search: { type: 'string', description: 'Keyword pencarian' },
    page: { type: 'number', description: 'Halaman (default: 1)' },
    limit: { type: 'number', description: 'Limit (default: 100)' },
    sort_order: { type: 'string', enum: ['asc', 'desc'], description: 'Sorting (default: desc)' },
  };
  for (const f of extra) base[f.name] = f.schema;
  return { type: 'object', properties: base };
};

const buildCreateParams = (fields) => {
  const props = {}; const required = [];
  for (const f of fields) { props[f.name] = f.schema; if (f.required) required.push(f.name); }
  return { type: 'object', properties: props, ...(required.length ? { required } : {}) };
};

const buildUpdateParams = (fields) => ({
  type: 'object',
  properties: { id: { type: 'string', description: 'ID' }, ...Object.fromEntries(fields.map(f => [f.name, f.schema])) },
  required: ['id'],
});

const buildDeleteParams = () => ({
  type: 'object', properties: { id: { type: 'string', description: 'ID yang akan dihapus' } }, required: ['id'],
});

const buildQuotationTool = (entity, entityPath, method, searchExtras = [], createFields = [], updateFields = null) => {
  const descName = entity.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim();
  const toolNameBase = entity.replace(/([A-Z])/g, '_$1').toLowerCase();

  let name, action, descAction, paramsBuilder;
  if (method === 'GET') {
    name = `search_${toolNameBase}`;
    action = 'read';
    descAction = 'Mencari';
    paramsBuilder = () => buildSearchParams(searchExtras);
  } else if (method === 'CREATE') {
    name = `create_${toolNameBase}`;
    action = 'create';
    descAction = 'Membuat';
    paramsBuilder = () => buildCreateParams(createFields);
  } else if (method === 'UPDATE') {
    name = `update_${toolNameBase}`;
    action = 'update';
    descAction = 'Memperbarui';
    paramsBuilder = () => buildUpdateParams(updateFields || createFields);
  } else {
    name = `delete_${toolNameBase}`;
    action = 'delete';
    descAction = 'Menghapus';
    paramsBuilder = buildDeleteParams;
  }

  const desc = `${descAction} ${descName} Quotation.`;

  return {
    name, menuKey: 'manage_quotation', action,
    description: desc,
    parameters: paramsBuilder(),
    execute: async (input, authToken) => {
      try {
        const baseUrl = (aiConfig.API_GATEWAY_BASE_URL || '').replace(/\/$/, '');
        let url, httpMethod, payload = null;

        if (method === 'GET') {
          url = `${baseUrl}${sanitizePath(`${entityPath}/get`)}`;
          payload = cleanObject({ page: 1, limit: 100, sort_order: 'desc', ...input });
          httpMethod = 'post';
        } else if (method === 'DELETE') {
          url = `${baseUrl}${sanitizePath(`${entityPath}/${input.id}`)}`;
          httpMethod = 'delete';
        } else if (method === 'UPDATE') {
          const { id, ...rest } = input;
          url = `${baseUrl}${sanitizePath(`${entityPath}/${id}`)}`;
          payload = cleanObject(rest);
          httpMethod = 'put';
        } else {
          // CREATE
          url = `${baseUrl}${sanitizePath(`${entityPath}`)}`;
          payload = cleanObject(input);
          httpMethod = 'post';
        }

        const headers = getDefaultHeaders(authToken);
        let response;
        if (httpMethod === 'post') response = await axios.post(url, payload || {}, { headers, timeout: aiConfig.API_GATEWAY_TIMEOUT });
        else if (httpMethod === 'put') response = await axios.put(url, payload || {}, { headers, timeout: aiConfig.API_GATEWAY_TIMEOUT });
        else response = await axios.delete(url, { headers, timeout: aiConfig.API_GATEWAY_TIMEOUT });

        const lbl = method === 'GET' ? 'diambil' : method === 'CREATE' ? 'dibuat' : method === 'UPDATE' ? 'diupdate' : 'dihapus';
        return { success: true, data: response.data, message: `${descName} berhasil ${lbl}` };
      } catch (error) {
        logger.error(`Error ${name}: ${error.message}`);
        return { success: false, data: null, message: error.response?.data?.message || `Gagal ${descAction.toLowerCase()} ${descName.toLowerCase()}` };
      }
    },
  };
};

// ═══════════════════════════════════════════════════════════════
//  1. CUSTOMER (Quotation)
// ═══════════════════════════════════════════════════════════════
const e = ENTITIES.customer;
const searchQuotationCustomer    = buildQuotationTool('customer', e.path, 'GET');
const createQuotationCustomer    = buildQuotationTool('customer', e.path, 'CREATE', [], [
  { name: 'name', schema: { type: 'string' }, required: true },
  { name: 'email', schema: { type: 'string' } },
  { name: 'phone', schema: { type: 'string' } },
]);
const deleteQuotationCustomer    = buildQuotationTool('customer', e.path, 'DELETE');

// ═══════════════════════════════════════════════════════════════
//  2. SALES
// ═══════════════════════════════════════════════════════════════
const e2 = ENTITIES.sales;
const searchQuotationSales       = buildQuotationTool('sales', e2.path, 'GET');
const createQuotationSales       = buildQuotationTool('sales', e2.path, 'CREATE', [], [
  { name: 'sales_name', schema: { type: 'string' }, required: true },
]);
const deleteQuotationSales       = buildQuotationTool('sales', e2.path, 'DELETE');

// ═══════════════════════════════════════════════════════════════
//  3. BANK ACCOUNT (Quotation)
// ═══════════════════════════════════════════════════════════════
const e3 = ENTITIES.bankAccount;
const searchQuotationBankAccount = buildQuotationTool('bank_account', e3.path, 'GET');
const createQuotationBankAccount = buildQuotationTool('bank_account', e3.path, 'CREATE', [], [
  { name: 'bank_account_name', schema: { type: 'string' }, required: true },
  { name: 'bank_account_number', schema: { type: 'string' } },
  { name: 'bank_account_type', schema: { type: 'string' } },
]);
const deleteQuotationBankAccount = buildQuotationTool('bank_account', e3.path, 'DELETE');

// ═══════════════════════════════════════════════════════════════
//  4. MANAGE QUOTATION
// ═══════════════════════════════════════════════════════════════
const e4 = ENTITIES.manageQuotation;

// ── Search (backward compatible name search_quotations) ──
const searchQuotations = {
  name: 'search_quotations',
  menuKey: 'manage_quotation', action: 'read',
  description: 'Mencari data quotation. Response berisi pagination.total untuk jumlah keseluruhan.',
  parameters: buildSearchParams([
    { name: 'quotation_for', schema: { type: 'string' } },
    { name: 'quotationNumber', schema: { type: 'string' } },
    { name: 'status', schema: { type: 'string' } },
    { name: 'startDate', schema: { type: 'string' } },
    { name: 'endDate', schema: { type: 'string' } },
  ]),
  execute: async ({ search, page = 1, limit = 10, sort_order = 'desc', quotation_for, quotationNumber, status, startDate, endDate }, authToken) => {
    try {
      const payload = cleanObject({ page, limit, sort_order, search: search || quotationNumber || '', quotation_for: quotation_for || '', status, startDate, endDate });
      const baseUrl = (aiConfig.API_GATEWAY_BASE_URL || '').replace(/\/$/, '');
      const url = `${baseUrl}${sanitizePath(`${e4.path}/get`)}`;
      const response = await axios.post(url, payload || {}, { headers: getDefaultHeaders(authToken), timeout: aiConfig.API_GATEWAY_TIMEOUT });
      return { success: true, data: response.data, message: 'Data quotation berhasil diambil' };
    } catch (error) {
      logger.error(`Error search_quotations: ${error.message}`);
      return { success: false, data: null, message: error.response?.data?.message || 'Gagal mengambil data quotation' };
    }
  },
};
const createQuotation            = buildQuotationTool('manage_quotation', e4.path, 'CREATE', [], [
  { name: 'customer_name', schema: { type: 'string' }, required: true },
  { name: 'quotation_for', schema: { type: 'string' } },
]);
const updateQuotation            = buildQuotationTool('manage_quotation', e4.path, 'UPDATE', [], [
  { name: 'customer_name', schema: { type: 'string' } },
  { name: 'status', schema: { type: 'string' } },
]);
const deleteQuotation            = buildQuotationTool('manage_quotation', e4.path, 'DELETE');

// ═══════════════════════════════════════════════════════════════
//  5. TERM CONTENT
// ═══════════════════════════════════════════════════════════════
const e5 = ENTITIES.termContent;
const searchQuotationTermCondition = buildQuotationTool('term_content', e5.path, 'GET');
const createQuotationTermCondition = buildQuotationTool('term_content', e5.path, 'CREATE', [], [
  { name: 'term_content_title', schema: { type: 'string' }, required: true },
  { name: 'term_content_directory', schema: { type: 'string' } },
]);
const updateQuotationTermCondition = buildQuotationTool('term_content', e5.path, 'UPDATE', [], [
  { name: 'term_content_title', schema: { type: 'string' } },
  { name: 'term_content_directory', schema: { type: 'string' } },
]);
const deleteQuotationTermCondition = buildQuotationTool('term_content', e5.path, 'DELETE');

// ═══════════════════════════════════════════════════════════════
//  6. COMPONENT PRODUCT
// ═══════════════════════════════════════════════════════════════
const e6 = ENTITIES.componentProduct;
const searchQuotationProducts     = buildQuotationTool('componen_product', e6.path, 'GET');
const createQuotationProduct      = buildQuotationTool('componen_product', e6.path, 'CREATE', [], [
  { name: 'componen_product_name', schema: { type: 'string' }, required: true },
  { name: 'componen_product_description', schema: { type: 'string' } },
]);
const updateQuotationProduct      = buildQuotationTool('componen_product', e6.path, 'UPDATE', [], [
  { name: 'componen_product_name', schema: { type: 'string' } },
  { name: 'componen_product_description', schema: { type: 'string' } },
]);
const deleteQuotationProduct      = buildQuotationTool('componen_product', e6.path, 'DELETE');

// ═══════════════════════════════════════════════════════════════
//  7. ACCESSORIES
// ═══════════════════════════════════════════════════════════════
const e7 = ENTITIES.accessory;
const searchQuotationAccessory    = buildQuotationTool('accessory', e7.path, 'GET');
const createQuotationAccessory    = buildQuotationTool('accessory', e7.path, 'CREATE', [], [
  { name: 'accessory_part_name', schema: { type: 'string' }, required: true },
  { name: 'accessory_part_number', schema: { type: 'string' } },
  { name: 'accessory_specification', schema: { type: 'string' } },
]);
const updateQuotationAccessory    = buildQuotationTool('accessory', e7.path, 'UPDATE', [], [
  { name: 'accessory_part_name', schema: { type: 'string' } },
  { name: 'accessory_part_number', schema: { type: 'string' } },
]);
const deleteQuotationAccessory    = buildQuotationTool('accessory', e7.path, 'DELETE');

// ═══════════════════════════════════════════════════════════════
//  8. ISLAND (for Quotation context — gateway fallback)
// ═══════════════════════════════════════════════════════════════
const searchQuotationIsland = {
  name: 'search_quotation_island',
  menuKey: 'manage_quotation',
  action: 'read',
  description: 'Mencari data pulau (island) khusus untuk keperluan Quotation.',
  parameters: {
    type: 'object',
    properties: {
      search: { type: 'string', description: 'Keyword pencarian island' },
      page: { type: 'number', description: 'Halaman (default: 1)' },
      limit: { type: 'number', description: 'Limit (default: 100)' },
      sort_order: { type: 'string', enum: ['asc', 'desc'], description: 'Sorting (default: desc)' },
    },
  },
  execute: async ({ search, page = 1, limit = 100, sort_order = 'desc' }, authToken) => {
    try {
      const payload = cleanObject({ page, limit, sort_order, search });
      const baseUrl = (aiConfig.API_GATEWAY_BASE_URL || '').replace(/\/$/, '');
      const url = `${baseUrl}${sanitizePath('/api/island/get')}`;
      const response = await axios.post(url, payload || {}, { headers: getDefaultHeaders(authToken), timeout: aiConfig.API_GATEWAY_TIMEOUT });
      return { success: true, data: response.data, message: 'Data island quotation berhasil diambil' };
    } catch (error) {
      logger.error(`Error search_quotation_island: ${error.message}`);
      return { success: false, data: null, message: error.response?.data?.message || 'Gagal mengambil data island quotation' };
    }
  },
};

// ═══════════════════════════════════════════════════════════════
//  Exports
// ═══════════════════════════════════════════════════════════════

module.exports = {
  // Manage Quotation
  searchQuotations, createQuotation, updateQuotation, deleteQuotation,
  // Customer
  searchQuotationCustomer, createQuotationCustomer, deleteQuotationCustomer,
  // Sales
  searchQuotationSales, createQuotationSales, deleteQuotationSales,
  // Bank Account
  searchQuotationBankAccount, createQuotationBankAccount, deleteQuotationBankAccount,
  // Term Condition
  searchQuotationTermCondition, createQuotationTermCondition, updateQuotationTermCondition, deleteQuotationTermCondition,
  // Products
  searchQuotationProducts, createQuotationProduct, updateQuotationProduct, deleteQuotationProduct,
  // Accessories
  searchQuotationAccessory, createQuotationAccessory, updateQuotationAccessory, deleteQuotationAccessory,
  // Island
  searchQuotationIsland,
};
