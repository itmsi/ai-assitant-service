const express = require('express');
const router = express.Router();
const handler = require('./handler');
const { gradeValidation } = require('./validation');
const { validateMiddleware } = require('../../middlewares/validation');
const { requireSSOToken, extractToken } = require('../ai_assistant/middleware/sso');

// requireSSOToken punya fallback auto-login (token akun service) jika request tanpa token.
// Endpoint ini memanggil AI (berbiaya), jadi token milik pemanggil wajib ada.
const requireClientToken = (req, res, next) => {
  if (!extractToken(req)) {
    return res.status(401).json({
      success: false,
      message: 'SSO token diperlukan',
    });
  }
  return next();
};

/**
 * @route   POST /api/mosa/answer-grading/grade
 * @desc    Nilai jawaban karyawan dengan AI berdasarkan pertanyaan, kunci jawaban admin, dan poin maksimal
 * @access  Protected (wajib token SSO)
 * @body    { question: string, employee_answer: string, admin_answer: string, max_points: number }
 */
router.post(
  '/grade',
  requireClientToken,
  requireSSOToken,
  gradeValidation,
  validateMiddleware,
  handler.grade
);

module.exports = router;
