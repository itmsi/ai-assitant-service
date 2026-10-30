const amqp = require('amqplib')
const aiConfig = require('../config/ai')
const { connectRabbitMQ } = require('../config/rabbitmq')
const voiceService = require('../modules/ai_assistant/voice_service')
const transcriptionRepo = require('../modules/ai_assistant/ai_transcriptions_repository')
const careerSttUpdate = require('../modules/ai_assistant/career_stt_update')
const { Logger } = require('../utils/logger')

const logger = Logger

const isQueueEnabled = () => process.env.RABBITMQ_ENABLED === 'true'
  && Boolean(process.env.RABBITMQ_URL)
  && process.env.RABBITMQ_URL !== 'disabled'

/**
 * Masukkan job ke antrian. Pesan berisi id (parameter dibaca worker dari DB) dan token SSO request untuk dipakai saat mengirim hasil; token tidak disimpan di DB.
 * Melempar error jika gagal (berbeda dengan publishToRabbitMqQueueSingle yang menelan error).
 */
const publishSttJob = async (id, token = null) => {
  const connection = await amqp.connect(`${process.env.RABBITMQ_URL}?heartbeat=60`)
  try {
    const channel = await connection.createChannel()
    await channel.assertQueue(aiConfig.STT_QUEUE_NAME, { durable: true })
    channel.sendToQueue(
      aiConfig.STT_QUEUE_NAME,
      Buffer.from(JSON.stringify({ id, token })),
      { persistent: true },
    )
    await channel.close()
  } finally {
    await connection.close()
  }
}

const processJob = async (id, token = null) => {
  const job = await transcriptionRepo.claimForProcessing(id)
  if (!job) {
    logger.info(`[STT Worker] Job ${id} sudah selesai/tidak ada, dilewati`)
    return
  }

  const startedAt = Date.now()
  try {
    const params = job.params || {}
    const result = await voiceService.runPipeline({
      audioUrl: job.audio_url,
      language: params.language,
      outputLanguage: params.output_language,
      analyze: params.analyze === true,
      instruction: params.instruction,
      summarize: params.summarize === true,
    })

    await transcriptionRepo.markDone(id, {
      sizeBytes: result.sizeBytes,
      language: result.transcription.language,
      outputLanguage: result.targetLanguage,
      translated: result.needsTranslation,
      transcript: result.transcription.text,
      translation: result.translation,
      segments: result.transcription.segments,
      summary: result.summary,
      analysis: result.analysis,
      duration: result.transcription.duration,
      sttModel: aiConfig.STT_MODEL,
      processingMs: Date.now() - startedAt,
    })
    logger.info(`[STT Worker] Job ${id} selesai (${Date.now() - startedAt}ms)`)
    await careerSttUpdate.updateSttResult(job, {
      transcript: result.transcription.text,
      translation: result.translation,
      summary: result.summary,
    }, token)
  } catch (error) {
    logger.error(`[STT Worker] Job ${id} gagal: ${error.message || error}`)
    await transcriptionRepo.markFailed(id, error.message || error)
    await careerSttUpdate.updateSttResult(job, { error: error.message || String(error) }, token)
  }
}

const initSttServices = async () => {
  const { channel, connection } = await connectRabbitMQ()

  const shutdown = async () => {
    try {
      await channel.close()
      await connection.close()
    } catch (error) {
      logger.warn(`[STT Worker] Gagal menutup koneksi: ${error.message}`)
    }
  }
  process.once('SIGTERM', shutdown)
  process.once('SIGINT', shutdown)

  await channel.assertQueue(aiConfig.STT_QUEUE_NAME, { durable: true })
  // Jumlah job yang diproses bersamaan; sisanya menunggu di antrian
  await channel.prefetch(aiConfig.STT_QUEUE_CONCURRENCY)

  await channel.consume(
    aiConfig.STT_QUEUE_NAME,
    async (msg) => {
      if (msg === null) return
      let id = null
      let token = null
      try {
        const body = JSON.parse(msg.content.toString())
        id = body.id
        token = body.token || null
      } catch (error) {
        logger.error(`[STT Worker] Pesan tidak valid dibuang: ${error.message}`)
        channel.ack(msg)
        return
      }

      try {
        await processJob(id, token)
      } catch (error) {
        // Error tak terduga (mis. DB mati): kembalikan ke antrian agar dicoba lagi
        logger.error(`[STT Worker] Error tak terduga job ${id}: ${error.message || error}`)
        channel.nack(msg, false, true)
        return
      }
      channel.ack(msg)
    },
    { noAck: false },
  )

  logger.info(`[STT Worker] Mendengarkan queue "${aiConfig.STT_QUEUE_NAME}" (concurrency ${aiConfig.STT_QUEUE_CONCURRENCY})`)
}

module.exports = {
  isQueueEnabled,
  publishSttJob,
  initSttServices,
  processJob,
}
