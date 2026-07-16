/**
 * AI Assistant - Standalone Server
 * 
 * Menjalankan modul AI Assistant sebagai service mandiri
 * dengan port sendiri.
 * 
 * Usage:
 *   npm run dev:ai    (development)
 *   npm run start:ai  (production)
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const aiAssistantRoutes = require('./index');
const { getMCPRouter } = require('./mcp');
const { createOAuthRouter } = require('./oauth');

const PORT = process.env.AI_ASSISTANT_PORT || 9588;
const app = express();

// =============================================
// Middleware
// =============================================
app.use(cors());
app.use(express.json({ limit: process.env.JSON_LIMIT || '100mb' }));
app.use(express.urlencoded({ limit: process.env.JSON_LIMIT || '100mb', extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// =============================================
// OAuth Endpoints (WAJIB di root level!)
// - .well-known/oauth-authorization-server
// - .well-known/oauth-protected-resource/...
// - /authorize, /token, /register, /revoke
// =============================================
const oauthRouter = createOAuthRouter();
app.use(oauthRouter);

// =============================================
// Health Check
// =============================================
app.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'AI Assistant Service',
    status: 'running',
    timestamp: new Date().toISOString(),
    port: PORT,
    mode: 'REST + MCP + OAuth',
  });
});

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'AI Assistant Service is running',
    docs: {
      chat: 'POST /api/mosa/ai-assistant/chat',
      history: 'GET /api/mosa/ai-assistant/history/:sessionId',
      clearHistory: 'DELETE /api/mosa/ai-assistant/history/:sessionId',
      mcp: 'POST /api/mosa/ai-assistant/mcp',
      oauth: 'GET /.well-known/oauth-authorization-server',
      register: 'POST /register',
      health: 'GET /health',
    },
  });
});

// =============================================
// AI Assistant REST Routes
// =============================================
app.use('/api/mosa/ai-assistant', aiAssistantRoutes);

// =============================================
// MCP Endpoint (Streamable HTTP)
// =============================================
app.use('/api/mosa/ai-assistant/mcp', getMCPRouter());

// =============================================
// 404 Handler
// =============================================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.url} tidak ditemukan`,
  });
});

// =============================================
// Error Handler
// =============================================
app.use((err, req, res, next) => {
  console.error(`[ERROR] ${err.message || err}`);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Terjadi kesalahan internal server',
  });
});

// =============================================
// Redis Initialization
// =============================================
const { initRedis, closeRedis } = require('../../utils/redis');
if (process.env.REDIS_ENABLED === 'true') {
  try {
    initRedis();
    console.log('[AI Assistant] Redis initialized');
  } catch (error) {
    console.warn(`[AI Assistant] Redis init skipped: ${error.message}`);
  }
}

// =============================================
// Start Server
// =============================================
app.listen(PORT, () => {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║        AI ASSISTANT SERVICE                  ║');
  console.log('╠══════════════════════════════════════════════╣');
  console.log(`║  Port    : ${PORT}                              `);
  console.log(`║  Mode    : ${process.env.NODE_ENV || 'development'}                        `);
  console.log(`║  Provider: ${process.env.AI_MODEL_PROVIDER || 'openai'}                        `);
  console.log(`║  SSO     : ${process.env.SSO_SERVER_URL || 'localhost:9518'}          `);
  console.log('╚══════════════════════════════════════════════╝');
  console.log(`🚀 AI Assistant running at http://localhost:${PORT}`);
  console.log(`📚 Health check: http://localhost:${PORT}/health`);
  console.log(`🤖 MCP endpoint: http://localhost:${PORT}/api/mosa/ai-assistant/mcp`);
});

// =============================================
// Graceful Shutdown
// =============================================
process.on('SIGTERM', async () => {
  console.log('[AI Assistant] SIGTERM received, shutting down...');
  await closeRedis();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[AI Assistant] SIGINT received, shutting down...');
  await closeRedis();
  process.exit(0);
});

process.on('uncaughtException', (err) => {
  console.error(`[AI Assistant] Uncaught Exception: ${err.message}`);
});

process.on('unhandledRejection', (reason) => {
  console.error(`[AI Assistant] Unhandled Rejection: ${reason}`);
});

module.exports = app;
