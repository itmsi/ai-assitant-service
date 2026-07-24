const axios = require('axios');
const { Logger } = require('../../../utils/logger');
const logger = Logger;
const aiConfig = require('../../../config/ai');
const { sanitizePath, getDefaultHeaders, cleanObject } = require('./gateway');

// ═══════════════════════════════════════════════════════════════
//  Helper: Build HRM Tool
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

const buildTool = (entity, endpoint, method, menuKey = 'HRM', searchExtra = [], createFields = [], updateFields = null, customName = null) => {
  const descName = entity.replace(/_/g, ' ').replace(/\b\w/g, s => s.toUpperCase());
  let name, action, descAction, params;
  if (method === 'GET') {
    name = customName || `search_hr_${entity}`; action = 'read'; descAction = 'Mencari';
    params = buildSearchParams(searchExtra);
  } else if (method === 'CREATE') {
    name = customName || `create_hr_${entity}`; action = 'create'; descAction = 'Membuat';
    params = buildCreateParams(createFields);
  } else if (method === 'UPDATE') {
    name = customName || `update_hr_${entity}`; action = 'update'; descAction = 'Memperbarui';
    params = buildUpdateParams(updateFields || createFields);
  } else if (method === 'GET_SINGLE') {
    name = customName || `get_hr_${entity}`; action = 'read'; descAction = 'Mendapatkan';
    params = { type: 'object', properties: { id: { type: 'string', description: `ID ${descName}` } }, required: ['id'] };
  } else {
    name = customName || `delete_hr_${entity}`; action = 'delete'; descAction = 'Menghapus';
    params = { type: 'object', properties: { id: { type: 'string', description: 'ID' } }, required: ['id'] };
  }

  return {
    name, menuKey, action,
    description: `${descAction} ${descName} HRM.`,
    parameters: params,
    execute: async (input, authToken) => {
      try {
        const baseUrl = (aiConfig.API_GATEWAY_BASE_URL || '').replace(/\/$/, '');
        let url, httpMethod, payload = null;
        if (method === 'GET') {
          url = `${baseUrl}${sanitizePath(`/api/hrm/${endpoint}/get`)}`;
          payload = cleanObject({ page: 1, limit: 100, sort_order: 'desc', ...input });
          httpMethod = 'post';
        } else if (method === 'GET_SINGLE') {
          url = `${baseUrl}${sanitizePath(`/api/hrm/${endpoint}/${input.id}`)}`;
          httpMethod = 'get';
        } else if (method === 'DELETE') {
          url = `${baseUrl}${sanitizePath(`/api/hrm/${endpoint}/${input.id}`)}`;
          httpMethod = 'delete';
        } else if (method === 'UPDATE') {
          const { id, ...rest } = input;
          url = `${baseUrl}${sanitizePath(`/api/hrm/${endpoint}/${id}`)}`;
          payload = cleanObject(rest); httpMethod = 'put';
        } else {
          url = `${baseUrl}${sanitizePath(`/api/hrm/${endpoint}/create`)}`;
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
//  1. CANDIDATES (backward compatible: search_hr_candidates)
// ═══════════════════════════════════════════════════════════════
const searchHRCandidates = buildTool('candidates', 'candidates', 'GET', 'HRM', [
  { name: 'month', schema: { type: 'string', description: 'Bulan YYYY-MM' } },
  { name: 'status', schema: { type: 'string', description: 'Status kandidat' } },
  { name: 'keyword', schema: { type: 'string', description: 'Keyword' } },
], [], null, 'search_hr_candidates');
const createHRCandidate   = buildTool('candidate', 'candidates', 'CREATE', 'HRM', [], [
  { name: 'candidate_name', schema: { type: 'string' }, required: true },
  { name: 'candidate_email', schema: { type: 'string' } },
  { name: 'candidate_phone', schema: { type: 'string' } },
  { name: 'company_id', schema: { type: 'string' } },
  { name: 'department_id', schema: { type: 'string' } },
  { name: 'title_id', schema: { type: 'string' } },
]);
const updateHRCandidate   = buildTool('candidate', 'candidates', 'UPDATE', 'HRM', [], [
  { name: 'candidate_name', schema: { type: 'string' } },
  { name: 'candidate_email', schema: { type: 'string' } },
  { name: 'candidate_phone', schema: { type: 'string' } },
  { name: 'candidate_status', schema: { type: 'string' } },
]);
const deleteHRCandidate   = buildTool('candidate', 'candidates', 'DELETE', 'HRM');
const getHRCandidate      = buildTool('candidate_by_id', 'candidates', 'GET_SINGLE', 'HRM', [], [], null, 'get_hr_candidate');

// ═══════════════════════════════════════════════════════════════
//  2. SCHEDULE INTERVIEWS
// ═══════════════════════════════════════════════════════════════
const searchHRScheduleInterviews = buildTool('schedule_interviews', 'schedule_interview', 'GET', 'HRM', [
  { name: 'candidate_id', schema: { type: 'string' } },
]);
const createHRScheduleInterview  = buildTool('schedule_interview', 'schedule_interview', 'CREATE', 'HRM', [], [
  { name: 'candidate_id', schema: { type: 'string' }, required: true },
  { name: 'schedule_interview_date', schema: { type: 'string', description: 'Tanggal interview' } },
  { name: 'schedule_interview_time', schema: { type: 'string', description: 'Waktu interview' } },
  { name: 'schedule_interview_duration', schema: { type: 'number', description: 'Durasi interview (menit)' } },
]);
const updateHRScheduleInterview  = buildTool('schedule_interview', 'schedule_interview', 'UPDATE', 'HRM', [], [
  { name: 'schedule_interview_date', schema: { type: 'string' } },
  { name: 'schedule_interview_time', schema: { type: 'string' } },
]);
const deleteHRScheduleInterview  = buildTool('schedule_interview', 'schedule_interview', 'DELETE', 'HRM');
const getHRScheduleInterview     = buildTool('schedule_interview_by_id', 'schedule_interview', 'GET_SINGLE', 'HRM', [], [], null, 'get_hr_schedule_interview');

// ═══════════════════════════════════════════════════════════════
//  3. INTERVIEWS
// ═══════════════════════════════════════════════════════════════
const searchHRInterviews = buildTool('interviews', 'interviews', 'GET', 'HRM');
const createHRInterview  = buildTool('interview', 'interviews', 'CREATE', 'HRM', [], [
  { name: 'schedule_interview_id', schema: { type: 'string' }, required: true },
  { name: 'assigned_id', schema: { type: 'string' } },
  { name: 'comment', schema: { type: 'string' } },
]);
const updateHRInterview  = buildTool('interview', 'interviews', 'UPDATE', 'HRM', [], [
  { name: 'assigned_id', schema: { type: 'string' } },
  { name: 'comment', schema: { type: 'string' } },
]);
const deleteHRInterview  = buildTool('interview', 'interviews', 'DELETE', 'HRM');
const getHRInterview     = buildTool('interview_by_id', 'interviews', 'GET_SINGLE', 'HRM', [], [], null, 'get_hr_interview');

// ═══════════════════════════════════════════════════════════════
//  4. BACKGROUND CHECKS
// ═══════════════════════════════════════════════════════════════
const searchHRBackgroundChecks = buildTool('background_checks', 'background_check', 'GET', 'HRM', [
  { name: 'candidate_id', schema: { type: 'string' } },
]);
const createHRBackgroundCheck  = buildTool('background_check', 'background_check', 'CREATE', 'HRM', [], [
  { name: 'candidate_id', schema: { type: 'string' }, required: true },
  { name: 'background_check_note', schema: { type: 'string' } },
  { name: 'background_check_status', schema: { type: 'string' } },
]);
const updateHRBackgroundCheck  = buildTool('background_check', 'background_check', 'UPDATE', 'HRM', [], [
  { name: 'background_check_note', schema: { type: 'string' } },
  { name: 'background_check_status', schema: { type: 'string' } },
]);
const deleteHRBackgroundCheck  = buildTool('background_check', 'background_check', 'DELETE', 'HRM');
const getHRBackgroundCheck     = buildTool('background_check_by_id', 'background_check', 'GET_SINGLE', 'HRM', [], [], null, 'get_hr_background_check');

// ═══════════════════════════════════════════════════════════════
//  5. ON BOARD DOCUMENTS
// ═══════════════════════════════════════════════════════════════
const searchHROnBoardDocuments = buildTool('on_board_docs', 'on_board_document', 'GET', 'HRM', [
  { name: 'candidate_id', schema: { type: 'string' } },
]);
const createHROnBoardDocument  = buildTool('on_board_doc', 'on_board_document', 'CREATE', 'HRM', [], [
  { name: 'candidate_id', schema: { type: 'string' }, required: true },
  { name: 'on_board_documents_name', schema: { type: 'string' }, required: true },
  { name: 'on_board_documents_file', schema: { type: 'string' } },
  { name: 'on_board_documents_file_path', schema: { type: 'string' } },
]);
const updateHROnBoardDocument  = buildTool('on_board_doc', 'on_board_document', 'UPDATE', 'HRM', [], [
  { name: 'on_board_documents_name', schema: { type: 'string' } },
]);
const deleteHROnBoardDocument  = buildTool('on_board_doc', 'on_board_document', 'DELETE', 'HRM');
const getHROnBoardDocument     = buildTool('on_board_doc_by_id', 'on_board_document', 'GET_SINGLE', 'HRM', [], [], null, 'get_hr_on_board_doc');

// ═══════════════════════════════════════════════════════════════
//  6. NOTES (HRM)
// ═══════════════════════════════════════════════════════════════
const searchHRNotes = buildTool('notes', 'note', 'GET', 'HRM', [
  { name: 'candidate_id', schema: { type: 'string' } },
]);
const createHRNote  = buildTool('note', 'note', 'CREATE', 'HRM', [], [
  { name: 'candidate_id', schema: { type: 'string' }, required: true },
  { name: 'notes', schema: { type: 'string' }, required: true },
]);
const updateHRNote  = buildTool('note', 'note', 'UPDATE', 'HRM', [], [
  { name: 'notes', schema: { type: 'string' } },
]);
const deleteHRNote  = buildTool('note', 'note', 'DELETE', 'HRM');
const getHRNote     = buildTool('note_by_id', 'note', 'GET_SINGLE', 'HRM', [], [], null, 'get_hr_note');

// ═══════════════════════════════════════════════════════════════
//  Exports
// ═══════════════════════════════════════════════════════════════

module.exports = {
  searchHRCandidates, createHRCandidate, updateHRCandidate, deleteHRCandidate, getHRCandidate,
  searchHRScheduleInterviews, createHRScheduleInterview, updateHRScheduleInterview, deleteHRScheduleInterview, getHRScheduleInterview,
  searchHRInterviews, createHRInterview, updateHRInterview, deleteHRInterview, getHRInterview,
  searchHRBackgroundChecks, createHRBackgroundCheck, updateHRBackgroundCheck, deleteHRBackgroundCheck, getHRBackgroundCheck,
  searchHROnBoardDocuments, createHROnBoardDocument, updateHROnBoardDocument, deleteHROnBoardDocument, getHROnBoardDocument,
  searchHRNotes, createHRNote, updateHRNote, deleteHRNote, getHRNote,
};
