/**
 * MCP (Model Context Protocol) Server untuk AI Assistant
 * 
 * Mengekspos tools dari ai_assistant sebagai MCP tools 
 * yang bisa dikonsumsi oleh MCP client (VS Code, Claude, dll).
 * 
 * Menggunakan Streamable HTTP Transport:
 * - Satu endpoint POST untuk semua komunikasi
 * - Bisa kirim Authorization header langsung
 * - Transport diinisialisasi sekali di awal
 */

const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StreamableHTTPServerTransport } = require('@modelcontextprotocol/sdk/server/streamableHttp.js');
const { z } = require('zod');

const { executeTool, getToolsForLangChain } = require('./tools');
const { processChat } = require('./service');
const { optionalSSOToken } = require('./middleware/sso');
const { Logger } = require('../../utils/logger');
const logger = Logger;

// Global MCP Server & Transport (init once)
let mcpServer = null;
let mcpTransport = null;
let initialized = false;

/**
 * Initialize MCP Server dan Transport (dipanggil sekali)
 */
const ensureInitialized = async () => {
  if (initialized) return;

  mcpTransport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => require('crypto').randomUUID(),
  });

  mcpServer = new McpServer(
    { name: 'MSI AI Assistant MCP', version: '1.0.0' },
    { capabilities: { tools: {}, logging: {} } }
  );

  registerTools(mcpServer);
  registerChatTool(mcpServer);

  await mcpServer.connect(mcpTransport);

  mcpTransport.onclose = () => logger.info('MCP transport closed');

  initialized = true;
  logger.info('MCP Server initialized');
};

/**
 * Register chat tool
 */
const registerChatTool = (server) => {
  server.tool(
    'ai_chat',
    'Mengirim pesan chat ke AI Assistant MSI (Mosa). AI akan otomatis memilih tool yang sesuai untuk menjawab pertanyaan tentang data MSI seperti Quotation, CRM, HR, Power BI, dll.',
    {
      message: z.string().min(1).describe('Pesan atau pertanyaan dalam bahasa alami (Indonesia/Inggris/Mandarin)'),
      sessionId: z.string().optional().describe('Session ID untuk melanjutkan percakapan. Kosongkan untuk sesi baru.'),
      employee_id: z.string().optional().describe('Employee ID (jika ingin override user)'),
    },
    async (params, extra) => {
      try {
        const authToken = extra?.authInfo?.token || null;
        const result = await processChat(
          params.message,
          params.employee_id || 'mcp-user',
          params.sessionId || `mcp_session_${Date.now()}`,
          authToken
        );
        return {
          content: [{ type: 'text', text: result.message || 'Tidak ada respons dari AI' }],
        };
      } catch (error) {
        logger.error(`MCP ai_chat error: ${error.message}`);
        return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
      }
    }
  );
};

/**
 * Register all function tools as MCP tools
 */
const registerTools = (server) => {
  const langchainTools = getToolsForLangChain();

  for (const tool of langchainTools) {
    const { name, description, parameters } = tool.function;
    const zodSchema = convertToZodSchema(parameters);

    server.tool(name, description, zodSchema, async (params, extra) => {
      try {
        const authToken = extra?.authInfo?.token || null;
        logger.info(`MCP executing tool: ${name}`, params);
        const result = await executeTool(name, params, authToken);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        logger.error(`MCP tool ${name} error: ${error.message}`);
        return {
          content: [{ type: 'text', text: JSON.stringify({ success: false, message: `Error: ${error.message}` }) }],
          isError: true,
        };
      }
    });
  }
};

/**
 * Convert JSON Schema parameters ke Zod schema
 */
const convertToZodSchema = (parameters) => {
  if (!parameters || !parameters.properties) return {};
  const schema = {};
  for (const [key, prop] of Object.entries(parameters.properties)) {
    let fieldSchema;
    switch (prop.type) {
      case 'string': fieldSchema = prop.enum ? z.enum(prop.enum) : z.string(); break;
      case 'number': fieldSchema = z.number(); break;
      case 'boolean': fieldSchema = z.boolean(); break;
      case 'object': fieldSchema = z.record(z.any()); break;
      case 'array': fieldSchema = z.array(z.any()); break;
      default: fieldSchema = z.any();
    }
    if (prop.description) fieldSchema = fieldSchema.describe(prop.description);
    schema[key] = parameters.required?.includes(key) ? fieldSchema : fieldSchema.optional();
  }
  return schema;
};

// =============================================
// Express Router
// =============================================

/**
 * Handle MCP HTTP request (POST /mcp)
 */
const handleMCPRequest = async (req, res) => {
  try {
    await ensureInitialized();

    // Set auth info untuk StreamableHTTP transport
    req.auth = { token: req.authToken, user: req.user };

    // Delegate ke transport
    await mcpTransport.handleRequest(req, res, req.body);
  } catch (error) {
    logger.error(`MCP request error: ${error.message}`);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: `MCP error: ${error.message}` });
    }
  }
};

/**
 * Express router untuk MCP endpoint
 */
const getMCPRouter = () => {
  const express = require('express');
  const router = express.Router();

  // GET /mcp - SSE stream (untuk server-initiated messages)
  // POST /mcp - JSON-RPC messages
  // Keduanya wajib SSO token
  router.all('/', optionalSSOToken, handleMCPRequest);

  return router;
};

module.exports = { getMCPRouter };
