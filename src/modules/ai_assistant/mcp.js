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
const { getToken } = require('./middleware/sso-auth');
const { Logger } = require('../../utils/logger');
const logger = Logger;
const { AsyncLocalStorage } = require('async_hooks');
const mcpContext = new AsyncLocalStorage();

/**
 * Create MCP Server dengan tools
 */
const createServer = () => {
  const server = new McpServer(
    { name: 'MSI AI Assistant MCP', version: '1.0.0' },
    { capabilities: { tools: {}, logging: {} } }
  );
  registerTools(server);
  registerChatTool(server);
  return server;
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
        const ctx = mcpContext.getStore();
        const mcpPermissions = ctx?.mcpPermissions || [];
        logger.info(`MCP executing tool: ${name}`, params);
        
        const result = await executeTool(name, params, authToken, mcpPermissions);
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

// Sessions cache
const sessions = new Map();

const handleMCPRequest = async (req, res) => {
  try {
    const sessionId = req.headers['mcp-session-id'];
    let session;

    if (sessionId && sessions.has(sessionId)) {
      session = sessions.get(sessionId);
    } else {
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => require('crypto').randomUUID(),
      });
      const server = new McpServer(
        { name: 'MSI AI Assistant MCP', version: '1.0.0' },
        { capabilities: { tools: {}, logging: {} } }
      );
      registerTools(server);
      registerChatTool(server);
      await server.connect(transport);
      transport.onclose = () => sessions.delete(transport.sessionId);
      session = { transport, server };
    }

    // Pakai SSO token dari auto-login
    req.auth = { token: getToken(), user: req.user };

    // Extract MCP Token & Permissions
    const authHeader = req.headers.authorization;
    let mcpPermissions = null; // null = no MCP auth (bypass validation), [] = auth present but no permissions
    let mcpCredentialId = null;

    logger.info(`[MCP] Incoming request. Method: ${req.method}, Authorization: ${authHeader ? 'present' : 'MISSING'}`);

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const jwtDecode = require('jwt-decode');
        const decoded = jwtDecode(token);
        mcpCredentialId = decoded.mcp_credential_id;
        logger.info(`[MCP] JWT decoded. mcp_credential_id: ${mcpCredentialId || 'NOT FOUND in token'}`);

        if (mcpCredentialId) {
          mcpPermissions = []; // set to empty array — will be populated from DB
          try {
            const { raw } = require('../../repository/postgres/core_postgres');
            logger.info(`[MCP] Querying permissions from DB for credential: ${mcpCredentialId}`);
            const result = await raw(`
              SELECT p.*, m.menu_key 
              FROM gate_sso_mcp_credential_permissions p
              LEFT JOIN gate_sso_menus m ON p.menu_id = m.menu_id
              WHERE p.mcp_credential_id = '${mcpCredentialId}'
            `);
            mcpPermissions = result.rows || [];
            logger.info(`[MCP] Fetched ${mcpPermissions.length} permissions from DB for credential ${mcpCredentialId}: ${JSON.stringify(mcpPermissions.map(p => ({ menu_key: p.menu_key, actions: p.actions })))}`);
          } catch (dbErr) {
            logger.error(`[MCP] DB query failed: ${dbErr.message}`);
          }
        } else {
          // Token valid tapi tidak ada mcp_credential_id — bypass validasi
          logger.warn(`[MCP] JWT has no mcp_credential_id. Skipping permission validation.`);
          mcpPermissions = null;
        }
      } catch (err) {
        logger.error(`[MCP] Error extracting MCP permissions: ${err.message}`);
        mcpPermissions = null;
      }
    } else {
      logger.info(`[MCP] No Bearer token. Skipping permission validation.`);
    }

    await mcpContext.run({ mcpPermissions, mcpCredentialId }, async () => {
      await session.transport.handleRequest(req, res, req.body);
    });

    if (session.transport.sessionId && !sessionId) {
      sessions.set(session.transport.sessionId, session);
    }
  } catch (error) {
    logger.error(`MCP error: ${error.message}`);
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
  router.all('/', optionalSSOToken, handleMCPRequest);
  return router;
};

module.exports = { getMCPRouter };
