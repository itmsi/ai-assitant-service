const { body } = require('express-validator');

const MAX_QUESTION_LENGTH = 5000;
const MAX_ANSWER_LENGTH = 10000;

const requiredText = (field, label, maxLength) =>
  body(field)
    .exists({ values: 'null' })
    .withMessage(`${label} wajib diisi`)
    .bail()
    .isString()
    .withMessage(`${label} harus berupa teks`)
    .bail()
    .isLength({ max: maxLength })
    .withMessage(`${label} maksimal ${maxLength} karakter`);

/**
 * Validation rules untuk penilaian jawaban oleh AI
 */
const gradeValidation = [
  requiredText('question', 'question', MAX_QUESTION_LENGTH)
    .trim()
    .notEmpty()
    .withMessage('question tidak boleh kosong'),
  // Jawaban karyawan boleh kosong (dinilai 0 tanpa memanggil AI)
  requiredText('employee_answer', 'employee_answer', MAX_ANSWER_LENGTH),
  requiredText('admin_answer', 'admin_answer', MAX_ANSWER_LENGTH)
    .trim()
    .notEmpty()
    .withMessage('admin_answer tidak boleh kosong'),
  body('max_points')
    .exists({ values: 'null' })
    .withMessage('max_points wajib diisi')
    .bail()
    .isFloat({ gt: 0, max: 1000 })
    .withMessage('max_points harus berupa angka lebih dari 0 dan maksimal 1000')
    .toFloat(),
];

module.exports = {
  gradeValidation,
};
