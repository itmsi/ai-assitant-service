const axios = require('axios');
const { Logger } = require('../../../utils/logger');
const logger = Logger;
const aiConfig = require('../../../config/ai');
const { sanitizePath, getDefaultHeaders, cleanObject } = require('./gateway');

const calculateQuotationGrandTotal = {
  name: 'calculate_quotation_grand_total',
  menuKey: 'manage_quotation',
  action: 'read',
  description: 'Menghitung total grand total dari semua quotation. Gunakan ini untuk pertanyaan tentang total quotation keseluruhan atau per customer.',
  parameters: {
    type: 'object',
    properties: {
      customerName: { type: 'string', description: 'Nama customer untuk filter (opsional).' },
      startDate: { type: 'string', description: 'Tanggal mulai YYYY-MM-DD (opsional)' },
      endDate: { type: 'string', description: 'Tanggal akhir YYYY-MM-DD (opsional)' },
      status: { type: 'string', description: 'Status quotation (opsional)' },
    },
  },
  execute: async ({ customerName, startDate, endDate, status }, authToken) => {
    try {
      const payload = cleanObject({ customerName, startDate, endDate, status, limit: 10000 });
      const baseUrl = (aiConfig.API_GATEWAY_BASE_URL || aiConfig.MICROSERVICE_QUOTATION_URL || '').replace(/\/$/, '');
      const endpoint = `${baseUrl}${sanitizePath('/api/quotation/manage-quotation/get')}`;
      const response = await axios.post(endpoint, payload || {}, { headers: getDefaultHeaders(authToken), timeout: aiConfig.API_GATEWAY_TIMEOUT });
      const quotations = response.data?.data || response.data || [];
      let total = 0, count = 0;
      quotations.forEach((q) => { const gt = parseFloat(q.manage_quotation_grand_total) || 0; if (!isNaN(gt)) { total += gt; count++; } });
      return { success: true, data: { total, count, currency: 'IDR', filter: { customerName, startDate, endDate, status } }, message: `Total grand total quotation: ${total.toLocaleString('id-ID')} (dari ${count} quotation)` };
    } catch (error) {
      logger.error(`Error calculating quotation grand total: ${error.message || error}`);
      return { success: false, data: null, message: error.response?.data?.message || 'Gagal menghitung grand total quotation' };
    }
  },
};

const calculateQuotationProductTotal = {
  name: 'calculate_quotation_product_total',
  menuKey: 'manage_quotation',
  action: 'read',
  description: 'Menghitung total harga produk dari quotation.',
  parameters: { type: 'object', properties: { productName: { type: 'string', description: 'Nama produk (opsional)' }, limit: { type: 'number', description: 'Jumlah maksimal (default: 10000)' } } },
  execute: async ({ productName, limit = 10000 }, authToken) => {
    try {
      const payload = cleanObject({ search: productName, limit, sort_order: 'desc' });
      const baseUrl = (aiConfig.API_GATEWAY_BASE_URL || aiConfig.MICROSERVICE_QUOTATION_URL || '').replace(/\/$/, '');
      const endpoint = `${baseUrl}${sanitizePath('/api/quotation/componen_product/get')}`;
      const response = await axios.post(endpoint, payload || {}, { headers: getDefaultHeaders(authToken), timeout: aiConfig.API_GATEWAY_TIMEOUT });
      const items = response.data?.data || response.data || [];
      let total = 0, count = 0;
      items.forEach((p) => { const price = parseFloat(p.component_product_price) || 0; if (!isNaN(price)) { total += price; count++; } });
      return { success: true, data: { total, count, currency: 'IDR', filter: { productName } }, message: `Total harga produk: ${total.toLocaleString('id-ID')} (dari ${count} produk)` };
    } catch (error) {
      logger.error(`Error calculating product total: ${error.message || error}`);
      return { success: false, data: null, message: error.response?.data?.message || 'Gagal menghitung total produk' };
    }
  },
};

const calculateQuotationAccessoryTotal = {
  name: 'calculate_quotation_accessory_total',
  menuKey: 'manage_quotation',
  action: 'read',
  description: 'Menghitung total harga aksesori dari quotation.',
  parameters: { type: 'object', properties: { accessoryName: { type: 'string', description: 'Nama aksesori (opsional)' }, limit: { type: 'number', description: 'Jumlah maksimal (default: 10000)' } } },
  execute: async ({ accessoryName, limit = 10000 }, authToken) => {
    try {
      const payload = cleanObject({ search: accessoryName, limit, sort_order: 'desc' });
      const baseUrl = (aiConfig.API_GATEWAY_BASE_URL || aiConfig.MICROSERVICE_QUOTATION_URL || '').replace(/\/$/, '');
      const endpoint = `${baseUrl}${sanitizePath('/api/quotation/accessory/get')}`;
      const response = await axios.post(endpoint, payload || {}, { headers: getDefaultHeaders(authToken), timeout: aiConfig.API_GATEWAY_TIMEOUT });
      const items = response.data?.data || response.data || [];
      let total = 0, count = 0;
      items.forEach((a) => { const price = parseFloat(a.component_accessory_price) || 0; if (!isNaN(price)) { total += price; count++; } });
      return { success: true, data: { total, count, currency: 'IDR', filter: { accessoryName } }, message: `Total aksesori: ${total.toLocaleString('id-ID')} (dari ${count} aksesori)` };
    } catch (error) {
      logger.error(`Error calculating accessory total: ${error.message || error}`);
      return { success: false, data: null, message: error.response?.data?.message || 'Gagal menghitung total aksesori' };
    }
  },
};

const calculateQuotationTermConditionTotal = {
  name: 'calculate_quotation_term_condition_total',
  menuKey: 'manage_quotation',
  action: 'read',
  description: 'Menghitung total harga term & condition dari quotation.',
  parameters: { type: 'object', properties: { termConditionName: { type: 'string', description: 'Nama term condition (opsional)' }, limit: { type: 'number', description: 'Jumlah maksimal (default: 10000)' } } },
  execute: async ({ termConditionName, limit = 10000 }, authToken) => {
    try {
      const payload = cleanObject({ search: termConditionName, limit, sort_order: 'desc' });
      const baseUrl = (aiConfig.API_GATEWAY_BASE_URL || aiConfig.MICROSERVICE_QUOTATION_URL || '').replace(/\/$/, '');
      const endpoint = `${baseUrl}${sanitizePath('/api/quotation/term_content/get')}`;
      const response = await axios.post(endpoint, payload || {}, { headers: getDefaultHeaders(authToken), timeout: aiConfig.API_GATEWAY_TIMEOUT });
      const items = response.data?.data || response.data || [];
      let total = 0, count = 0;
      items.forEach((t) => { const price = parseFloat(t.component_term_condition_price) || 0; if (!isNaN(price)) { total += price; count++; } });
      return { success: true, data: { total, count, currency: 'IDR', filter: { termConditionName } }, message: `Total term condition: ${total.toLocaleString('id-ID')} (dari ${count} item)` };
    } catch (error) {
      logger.error(`Error calculating term condition total: ${error.message || error}`);
      return { success: false, data: null, message: error.response?.data?.message || 'Gagal menghitung total term condition' };
    }
  },
};

const calculateQuotationCustomerTotal = {
  name: 'calculate_quotation_customer_total',
  menuKey: 'manage_quotation',
  action: 'read',
  description: 'Menghitung total harga customer dari quotation.',
  parameters: { type: 'object', properties: { customerName: { type: 'string', description: 'Nama customer (opsional)' }, limit: { type: 'number', description: 'Jumlah maksimal (default: 10000)' } } },
  execute: async ({ customerName, limit = 10000 }, authToken) => {
    try {
      const payload = cleanObject({ search: customerName, limit, sort_order: 'desc' });
      const baseUrl = (aiConfig.API_GATEWAY_BASE_URL || aiConfig.MICROSERVICE_QUOTATION_URL || '').replace(/\/$/, '');
      const endpoint = `${baseUrl}${sanitizePath('/api/customers/get')}`;
      const response = await axios.post(endpoint, payload || {}, { headers: getDefaultHeaders(authToken), timeout: aiConfig.API_GATEWAY_TIMEOUT });
      const items = response.data?.data || response.data || [];
      let total = 0, count = 0;
      items.forEach((c) => { const price = parseFloat(c.customer_price) || 0; if (!isNaN(price)) { total += price; count++; } });
      return { success: true, data: { total, count, currency: 'IDR', filter: { customerName } }, message: `Total customer: ${total.toLocaleString('id-ID')} (dari ${count} customer)` };
    } catch (error) {
      logger.error(`Error calculating customer total: ${error.message || error}`);
      return { success: false, data: null, message: error.response?.data?.message || 'Gagal menghitung total customer' };
    }
  },
};

const calculateQuotationBankAccountTotal = {
  name: 'calculate_quotation_bank_account_total',
  menuKey: 'manage_quotation',
  action: 'read',
  description: 'Menghitung total harga bank account dari quotation.',
  parameters: { type: 'object', properties: { bankAccountName: { type: 'string', description: 'Nama bank account (opsional)' }, limit: { type: 'number', description: 'Jumlah maksimal (default: 10000)' } } },
  execute: async ({ bankAccountName, limit = 10000 }, authToken) => {
    try {
      const payload = cleanObject({ search: bankAccountName, limit, sort_order: 'desc' });
      const baseUrl = (aiConfig.API_GATEWAY_BASE_URL || aiConfig.MICROSERVICE_QUOTATION_URL || '').replace(/\/$/, '');
      const endpoint = `${baseUrl}${sanitizePath('/api/bank_accounts/get')}`;
      const response = await axios.post(endpoint, payload || {}, { headers: getDefaultHeaders(authToken), timeout: aiConfig.API_GATEWAY_TIMEOUT });
      const items = response.data?.data || response.data || [];
      let total = 0, count = 0;
      items.forEach((b) => { const price = parseFloat(b.bank_account_price) || 0; if (!isNaN(price)) { total += price; count++; } });
      return { success: true, data: { total, count, currency: 'IDR', filter: { bankAccountName } }, message: `Total bank account: ${total.toLocaleString('id-ID')} (dari ${count} bank account)` };
    } catch (error) {
      logger.error(`Error calculating bank account total: ${error.message || error}`);
      return { success: false, data: null, message: error.response?.data?.message || 'Gagal menghitung total bank account' };
    }
  },
};

const calculateQuotationIslandTotal = {
  name: 'calculate_quotation_island_total',
  menuKey: 'manage_quotation',
  action: 'read',
  description: 'Menghitung total harga pulau dari quotation.',
  parameters: { type: 'object', properties: { islandName: { type: 'string', description: 'Nama pulau (opsional)' }, limit: { type: 'number', description: 'Jumlah maksimal (default: 10000)' } } },
  execute: async ({ islandName, limit = 10000 }, authToken) => {
    try {
      const payload = cleanObject({ search: islandName, limit, sort_order: 'desc' });
      const baseUrl = (aiConfig.API_GATEWAY_BASE_URL || aiConfig.MICROSERVICE_QUOTATION_URL || '').replace(/\/$/, '');
      const endpoint = `${baseUrl}${sanitizePath('/api/island/get')}`;
      const response = await axios.post(endpoint, payload || {}, { headers: getDefaultHeaders(authToken), timeout: aiConfig.API_GATEWAY_TIMEOUT });
      const items = response.data?.data || response.data || [];
      let total = 0, count = 0;
      items.forEach((i) => { const price = parseFloat(i.island_price) || 0; if (!isNaN(price)) { total += price; count++; } });
      return { success: true, data: { total, count, currency: 'IDR', filter: { islandName } }, message: `Total pulau: ${total.toLocaleString('id-ID')} (dari ${count} pulau)` };
    } catch (error) {
      logger.error(`Error calculating island total: ${error.message || error}`);
      return { success: false, data: null, message: error.response?.data?.message || 'Gagal menghitung total pulau' };
    }
  },
};

const calculateIUPCount = {
  name: 'calculate_iup_count',
  menuKey: 'manage_quotation',
  action: 'read',
  description: 'Menghitung jumlah IUP berdasarkan filter tertentu.',
  parameters: {
    type: 'object',
    properties: {
      status: { type: 'string', description: 'Status IUP (opsional)' },
      islandName: { type: 'string', description: 'Nama pulau (opsional)' },
      areaName: { type: 'string', description: 'Nama area/iup_zone_name (opsional)' },
      zoneName: { type: 'string', description: 'Nama zona/area_name (opsional)' },
      groupName: { type: 'string', description: 'Nama group (opsional)' },
      segmentationName: { type: 'string', description: 'Nama segmentasi (opsional)' },
      limit: { type: 'number', description: 'Jumlah maksimal (default: 10000)' },
    },
  },
  execute: async ({ status, islandName, areaName, zoneName, groupName, segmentationName, limit = 10000 }, authToken) => {
    try {
      const payload = cleanObject({ status, limit, sort_by: 'updated_at', sort_order: 'desc' });
      const baseUrl = (aiConfig.API_GATEWAY_BASE_URL || '').replace(/\/$/, '');
      const endpoint = `${baseUrl}${sanitizePath('/api/crm/iup_management/get')}`;
      const response = await axios.post(endpoint, payload || {}, { headers: getDefaultHeaders(authToken), timeout: aiConfig.API_GATEWAY_TIMEOUT });
      const iups = response.data?.data || response.data || [];
      let filteredIups = iups;
      if (islandName) filteredIups = filteredIups.filter((i) => i.island_name && i.island_name.toUpperCase().includes(islandName.toUpperCase()));
      if (areaName) filteredIups = filteredIups.filter((i) => i.iup_zone_name && i.iup_zone_name.toUpperCase().includes(areaName.toUpperCase()));
      if (zoneName) filteredIups = filteredIups.filter((i) => i.area_name && i.area_name.toString().includes(zoneName));
      if (groupName) filteredIups = filteredIups.filter((i) => i.group_name && i.group_name.toUpperCase().includes(groupName.toUpperCase()));
      if (segmentationName) filteredIups = filteredIups.filter((i) => i.segmentation_name && i.segmentation_name.toUpperCase().includes(segmentationName.toUpperCase()));
      return { success: true, data: { count: filteredIups.length, total: iups.length, filter: { status, islandName, areaName, zoneName, groupName, segmentationName } }, message: `Jumlah IUP: ${filteredIups.length} (dari total ${iups.length} IUP)` };
    } catch (error) {
      logger.error(`Error calculating IUP count: ${error.message || error}`);
      return { success: false, data: null, message: error.response?.data?.message || 'Gagal menghitung jumlah IUP' };
    }
  },
};

const calculateContractorCount = {
  name: 'calculate_contractor_count',
  menuKey: 'manage_quotation',
  action: 'read',
  description: 'Menghitung jumlah contractor berdasarkan filter tertentu.',
  parameters: {
    type: 'object',
    properties: {
      islandName: { type: 'string', description: 'Nama pulau (opsional)' },
      iupName: { type: 'string', description: 'Nama IUP (opsional)' },
      areaName: { type: 'string', description: 'Nama area (opsional)' },
      zoneName: { type: 'string', description: 'Nama zona (opsional)' },
      groupName: { type: 'string', description: 'Nama group (opsional)' },
      segmentationName: { type: 'string', description: 'Nama segmentasi (opsional)' },
      status: { type: 'string', description: 'Status (opsional)' },
      limit: { type: 'number', description: 'Jumlah maksimal (default: 10000)' },
    },
  },
  execute: async ({ islandName, iupName, areaName, zoneName, groupName, segmentationName, status, limit = 10000 }, authToken) => {
    try {
      const payload = cleanObject({ page: 1, limit: limit || 10000, sort_order: 'desc', search: '', mine_type: '', status: status || '', is_admin: 'true' });
      const baseUrl = (aiConfig.API_GATEWAY_BASE_URL || '').replace(/\/$/, '');
      const endpoint = `${baseUrl}${sanitizePath('/api/crm/iup_customers/get')}`;
      const response = await axios.post(endpoint, payload || {}, { headers: getDefaultHeaders(authToken), timeout: aiConfig.API_GATEWAY_TIMEOUT });
      const responseData = response.data?.data || response.data || [];
      const pagination = response.data?.pagination || {};
      const contractors = Array.isArray(responseData) ? responseData : [];
      let filtered = contractors;
      if (islandName) { const u = islandName.toUpperCase().trim(); filtered = filtered.filter((c) => (c.island_name || '').toUpperCase().trim() === u); }
      if (iupName) filtered = filtered.filter((c) => c.iup_name && c.iup_name.toUpperCase().includes(iupName.toUpperCase()));
      if (areaName) filtered = filtered.filter((c) => c.iup_zone_name && c.iup_zone_name.toUpperCase().includes(areaName.toUpperCase()));
      if (zoneName) filtered = filtered.filter((c) => c.area_name && c.area_name.toString().includes(zoneName));
      if (groupName) filtered = filtered.filter((c) => c.group_name && c.group_name.toUpperCase().includes(groupName.toUpperCase()));
      if (segmentationName) filtered = filtered.filter((c) => c.segmentation_name_en && c.segmentation_name_en.toUpperCase().includes(segmentationName.toUpperCase()));
      const totalCount = pagination.total || contractors.length;
      return { success: true, data: { count: filtered.length, total: totalCount, filter: { islandName, iupName, areaName, zoneName, groupName, segmentationName, status } }, message: `Jumlah contractor: ${filtered.length} (dari total ${totalCount})` };
    } catch (error) {
      logger.error(`Error calculating contractor count: ${error.message || error}`);
      return { success: false, data: null, message: error.response?.data?.message || 'Gagal menghitung jumlah contractor' };
    }
  },
};

module.exports = {
  calculateQuotationGrandTotal,
  calculateQuotationProductTotal,
  calculateQuotationAccessoryTotal,
  calculateQuotationTermConditionTotal,
  calculateQuotationCustomerTotal,
  calculateQuotationBankAccountTotal,
  calculateQuotationIslandTotal,
  calculateIUPCount,
  calculateContractorCount,
};
