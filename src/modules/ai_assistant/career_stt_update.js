const axios = require('axios');
const aiConfig = require('../../config/ai');
const { Logger } = require('../../utils/logger');

const logger = Logger;

const UPDATE_PATH = '/api/career/applicant_form_contents/update-stt';
const UPDATE_TIMEOUT = 15000;
const UPDATE_RETRIES = 3;

const getUpdateUrl = () => {
  const base = (aiConfig.MICROSERVICE_CAREER_URL || '').replace(/\/$/, '');
  return base ? `${base}${UPDATE_PATH}` : '';
};

const isUpdateEnabled = () => Boolean(getUpdateUrl());

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Susun body untuk POST /applicant_form_contents/update-stt (api-career).
 * Status memakai kapitalisasi yang divalidasi penerima: Success | Failed.
 * speech_text tidak dikirim saat gagal, supaya isi lama di penerima tidak tertimpa.
 */
const buildPayload = (job, outcome) => {
  if (outcome.error) {
    return {
      file_link_audio: job.audio_url,
      status_speech_text: 'Failed',
      message_speech_text: `Transcribe gagal: ${outcome.error}`,
    };
  }
  return {
    file_link_audio: job.audio_url,
    // Jika output_language diminta dan berbeda dari bahasa audio, yang dikirim adalah hasil terjemahannya
    speech_text: outcome.translation || outcome.transcript,
    status_speech_text: 'Success',
    message_speech_text: 'Transcribe berhasil',
  };
};

/**
 * Kirim hasil job ke api-career (POST /applicant_form_contents/update-stt). Tidak pernah melempar error:
 * kegagalan update ke api-career tidak boleh mengubah status job yang sudah selesai.
 * Penerima membalas HTTP 201 + {status:false} saat token salah, jadi keberhasilan dicek dari body.success.
 */
const updateSttResult = async (job, outcome, token) => {
  if (!isUpdateEnabled()) return false;
  if (!token) {
    logger.warn(`[STT Update] Job ${job.id} dilewati: request async tidak membawa token SSO`);
    return false;
  }

  const url = getUpdateUrl();
  const payload = buildPayload(job, outcome);
  const headers = { 'Content-Type': 'application/json' };
  // Token SSO milik request asal (sama dengan yang dipakai project), diteruskan apa adanya
  headers.Authorization = `Bearer ${token}`;

  const attempts = UPDATE_RETRIES;
  let lastError = '';
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await axios.post(url, payload, {
        headers,
        timeout: UPDATE_TIMEOUT,
        validateStatus: () => true,
      });
      if (response.status >= 200 && response.status < 300 && response.data?.success === true) {
        logger.info(`[STT Update] Job ${job.id} terkirim (${payload.status_speech_text}), percobaan ${attempt}`);
        return true;
      }
      lastError = `HTTP ${response.status} ${String(response.data?.message || '').slice(0, 200)}`;
      // 4xx = permintaan/otorisasi salah, mengulang tidak akan membantu
      if (response.status >= 400 && response.status < 500) break;
      if (response.status === 201) break;
    } catch (error) {
      lastError = error.message;
    }
    if (attempt < attempts) await wait(1000 * 2 ** (attempt - 1));
  }

  logger.error(`[STT Update] Job ${job.id} GAGAL terkirim ke ${url}: ${lastError}`);
  return false;
};

module.exports = {
  isUpdateEnabled,
  getUpdateUrl,
  buildPayload,
  updateSttResult,
};
