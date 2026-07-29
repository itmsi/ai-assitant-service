const axios = require('axios');
const { Logger } = require('../../../utils/logger');
const logger = Logger;
const aiConfig = require('../../../config/ai');
const { sanitizePath, getDefaultHeaders, cleanObject } = require('./gateway');

// ═══════════════════════════════════════════════════════════════
//  Helper: Build ROE Tool
//  ROE endpoints accessed via gateway: /api/roe/<entity>/...
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

const buildTool = (entity, endpoint, method, menuKey = 'ROA ROE Calculate', searchExtra = [], createFields = [], updateFields = null, customName = null) => {
  const descName = entity.replace(/_/g, ' ').replace(/\b\w/g, s => s.toUpperCase());
  let name, action, descAction, params;

  if (method === 'GET') {
    name = customName || `search_${entity}`;
    action = 'read'; descAction = 'Mencari';
    params = buildSearchParams(searchExtra);
  } else if (method === 'CREATE') {
    name = customName || `create_${entity}`;
    action = 'create'; descAction = 'Membuat';
    params = buildCreateParams(createFields);
  } else if (method === 'UPDATE') {
    name = customName || `update_${entity}`;
    action = 'update'; descAction = 'Memperbarui';
    params = buildUpdateParams(updateFields || createFields);
  } else if (method === 'GET_SINGLE') {
    name = customName || `get_${entity}`;
    action = 'read'; descAction = 'Mendapatkan';
    params = { type: 'object', properties: { id: { type: 'string', description: `ID ${descName}` } }, required: ['id'] };
  } else {
    name = customName || `delete_${entity}`;
    action = 'delete'; descAction = 'Menghapus';
    params = buildDeleteParams();
  }

  return {
    name, menuKey, action,
    description: `${descAction} ${descName}.`,
    parameters: params,
    execute: async (input, authToken) => {
      try {
        const baseUrl = (aiConfig.API_GATEWAY_BASE_URL || '').replace(/\/$/, '');
        let url, httpMethod, payload = null;

        if (method === 'GET') {
          url = `${baseUrl}${sanitizePath(`/api/roe/${endpoint}/get`)}`;
          payload = cleanObject({ page: 1, limit: 100, sort_order: 'desc', ...input });
          httpMethod = 'post';
        } else if (method === 'GET_SINGLE') {
          url = `${baseUrl}${sanitizePath(`/api/roe/${endpoint}/${input.id}`)}`;
          httpMethod = 'get';
        } else if (method === 'DELETE') {
          url = `${baseUrl}${sanitizePath(`/api/roe/${endpoint}/${input.id}`)}`;
          httpMethod = 'delete';
        } else if (method === 'UPDATE') {
          const { id, ...rest } = input;
          url = `${baseUrl}${sanitizePath(`/api/roe/${endpoint}/${id}`)}`;
          payload = cleanObject(rest); httpMethod = 'put';
        } else {
          url = `${baseUrl}${sanitizePath(`/api/roe/${endpoint}/create`)}`;
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
//  1. QUOTES (ROA/ROE Calculator)
// ═══════════════════════════════════════════════════════════════
const searchROEQuotes = buildTool('roe_quote', 'quotes', 'GET', 'ROA ROE Calculate', [
  { name: 'commodity', schema: { type: 'string' } },
  { name: 'is_admin', schema: { type: 'string' } },
  { name: 'iup_customer_id', schema: { type: 'string' } },
  { name: 'status', schema: { type: 'string' } },
]);
const getROEQuote = buildTool('roe_quote_by_id', 'quotes', 'GET_SINGLE', 'ROA ROE Calculate', [], [], null, 'get_roe_quote');
const createROEQuote = buildTool('roe_quote', 'quotes', 'CREATE', 'ROA ROE Calculate', [], [
  { name: 'iup_customer_id', schema: { type: 'string' }, required: true },
  { name: 'commodity', schema: { type: 'string' }, required: true },
  { name: 'haul_distance', schema: { type: 'number' }, required: true },
  { name: 'selling_price_per_ton', schema: { type: 'number' }, required: true },
  { name: 'tonnage_per_ritase', schema: { type: 'number' }, required: true },
  { name: 'status', schema: { type: 'string' } },
]);
const updateROEQuote = buildTool('roe_quote', 'quotes', 'UPDATE', 'ROA ROE Calculate', [], [
  { name: 'iup_customer_id', schema: { type: 'string' }, required: true },
  { name: 'commodity', schema: { type: 'string' }, required: true },
  { name: 'haul_distance', schema: { type: 'number' }, required: true },
  { name: 'selling_price_per_ton', schema: { type: 'number' }, required: true },
  { name: 'tonnage_per_ritase', schema: { type: 'number' }, required: true },
  { name: 'status', schema: { type: 'string' } },
]);
const deleteROEQuote = buildTool('roe_quote', 'quotes', 'DELETE');

/**
 * Calculate ROA & ROE for a quote
 * POST /api/roe/quotes/{id}/calculate
 */
const calculateROE = {
  name: 'calculate_roe',
  menuKey: 'ROA ROE Calculate', action: 'create',
  description: 'Menghitung ROA (Return on Assets) dan ROE (Return on Equity) untuk quote tertentu.',
  parameters: { type: 'object', properties: { id: { type: 'string', description: 'ID quote' } }, required: ['id'] },
  execute: async ({ id }, authToken) => {
    try {
      const baseUrl = (aiConfig.API_GATEWAY_BASE_URL || '').replace(/\/$/, '');
      const url = `${baseUrl}${sanitizePath(`/api/roe/quotes/${id}/calculate`)}`;
      const response = await axios.post(url, {}, { headers: getDefaultHeaders(authToken), timeout: aiConfig.API_GATEWAY_TIMEOUT });
      return { success: true, data: response.data, message: 'Perhitungan ROA/ROE berhasil' };
    } catch (error) {
      logger.error(`Error calculate_roe: ${error.message}`);
      return { success: false, data: null, message: error.response?.data?.message || 'Gagal menghitung ROA/ROE' };
    }
  },
};

/**
 * Update operational parameters
 * PUT /api/roe/quotes/{id}/operational
 */
const updateROEOperational = {
  name: 'update_roe_operational',
  menuKey: 'ROA ROE Calculate', action: 'update',
  description: 'Memperbarui parameter operational pada quote ROA/ROE.',
  parameters: {
    type: 'object', properties: {
      id: { type: 'string', description: 'ID quote' },
      downtime_percent: { type: 'number', description: 'Downtime (%)' },
      fuel_consumption: { type: 'number', description: 'Konsumsi BBM' },
      fuel_consumption_type: { type: 'string', description: 'Tipe konsumsi BBM' },
      fuel_price: { type: 'number', description: 'Harga BBM (Rp/L)' },
      hari_kerja_per_bulan: { type: 'number', description: 'Hari kerja per bulan' },
      ritase_per_shift: { type: 'number', description: 'Ritase per shift' },
      shift_per_hari: { type: 'number', description: 'Shift per hari' },
      utilization_percent: { type: 'number', description: 'Utilization (%)' },
    }, required: ['id'],
  },
  execute: async ({ id, ...rest }, authToken) => {
    try {
      const baseUrl = (aiConfig.API_GATEWAY_BASE_URL || '').replace(/\/$/, '');
      const url = `${baseUrl}${sanitizePath(`/api/roe/quotes/${id}/operational`)}`;
      const response = await axios.put(url, cleanObject(rest), { headers: getDefaultHeaders(authToken), timeout: aiConfig.API_GATEWAY_TIMEOUT });
      return { success: true, data: response.data, message: 'Parameter operational berhasil diupdate' };
    } catch (error) {
      logger.error(`Error update_roe_operational: ${error.message}`);
      return { success: false, data: null, message: error.response?.data?.message || 'Gagal update operational' };
    }
  },
};

/**
 * Update cost parameters
 * PUT /api/roe/quotes/{id}/cost
 */
const updateROECost = {
  name: 'update_roe_cost',
  menuKey: 'ROA ROE Calculate', action: 'update',
  description: 'Memperbarui parameter cost pada quote ROA/ROE.',
  parameters: {
    type: 'object', properties: {
      id: { type: 'string', description: 'ID quote' },
      depreciation_monthly: { type: 'number', description: 'Depreciation bulanan (Rp)' },
      interest_monthly: { type: 'number', description: 'Interest bulanan (Rp)' },
      overhead_monthly: { type: 'number', description: 'Overhead bulanan (Rp)' },
      salary_operator_monthly: { type: 'number', description: 'Salary operator bulanan (Rp)' },
      sparepart_expense_monthly: { type: 'number', description: 'Sparepart expense bulanan (Rp)' },
      tyre_expense_monthly: { type: 'number', description: 'Tyre expense bulanan (Rp)' },
    }, required: ['id'],
  },
  execute: async ({ id, ...rest }, authToken) => {
    try {
      const baseUrl = (aiConfig.API_GATEWAY_BASE_URL || '').replace(/\/$/, '');
      const url = `${baseUrl}${sanitizePath(`/api/roe/quotes/${id}/cost`)}`;
      const response = await axios.put(url, cleanObject(rest), { headers: getDefaultHeaders(authToken), timeout: aiConfig.API_GATEWAY_TIMEOUT });
      return { success: true, data: response.data, message: 'Parameter cost berhasil diupdate' };
    } catch (error) {
      logger.error(`Error update_roe_cost: ${error.message}`);
      return { success: false, data: null, message: error.response?.data?.message || 'Gagal update cost' };
    }
  },
};

/**
 * Update financial parameters
 * PUT /api/roe/quotes/{id}/financial
 */
const updateROEFinancial = {
  name: 'update_roe_financial',
  menuKey: 'ROA ROE Calculate', action: 'update',
  description: 'Memperbarui parameter financial pada quote ROA/ROE.',
  parameters: {
    type: 'object', properties: {
      id: { type: 'string', description: 'ID quote' },
      assets: { type: 'number', description: 'Assets (Rp)' },
      equity: { type: 'number', description: 'Equity (Rp)' },
      liability: { type: 'number', description: 'Liability (Rp)' },
    }, required: ['id'],
  },
  execute: async ({ id, ...rest }, authToken) => {
    try {
      const baseUrl = (aiConfig.API_GATEWAY_BASE_URL || '').replace(/\/$/, '');
      const url = `${baseUrl}${sanitizePath(`/api/roe/quotes/${id}/financial`)}`;
      const response = await axios.put(url, cleanObject(rest), { headers: getDefaultHeaders(authToken), timeout: aiConfig.API_GATEWAY_TIMEOUT });
      return { success: true, data: response.data, message: 'Parameter financial berhasil diupdate' };
    } catch (error) {
      logger.error(`Error update_roe_financial: ${error.message}`);
      return { success: false, data: null, message: error.response?.data?.message || 'Gagal update financial' };
    }
  },
};

// ═══════════════════════════════════════════════════════════════
//  2. FINANCE (Net Income, Equity, ROA, ROE)
// ═══════════════════════════════════════════════════════════════

const calculateROAAndROE = {
  name: 'calculate_roa_roe',
  menuKey: 'ROA ROE Calculate', action: 'read',
  description: 'Menghitung ROA dan ROE bersama-sama.',
  parameters: {
    type: 'object', properties: {
      revenue: { type: 'number', description: 'Total pendapatan (Rp)' },
      expense: { type: 'number', description: 'Total biaya (Rp)' },
      assets: { type: 'number', description: 'Total aset (Rp)' },
      liabilities: { type: 'number', description: 'Total kewajiban (Rp)' },
    }, required: ['revenue', 'expense', 'assets', 'liabilities'],
  },
  execute: async (params, authToken) => {
    try {
      const baseUrl = (aiConfig.API_GATEWAY_BASE_URL || '').replace(/\/$/, '');
      const url = `${baseUrl}${sanitizePath('/api/roe/finance/roa-roe')}`;
      const response = await axios.post(url, cleanObject(params), { headers: getDefaultHeaders(authToken), timeout: aiConfig.API_GATEWAY_TIMEOUT });
      return { success: true, data: response.data, message: 'Perhitungan ROA & ROE berhasil' };
    } catch (error) {
      logger.error(`Error roa_roe: ${error.message}`);
      return { success: false, data: null, message: error.response?.data?.message || 'Gagal hitung ROA & ROE' };
    }
  },
};

const calculateNetIncome = {
  name: 'calculate_net_income',
  menuKey: 'ROA ROE Calculate', action: 'read',
  description: 'Menghitung Laba Bersih (Net Income).',
  parameters: {
    type: 'object', properties: {
      revenue: { type: 'number', description: 'Total pendapatan (Rp)' },
      expense: { type: 'number', description: 'Total biaya (Rp)' },
    }, required: ['revenue', 'expense'],
  },
  execute: async (params, authToken) => {
    try {
      const baseUrl = (aiConfig.API_GATEWAY_BASE_URL || '').replace(/\/$/, '');
      const url = `${baseUrl}${sanitizePath('/api/roe/finance/net-income')}`;
      const response = await axios.post(url, cleanObject(params), { headers: getDefaultHeaders(authToken), timeout: aiConfig.API_GATEWAY_TIMEOUT });
      return { success: true, data: response.data, message: 'Perhitungan Net Income berhasil' };
    } catch (error) {
      logger.error(`Error net_income: ${error.message}`);
      return { success: false, data: null, message: error.response?.data?.message || 'Gagal hitung Net Income' };
    }
  },
};

const calculateEquity = {
  name: 'calculate_equity',
  menuKey: 'ROA ROE Calculate', action: 'read',
  description: 'Menghitung Ekuitas (Equity).',
  parameters: {
    type: 'object', properties: {
      assets: { type: 'number', description: 'Total aset (Rp)' },
      liabilities: { type: 'number', description: 'Total kewajiban (Rp)' },
    }, required: ['assets', 'liabilities'],
  },
  execute: async (params, authToken) => {
    try {
      const baseUrl = (aiConfig.API_GATEWAY_BASE_URL || '').replace(/\/$/, '');
      const url = `${baseUrl}${sanitizePath('/api/roe/finance/equity')}`;
      const response = await axios.post(url, cleanObject(params), { headers: getDefaultHeaders(authToken), timeout: aiConfig.API_GATEWAY_TIMEOUT });
      return { success: true, data: response.data, message: 'Perhitungan Equity berhasil' };
    } catch (error) {
      logger.error(`Error equity: ${error.message}`);
      return { success: false, data: null, message: error.response?.data?.message || 'Gagal hitung Equity' };
    }
  },
};

const calculateROA = {
  name: 'calculate_roa',
  menuKey: 'ROA ROE Calculate', action: 'read',
  description: 'Menghitung ROA (Return on Assets).',
  parameters: {
    type: 'object', properties: {
      net_income: { type: 'number', description: 'Laba bersih (Rp)' },
      assets: { type: 'number', description: 'Total aset (Rp)' },
    }, required: ['net_income', 'assets'],
  },
  execute: async (params, authToken) => {
    try {
      const baseUrl = (aiConfig.API_GATEWAY_BASE_URL || '').replace(/\/$/, '');
      const url = `${baseUrl}${sanitizePath('/api/roe/finance/roa')}`;
      const response = await axios.post(url, cleanObject(params), { headers: getDefaultHeaders(authToken), timeout: aiConfig.API_GATEWAY_TIMEOUT });
      return { success: true, data: response.data, message: 'Perhitungan ROA berhasil' };
    } catch (error) {
      logger.error(`Error roa: ${error.message}`);
      return { success: false, data: null, message: error.response?.data?.message || 'Gagal hitung ROA' };
    }
  },
};

const calculateFinanceROE = {
  name: 'calculate_roe_finance',
  menuKey: 'ROA ROE Calculate', action: 'read',
  description: 'Menghitung ROE (Return on Equity).',
  parameters: {
    type: 'object', properties: {
      net_income: { type: 'number', description: 'Laba bersih (Rp)' },
      equity: { type: 'number', description: 'Ekuitas (Rp) - Opsi A' },
      assets: { type: 'number', description: 'Total aset (Rp) - Opsi B' },
      liabilities: { type: 'number', description: 'Total kewajiban (Rp) - Opsi B' },
    }, required: ['net_income'],
  },
  execute: async (params, authToken) => {
    try {
      const baseUrl = (aiConfig.API_GATEWAY_BASE_URL || '').replace(/\/$/, '');
      const url = `${baseUrl}${sanitizePath('/api/roe/finance/roe')}`;
      const response = await axios.post(url, cleanObject(params), { headers: getDefaultHeaders(authToken), timeout: aiConfig.API_GATEWAY_TIMEOUT });
      return { success: true, data: response.data, message: 'Perhitungan ROE berhasil' };
    } catch (error) {
      logger.error(`Error roe: ${error.message}`);
      return { success: false, data: null, message: error.response?.data?.message || 'Gagal hitung ROE' };
    }
  },
};

// ═══════════════════════════════════════════════════════════════
//  3. UNIT PURCHASES
// ═══════════════════════════════════════════════════════════════
const searchROEUnitPurchases = buildTool('unit_purchase', 'unit-purchases', 'GET', 'ROA ROE Calculate', [
  { name: 'quote_id', schema: { type: 'string' } },
  { name: 'iup_customer_id', schema: { type: 'string' } },
  { name: 'is_admin', schema: { type: 'string' } },
]);
const getROEUnitPurchase = buildTool('unit_purchase_by_id', 'unit-purchases', 'GET_SINGLE', 'ROA ROE Calculate', [], [], null, 'get_unit_purchase');
const createROEUnitPurchase = buildTool('unit_purchase', 'unit-purchases', 'CREATE', 'ROA ROE Calculate', [], [
  { name: 'quote_id', schema: { type: 'string' }, required: true },
  { name: 'price_per_unit', schema: { type: 'number' }, required: true },
  { name: 'quantity', schema: { type: 'number' }, required: true },
  { name: 'depreciation_period_months', schema: { type: 'number' }, required: true },
  { name: 'down_payment_percent', schema: { type: 'number' }, required: true },
  { name: 'financing_tenor_months', schema: { type: 'number' }, required: true },
  { name: 'interest_rate_flat_per_year', schema: { type: 'number' }, required: true },
]);
const updateROEUnitPurchase = buildTool('unit_purchase', 'unit-purchases', 'UPDATE', 'ROA ROE Calculate', [], [
  { name: 'quote_id', schema: { type: 'string' }, required: true },
  { name: 'price_per_unit', schema: { type: 'number' }, required: true },
  { name: 'quantity', schema: { type: 'number' }, required: true },
  { name: 'depreciation_period_months', schema: { type: 'number' }, required: true },
  { name: 'down_payment_percent', schema: { type: 'number' }, required: true },
  { name: 'financing_tenor_months', schema: { type: 'number' }, required: true },
  { name: 'interest_rate_flat_per_year', schema: { type: 'number' }, required: true },
]);
const deleteROEUnitPurchase = buildTool('unit_purchase', 'unit-purchases', 'DELETE');

// ═══════════════════════════════════════════════════════════════
//  4. LIST COMPARE
// ═══════════════════════════════════════════════════════════════
const searchROEListCompare = buildTool('list_compare', 'list_compare', 'GET', 'ROA ROE Calculate', [
  { name: 'quote_id', schema: { type: 'string' }, required: true },
]);
const createROEListCompare = buildTool('list_compare', 'list_compare', 'CREATE', 'ROA ROE Calculate', [], [
  { name: 'quote_id', schema: { type: 'string' }, required: true },
  { name: 'brand', schema: { type: 'string' }, required: true },
  { name: 'price_per_unit', schema: { type: 'number' } },
  { name: 'qty', schema: { type: 'number' } },
  { name: 'fuel_consumption', schema: { type: 'number' } },
  { name: 'ritase', schema: { type: 'number' } },
  { name: 'tonase', schema: { type: 'number' } },
]);
const deleteROEListCompare = buildTool('list_compare_item', 'list_compare', 'DELETE');

// ═══════════════════════════════════════════════════════════════
//  5. HAULING PRICES
// ═══════════════════════════════════════════════════════════════
const searchROEHaulingPrice = buildTool('hauling_price', 'hauling_prices', 'GET');
const getROEHaulingPrice = buildTool('hauling_price_by_id', 'hauling_prices', 'GET_SINGLE', 'ROA ROE Calculate', [], [], null, 'get_hauling_price');
const createROEHaulingPrice = buildTool('hauling_price', 'hauling_prices', 'CREATE', 'ROA ROE Calculate', [], [
  { name: 'iup_customer_id', schema: { type: 'string' } },
  { name: 'iup_id', schema: { type: 'string' } },
  { name: 'iup_name', schema: { type: 'string' } },
  { name: 'contractor_id', schema: { type: 'string' } },
  { name: 'contractor_name', schema: { type: 'string' } },
  { name: 'metode', schema: { type: 'string' } },
  { name: 'periode_harga', schema: { type: 'string' } },
  { name: 'effective_date', schema: { type: 'string' } },
  { name: 'harga_solar_lama', schema: { type: 'number' } },
  { name: 'harga_solar_baru', schema: { type: 'number' } },
  { name: 'harga_hauling_lama', schema: { type: 'number' } },
  { name: 'hasil_hitung', schema: { type: 'number' } },
  { name: 'jarak_haul_km', schema: { type: 'number' } },
  { name: 'tonase_per_unit', schema: { type: 'number' } },
  { name: 'ritase_per_shift', schema: { type: 'number' } },
  { name: 'shift_per_hari', schema: { type: 'number' } },
  { name: 'fuel_consumption_l_km', schema: { type: 'number' } },
  { name: 'porsi_biaya_bbm_persen', schema: { type: 'number' } },
  { name: 'idle_factor_persen', schema: { type: 'number' } },
  { name: 'adjustment_tambahan', schema: { type: 'number' } },
  { name: 'catatan', schema: { type: 'string' } },
  { name: 'notes_khusus', schema: { type: 'string' } },
]);
const updateROEHaulingPrice = buildTool('hauling_price', 'hauling_prices', 'UPDATE', 'ROA ROE Calculate', [], [
  { name: 'iup_customer_id', schema: { type: 'string' } },
  { name: 'iup_id', schema: { type: 'string' } },
  { name: 'iup_name', schema: { type: 'string' } },
  { name: 'contractor_id', schema: { type: 'string' } },
  { name: 'contractor_name', schema: { type: 'string' } },
  { name: 'metode', schema: { type: 'string' } },
  { name: 'periode_harga', schema: { type: 'string' } },
  { name: 'effective_date', schema: { type: 'string' } },
  { name: 'harga_solar_lama', schema: { type: 'number' } },
  { name: 'harga_solar_baru', schema: { type: 'number' } },
  { name: 'harga_hauling_lama', schema: { type: 'number' } },
  { name: 'hasil_hitung', schema: { type: 'number' } },
  { name: 'jarak_haul_km', schema: { type: 'number' } },
  { name: 'tonase_per_unit', schema: { type: 'number' } },
  { name: 'ritase_per_shift', schema: { type: 'number' } },
  { name: 'shift_per_hari', schema: { type: 'number' } },
  { name: 'fuel_consumption_l_km', schema: { type: 'number' } },
  { name: 'porsi_biaya_bbm_persen', schema: { type: 'number' } },
  { name: 'idle_factor_persen', schema: { type: 'number' } },
  { name: 'adjustment_tambahan', schema: { type: 'number' } },
  { name: 'catatan', schema: { type: 'string' } },
  { name: 'notes_khusus', schema: { type: 'string' } },
]);
const deleteROEHaulingPrice = buildTool('hauling_price', 'hauling_prices', 'DELETE');

// ═══════════════════════════════════════════════════════════════
//  Exports
// ═══════════════════════════════════════════════════════════════

module.exports = {
  // Quotes
  searchROEQuotes, getROEQuote, createROEQuote, updateROEQuote, deleteROEQuote,
  calculateROE, updateROEOperational, updateROECost, updateROEFinancial,
  calculateROAAndROE,
  // Finance
  calculateNetIncome, calculateEquity, calculateROA, calculateFinanceROE,
  // Unit Purchases
  searchROEUnitPurchases, getROEUnitPurchase, createROEUnitPurchase, updateROEUnitPurchase, deleteROEUnitPurchase,
  // List Compare
  searchROEListCompare, createROEListCompare, deleteROEListCompare,
  // Hauling Prices
  searchROEHaulingPrice, getROEHaulingPrice, createROEHaulingPrice, updateROEHaulingPrice, deleteROEHaulingPrice,
};
