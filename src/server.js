// make sure for crashing handler continues to run
const http = require('http');
const app = require('./app')
const { Server: SocketIOServer } = require('socket.io');
const { registerSocketHandlers } = require('./modules/ai_assistant/socket-handler');
const { initRedis, closeRedis } = require('./utils/redis')

process.on('warning', (warning) => {
  console.warn(warning.name)
  console.warn(warning.message)
  console.warn(warning.stack)
})

const unhandledRejections = new Map()
process.on('unhandledRejection', (reason, promise) => {
  unhandledRejections.set(promise, reason)
  console.log(
    process.stderr.fd,
    `Caught rejection: ${promise}\n`
    + `Exception reason: ${reason}`
  )
})
process.on('rejectionHandled', (promise) => {
  unhandledRejections.delete(promise)
})

process.on('uncaughtException', (err, origin) => {
  console.log(
    process.stderr.fd,
    `Caught exception: ${err}\n`
    + `Exception origin: ${origin}`
  )
})

process.on('SIGTERM', async () => {
  console.info('SIGTERM received')
  await closeRedis()
})

process.on('SIGINT', async () => {
  console.info('SIGINT received')
  await closeRedis()
  io.close()
  process.exit(0)
})

// Initialize Redis if enabled
if (process.env.REDIS_ENABLED === 'true') {
  initRedis()
}

// =============================================
// Socket.IO — mounted on /api/mosa/ai-assistant/websocket
// =============================================
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  path: '/api/mosa/ai-assistant/websocket',
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  transports: ['websocket', 'polling'],
  pingInterval: 30000,      // Kirim ping tiap 30 detik
  pingTimeout: 60000,       // Tunggu response ping sampai 60 detik (naik dari default 20s)
  maxHttpBufferSize: 5e6,   // 5MB buffer size untuk response besar (naik dari default 1MB)
});

registerSocketHandlers(io);

server.listen(process.env.APP_PORT, () => {
  if (process.env.NODE_ENV === 'development') {
    console.info(`${process?.env.APP_NAME} running in port ${process.env.APP_PORT}`)
    console.info(`Socket.IO: ws://localhost:${process.env.APP_PORT}/api/mosa/ai-assistant/websocket`)
  } else {
    console.info(`${process?.env.APP_NAME} is running`)
  }
})
