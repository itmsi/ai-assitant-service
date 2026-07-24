const axios = require('axios');
const { Logger } = require('../../../utils/logger');
const logger = Logger;
const aiConfig = require('../../../config/ai');
const { sanitizePath, getDefaultHeaders, cleanObject } = require('./gateway');

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

const buildTool = (entity, endpoint, method, menuKey = 'EPC', searchExtra = [], createFields = [], updateFields = null) => {
  const descName = entity.replace(/_/g, ' ').replace(/\b\w/g, s => s.toUpperCase());
  let name, action, descAction, params;
  if (method === 'GET') {
    name = `search_epc_${entity}`; action = 'read'; descAction = 'Mencari';
    params = buildSearchParams(searchExtra);
  } else if (method === 'CREATE') {
    name = `create_epc_${entity}`; action = 'create'; descAction = 'Membuat';
    params = buildCreateParams(createFields);
  } else if (method === 'UPDATE') {
    name = `update_epc_${entity}`; action = 'update'; descAction = 'Memperbarui';
    params = buildUpdateParams(updateFields || createFields);
  } else if (method === 'GET_SINGLE') {
    name = `get_epc_${entity}`; action = 'read'; descAction = 'Mendapatkan';
    params = { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] };
  } else {
    name = `delete_epc_${entity}`; action = 'delete'; descAction = 'Menghapus';
    params = { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] };
  }

  return {
    name, menuKey, action, description: `${descAction} ${descName} EPC.`,
    parameters: params,
    execute: async (input, authToken) => {
      try {
        const baseUrl = (aiConfig.API_GATEWAY_BASE_URL || '').replace(/\/$/, '');
        let url, httpMethod, payload = null;
        if (method === 'GET') {
          url = `${baseUrl}${sanitizePath(`/api/epc/${endpoint}/get`)}`;
          payload = cleanObject({ page: 1, limit: 100, sort_order: 'desc', ...input });
          httpMethod = 'post';
        } else if (method === 'GET_SINGLE') {
          url = `${baseUrl}${sanitizePath(`/api/epc/${endpoint}/${input.id}`)}`;
          httpMethod = 'get';
        } else if (method === 'DELETE') {
          url = `${baseUrl}${sanitizePath(`/api/epc/${endpoint}/${input.id}`)}`;
          httpMethod = 'delete';
        } else if (method === 'UPDATE') {
          const { id, ...rest } = input;
          url = `${baseUrl}${sanitizePath(`/api/epc/${endpoint}/${id}`)}`;
          payload = cleanObject(rest); httpMethod = 'put';
        } else {
          url = `${baseUrl}${sanitizePath(`/api/epc/${endpoint}/create`)}`;
          payload = cleanObject(input); httpMethod = 'post';
        }
        const headers = getDefaultHeaders(authToken);
        let response;
        if (httpMethod === 'post') response = await axios.post(url, payload || {}, { headers, timeout: aiConfig.API_GATEWAY_TIMEOUT });
        else if (httpMethod === 'put') response = await axios.put(url, payload || {}, { headers, timeout: aiConfig.API_GATEWAY_TIMEOUT });
        else if (httpMethod === 'get') response = await axios.get(url, { headers, timeout: aiConfig.API_GATEWAY_TIMEOUT });
        else response = await axios.delete(url, { headers, timeout: aiConfig.API_GATEWAY_TIMEOUT });
        const lbl = method === 'GET' || method === 'GET_SINGLE' ? 'diambil' : method === 'CREATE' ? 'dibuat' : method === 'UPDATE' ? 'diupdate' : 'dihapus';
        return { success: true, data: response.data, message: `${descName} berhasil ${lbl}` };
      } catch (error) {
        logger.error(`Error ${name}: ${error.message}`);
        return { success: false, data: null, message: error.response?.data?.message || `Gagal ${descAction.toLowerCase()}` };
      }
    },
  };
};

// ═══════════════════════════════════════════════════════════════
//  1. MASTER CATEGORY (MasterCategoryInput: master_category_name_en, master_category_name_cn, master_category_description)
// ═══════════════════════════════════════════════════════════════
const searchEPCMasterCategory   = buildTool('master_category', 'master_category', 'GET');
const createEPCMasterCategory   = buildTool('master_category', 'master_category', 'CREATE', 'EPC', [], [
  { name: 'master_category_name_en', schema: { type: 'string' }, required: true },
  { name: 'master_category_name_cn', schema: { type: 'string' } },
  { name: 'master_category_description', schema: { type: 'string' } },
]);
const updateEPCMasterCategory   = buildTool('master_category', 'master_category', 'UPDATE', 'EPC', [], [
  { name: 'master_category_name_en', schema: { type: 'string' } },
]);
const deleteEPCMasterCategory   = buildTool('master_category', 'master_category', 'DELETE');

// ═══════════════════════════════════════════════════════════════
//  2. CATEGORIES (CategoryInput: category_name_cn, category_description, categories_code, data_type)
// ═══════════════════════════════════════════════════════════════
const searchEPCCategories       = buildTool('categories', 'categories', 'GET');
const createEPCCategory         = buildTool('category', 'categories', 'CREATE', 'EPC', [], [
  { name: 'category_name_cn', schema: { type: 'string' }, required: true },
  { name: 'category_description', schema: { type: 'string' } },
  { name: 'categories_code', schema: { type: 'string' } },
  { name: 'data_type', schema: { type: 'string' } },
]);
const updateEPCCategory         = buildTool('category', 'categories', 'UPDATE', 'EPC', [], [
  { name: 'category_name_cn', schema: { type: 'string' } },
]);
const deleteEPCCategory         = buildTool('category', 'categories', 'DELETE');

// ═══════════════════════════════════════════════════════════════
//  3. TYPE CATEGORY (TypeCategoryInput: type_category_name_en, type_category_name_cn, type_category_description)
// ═══════════════════════════════════════════════════════════════
const searchEPCTypeCategory     = buildTool('type_category', 'type_category', 'GET');
const createEPCTypeCategory     = buildTool('type_category', 'type_category', 'CREATE', 'EPC', [], [
  { name: 'type_category_name_en', schema: { type: 'string' }, required: true },
  { name: 'type_category_name_cn', schema: { type: 'string' } },
  { name: 'type_category_description', schema: { type: 'string' } },
]);
const updateEPCTypeCategory     = buildTool('type_category', 'type_category', 'UPDATE', 'EPC', [], [
  { name: 'type_category_name_en', schema: { type: 'string' } },
]);
const deleteEPCTypeCategory     = buildTool('type_category', 'type_category', 'DELETE');

// ═══════════════════════════════════════════════════════════════
//  4. UNITS (UnitInput: unit_name_en, unit_name_cn, unit_description)
// ═══════════════════════════════════════════════════════════════
const searchEPCUnits            = buildTool('units', 'unit', 'GET');
const createEPCUnit             = buildTool('unit', 'unit', 'CREATE', 'EPC', [], [
  { name: 'unit_name_en', schema: { type: 'string' }, required: true },
  { name: 'unit_name_cn', schema: { type: 'string' } },
  { name: 'unit_description', schema: { type: 'string' } },
]);
const updateEPCUnit             = buildTool('unit', 'unit', 'UPDATE', 'EPC', [], [
  { name: 'unit_name_en', schema: { type: 'string' } },
]);
const deleteEPCUnit             = buildTool('unit', 'unit', 'DELETE');

// ═══════════════════════════════════════════════════════════════
//  5. ITEM CATEGORY (ItemCategoryInput: item_category_name_en, type_category_id, item_category_name_cn, dokumen_name)
// ═══════════════════════════════════════════════════════════════
const searchEPCItemCategory     = buildTool('item_category', 'item_category', 'GET');
const createEPCItemCategory     = buildTool('item_category', 'item_category', 'CREATE', 'EPC', [], [
  { name: 'item_category_name_en', schema: { type: 'string' }, required: true },
  { name: 'item_category_name_cn', schema: { type: 'string' } },
  { name: 'item_category_description', schema: { type: 'string' } },
  { name: 'type_category_id', schema: { type: 'string' } },
]);
const updateEPCItemCategory     = buildTool('item_category', 'item_category', 'UPDATE', 'EPC', [], [
  { name: 'item_category_name_en', schema: { type: 'string' } },
]);
const deleteEPCItemCategory     = buildTool('item_category', 'item_category', 'DELETE');

// ═══════════════════════════════════════════════════════════════
//  6. PRODUCTS (ProductInput: product_name_en, product_name_cn, product_description, vin_number, model_type, dimensi)
// ═══════════════════════════════════════════════════════════════
const searchEPCProducts         = buildTool('products', 'products', 'GET');
const createEPCProduct          = buildTool('product', 'products', 'CREATE', 'EPC', [], [
  { name: 'product_name_en', schema: { type: 'string' }, required: true },
  { name: 'product_name_cn', schema: { type: 'string' } },
  { name: 'product_description', schema: { type: 'string' } },
  { name: 'category_id', schema: { type: 'string' } },
  { name: 'vin_number', schema: { type: 'string' } },
]);
const updateEPCProduct          = buildTool('product', 'products', 'UPDATE', 'EPC', [], [
  { name: 'product_name_en', schema: { type: 'string' } },
]);
const deleteEPCProduct          = buildTool('product', 'products', 'DELETE');

// ═══════════════════════════════════════════════════════════════
//  7. DOKUMEN (DokumenInput: dokumen_name, dokumen_description)
// ═══════════════════════════════════════════════════════════════
const searchEPCDokumen          = buildTool('dokumen', 'dokumen', 'GET');
const createEPCDokumen          = buildTool('dokumen', 'dokumen', 'CREATE', 'EPC', [], [
  { name: 'dokumen_name', schema: { type: 'string' }, required: true },
  { name: 'dokumen_description', schema: { type: 'string' } },
]);
const updateEPCDokumen          = buildTool('dokumen', 'dokumen', 'UPDATE', 'EPC', [], [
  { name: 'dokumen_name', schema: { type: 'string' } },
]);
const deleteEPCDokumen          = buildTool('dokumen', 'dokumen', 'DELETE');

// ═══════════════════════════════════════════════════════════════
//  8. MASTER ITEMS (MasterItemInput: master_item_name_en, part_number, description, quantity, unit)
// ═══════════════════════════════════════════════════════════════
const searchEPCMasterItems      = buildTool('master_items', 'master_items', 'GET');
const createEPCMasterItem       = buildTool('master_item', 'master_items', 'CREATE', 'EPC', [], [
  { name: 'master_item_name_en', schema: { type: 'string' }, required: true },
  { name: 'part_number', schema: { type: 'string' } },
  { name: 'description', schema: { type: 'string' } },
  { name: 'quantity', schema: { type: 'number' } },
]);
const updateEPCMasterItem       = buildTool('master_item', 'master_items', 'UPDATE', 'EPC', [], [
  { name: 'master_item_name_en', schema: { type: 'string' } },
]);
const deleteEPCMasterItem       = buildTool('master_item', 'master_items', 'DELETE');

// ═══════════════════════════════════════════════════════════════
//  9. PARTS CATALOGS (search only)
// ═══════════════════════════════════════════════════════════════
const searchEPCPartsCatalog = {
  name: 'search_epc_parts_catalog',
  menuKey: 'EPC', action: 'read',
  description: 'Mencari data katalog parts EPC berdasarkan keyword, VIN number, atau kategori.',
  parameters: {
    type: 'object', properties: {
      search: { type: 'string', description: 'Keyword pencarian' },
      vin_number: { type: 'string', description: 'VIN number untuk pencarian' },
      master_category_id: { type: 'string', description: 'Filter master category' },
      page: { type: 'number', description: 'Halaman (default: 1)' },
      limit: { type: 'number', description: 'Limit (default: 100)' },
    },
  },
  execute: async ({ search, vin_number, master_category_id, page = 1, limit = 100 }, authToken) => {
    try {
      const baseUrl = (aiConfig.API_GATEWAY_BASE_URL || '').replace(/\/$/, '');
      let url, payload;
      if (vin_number) {
        url = `${baseUrl}${sanitizePath('/api/epc/parts-catalogs/vin/get')}`;
        payload = cleanObject({ vin_number, page, limit });
      } else if (master_category_id) {
        url = `${baseUrl}${sanitizePath('/api/epc/parts-catalogs/get-by-master-category-id')}`;
        payload = cleanObject({ master_category_id, page, limit });
      } else {
        url = `${baseUrl}${sanitizePath('/api/epc/parts-catalogs')}`;
        payload = cleanObject({ search, page, limit });
      }
      const response = await axios.post(url, payload || {}, { headers: getDefaultHeaders(authToken), timeout: aiConfig.API_GATEWAY_TIMEOUT });
      return { success: true, data: response.data, message: 'Data parts catalog berhasil diambil' };
    } catch (error) {
      logger.error(`Error search_epc_parts_catalog: ${error.message}`);
      return { success: false, data: null, message: error.response?.data?.message || 'Gagal mengambil parts catalog' };
    }
  },
};

// ═══════════════════════════════════════════════════════════════
//  10. VIN CUSTOMER
// ═══════════════════════════════════════════════════════════════
const searchEPCVINCustomer = {
  name: 'search_epc_vin_customer',
  menuKey: 'EPC', action: 'read',
  description: 'Mencari data VIN customer EPC.',
  parameters: buildSearchParams(),
  execute: async (params, authToken) => {
    try {
      const baseUrl = (aiConfig.API_GATEWAY_BASE_URL || '').replace(/\/$/, '');
      const payload = cleanObject({ page: 1, limit: 100, ...params });
      const url = `${baseUrl}${sanitizePath('/api/epc/vin_customer')}`;
      const response = await axios.post(url, payload || {}, { headers: getDefaultHeaders(authToken), timeout: aiConfig.API_GATEWAY_TIMEOUT });
      return { success: true, data: response.data, message: 'Data VIN customer berhasil diambil' };
    } catch (error) {
      logger.error(`Error VIN customer: ${error.message}`);
      return { success: false, data: null, message: error.response?.data?.message || 'Gagal mengambil VIN customer' };
    }
  },
};
const createEPCVINCustomer = buildTool('vin_customer', 'vin_customer', 'CREATE', 'EPC', [], [
  { name: 'customer_id', schema: { type: 'string' }, required: true },
  { name: 'vin_number', schema: { type: 'string' }, required: true },
]);

// ═══════════════════════════════════════════════════════════════
//  11. TRANSACTION ORDER
// ═══════════════════════════════════════════════════════════════
const searchEPCTransactionOrder = buildTool('transaction_order', 'transaction_order', 'GET');
const createEPCTransactionOrder = buildTool('transaction_order', 'transaction_order', 'CREATE', 'EPC', [], [
  { name: 'order_number', schema: { type: 'string' }, required: true },
]);
const updateEPCTransactionOrder = buildTool('transaction_order', 'transaction_order', 'UPDATE', 'EPC', [], [
  { name: 'order_number', schema: { type: 'string' } },
]);
const deleteEPCTransactionOrder = buildTool('transaction_order', 'transaction_order', 'DELETE');

// ═══════════════════════════════════════════════════════════════
//  Exports
// ═══════════════════════════════════════════════════════════════

module.exports = {
  searchEPCMasterCategory, createEPCMasterCategory, updateEPCMasterCategory, deleteEPCMasterCategory,
  searchEPCCategories, createEPCCategory, updateEPCCategory, deleteEPCCategory,
  searchEPCTypeCategory, createEPCTypeCategory, updateEPCTypeCategory, deleteEPCTypeCategory,
  searchEPCUnits, createEPCUnit, updateEPCUnit, deleteEPCUnit,
  searchEPCItemCategory, createEPCItemCategory, updateEPCItemCategory, deleteEPCItemCategory,
  searchEPCProducts, createEPCProduct, updateEPCProduct, deleteEPCProduct,
  searchEPCDokumen, createEPCDokumen, updateEPCDokumen, deleteEPCDokumen,
  searchEPCMasterItems, createEPCMasterItem, updateEPCMasterItem, deleteEPCMasterItem,
  searchEPCPartsCatalog,
  searchEPCVINCustomer, createEPCVINCustomer,
  searchEPCTransactionOrder, createEPCTransactionOrder, updateEPCTransactionOrder, deleteEPCTransactionOrder,
};
