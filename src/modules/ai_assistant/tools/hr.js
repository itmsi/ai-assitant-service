const axios = require('axios');
const { Logger } = require('../../../utils/logger');
const logger = Logger;
const aiConfig = require('../../../config/ai');
const { sanitizePath, getDefaultHeaders, cleanObject } = require('./gateway');

const searchHRCandidates = {
  name: 'search_hr_candidates',
  menuKey: 'employees',
  action: 'read',
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

const searchHREmployees = {
  name: 'search_hr_employees',
  menuKey: 'employees',
  action: 'read',
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

module.exports = {
  searchHRCandidates,
  searchHREmployees,
};
