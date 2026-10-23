const axios = require("axios");
const aiConfig = require("../../config/ai");
const { Logger } = require("../../utils/logger");

const logger = Logger;

const UPDATE_PATH = "/api/career/applicant_form_contents/update-stt";
const UPDATE_TIMEOUT = 15000;
const UPDATE_RETRIES = 3;

const getUpdateUrl = () => {
  const base = (aiConfig.MICROSERVICE_CAREER_URL || "").replace(/\/$/, "");
  return base ? `${base}${UPDATE_PATH}` : "";
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
      transcription_id: job.id,
      status_speech_text: "Failed",
      message_speech_text: `Transcribe gagal: ${outcome.error}`,
    };
  }
  return {
    file_link_audio: job.audio_url,
    // ID di ai_transcriptions, dipakai nanti untuk POST /ai-assistant/summarize
    transcription_id: job.id,
    // Jika output_language diminta dan berbeda dari bahasa audio, yang dikirim adalah hasil terjemahannya
    speech_text: outcome.translation || outcome.transcript,
    // Hanya dikirim jika summarize=true; tanpa itu tidak ada ringkasan lama di penerima yang tertimpa
    ...(outcome.summary ? { summary: outcome.summary } : {}),
    status_speech_text: "Success",
    message_speech_text: "Transcribe berhasil",
  };
};

/**
 * Body untuk ringkasan hasil perintah HRD (POST /ai-assistant/summarize). Hanya berisi summary_update;
 * file_link_audio wajib karena penerima mencocokkan baris berdasarkan link audio.
 * Saat gagal summary_update tidak dikirim, supaya ringkasan lama di penerima tidak tertimpa.
 */
const buildSummaryPayload = (record, outcome) => {
  if (outcome.error) {
    return {
      file_link_audio: record.audio_url,
      transcription_id: record.id,
      status_summary: "Failed",
      message_summary: `Summary gagal: ${outcome.error}`,
    };
  }
  return {
    file_link_audio: record.audio_url,
    transcription_id: record.id,
    summary_update: outcome.summary,
    status_summary: "Success",
    message_summary: "Summary berhasil",
  };
};

/**
 * Kirim hasil job ke api-career (POST /applicant_form_contents/update-stt). Tidak pernah melempar error:
 * kegagalan update ke api-career tidak boleh mengubah status job yang sudah selesai.
 * Penerima membalas HTTP 201 + {status:false} saat token salah, jadi keberhasilan dicek dari body.success.
 */
const postToCareer = async (
  payload,
  token,
  { label, attempts = UPDATE_RETRIES, timeout = UPDATE_TIMEOUT } = {},
) => {
  if (!isUpdateEnabled()) return false;
  if (!token) {
    logger.warn(
      `[STT Update] ${label} dilewati: request tidak membawa token SSO`,
    );
    return false;
  }

  const url = getUpdateUrl();
  const headers = { "Content-Type": "application/json" };
  // Token SSO milik request asal (sama dengan yang dipakai project), diteruskan apa adanya
  headers.Authorization = `Bearer ${token}`;

  let lastError = "";
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await axios.post(url, payload, {
        headers,
        timeout,
        validateStatus: () => true,
      });
      if (
        response.status >= 200 &&
        response.status < 300 &&
        response.data?.success === true
      ) {
        logger.info(`[STT Update] ${label} terkirim, percobaan ${attempt}`);
        return true;
      }
      lastError = `HTTP ${response.status} ${String(response.data?.message || "").slice(0, 200)}`;
      // 4xx = permintaan/otorisasi salah, mengulang tidak akan membantu
      if (response.status >= 400 && response.status < 500) break;
      if (response.status === 201) break;
    } catch (error) {
      lastError = error.message;
    }
    if (attempt < attempts) await wait(1000 * 2 ** (attempt - 1));
  }

  logger.error(`[STT Update] ${label} GAGAL terkirim ke ${url}: ${lastError}`);
  return false;
};

// Hasil job speech-to-text (dipanggil worker setelah selesai atau gagal)
const updateSttResult = (job, outcome, token) =>
  postToCareer(buildPayload(job, outcome), token, { label: `Job ${job.id}` });

// Ringkasan HRD (dipanggil request interaktif, jadi percobaan dan timeout dibuat singkat)
const updateSummaryResult = (record, outcome, token) =>
  postToCareer(buildSummaryPayload(record, outcome), token, {
    label: `Summary ${record.id}`,
    attempts: 2,
    timeout: 10000,
  });

module.exports = {
  isUpdateEnabled,
  getUpdateUrl,
  buildPayload,
  buildSummaryPayload,
  updateSttResult,
  updateSummaryResult,
};
