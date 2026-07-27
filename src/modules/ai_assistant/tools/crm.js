const axios = require('axios');
const { Logger } = require('../../../utils/logger');
const logger = Logger;
const aiConfig = require('../../../config/ai');
const { sanitizePath, getDefaultHeaders, cleanObject } = require('./gateway');

// ═══════════════════════════════════════════════════════════════
//  Helper: Build CRM Tool
// ═══════════════════════════════════════════════════════════════
// Field names sesuai schema Swagger CRM

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

const buildTool = (entity, endpoint, method, menuKey = 'iup_management_crm', searchExtra = [], createFields = [], updateFields = null, customName = null, customDesc = null) => {
  const descName = entity.replace(/_/g, ' ').replace(/\b\w/g, s => s.toUpperCase());
  let name, action, descAction, params;
  if (method === 'GET') {
    name = customName || `search_${entity}`; action = 'read'; descAction = 'Mencari';
    params = buildSearchParams(searchExtra);
  } else if (method === 'CREATE') {
    name = customName || `create_${entity}`; action = 'create'; descAction = 'Membuat';
    params = buildCreateParams(createFields);
  } else if (method === 'UPDATE') {
    name = customName || `update_${entity}`; action = 'update'; descAction = 'Memperbarui';
    params = buildUpdateParams(updateFields || createFields);
  } else {
    name = customName || `delete_${entity}`; action = 'delete'; descAction = 'Menghapus';
    params = { type: 'object', properties: { id: { type: 'string', description: 'ID' } }, required: ['id'] };
  }

  return {
    name, menuKey, action, description: customDesc || `${descAction} ${descName} CRM.`,
    parameters: params,
    execute: async (input, authToken) => {
      try {
        const baseUrl = (aiConfig.API_GATEWAY_BASE_URL || '').replace(/\/$/, '');
        let url, httpMethod, payload = null;
        if (method === 'GET') {
          url = `${baseUrl}${sanitizePath(`/api/crm/${endpoint}/get`)}`;
          payload = cleanObject({ page: 1, limit: 100, sort_order: 'desc', ...input });
          httpMethod = 'post';
        } else if (method === 'DELETE') {
          url = `${baseUrl}${sanitizePath(`/api/crm/${endpoint}/${input.id}`)}`;
          httpMethod = 'delete';
        } else if (method === 'UPDATE') {
          const { id, ...rest } = input;
          url = `${baseUrl}${sanitizePath(`/api/crm/${endpoint}/${id}`)}`;
          payload = cleanObject(rest); httpMethod = 'put';
        } else {
          url = `${baseUrl}${sanitizePath(`/api/crm/${endpoint}/create`)}`;
          payload = cleanObject(input); httpMethod = 'post';
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
        return { success: false, data: null, message: error.response?.data?.message || `Gagal ${descAction.toLowerCase()}` };
      }
    },
  };
};

// ═══════════════════════════════════════════════════════════════
//  TERRITORY
//  Swagger TerritoryInput: type*, name*, island_id, group_id, area_id, iup_zone_id, segment_description, code, status
// ═══════════════════════════════════════════════════════════════
const searchCRMTerritory = buildTool('territory', 'territory', 'GET', 'iup_management_crm', [
  { name: 'is_admin', schema: { type: 'string' } },
]);
const createCRMTerritory = buildTool('territory', 'territory', 'CREATE', 'iup_management_crm', [], [
  { name: 'type', schema: { type: 'string' }, required: true },
  { name: 'name', schema: { type: 'string' }, required: true },
  { name: 'island_id', schema: { type: 'string' } },
  { name: 'group_id', schema: { type: 'string' } },
  { name: 'area_id', schema: { type: 'string' } },
  { name: 'iup_zone_id', schema: { type: 'string' } },
  { name: 'code', schema: { type: 'string' } },
  { name: 'status', schema: { type: 'string' } },
]);
const updateCRMTerritory = buildTool('territory', 'territory', 'UPDATE', 'iup_management_crm', [], [
  { name: 'name', schema: { type: 'string' } },
  { name: 'type', schema: { type: 'string' } },
]);
const deleteCRMTerritory = buildTool('territory', 'territory', 'DELETE');

// ═══════════════════════════════════════════════════════════════
//  IUP MANAGEMENT
//  Swagger IupManagementCreateInput: company_name*, iup_zone_id*, business_type, permit_type, segmentation_id, ...
// ═══════════════════════════════════════════════════════════════
const searchCRMIUPManagement = buildTool('iup_management', 'iup_management', 'GET', 'iup_management_crm', [
  { name: 'status', schema: { type: 'string' } },
  { name: 'is_admin', schema: { type: 'string' } },
  { name: 'employee_id', schema: { type: 'string' } },
  { name: 'segmentation_id', schema: { type: 'string' } },
]);
const createCRMIUPManagement = buildTool('iup_management', 'iup_management', 'CREATE', 'iup_management_crm', [], [
  { name: 'company_name', schema: { type: 'string' }, required: true },
  { name: 'iup_zone_id', schema: { type: 'string' }, required: true },
  { name: 'business_type', schema: { type: 'string' } },
  { name: 'permit_type', schema: { type: 'string' } },
  { name: 'segmentation_id', schema: { type: 'string' } },
]);
const updateCRMIUPManagement = buildTool('iup_management', 'iup_management', 'UPDATE', 'iup_management_crm', [], [
  { name: 'company_name', schema: { type: 'string' } },
  { name: 'status', schema: { type: 'string' } },
]);
const deleteCRMIUPManagement = buildTool('iup_management', 'iup_management', 'DELETE');

// ═══════════════════════════════════════════════════════════════
//  SEGMENTATION
// ═══════════════════════════════════════════════════════════════
const searchCRMSegmentation = buildTool('segmentation', 'segmentation', 'GET', 'iup_management_crm', [
  { name: 'is_admin', schema: { type: 'string' } },
]);
const createCRMSegmentation = buildTool('segmentation', 'segmentation', 'CREATE', 'iup_management_crm', [], [
  { name: 'segmentation_name', schema: { type: 'string' }, required: true },
  { name: 'description', schema: { type: 'string' } },
]);
const updateCRMSegmentation = buildTool('segmentation', 'segmentation', 'UPDATE', 'iup_management_crm', [], [
  { name: 'segmentation_name', schema: { type: 'string' } },
]);
const deleteCRMSegmentation = buildTool('segmentation', 'segmentation', 'DELETE');

// ═══════════════════════════════════════════════════════════════
//  IUP CUSTOMERS
//  Swagger: customer_data, iup_customers (nested objects)
// ═══════════════════════════════════════════════════════════════
const searchCRMIUPCustomers = buildTool('iup_customers', 'iup_customers', 'GET', 'iup_management_crm', [
  { name: 'iup_id', schema: { type: 'string' } },
  { name: 'mine_type', schema: { type: 'string' } },
  { name: 'status', schema: { type: 'string' } },
  { name: 'is_admin', schema: { type: 'string' } },
]);
const createCRMIUPCustomer = buildTool('iup_customer', 'iup_customers', 'CREATE', 'iup_management_crm', [], [
  { name: 'customer_name', schema: { type: 'string' }, required: true },
  { name: 'customer_email', schema: { type: 'string' } },
  { name: 'customer_phone', schema: { type: 'string' } },
  { name: 'iup_id', schema: { type: 'string' }, required: true },
  { name: 'type', schema: { type: 'string' } },
]);
const updateCRMIUPCustomer = buildTool('iup_customer', 'iup_customers', 'UPDATE', 'iup_management_crm', [], [
  { name: 'customer_name', schema: { type: 'string' } },
]);
const deleteCRMIUPCustomer = buildTool('iup_customer', 'iup_customers', 'DELETE');

// ═══════════════════════════════════════════════════════════════
//  TRANSACTIONS
// ═══════════════════════════════════════════════════════════════
const searchCRMTransactions = buildTool('transactions', 'transactions', 'GET');
const createCRMTransaction = buildTool('transaction', 'transactions', 'CREATE', 'iup_management_crm', [], [
  { name: 'iup_customer_id', schema: { type: 'string' }, required: true },
  { name: 'transaction_type', schema: { type: 'string' } },
  { name: 'amount', schema: { type: 'number' } },
  { name: 'description', schema: { type: 'string' } },
]);
const updateCRMTransaction = buildTool('transaction', 'transactions', 'UPDATE', 'iup_management_crm', [], [
  { name: 'amount', schema: { type: 'number' } },
  { name: 'description', schema: { type: 'string' } },
]);
const deleteCRMTransaction = buildTool('transaction', 'transactions', 'DELETE');

// ═══════════════════════════════════════════════════════════════
//  EMPLOYEE DATA ACCESS
// ═══════════════════════════════════════════════════════════════
const searchCRMEmployeeDataAccess = buildTool('employee_data_access', 'employee-data-access', 'GET', 'iup_management_crm', [
  { name: 'is_admin', schema: { type: 'string' } },
]);
const createCRMEmployeeDataAccess = buildTool('employee_data_access', 'employee-data-access', 'CREATE', 'iup_management_crm', [], [
  { name: 'employee_id', schema: { type: 'string' }, required: true },
]);
const updateCRMEmployeeDataAccess = buildTool('employee_data_access', 'employee-data-access', 'UPDATE', 'iup_management_crm', [], [
  { name: 'employee_id', schema: { type: 'string' } },
]);
const deleteCRMEmployeeDataAccess = buildTool('employee_data_access', 'employee-data-access', 'DELETE');

// ═══════════════════════════════════════════════════════════════
//  ISLAND
// ═══════════════════════════════════════════════════════════════
const searchCRMIsland = buildTool('crm_island', 'island', 'GET', 'iup_management_crm');
const createCRMIsland = buildTool('crm_island', 'island', 'CREATE', 'iup_management_crm', [], [
  { name: 'island_name', schema: { type: 'string' }, required: true },
  { name: 'code', schema: { type: 'string' } },
]);
const updateCRMIsland = buildTool('crm_island', 'island', 'UPDATE', 'iup_management_crm', [], [
  { name: 'island_name', schema: { type: 'string' } },
]);
const deleteCRMIsland = buildTool('crm_island', 'island', 'DELETE');

// ═══════════════════════════════════════════════════════════════
//  BRAND
//  Swagger Brand response: brand_id, brand_name_en
// ═══════════════════════════════════════════════════════════════
const searchCRMBrand = buildTool('brand', 'brand', 'GET', 'iup_management_crm');
const createCRMBrand = buildTool('brand', 'brand', 'CREATE', 'iup_management_crm', [], [
  { name: 'brand_name_en', schema: { type: 'string' }, required: true },
]);
const updateCRMBrand = buildTool('brand', 'brand', 'UPDATE', 'iup_management_crm', [], [
  { name: 'brand_name_en', schema: { type: 'string' } },
]);
const deleteCRMBrand = buildTool('brand', 'brand', 'DELETE');

// ═══════════════════════════════════════════════════════════════
//  GROUP (CRM)
// ═══════════════════════════════════════════════════════════════
const searchCRMGroup = buildTool('crm_group', 'group', 'GET', 'iup_management_crm');
const createCRMGroup = buildTool('crm_group', 'group', 'CREATE', 'iup_management_crm', [], [
  { name: 'group_name', schema: { type: 'string' }, required: true },
]);
const updateCRMGroup = buildTool('crm_group', 'group', 'UPDATE', 'iup_management_crm', [], [
  { name: 'group_name', schema: { type: 'string' } },
]);
const deleteCRMGroup = buildTool('crm_group', 'group', 'DELETE');

// ═══════════════════════════════════════════════════════════════
//  AREA
// ═══════════════════════════════════════════════════════════════
const searchCRMArea = buildTool('area', 'area', 'GET', 'iup_management_crm');
const createCRMArea = buildTool('area', 'area', 'CREATE', 'iup_management_crm', [], [
  { name: 'area_name', schema: { type: 'string' }, required: true },
]);
const updateCRMArea = buildTool('area', 'area', 'UPDATE', 'iup_management_crm', [], [
  { name: 'area_name', schema: { type: 'string' } },
]);
const deleteCRMArea = buildTool('area', 'area', 'DELETE');

// ═══════════════════════════════════════════════════════════════
//  IUP ZONE
// ═══════════════════════════════════════════════════════════════
const searchCRMIUPZone = buildTool('iup_zone', 'iup_zone', 'GET', 'iup_management_crm');
const createCRMIUPZone = buildTool('iup_zone', 'iup_zone', 'CREATE', 'iup_management_crm', [], [
  { name: 'iup_zone_name', schema: { type: 'string' }, required: true },
]);
const updateCRMIUPZone = buildTool('iup_zone', 'iup_zone', 'UPDATE', 'iup_management_crm', [], [
  { name: 'iup_zone_name', schema: { type: 'string' } },
]);
const deleteCRMIUPZone = buildTool('iup_zone', 'iup_zone', 'DELETE');

// ═══════════════════════════════════════════════════════════════
//  IUP SEGMENTATIONS
// ═══════════════════════════════════════════════════════════════
const searchCRMIUPSegmentation = buildTool('iup_segmentation', 'iup_segmentations', 'GET', 'iup_management_crm', [
  { name: 'iup_id', schema: { type: 'string' } },
]);
const createCRMIUPSegmentation = buildTool('iup_segmentation', 'iup_segmentations', 'CREATE', 'iup_management_crm', [], [
  { name: 'iup_id', schema: { type: 'string' }, required: true },
  { name: 'segmentation_id', schema: { type: 'string' }, required: true },
]);
const updateCRMIUPSegmentation = buildTool('iup_segmentation', 'iup_segmentations', 'UPDATE', 'iup_management_crm', [], [
  { name: 'iup_id', schema: { type: 'string' } },
]);
const deleteCRMIUPSegmentation = buildTool('iup_segmentation', 'iup_segmentations', 'DELETE');

// ═══════════════════════════════════════════════════════════════
//  PROJECTS
// ═══════════════════════════════════════════════════════════════
const searchCRMProject = buildTool('crm_project', 'projects', 'GET', 'iup_management_crm');
const createCRMProject = buildTool('crm_project', 'projects', 'CREATE', 'iup_management_crm', [], [
  { name: 'project_name', schema: { type: 'string' }, required: true },
]);
const updateCRMProject = buildTool('crm_project', 'projects', 'UPDATE', 'iup_management_crm', [], [
  { name: 'project_name', schema: { type: 'string' } },
]);
const deleteCRMProject = buildTool('crm_project', 'projects', 'DELETE');

// ═══════════════════════════════════════════════════════════════
//  WORK ORDER
// ═══════════════════════════════════════════════════════════════
const searchCRMWorkOrder = buildTool('work_order', 'work_order', 'GET', 'Work Order');
const createCRMWorkOrder = buildTool('work_order', 'work_order', 'CREATE', 'Work Order', [], [
  { name: 'wo_number', schema: { type: 'string' }, required: true },
  { name: 'description', schema: { type: 'string' } },
]);
const updateCRMWorkOrder = buildTool('work_order', 'work_order', 'UPDATE', 'Work Order', [], [
  { name: 'description', schema: { type: 'string' } },
]);
const deleteCRMWorkOrder = buildTool('work_order', 'work_order', 'DELETE');

// ═══════════════════════════════════════════════════════════════
//  DAILY TASK ACTIVITY
// ═══════════════════════════════════════════════════════════════
const searchCRMDailyTask = buildTool('daily_task_activity', 'daily_task_activity', 'GET', 'iup_management_crm');
const createCRMDailyTask = buildTool('daily_task_activity', 'daily_task_activity', 'CREATE', 'iup_management_crm', [], [
  { name: 'activity_name', schema: { type: 'string' }, required: true },
  { name: 'activity_date', schema: { type: 'string' } },
]);
const updateCRMDailyTask = buildTool('daily_task_activity', 'daily_task_activity', 'UPDATE', 'iup_management_crm', [], [
  { name: 'activity_name', schema: { type: 'string' } },
]);
const deleteCRMDailyTask = buildTool('daily_task_activity', 'daily_task_activity', 'DELETE');

// ═══════════════════════════════════════════════════════════════
//  IUP CONTRACTOR
// ═══════════════════════════════════════════════════════════════
const searchCRMIUPContractor = buildTool('iup_contractor', 'iup_contractor', 'GET', 'iup_management_crm', [
  { name: 'iup_id', schema: { type: 'string' } },
]);
const createCRMIUPContractor = buildTool('iup_contractor', 'iup_contractor', 'CREATE', 'iup_management_crm', [], [
  { name: 'contractor_name', schema: { type: 'string' }, required: true },
  { name: 'iup_id', schema: { type: 'string' } },
]);
const updateCRMIUPContractor = buildTool('iup_contractor', 'iup_contractor', 'UPDATE', 'iup_management_crm', [], [
  { name: 'contractor_name', schema: { type: 'string' } },
]);
const deleteCRMIUPContractor = buildTool('iup_contractor', 'iup_contractor', 'DELETE');

// ═══════════════════════════════════════════════════════════════
//  IUP RKAB
// ═══════════════════════════════════════════════════════════════
const searchCRMIUPRkab = buildTool('iup_rkab', 'iup_rkab', 'GET', 'iup_management_crm', [
  { name: 'iup_id', schema: { type: 'string' } },
]);
const createCRMIUPRkab = buildTool('iup_rkab', 'iup_rkab', 'CREATE', 'iup_management_crm', [], [
  { name: 'iup_id', schema: { type: 'string' }, required: true },
  { name: 'year', schema: { type: 'number' }, required: true },
  { name: 'volume', schema: { type: 'number' } },
]);
const updateCRMIUPRkab = buildTool('iup_rkab', 'iup_rkab', 'UPDATE', 'iup_management_crm', [], [
  { name: 'volume', schema: { type: 'number' } },
]);
const deleteCRMIUPRkab = buildTool('iup_rkab', 'iup_rkab', 'DELETE');

// ═══════════════════════════════════════════════════════════════
//  IUP BRAND UNIT
// ═══════════════════════════════════════════════════════════════
const searchCRMIUPBrandUnit = buildTool('iup_brand_unit', 'iup_brand_unit', 'GET', 'iup_management_crm', [
  { name: 'iup_id', schema: { type: 'string' } },
]);
const createCRMIUPBrandUnit = buildTool('iup_brand_unit', 'iup_brand_unit', 'CREATE', 'iup_management_crm', [], [
  { name: 'iup_id', schema: { type: 'string' }, required: true },
  { name: 'brand_id', schema: { type: 'string' }, required: true },
]);
const updateCRMIUPBrandUnit = buildTool('iup_brand_unit', 'iup_brand_unit', 'UPDATE', 'iup_management_crm', [], [
  { name: 'iup_id', schema: { type: 'string' } },
]);
const deleteCRMIUPBrandUnit = buildTool('iup_brand_unit', 'iup_brand_unit', 'DELETE');

// ═══════════════════════════════════════════════════════════════
//  IUP SURVEY
//  Schema: iup_id, user_phone, user_name, chat_date, source_type, source_link, file_name, description
// ═══════════════════════════════════════════════════════════════
const searchCRMIUPSurvey    = buildTool('iup_survey', 'iup_survey', 'GET', 'iup_management_crm', [
  { name: 'iup_id', schema: { type: 'string' } },
]);
const getCRMIUPSurvey       = buildTool('iup_survey_by_id', 'iup_survey', 'GET_SINGLE', 'iup_management_crm', [], [], null, 'get_crm_iup_survey');
const createCRMIUPSurvey    = buildTool('iup_survey', 'iup_survey', 'CREATE', 'iup_management_crm', [], [
  { name: 'iup_id', schema: { type: 'string' }, required: true },
  { name: 'user_name', schema: { type: 'string' }, required: true },
  { name: 'user_phone', schema: { type: 'string' } },
  { name: 'chat_date', schema: { type: 'string' } },
  { name: 'source_type', schema: { type: 'string' } },
  { name: 'source_link', schema: { type: 'string' } },
  { name: 'file_name', schema: { type: 'string' } },
  { name: 'description', schema: { type: 'string' } },
]);
const updateCRMIUPSurvey    = buildTool('iup_survey', 'iup_survey', 'UPDATE', 'iup_management_crm', [], [
  { name: 'user_name', schema: { type: 'string' } },
  { name: 'description', schema: { type: 'string' } },
]);
const deleteCRMIUPSurvey    = buildTool('iup_survey', 'iup_survey', 'DELETE');

// ═══════════════════════════════════════════════════════════════
//  CUSTOMER 360 (read only)
// ═══════════════════════════════════════════════════════════════
const getCRMCustomer360 = {
  name: 'get_crm_customer_360',
  menuKey: 'iup_management_crm', action: 'read',
  description: 'Mendapatkan data Customer 360 CRM. Ringkasan lengkap data customer.',
  parameters: { type: 'object', properties: { customer_id: { type: 'string', description: 'ID customer' } } },
  execute: async ({ customer_id }, authToken) => {
    try {
      const baseUrl = (aiConfig.API_GATEWAY_BASE_URL || '').replace(/\/$/, '');
      const url = `${baseUrl}${sanitizePath('/api/crm/customer_360/get')}`;
      const response = await axios.post(url, cleanObject({ customer_id }) || {}, { headers: getDefaultHeaders(authToken), timeout: aiConfig.API_GATEWAY_TIMEOUT });
      return { success: true, data: response.data, message: 'Data Customer 360 berhasil diambil' };
    } catch (error) {
      logger.error(`Error customer 360: ${error.message}`);
      return { success: false, data: null, message: error.response?.data?.message || 'Gagal mengambil Customer 360' };
    }
  },
};

// ═══════════════════════════════════════════════════════════════
//  SALES STAGE (read only)
// ═══════════════════════════════════════════════════════════════
const searchCRMSalesStage = {
  name: 'search_crm_sales_stage',
  menuKey: 'iup_management_crm', action: 'read',
  description: 'Mendapatkan data sales stage / kanban board CRM.',
  parameters: { type: 'object', properties: {
    stage: { type: 'string', description: 'Filter stage' },
    page: { type: 'number', description: 'Halaman (default: 1)' },
    limit: { type: 'number', description: 'Limit (default: 100)' },
  }},
  execute: async ({ stage, page = 1, limit = 100 }, authToken) => {
    try {
      const baseUrl = (aiConfig.API_GATEWAY_BASE_URL || '').replace(/\/$/, '');
      const url = `${baseUrl}${sanitizePath('/api/crm/sales-stage/get')}`;
      const response = await axios.post(url, cleanObject({ stage, page, limit }) || {}, { headers: getDefaultHeaders(authToken), timeout: aiConfig.API_GATEWAY_TIMEOUT });
      return { success: true, data: response.data, message: 'Data sales stage berhasil diambil' };
    } catch (error) {
      logger.error(`Error sales stage: ${error.message}`);
      return { success: false, data: null, message: error.response?.data?.message || 'Gagal mengambil sales stage' };
    }
  },
};

// ═══════════════════════════════════════════════════════════════
//  Exports
// ═══════════════════════════════════════════════════════════════

module.exports = {
  searchCRMTerritory, createCRMTerritory, updateCRMTerritory, deleteCRMTerritory,
  searchCRMIUPManagement, createCRMIUPManagement, updateCRMIUPManagement, deleteCRMIUPManagement,
  searchCRMSegmentation, createCRMSegmentation, updateCRMSegmentation, deleteCRMSegmentation,
  searchCRMIUPCustomers, createCRMIUPCustomer, updateCRMIUPCustomer, deleteCRMIUPCustomer,
  searchCRMTransactions, createCRMTransaction, updateCRMTransaction, deleteCRMTransaction,
  searchCRMEmployeeDataAccess, createCRMEmployeeDataAccess, updateCRMEmployeeDataAccess, deleteCRMEmployeeDataAccess,
  searchCRMIsland, createCRMIsland, updateCRMIsland, deleteCRMIsland,
  searchCRMBrand, createCRMBrand, updateCRMBrand, deleteCRMBrand,
  searchCRMGroup, createCRMGroup, updateCRMGroup, deleteCRMGroup,
  searchCRMArea, createCRMArea, updateCRMArea, deleteCRMArea,
  searchCRMIUPZone, createCRMIUPZone, updateCRMIUPZone, deleteCRMIUPZone,
  searchCRMIUPSegmentation, createCRMIUPSegmentation, updateCRMIUPSegmentation, deleteCRMIUPSegmentation,
  searchCRMProject, createCRMProject, updateCRMProject, deleteCRMProject,
  searchCRMWorkOrder, createCRMWorkOrder, updateCRMWorkOrder, deleteCRMWorkOrder,
  searchCRMDailyTask, createCRMDailyTask, updateCRMDailyTask, deleteCRMDailyTask,
  searchCRMIUPContractor, createCRMIUPContractor, updateCRMIUPContractor, deleteCRMIUPContractor,
  searchCRMIUPRkab, createCRMIUPRkab, updateCRMIUPRkab, deleteCRMIUPRkab,
  searchCRMIUPBrandUnit, createCRMIUPBrandUnit, updateCRMIUPBrandUnit, deleteCRMIUPBrandUnit,
  searchCRMIUPSurvey, getCRMIUPSurvey, createCRMIUPSurvey, updateCRMIUPSurvey, deleteCRMIUPSurvey,
  getCRMCustomer360,
  searchCRMSalesStage,
};
