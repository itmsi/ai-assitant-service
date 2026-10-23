const amqp = require('amqplib')
const aiConfig = require('../config/ai')
const { connectRabbitMQ } = require('../config/rabbitmq')
const voiceService = require('../modules/ai_assistant/voice_service')
const transcriptionRepo = require('../modules/ai_assistant/ai_transcriptions_repository')
const careerSttUpdate = require('../modules/ai_assistant/career_stt_update')
const { Logger } = require('../utils/logger')

const logger = Logger

/**
 * Masukkan job summary-all ke antrian. Pesan berisi parameter lengkap dan token SSO request
 * (dipakai saat mengirim hasil ke api-career); tidak ada yang disimpan di DB.
 * Melempar error jika gagal agar handler bisa membalas 503.
 */
const publishSummaryAllJob = async (job) => {
  const connection = await amqp.connect(`${process.env.RABBITMQ_URL}?heartbeat=60`)
  try {
    const channel = await connection.createChannel()
    await channel.assertQueue(aiConfig.SUMMARY_ALL_QUEUE_NAME, { durable: true })
    channel.sendToQueue(
      aiConfig.SUMMARY_ALL_QUEUE_NAME,
      Buffer.from(JSON.stringify(job)),
      { persistent: true },
    )
    await channel.close()
  } finally {
    await connection.close()
  }
}

/**
 * Transkrip dibaca ulang dari DB saat diproses, lalu diringkas dan dikirim ke api-career.
 * Kegagalan (LLM, data berubah) hanya dicatat di log; job tidak diulang agar tidak berputar terus.
 */
const processJob = async (job) => {
  const startedAt = Date.now()
  const ids = job.transcription_ids || []

  const records = await transcriptionRepo.getByIds(ids)
  const byId = new Map(records.map((record) => [String(record.id).toLowerCase(), record]))
  const texts = ids.map((id) => {
    const record = byId.get(id)
    return record && record.status === 'success' ? (record.translation || record.transcript) : null
  })
  if (texts.some((text) => !text)) {
    logger.error(`[Summary All Worker] Job ${job.job_id} dibatalkan: sebagian transkrip tidak lagi tersedia`)
    return
  }

  let summary
  try {
    summary = await voiceService.summarizeAll(texts, {
      outputLanguage: job.output_language || 'id',
      instructions: job.instructions || [],
    })
  } catch (error) {
    logger.error(`[Summary All Worker] Job ${job.job_id} gagal membuat ringkasan: ${error.message || error}`)
    return
  }

  const synced = await careerSttUpdate.updateSummaryAll(ids[0], summary, job.token)
  logger.info(`[Summary All Worker] Job ${job.job_id} selesai (${Date.now() - startedAt}ms), synced_to_career=${synced}`)
}

const initSummaryAllServices = async () => {
  const { channel, connection } = await connectRabbitMQ()

  const shutdown = async () => {
    try {
      await channel.close()
      await connection.close()
    } catch (error) {
      logger.warn(`[Summary All Worker] Gagal menutup koneksi: ${error.message}`)
    }
  }
  process.once('SIGTERM', shutdown)
  process.once('SIGINT', shutdown)

  await channel.assertQueue(aiConfig.SUMMARY_ALL_QUEUE_NAME, { durable: true })
  await channel.prefetch(aiConfig.SUMMARY_ALL_QUEUE_CONCURRENCY)

  await channel.consume(
    aiConfig.SUMMARY_ALL_QUEUE_NAME,
    async (msg) => {
      if (msg === null) return
      let job
      try {
        job = JSON.parse(msg.content.toString())
      } catch (error) {
        logger.error(`[Summary All Worker] Pesan tidak valid dibuang: ${error.message}`)
        channel.ack(msg)
        return
      }

      try {
        await processJob(job)
      } catch (error) {
        // Error tak terduga (mis. DB mati): kembalikan ke antrian agar dicoba lagi
        logger.error(`[Summary All Worker] Error tak terduga job ${job.job_id}: ${error.message || error}`)
        channel.nack(msg, false, true)
        return
      }
      channel.ack(msg)
    },
    { noAck: false },
  )

  logger.info(`[Summary All Worker] Mendengarkan queue "${aiConfig.SUMMARY_ALL_QUEUE_NAME}" (concurrency ${aiConfig.SUMMARY_ALL_QUEUE_CONCURRENCY})`)
}

module.exports = {
  publishSummaryAllJob,
  initSummaryAllServices,
  processJob,
}
