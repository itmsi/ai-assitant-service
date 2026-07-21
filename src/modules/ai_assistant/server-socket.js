/**
 * AI Assistant - Socket.IO Server
 *
 * Server mandiri untuk Socket.IO + REST (tanpa MCP).
 * Melayani WebSocket real-time chat dan HTTP fallback.
 *
 * Usage:
 *   npm run dev:socket    (development)
 *   npm run start:socket  (production)
 */

require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server: SocketIOServer } = require('socket.io');
const cors = require('cors');
const aiAssistantRoutes = require('./index');
const { createOAuthRouter } = require('./oauth');
const { login: ssoLogin } = require('./middleware/sso-auth');
const { registerSocketHandlers } = require('./socket-handler');

const PORT = process.env.AI_SOCKET_PORT || 9587;
const app = express();

// Trust proxy (nginx/cloudflare di belakang)
app.set('trust proxy', 1);

// =============================================
// SSO Auto-Login (startup)
// =============================================
if (process.env.SSO_USERNAME && process.env.SSO_PASSWORD) {
  ssoLogin().then((token) => {
    if (token) {
      console.log(`[SSO] Auto-login berhasil, token: ${token.substring(0, 20)}...`);
    } else {
      console.warn('[SSO] Auto-login gagal. Request tanpa token akan tetap jalan.');
    }
  });
} else {
  console.log('[SSO] Auto-login tidak dikonfigurasi (SSO_USERNAME/SSO_PASSWORD)');
}

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
// OAuth Endpoints (.well-known, authorize, token)
// =============================================
const oauthRouter = createOAuthRouter();
app.use(oauthRouter);

// =============================================
// Health Check
// =============================================
app.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'AI Assistant Socket Server',
    status: 'running',
    timestamp: new Date().toISOString(),
    port: PORT,
    mode: 'REST + Socket.IO',
  });
});

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'AI Assistant Socket Server is running',
    docs: {
      chat: 'POST /api/mosa/ai-assistant/chat',
      chatStream: 'POST /api/mosa/ai-assistant/chat/stream',
      history: 'GET /api/mosa/ai-assistant/history/:sessionId',
      clearHistory: 'DELETE /api/mosa/ai-assistant/history/:sessionId',
      socketIO: `ws://localhost:${PORT}/api/mosa/ai-assistant`,
      health: 'GET /health',
    },
  });
});

// =============================================
// AI Assistant REST Routes
// =============================================
app.use('/api/mosa/ai-assistant', aiAssistantRoutes);

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
// Socket.IO Setup
// =============================================
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  path: '/api/mosa/ai-assistant',
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  transports: ['websocket', 'polling'],
});

// Register Socket.IO event handlers
registerSocketHandlers(io);

// =============================================
// Start Server
// =============================================
server.listen(PORT, () => {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║     AI ASSISTANT SOCKET SERVER               ║');
  console.log('╠══════════════════════════════════════════════╣');
  console.log(`║  Port      : ${PORT}                           `);
  console.log(`║  Provider  : ${process.env.AI_MODEL_PROVIDER || 'openai'}                        `);
  console.log(`║  Socket.IO : /api/mosa/ai-assistant           `);
  console.log('╚══════════════════════════════════════════════╝');
  console.log(`AI Assistant Socket Server running at http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Socket.IO: ws://localhost:${PORT}/api/mosa/ai-assistant`);
});

// =============================================
// Graceful Shutdown
// =============================================
const shutdown = async (signal) => {
  console.log(`[AI Assistant] ${signal} received, shutting down...`);
  await closeRedis();
  io.close();
  server.close(() => {
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('uncaughtException', (err) => {
  console.error(`[AI Assistant] Uncaught Exception: ${err.message}`);
});

process.on('unhandledRejection', (reason) => {
  console.error(`[AI Assistant] Unhandled Rejection: ${reason}`);
});

module.exports = app;
