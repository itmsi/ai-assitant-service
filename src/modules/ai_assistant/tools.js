const axios = require('axios');
const { Logger } = require('../../utils/logger');
const logger = Logger;
const aiConfig = require('../../config/ai');

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
      const params = new URLSearchParams();
      if (month) params.append('month', month);
      if (status) params.append('status', status);
      if (keyword) params.append('keyword', keyword);
      params.append('limit', limit);

      const response = await axios.get(
        `${aiConfig.MICROSERVICE_HR_URL}/api/candidates?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
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
      const params = new URLSearchParams();
      if (name) params.append('name', name);
      if (department) params.append('department', department);
      if (status) params.append('status', status);
      params.append('limit', limit);

      const response = await axios.get(
        `${aiConfig.MICROSERVICE_HR_URL}/api/employees?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
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
      const params = new URLSearchParams();
      if (quotationNumber) params.append('quotationNumber', quotationNumber);
      if (status) params.append('status', status);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      params.append('limit', limit);

      const response = await axios.get(
        `${aiConfig.MICROSERVICE_QUOTATION_URL}/api/quotations?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
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
      const params = new URLSearchParams();
      if (name) params.append('name', name);
      if (category) params.append('category', category);
      if (keyword) params.append('keyword', keyword);
      params.append('limit', limit);

      const response = await axios.get(
        `${aiConfig.MICROSERVICE_ECATALOG_URL}/api/products?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

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

module.exports = {
  getToolsForLangChain,
  executeTool,
  searchHRCandidates,
  searchHREmployees,
  searchQuotations,
  searchECatalogProducts,
  summarizeData,
};
