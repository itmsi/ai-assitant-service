// make sure for crashing handler continues to run
const app = require('./app')
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
  process.exit(0)
})

// Initialize Redis if enabled
if (process.env.REDIS_ENABLED === 'true') {
  initRedis()
}

app.listen(process.env.APP_PORT, () => {
  if (process.env.NODE_ENV === 'development') {
    console.info(`${process?.env.APP_NAME} running in port ${process.env.APP_PORT}`)
  } else {
    console.info(`${process?.env.APP_NAME} is running`)
  }
})
