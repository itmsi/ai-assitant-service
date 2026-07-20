/**
 * Tools Index
 * 
 * Menggabungkan semua tools dari submodule dan mengekspor
 * dengan interface yang sama seperti tools.js sebelumnya.
 */

const { callGatewayEndpoint, isWriteOperation } = require('./gateway');

const { searchHRCandidates, searchHREmployees } = require('./hr');

const {
  searchQuotations,
  searchQuotationProducts,
  searchQuotationAccessory,
  searchQuotationTermCondition,
  searchQuotationCustomer,
  searchQuotationBankAccount,
  searchQuotationIsland,
} = require('./quotation');

const {
  calculateQuotationGrandTotal,
  calculateQuotationProductTotal,
  calculateQuotationAccessoryTotal,
  calculateQuotationTermConditionTotal,
  calculateQuotationCustomerTotal,
  calculateQuotationBankAccountTotal,
  calculateQuotationIslandTotal,
  calculateIUPCount,
  calculateContractorCount,
} = require('./aggregation');

const {
  searchCRMTerritory,
  searchCRMIUPManagement,
  searchCRMSegmentation,
  searchCRMIUPCustomers,
  searchCRMTransactions,
  searchCRMEmployeeDataAccess,
  searchCRMIsland,
} = require('./crm');

const { searchEmployeeCompany, searchEmployeeDepartment, searchEmployeeTitle } = require('./employee');

const { searchPowerBIDashboard, searchPowerBICategory, searchPowerBIManage } = require('./powerbi');

const { searchECatalogProducts } = require('./ecatalog');

const { summarizeData } = require('./summarize');

/**
 * Tool to Module Mapping
 */
const TOOL_MODULE_MAP = {
  [searchHRCandidates.name]: ['User Management', 'HR'],
  [searchHREmployees.name]: ['User Management', 'HR'],
  [searchEmployeeCompany.name]: ['User Management', 'HR'],
  [searchEmployeeDepartment.name]: ['User Management', 'HR'],
  [searchEmployeeTitle.name]: ['User Management', 'HR'],
  [searchQuotations.name]: ['Quotation'],
  [searchQuotationProducts.name]: ['Quotation'],
  [searchQuotationAccessory.name]: ['Quotation'],
  [searchQuotationTermCondition.name]: ['Quotation'],
  [searchQuotationCustomer.name]: ['Quotation'],
  [searchQuotationBankAccount.name]: ['Quotation'],
  [searchQuotationIsland.name]: ['Quotation'],
  [calculateQuotationGrandTotal.name]: ['Quotation'],
  [calculateQuotationProductTotal.name]: ['Quotation'],
  [calculateQuotationAccessoryTotal.name]: ['Quotation'],
  [calculateQuotationTermConditionTotal.name]: ['Quotation'],
  [calculateQuotationCustomerTotal.name]: ['Quotation'],
  [calculateQuotationBankAccountTotal.name]: ['Quotation'],
  [calculateQuotationIslandTotal.name]: ['Quotation'],
  [searchPowerBIDashboard.name]: ['Power BI'],
  [searchPowerBICategory.name]: ['Power BI'],
  [searchPowerBIManage.name]: ['Power BI'],
  [searchCRMTerritory.name]: ['CRM'],
  [searchCRMIUPManagement.name]: ['CRM'],
  [searchCRMSegmentation.name]: ['CRM'],
  [searchCRMIUPCustomers.name]: ['CRM'],
  [searchCRMTransactions.name]: ['CRM'],
  [searchCRMEmployeeDataAccess.name]: ['CRM'],
  [searchCRMIsland.name]: ['CRM'],
  [calculateIUPCount.name]: ['CRM'],
  [calculateContractorCount.name]: ['CRM'],
  [searchECatalogProducts.name]: ['eCatalog', 'Product'],
  [summarizeData.name]: ['GLOBAL'],
  [callGatewayEndpoint.name]: ['System'],
};

/**
 * Tool to Permission Mapping for MCP
 */
const TOOL_PERMISSION_MAP = {};
// Auto-generate mapping from TOOL_MODULE_MAP for simplicity:
// First element of allowed modules becomes menuKey, default action is 'read'
for (const [toolName, modules] of Object.entries(TOOL_MODULE_MAP)) {
  TOOL_PERMISSION_MAP[toolName] = { 
    menuKey: modules[0], 
    action: 'read' 
  };
}

/**
 * Convert tools to LangChain format
 */
const getToolsForLangChain = (allowedModules) => {
  const allTools = [
    { type: 'function', function: { name: callGatewayEndpoint.name, description: callGatewayEndpoint.description, parameters: callGatewayEndpoint.parameters } },
    { type: 'function', function: { name: searchHRCandidates.name, description: searchHRCandidates.description, parameters: searchHRCandidates.parameters } },
    { type: 'function', function: { name: searchHREmployees.name, description: searchHREmployees.description, parameters: searchHREmployees.parameters } },
    { type: 'function', function: { name: searchQuotations.name, description: searchQuotations.description, parameters: searchQuotations.parameters } },
    { type: 'function', function: { name: searchECatalogProducts.name, description: searchECatalogProducts.description, parameters: searchECatalogProducts.parameters } },
    { type: 'function', function: { name: summarizeData.name, description: summarizeData.description, parameters: summarizeData.parameters } },
    { type: 'function', function: { name: searchPowerBIDashboard.name, description: searchPowerBIDashboard.description, parameters: searchPowerBIDashboard.parameters } },
    { type: 'function', function: { name: searchPowerBICategory.name, description: searchPowerBICategory.description, parameters: searchPowerBICategory.parameters } },
    { type: 'function', function: { name: searchPowerBIManage.name, description: searchPowerBIManage.description, parameters: searchPowerBIManage.parameters } },
    { type: 'function', function: { name: searchQuotationProducts.name, description: searchQuotationProducts.description, parameters: searchQuotationProducts.parameters } },
    { type: 'function', function: { name: searchQuotationAccessory.name, description: searchQuotationAccessory.description, parameters: searchQuotationAccessory.parameters } },
    { type: 'function', function: { name: searchQuotationTermCondition.name, description: searchQuotationTermCondition.description, parameters: searchQuotationTermCondition.parameters } },
    { type: 'function', function: { name: searchQuotationCustomer.name, description: searchQuotationCustomer.description, parameters: searchQuotationCustomer.parameters } },
    { type: 'function', function: { name: searchQuotationBankAccount.name, description: searchQuotationBankAccount.description, parameters: searchQuotationBankAccount.parameters } },
    { type: 'function', function: { name: searchQuotationIsland.name, description: searchQuotationIsland.description, parameters: searchQuotationIsland.parameters } },
    { type: 'function', function: { name: searchCRMTerritory.name, description: searchCRMTerritory.description, parameters: searchCRMTerritory.parameters } },
    { type: 'function', function: { name: searchCRMIUPManagement.name, description: searchCRMIUPManagement.description, parameters: searchCRMIUPManagement.parameters } },
    { type: 'function', function: { name: searchCRMSegmentation.name, description: searchCRMSegmentation.description, parameters: searchCRMSegmentation.parameters } },
    { type: 'function', function: { name: searchCRMIUPCustomers.name, description: searchCRMIUPCustomers.description, parameters: searchCRMIUPCustomers.parameters } },
    { type: 'function', function: { name: searchCRMTransactions.name, description: searchCRMTransactions.description, parameters: searchCRMTransactions.parameters } },
    { type: 'function', function: { name: searchCRMEmployeeDataAccess.name, description: searchCRMEmployeeDataAccess.description, parameters: searchCRMEmployeeDataAccess.parameters } },
    { type: 'function', function: { name: searchCRMIsland.name, description: searchCRMIsland.description, parameters: searchCRMIsland.parameters } },
    { type: 'function', function: { name: searchEmployeeCompany.name, description: searchEmployeeCompany.description, parameters: searchEmployeeCompany.parameters } },
    { type: 'function', function: { name: searchEmployeeDepartment.name, description: searchEmployeeDepartment.description, parameters: searchEmployeeDepartment.parameters } },
    { type: 'function', function: { name: searchEmployeeTitle.name, description: searchEmployeeTitle.description, parameters: searchEmployeeTitle.parameters } },
    { type: 'function', function: { name: calculateQuotationGrandTotal.name, description: calculateQuotationGrandTotal.description, parameters: calculateQuotationGrandTotal.parameters } },
    { type: 'function', function: { name: calculateQuotationProductTotal.name, description: calculateQuotationProductTotal.description, parameters: calculateQuotationProductTotal.parameters } },
    { type: 'function', function: { name: calculateQuotationAccessoryTotal.name, description: calculateQuotationAccessoryTotal.description, parameters: calculateQuotationAccessoryTotal.parameters } },
    { type: 'function', function: { name: calculateQuotationTermConditionTotal.name, description: calculateQuotationTermConditionTotal.description, parameters: calculateQuotationTermConditionTotal.parameters } },
    { type: 'function', function: { name: calculateQuotationCustomerTotal.name, description: calculateQuotationCustomerTotal.description, parameters: calculateQuotationCustomerTotal.parameters } },
    { type: 'function', function: { name: calculateQuotationBankAccountTotal.name, description: calculateQuotationBankAccountTotal.description, parameters: calculateQuotationBankAccountTotal.parameters } },
    { type: 'function', function: { name: calculateQuotationIslandTotal.name, description: calculateQuotationIslandTotal.description, parameters: calculateQuotationIslandTotal.parameters } },
    { type: 'function', function: { name: calculateIUPCount.name, description: calculateIUPCount.description, parameters: calculateIUPCount.parameters } },
    { type: 'function', function: { name: calculateContractorCount.name, description: calculateContractorCount.description, parameters: calculateContractorCount.parameters } },
  ];

  if (allowedModules === undefined || allowedModules === null) {
    return allTools;
  }

  return allTools.filter(tool => {
    const toolName = tool.function.name;
    const allowedMap = TOOL_MODULE_MAP[toolName];
    if (allowedMap && allowedMap.includes('GLOBAL')) return true;
    if (!allowedMap) return false;
    return allowedMap.some(module => allowedModules.includes(module));
  });
};

/**
 * Execute tool by name
 */
const executeTool = async (toolName, parameters, authToken, mcpPermissions = null) => {
  const tools = {
    [callGatewayEndpoint.name]: callGatewayEndpoint,
    [searchHRCandidates.name]: searchHRCandidates,
    [searchHREmployees.name]: searchHREmployees,
    [searchQuotations.name]: searchQuotations,
    [searchECatalogProducts.name]: searchECatalogProducts,
    [summarizeData.name]: summarizeData,
    [searchPowerBIDashboard.name]: searchPowerBIDashboard,
    [searchPowerBICategory.name]: searchPowerBICategory,
    [searchPowerBIManage.name]: searchPowerBIManage,
    [searchQuotationProducts.name]: searchQuotationProducts,
    [searchQuotationAccessory.name]: searchQuotationAccessory,
    [searchQuotationTermCondition.name]: searchQuotationTermCondition,
    [searchQuotationCustomer.name]: searchQuotationCustomer,
    [searchQuotationBankAccount.name]: searchQuotationBankAccount,
    [searchQuotationIsland.name]: searchQuotationIsland,
    [searchCRMTerritory.name]: searchCRMTerritory,
    [searchCRMIUPManagement.name]: searchCRMIUPManagement,
    [searchCRMSegmentation.name]: searchCRMSegmentation,
    [searchCRMIUPCustomers.name]: searchCRMIUPCustomers,
    [searchCRMTransactions.name]: searchCRMTransactions,
    [searchCRMEmployeeDataAccess.name]: searchCRMEmployeeDataAccess,
    [searchCRMIsland.name]: searchCRMIsland,
    [searchEmployeeCompany.name]: searchEmployeeCompany,
    [searchEmployeeDepartment.name]: searchEmployeeDepartment,
    [searchEmployeeTitle.name]: searchEmployeeTitle,
    [calculateQuotationGrandTotal.name]: calculateQuotationGrandTotal,
    [calculateQuotationProductTotal.name]: calculateQuotationProductTotal,
    [calculateQuotationAccessoryTotal.name]: calculateQuotationAccessoryTotal,
    [calculateQuotationTermConditionTotal.name]: calculateQuotationTermConditionTotal,
    [calculateQuotationCustomerTotal.name]: calculateQuotationCustomerTotal,
    [calculateQuotationBankAccountTotal.name]: calculateQuotationBankAccountTotal,
    [calculateQuotationIslandTotal.name]: calculateQuotationIslandTotal,
    [calculateIUPCount.name]: calculateIUPCount,
    [calculateContractorCount.name]: calculateContractorCount,
  };

  const tool = tools[toolName];
  if (!tool) {
    return { success: false, message: `Tool ${toolName} tidak ditemukan` };
  }

  // Authorize MCP client execution if mcpPermissions array is provided
  if (mcpPermissions !== null) {
    const reqPerm = tool.menuKey ? { menuKey: tool.menuKey, action: tool.action || 'read' } : (TOOL_PERMISSION_MAP[toolName] || { menuKey: 'GLOBAL', action: 'read' });
    
    if (reqPerm.menuKey !== 'GLOBAL' && reqPerm.menuKey !== 'System') {
      const hasAccess = mcpPermissions.some(p => {
        let actions = [];
        try { actions = typeof p.actions === 'string' ? JSON.parse(p.actions) : (p.actions || []); } catch(e){}
        return p.menu_id === reqPerm.menuKey && actions.includes(reqPerm.action);
      });
      
      if (!hasAccess) {
        return { success: false, message: `Unauthorized: Tool requires permission for ${reqPerm.menuKey}:${reqPerm.action}` };
      }
    }
  }

  return await tool.execute(parameters, authToken);
};

module.exports = {
  getToolsForLangChain,
  executeTool,
  callGatewayEndpoint,
  searchHRCandidates,
  searchHREmployees,
  searchQuotations,
  searchECatalogProducts,
  summarizeData,
  searchPowerBIDashboard,
  searchPowerBICategory,
  searchPowerBIManage,
  searchQuotationProducts,
  searchQuotationAccessory,
  searchQuotationTermCondition,
  searchQuotationCustomer,
  searchQuotationBankAccount,
  searchQuotationIsland,
  searchCRMTerritory,
  searchCRMIUPManagement,
  searchCRMSegmentation,
  searchCRMIUPCustomers,
  searchCRMTransactions,
  searchCRMEmployeeDataAccess,
  searchCRMIsland,
  searchEmployeeCompany,
  searchEmployeeDepartment,
  searchEmployeeTitle,
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
