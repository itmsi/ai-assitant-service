const { successResponse, errorResponse } = require('../../utils/response');
const { gradeAnswer } = require('./service');

// Error konfigurasi AI (belum aktif / API key kosong) dibedakan dari kegagalan AI saat dipanggil
const isAiConfigError = (error) =>
  Boolean(error.message) &&
  (error.message.includes('API key') ||
    error.message.includes('base URL') ||
    error.message.includes('not enabled') ||
    error.message.includes('Unsupported AI model provider'));

/**
 * Nilai jawaban karyawan dengan AI
 */
const grade = async (req, res) => {
  try {
    const { question, employee_answer, admin_answer, max_points } = req.body;

    const result = await gradeAnswer({
      question,
      employeeAnswer: employee_answer,
      adminAnswer: admin_answer,
      maxPoints: max_points,
    });

    return successResponse(res, result, 'Penilaian berhasil', 200);
  } catch (error) {
    console.error('[ANSWER_GRADING HANDLER] Error:', error.message);

    if (isAiConfigError(error)) {
      return errorResponse(res, error.message, 503, { code: 'AI_SERVICE_NOT_CONFIGURED' });
    }

    if (error.code === 'AI_SERVICE_ERROR') {
      return errorResponse(res, error.message, 502, { code: 'AI_SERVICE_ERROR' });
    }

    return errorResponse(res, error.message || 'Internal server error', 500);
  }
};

module.exports = {
  grade,
};
