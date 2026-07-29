const axios = require('axios');
const { Logger } = require('../../../utils/logger');
const logger = Logger;
const aiConfig = require('../../../config/ai');
const { sanitizePath, getDefaultHeaders, cleanObject } = require('./gateway');

// ═══════════════════════════════════════════════════════════════
//  Helper: Build Netsuite Tool
//  Accessed via gateway: /api/netsuite/<entity>/...
// ═══════════════════════════════════════════════════════════════

const buildSearchParams = (extra = []) => {
  const base = {
    search: { type: 'string', description: 'Keyword pencarian' },
    page: { type: 'number', description: 'Halaman (default: 1)' },
    limit: { type: 'number', description: 'Limit (default: 100)' },
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

const buildTool = (entity, endpoint, method, menuKey = 'Netsuite', searchExtra = [], createFields = [], updateFields = null) => {
  const descName = entity.replace(/_/g, ' ').replace(/\b\w/g, s => s.toUpperCase());
  let name, action, descAction, params;

  if (method === 'GET') {
    name = `search_${entity}`; action = 'read'; descAction = 'Mencari';
    params = buildSearchParams(searchExtra);
  } else if (method === 'CREATE') {
    name = `create_${entity}`; action = 'create'; descAction = 'Membuat';
    params = buildCreateParams(createFields);
  } else if (method === 'UPDATE') {
    name = `update_${entity}`; action = 'update'; descAction = 'Memperbarui';
    params = buildUpdateParams(updateFields || createFields);
  } else if (method === 'GET_SINGLE') {
    name = `get_${entity}`; action = 'read'; descAction = 'Mendapatkan';
    params = { type: 'object', properties: { id: { type: 'string', description: `ID ${descName}` } }, required: ['id'] };
  } else {
    name = `delete_${entity}`; action = 'delete'; descAction = 'Menghapus';
    params = { type: 'object', properties: { id: { type: 'string', description: 'ID' } }, required: ['id'] };
  }

  const desc = `${descAction} ${descName} Netsuite.`;

  return {
    name, menuKey, action, description: desc, parameters: params,
    execute: async (input, authToken) => {
      try {
        const baseUrl = (aiConfig.API_GATEWAY_BASE_URL || '').replace(/\/$/, '');
        let url, httpMethod, payload = null;

        if (method === 'GET') {
          url = `${baseUrl}${sanitizePath(`/api/netsuite/${endpoint}/get-list`)}`;
          payload = cleanObject({ page: 1, limit: 100, ...input });
          httpMethod = 'post';
        } else if (method === 'GET_SINGLE') {
          url = `${baseUrl}${sanitizePath(`/api/netsuite/${endpoint}/${input.id}`)}`;
          httpMethod = 'get';
        } else if (method === 'DELETE') {
          url = `${baseUrl}${sanitizePath(`/api/netsuite/${endpoint}/${input.id}`)}`;
          httpMethod = 'delete';
        } else if (method === 'UPDATE') {
          const { id, ...rest } = input;
          url = `${baseUrl}${sanitizePath(`/api/netsuite/${endpoint}/update`)}`;
          payload = cleanObject({ id, ...rest }); httpMethod = 'post';
        } else {
          url = `${baseUrl}${sanitizePath(`/api/netsuite/${endpoint}/create`)}`;
          payload = cleanObject(input); httpMethod = 'post';
        }

        const headers = getDefaultHeaders(authToken);
        let response;
        if (httpMethod === 'post') response = await axios.post(url, payload || {}, { headers, timeout: aiConfig.API_GATEWAY_TIMEOUT });
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
//  1. PURCHASING ORDERS
// ═══════════════════════════════════════════════════════════════
const searchNSPurchaseOrders = {
  name: 'search_ns_purchase_orders',
  menuKey: 'Netsuite', action: 'read',
  description: 'Mencari data purchase order Netsuite. Untuk dashboard dan list. Juga bisa sync PO dari Bridge API.',
  parameters: buildSearchParams([
    { name: 'status', schema: { type: 'string', description: 'Filter status PO' } },
    { name: 'startDate', schema: { type: 'string', description: 'Tanggal mulai (YYYY-MM-DD)' } },
    { name: 'endDate', schema: { type: 'string', description: 'Tanggal akhir (YYYY-MM-DD)' } },
    { name: 'approvalstatus', schema: { type: 'string' } },
    { name: 'po_status', schema: { type: 'string' } },
    { name: 'subsidiary', schema: { type: 'string' } },
    { name: 'location', schema: { type: 'string' } },
    { name: 'classes', schema: { type: 'string' } },
    { name: 'created_by', schema: { type: 'string' } },
  ]),
  execute: async (params, authToken) => {
    try {
      const baseUrl = (aiConfig.API_GATEWAY_BASE_URL || '').replace(/\/$/, '');
      const payload = cleanObject({ page: 1, limit: 100, ...params });
      const url = `${baseUrl}${sanitizePath('/api/netsuite/purchasing-orders/get-list')}`;
      const response = await axios.post(url, payload || {}, { headers: getDefaultHeaders(authToken), timeout: aiConfig.API_GATEWAY_TIMEOUT });
      return { success: true, data: response.data, message: 'Data PO berhasil diambil' };
    } catch (error) {
      logger.error(`Error search_ns_purchase_orders: ${error.message}`);
      return { success: false, data: null, message: error.response?.data?.message || 'Gagal mengambil PO' };
    }
  },
};
const createNSPurchaseOrder = buildTool('ns_po', 'purchasing-orders', 'CREATE', 'Netsuite', [], [
  { name: 'vendorid', schema: { type: 'string' }, required: true },
  { name: 'tran_date', schema: { type: 'string', description: 'Purchase date' }, required: true },
  { name: 'trandate', schema: { type: 'string', description: 'Purchase date' } },
  { name: 'subsidiary', schema: { type: 'string' }, required: true },
  { name: 'customform', schema: { type: 'string' }, required: true },
  { name: 'currency', schema: { type: 'string' }, required: true },
  { name: 'location', schema: { type: 'string' }, required: true },
  { name: 'items', schema: { type: 'array', items: { type: 'object' } }, required: true },
  { name: 'memo', schema: { type: 'string' } },
  { name: 'terms', schema: { type: 'string' } },
  { name: 'class', schema: { type: 'string' } },
  { name: 'custbody_me_pr_number', schema: { type: 'string' } },
  { name: 'custbody_me_pr_type', schema: { type: 'string' } },
  { name: 'custbody_me_pr_date', schema: { type: 'string' } },
]);
const updateNSPurchaseOrder = buildTool('ns_po', 'purchasing-orders', 'UPDATE', 'Netsuite', [], [
  { name: 'vendorid', schema: { type: 'string' } },
  { name: 'subsidiary', schema: { type: 'string' }, required: true },
  { name: 'customform', schema: { type: 'string' }, required: true },
  { name: 'currency', schema: { type: 'string' }, required: true },
  { name: 'location', schema: { type: 'string' }, required: true },
  { name: 'items', schema: { type: 'array', items: { type: 'object' } }, required: true },
  { name: 'purchasedate', schema: { type: 'string' }, required: true },
  { name: 'memo', schema: { type: 'string' } },
  { name: 'terms', schema: { type: 'string' } },
  { name: 'class', schema: { type: 'string' } },
  { name: 'department', schema: { type: 'string' } },
]);
const getNSPurchaseOrderDetail = buildTool('ns_po_detail', 'purchasing-orders', 'GET_SINGLE', 'Netsuite');
const syncNSPurchaseOrders = {
  name: 'sync_ns_purchase_orders',
  menuKey: 'Netsuite', action: 'create',
  description: 'Sinkronisasi purchase order dari Bridge API Netsuite.',
  parameters: { type: 'object', properties: {} },
  execute: async (params, authToken) => {
    try {
      const baseUrl = (aiConfig.API_GATEWAY_BASE_URL || '').replace(/\/$/, '');
      const url = `${baseUrl}${sanitizePath('/api/netsuite/purchasing-orders/sync')}`;
      const response = await axios.post(url, {}, { headers: getDefaultHeaders(authToken), timeout: 120000 });
      return { success: true, data: response.data, message: 'Sinkronisasi PO berhasil' };
    } catch (error) {
      logger.error(`Error sync PO: ${error.message}`);
      return { success: false, data: null, message: error.response?.data?.message || 'Gagal sync PO' };
    }
  },
};

// ═══════════════════════════════════════════════════════════════
//  2. SALES ORDERS
// ═══════════════════════════════════════════════════════════════
const searchNSSalesOrders = {
  name: 'search_ns_sales_orders',
  menuKey: 'Netsuite', action: 'read',
  description: 'Mencari data sales order Netsuite.',
  parameters: buildSearchParams([
    { name: 'customer_id', schema: { type: 'string' } },
    { name: 'status_code', schema: { type: 'string' } },
    { name: 'trans_date_start', schema: { type: 'string' } },
    { name: 'trans_date_end', schema: { type: 'string' } },
  ]),
  execute: async (params, authToken) => {
    try {
      const baseUrl = (aiConfig.API_GATEWAY_BASE_URL || '').replace(/\/$/, '');
      const payload = cleanObject({ page: 1, limit: 100, ...params });
      const url = `${baseUrl}${sanitizePath('/api/netsuite/sales-orders/get')}`;
      const response = await axios.post(url, payload || {}, { headers: getDefaultHeaders(authToken), timeout: aiConfig.API_GATEWAY_TIMEOUT });
      return { success: true, data: response.data, message: 'Data SO berhasil diambil' };
    } catch (error) {
      logger.error(`Error SO: ${error.message}`);
      return { success: false, data: null, message: error.response?.data?.message || 'Gagal mengambil SO' };
    }
  },
};
const createNSSalesOrder = buildTool('ns_sales_order', 'sales-orders', 'CREATE', 'Netsuite', [], [
  { name: 'entity', schema: { type: 'string' }, required: true },
  { name: 'items', schema: { type: 'array', items: { type: 'object' } }, required: true },
  { name: 'subsidiary', schema: { type: 'string' }, required: true },
  { name: 'trandate', schema: { type: 'string' }, required: true },
  { name: 'customform', schema: { type: 'string' } },
  { name: 'currency', schema: { type: 'string' } },
  { name: 'location', schema: { type: 'string' } },
  { name: 'department', schema: { type: 'string' } },
  { name: 'class', schema: { type: 'string' } },
  { name: 'memo', schema: { type: 'string' } },
  { name: 'otherrefnum', schema: { type: 'string' } },
  { name: 'custbody_msi_quotation_no_iec', schema: { type: 'string' } },
  { name: 'custbody_cseg_cn_cfi', schema: { type: 'string' } },
]);
const updateNSSalesOrder = buildTool('ns_sales_order', 'sales-orders', 'UPDATE', 'Netsuite', [], [
  { name: 'entity', schema: { type: 'string' } },
  { name: 'items', schema: { type: 'array', items: { type: 'object' } } },
  { name: 'subsidiary', schema: { type: 'string' } },
  { name: 'trandate', schema: { type: 'string' } },
  { name: 'customform', schema: { type: 'string' } },
  { name: 'currency', schema: { type: 'string' } },
  { name: 'location', schema: { type: 'string' } },
  { name: 'department', schema: { type: 'string' } },
  { name: 'class', schema: { type: 'string' } },
  { name: 'memo', schema: { type: 'string' } },
  { name: 'orderstatus', schema: { type: 'string' } },
]);
const getNSSalesOrderDetail = buildTool('ns_sales_order_detail', 'sales-orders', 'GET_SINGLE', 'Netsuite');
const syncNSSalesOrders = {
  name: 'sync_ns_sales_orders',
  menuKey: 'Netsuite', action: 'create',
  description: 'Sinkronisasi sales order dari Bridge API Netsuite.',
  parameters: { type: 'object', properties: {} },
  execute: async (params, authToken) => {
    try {
      const baseUrl = (aiConfig.API_GATEWAY_BASE_URL || '').replace(/\/$/, '');
      const url = `${baseUrl}${sanitizePath('/api/netsuite/sales-orders/sync')}`;
      const response = await axios.post(url, {}, { headers: getDefaultHeaders(authToken), timeout: 120000 });
      return { success: true, data: response.data, message: 'Sinkronisasi SO berhasil' };
    } catch (error) { return { success: false, data: null, message: error.response?.data?.message || 'Gagal sync SO' }; }
  },
};

// ═══════════════════════════════════════════════════════════════
//  3. FAKTUR
// ═══════════════════════════════════════════════════════════════
const searchNSFaktur = buildTool('ns_faktur', 'faktur', 'GET', 'Netsuite', [
  { name: 'status', schema: { type: 'string' } },
]);
const createNSFaktur = buildTool('ns_faktur', 'faktur', 'CREATE', 'Netsuite', [], [
  { name: 'invoice_no', schema: { type: 'string' }, required: true },
  { name: 'customer_id', schema: { type: 'string' } },
]);
const updateNSFaktur = buildTool('ns_faktur', 'faktur', 'UPDATE', 'Netsuite', [], [
  { name: 'invoice_no', schema: { type: 'string' } },
]);
const deleteNSFaktur = buildTool('ns_faktur', 'faktur', 'DELETE', 'Netsuite');
const getNSFaktur = buildTool('ns_faktur_by_id', 'faktur', 'GET_SINGLE', 'Netsuite');

// ═══════════════════════════════════════════════════════════════
//  4. ITEMS
// ═══════════════════════════════════════════════════════════════
const searchNSItems = buildTool('ns_items', 'items', 'GET', 'Netsuite', [
  { name: 'item_type', schema: { type: 'string' } },
  { name: 'item_type_id', schema: { type: 'string' } },
  { name: 'netsuite_id', schema: { type: 'string' } },
]);
const syncNSItems = {
  name: 'sync_ns_items',
  menuKey: 'Netsuite', action: 'create',
  description: 'Sinkronisasi items dari Bridge API Netsuite.',
  parameters: { type: 'object', properties: {} },
  execute: async (params, authToken) => {
    try {
      const baseUrl = (aiConfig.API_GATEWAY_BASE_URL || '').replace(/\/$/, '');
      const url = `${baseUrl}${sanitizePath('/api/netsuite/items/sync')}`;
      const response = await axios.post(url, {}, { headers: getDefaultHeaders(authToken), timeout: 120000 });
      return { success: true, data: response.data, message: 'Sinkronisasi items berhasil' };
    } catch (error) { return { success: false, data: null, message: error.response?.data?.message || 'Gagal sync items' }; }
  },
};

// ═══════════════════════════════════════════════════════════════
//  5. VENDORS
// ═══════════════════════════════════════════════════════════════
const searchNSVendors = buildTool('ns_vendors', 'vendor', 'GET', 'Netsuite', [
  { name: 'netsuite_id', schema: { type: 'string' } },
]);
const syncNSVendors = {
  name: 'sync_ns_vendors',
  menuKey: 'Netsuite', action: 'create',
  description: 'Sinkronisasi vendors dari Bridge API Netsuite.',
  parameters: { type: 'object', properties: {} },
  execute: async (params, authToken) => {
    try {
      const baseUrl = (aiConfig.API_GATEWAY_BASE_URL || '').replace(/\/$/, '');
      const url = `${baseUrl}${sanitizePath('/api/netsuite/vendor/sync')}`;
      const response = await axios.post(url, {}, { headers: getDefaultHeaders(authToken), timeout: 120000 });
      return { success: true, data: response.data, message: 'Sinkronisasi vendors berhasil' };
    } catch (error) { return { success: false, data: null, message: error.response?.data?.message || 'Gagal sync vendors' }; }
  },
};

// ═══════════════════════════════════════════════════════════════
//  6. CUSTOMERS (Netsuite)
// ═══════════════════════════════════════════════════════════════
const searchNSCustomers = buildTool('ns_customers', 'customers', 'GET', 'Netsuite', [
  { name: 'is_sync', schema: { type: 'string' } },
]);
const createNSCustomer = buildTool('ns_customer', 'customers', 'CREATE', 'Netsuite', [], [
  { name: 'companyName', schema: { type: 'string' }, required: true },
  { name: 'email', schema: { type: 'string' } },
  { name: 'phone', schema: { type: 'string' } },
  { name: 'subsidiary', schema: { type: 'string' } },
  { name: 'address', schema: { type: 'string' } },
]);

// ═══════════════════════════════════════════════════════════════
//  7. INVOICE SALES ORDERS
// ═══════════════════════════════════════════════════════════════
const searchNSInvoiceSalesOrders = buildTool('ns_invoice_so', 'invoice-sales-orders', 'GET', 'Netsuite', [
  { name: 'subsidiary', schema: { type: 'string' } },
  { name: 'approvalstatus', schema: { type: 'string' } },
  { name: 'status_faktur', schema: { type: 'string' } },
  { name: 'trandate_start', schema: { type: 'string' } },
  { name: 'trandate_end', schema: { type: 'string' } },
]);
const syncNSInvoiceSalesOrders = {
  name: 'sync_ns_invoice_so',
  menuKey: 'Netsuite', action: 'create',
  description: 'Sinkronisasi invoice sales orders dari Bridge API.',
  parameters: { type: 'object', properties: {} },
  execute: async (params, authToken) => {
    try {
      const baseUrl = (aiConfig.API_GATEWAY_BASE_URL || '').replace(/\/$/, '');
      const url = `${baseUrl}${sanitizePath('/api/netsuite/invoice-sales-orders/sync')}`;
      const response = await axios.post(url, {}, { headers: getDefaultHeaders(authToken), timeout: 120000 });
      return { success: true, data: response.data, message: 'Sinkronisasi invoice SO berhasil' };
    } catch (error) { return { success: false, data: null, message: error.response?.data?.message || 'Gagal sync invoice SO' }; }
  },
};

// ═══════════════════════════════════════════════════════════════
//  8. SUBSIDIARY
// ═══════════════════════════════════════════════════════════════
const searchNSSubsidiary = buildTool('ns_subsidiary', 'subsidiary', 'GET', 'Netsuite');
const createNSSubsidiary = buildTool('ns_subsidiary', 'subsidiary', 'CREATE', 'Netsuite', [], [
  { name: 'company_name', schema: { type: 'string' }, required: true },
  { name: 'abbreviation', schema: { type: 'string' } },
  { name: 'country_code', schema: { type: 'string' } },
  { name: 'id_type', schema: { type: 'string' } },
  { name: 'nitku', schema: { type: 'string' } },
  { name: 'nomor', schema: { type: 'string' } },
]);
const updateNSSubsidiary = buildTool('ns_subsidiary', 'subsidiary', 'UPDATE', 'Netsuite', [], [
  { name: 'company_name', schema: { type: 'string' } },
  { name: 'abbreviation', schema: { type: 'string' } },
  { name: 'country_code', schema: { type: 'string' } },
  { name: 'id_type', schema: { type: 'string' } },
  { name: 'nitku', schema: { type: 'string' } },
  { name: 'nomor', schema: { type: 'string' } },
]);
const deleteNSSubsidiary = buildTool('ns_subsidiary', 'subsidiary', 'DELETE', 'Netsuite');

// ═══════════════════════════════════════════════════════════════
//  9. REFERENCE
// ═══════════════════════════════════════════════════════════════
const searchNSReference = buildTool('ns_reference', 'reference', 'GET', 'Netsuite', [
  { name: 'type', schema: { type: 'string' } },
  { name: 'code', schema: { type: 'string' } },
  { name: 'code_transaksi', schema: { type: 'string' } },
]);
const createNSReference = buildTool('ns_reference', 'reference', 'CREATE', 'Netsuite', [], [
  { name: 'type', schema: { type: 'string' }, required: true },
  { name: 'code', schema: { type: 'string' }, required: true },
  { name: 'code_transaksi', schema: { type: 'string' } },
  { name: 'description', schema: { type: 'string' } },
]);
const updateNSReference = buildTool('ns_reference', 'reference', 'UPDATE', 'Netsuite', [], [
  { name: 'type', schema: { type: 'string' }, required: true },
  { name: 'code', schema: { type: 'string' }, required: true },
  { name: 'code_transaksi', schema: { type: 'string' } },
  { name: 'description', schema: { type: 'string' } },
]);
const deleteNSReference = buildTool('ns_reference', 'reference', 'DELETE', 'Netsuite');

// ═══════════════════════════════════════════════════════════════
//  10. BILL PAYMENT
// ═══════════════════════════════════════════════════════════════
const searchNSBillPayment = buildTool('ns_bill_payment', 'bill-payment', 'GET', 'Netsuite', [
  { name: 'subsidiary', schema: { type: 'string' } },
  { name: 'approvalstatus', schema: { type: 'string' } },
  { name: 'department', schema: { type: 'string' } },
  { name: 'location', schema: { type: 'string' } },
  { name: 'entity', schema: { type: 'string' } },
  { name: 'trandate_from', schema: { type: 'string' } },
  { name: 'trandate_to', schema: { type: 'string' } },
]);
const getNSBillPayment = buildTool('ns_bill_payment_detail', 'bill-payment', 'GET_SINGLE', 'Netsuite');

// ═══════════════════════════════════════════════════════════════
//  11. NS QUOTATION
// ═══════════════════════════════════════════════════════════════
const searchNSQuotation = buildTool('ns_quotation', 'quotation', 'GET', 'Netsuite', [
  { name: 'customer_id', schema: { type: 'string' } },
  { name: 'subsidiary', schema: { type: 'string' } },
  { name: 'approvalstatus', schema: { type: 'string' } },
  { name: 'classes', schema: { type: 'string' } },
  { name: 'is_deleted', schema: { type: 'string' } },
  { name: 'tran_date_from', schema: { type: 'string' } },
  { name: 'tran_date_to', schema: { type: 'string' } },
]);
const createNSQuotation = buildTool('ns_quotation', 'quotation', 'CREATE', 'Netsuite', [], [
  { name: 'entity', schema: { type: 'string' }, required: true },
  { name: 'items', schema: { type: 'array', items: { type: 'object' } }, required: true },
  { name: 'subsidiary', schema: { type: 'string' }, required: true },
  { name: 'trandate', schema: { type: 'string' }, required: true },
  { name: 'customform', schema: { type: 'string' }, required: true },
  { name: 'currency', schema: { type: 'string' }, required: true },
  { name: 'location', schema: { type: 'string' }, required: true },
  { name: 'duedate', schema: { type: 'string' } },
  { name: 'memo', schema: { type: 'string' } },
  { name: 'department', schema: { type: 'string' } },
  { name: 'class', schema: { type: 'string' } },
  { name: 'opportunity', schema: { type: 'string' } },
  { name: 'title', schema: { type: 'string' } },
  { name: 'probability', schema: { type: 'number' } },
]);
const updateNSQuotation = buildTool('ns_quotation', 'quotation', 'UPDATE', 'Netsuite', [], [
  { name: 'entity', schema: { type: 'string' } },
  { name: 'items', schema: { type: 'array', items: { type: 'object' } } },
  { name: 'subsidiary', schema: { type: 'string' } },
  { name: 'trandate', schema: { type: 'string' } },
  { name: 'customform', schema: { type: 'string' } },
  { name: 'currency', schema: { type: 'string' } },
  { name: 'location', schema: { type: 'string' } },
  { name: 'memo', schema: { type: 'string' } },
  { name: 'department', schema: { type: 'string' } },
]);
const getNSQuotation = buildTool('ns_quotation_detail', 'quotation', 'GET_SINGLE', 'Netsuite');

// ═══════════════════════════════════════════════════════════════
//  12. LOCATIONS (Netsuite)
// ═══════════════════════════════════════════════════════════════
const searchNSLocations = buildTool('ns_locations', 'locations', 'GET', 'Netsuite', [
  { name: 'subsidiary_id', schema: { type: 'string' } },
  { name: 'is_parent', schema: { type: 'string' } },
]);
const syncNSLocations = {
  name: 'sync_ns_locations',
  menuKey: 'Netsuite', action: 'create',
  description: 'Sinkronisasi locations dari Bridge API.',
  parameters: { type: 'object', properties: {} },
  execute: async (params, authToken) => {
    try {
      const baseUrl = (aiConfig.API_GATEWAY_BASE_URL || '').replace(/\/$/, '');
      const url = `${baseUrl}${sanitizePath('/api/netsuite/locations/sync')}`;
      const response = await axios.post(url, {}, { headers: getDefaultHeaders(authToken), timeout: 120000 });
      return { success: true, data: response.data, message: 'Sinkronisasi locations berhasil' };
    } catch (error) { return { success: false, data: null, message: error.response?.data?.message || 'Gagal sync locations' }; }
  },
};

// ═══════════════════════════════════════════════════════════════
//  13. DEPARTMENTS (Netsuite)
// ═══════════════════════════════════════════════════════════════
const searchNSDepartments = buildTool('ns_departments', 'departments', 'GET', 'Netsuite', [
  { name: 'subsidiary_id', schema: { type: 'string' } },
]);
const syncNSDepartments = {
  name: 'sync_ns_departments',
  menuKey: 'Netsuite', action: 'create',
  description: 'Sinkronisasi departments dari Bridge API.',
  parameters: { type: 'object', properties: {} },
  execute: async (params, authToken) => {
    try {
      const baseUrl = (aiConfig.API_GATEWAY_BASE_URL || '').replace(/\/$/, '');
      const url = `${baseUrl}${sanitizePath('/api/netsuite/departments/sync')}`;
      const response = await axios.post(url, {}, { headers: getDefaultHeaders(authToken), timeout: 120000 });
      return { success: true, data: response.data, message: 'Sinkronisasi departments berhasil' };
    } catch (error) { return { success: false, data: null, message: error.response?.data?.message || 'Gagal sync departments' }; }
  },
};

// ═══════════════════════════════════════════════════════════════
//  14. CLASSES
// ═══════════════════════════════════════════════════════════════
const searchNSClasses = buildTool('ns_classes', 'classes', 'GET', 'Netsuite', [
  { name: 'subsidiary_id', schema: { type: 'string' } },
  { name: 'class_profile', schema: { type: 'string' } },
]);

// ═══════════════════════════════════════════════════════════════
//  15. TERMS
// ═══════════════════════════════════════════════════════════════
const searchNSTerms = buildTool('ns_terms', 'terms', 'GET', 'Netsuite');

// ═══════════════════════════════════════════════════════════════
//  16. PO STATUS
// ═══════════════════════════════════════════════════════════════
const searchNSPOStatus = buildTool('ns_po_status', 'po_status', 'GET', 'Netsuite');
const createNSPOStatus = buildTool('ns_po_status', 'po_status', 'CREATE', 'Netsuite', [], [
  { name: 'name', schema: { type: 'string' }, required: true },
  { name: 'code', schema: { type: 'string' }, required: true },
]);
const deleteNSPOStatus = buildTool('ns_po_status', 'po_status', 'DELETE', 'Netsuite');

// ═══════════════════════════════════════════════════════════════
//  17. ITEM TYPE
// ═══════════════════════════════════════════════════════════════
const searchNSItemType = buildTool('ns_item_type', 'item_type', 'GET', 'Netsuite');
const createNSItemType = buildTool('ns_item_type', 'item_type', 'CREATE', 'Netsuite', [], [
  { name: 'name', schema: { type: 'string' }, required: true },
  { name: 'code', schema: { type: 'string' }, required: true },
  { name: 'netsuite_id', schema: { type: 'string' } },
]);
const deleteNSItemType = buildTool('ns_item_type', 'item_type', 'DELETE', 'Netsuite');

// ═══════════════════════════════════════════════════════════════
//  18. ATTACH FILE
// ═══════════════════════════════════════════════════════════════
const searchNSAttachFile = buildTool('ns_attach_file', 'attach_file', 'GET', 'Netsuite', [
  { name: 'netsuite_id', schema: { type: 'string' } },
]);

// ═══════════════════════════════════════════════════════════════
//  Exports
// ═══════════════════════════════════════════════════════════════

module.exports = {
  // PO
  searchNSPurchaseOrders, createNSPurchaseOrder, updateNSPurchaseOrder,
  getNSPurchaseOrderDetail, syncNSPurchaseOrders,
  // SO
  searchNSSalesOrders, createNSSalesOrder, updateNSSalesOrder,
  getNSSalesOrderDetail, syncNSSalesOrders,
  // Faktur
  searchNSFaktur, createNSFaktur, updateNSFaktur, deleteNSFaktur, getNSFaktur,
  // Items
  searchNSItems, syncNSItems,
  // Vendors
  searchNSVendors, syncNSVendors,
  // Customers
  searchNSCustomers, createNSCustomer,
  // Invoice SO
  searchNSInvoiceSalesOrders, syncNSInvoiceSalesOrders,
  // Subsidiary
  searchNSSubsidiary, createNSSubsidiary, updateNSSubsidiary, deleteNSSubsidiary,
  // Reference
  searchNSReference, createNSReference, updateNSReference, deleteNSReference,
  // Bill Payment
  searchNSBillPayment, getNSBillPayment,
  // Quotation (NS)
  searchNSQuotation, createNSQuotation, updateNSQuotation, getNSQuotation,
  // Locations
  searchNSLocations, syncNSLocations,
  // Departments
  searchNSDepartments, syncNSDepartments,
  // Classes
  searchNSClasses,
  // Terms
  searchNSTerms,
  // PO Status
  searchNSPOStatus, createNSPOStatus, deleteNSPOStatus,
  // Item Type
  searchNSItemType, createNSItemType, deleteNSItemType,
  // Attach File
  searchNSAttachFile,
};
