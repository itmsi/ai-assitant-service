const express = require('express');
const router = express.Router();
const handler = require('./handler');
const { validateDuplicateValidation } = require('./validation');
// Uncomment jika sudah ada authentication
// const { verifyToken } = require('../../middlewares');
const { validateMiddleware } = require('../../middlewares/validation');

/**
 * @route   POST /api/customer-validation/validate-duplicate
 * @desc    Validate duplicate customer names
 * @access  Public (change to verifyToken for protected)
 */
router.post(
  '/validate-duplicate',
  validateDuplicateValidation,
  validateMiddleware,
  handler.validateDuplicate
);

module.exports = router;

