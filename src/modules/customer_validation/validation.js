const { body } = require('express-validator');

/**
 * Validation rules for customer duplicate validation
 */
const validateDuplicateValidation = [
  body('customer_name')
    .notEmpty()
    .withMessage('customer_name wajib diisi')
    .isArray()
    .withMessage('customer_name harus berupa array')
    .custom((value) => {
      if (value.length === 0) {
        throw new Error('customer_name array tidak boleh kosong');
      }
      return true;
    })
    .custom((value) => {
      // Validate each item in array
      value.forEach((name, index) => {
        if (typeof name !== 'string') {
          throw new Error(`customer_name[${index}] harus berupa string`);
        }
        if (name.trim().length === 0) {
          throw new Error(`customer_name[${index}] tidak boleh kosong`);
        }
        if (name.trim().length > 255) {
          throw new Error(`customer_name[${index}] maksimal 255 karakter`);
        }
      });
      return true;
    }),
];

module.exports = {
  validateDuplicateValidation
};

