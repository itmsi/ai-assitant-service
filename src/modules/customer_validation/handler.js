const { successResponse, errorResponse } = require('../../utils/response');
const { validateDuplicateCustomers } = require('./service');

/**
 * Validate duplicate customer names
 */
const validateDuplicate = async (req, res) => {
  try {
    const { customer_name } = req.body;

    // Validate input
    if (!customer_name || !Array.isArray(customer_name) || customer_name.length === 0) {
      return errorResponse(res, 'customer_name wajib diisi dan harus berupa array yang tidak kosong', 400);
    }

    // Call service to validate duplicates
    const result = await validateDuplicateCustomers(customer_name);

    return successResponse(res, {
      hasDuplicates: result.hasDuplicates,
      duplicates: result.duplicates,
      message: result.message,
      requestCount: customer_name.length
    }, result.message, 200);
  } catch (error) {
    // Log error untuk debugging
    console.error('[CUSTOMER_VALIDATION HANDLER] Error:', error);
    console.error('[CUSTOMER_VALIDATION HANDLER] Error name:', error.name);
    console.error('[CUSTOMER_VALIDATION HANDLER] Error message:', error.message);
    console.error('[CUSTOMER_VALIDATION HANDLER] Error stack:', error.stack);

    // Handle specific error types dengan status code yang sesuai
    if (error.name === 'DatabaseConnectionError') {
      return errorResponse(
        res, 
        error.message || 'Database connection error',
        503,
        {
          code: error.code || 'DB_CONNECTION_ERROR',
          details: error.details
        }
      );
    }

    // Handle AI configuration errors
    if (error.message && (
      error.message.includes('AI service') || 
      error.message.includes('menginisialisasi AI') ||
      error.message.includes('memanggil AI service') ||
      error.message.includes('API key')
    )) {
      return errorResponse(
        res,
        error.message || 'AI service error',
        503,
        { code: 'AI_SERVICE_ERROR' }
      );
    }

    // Generic error handling
    const errorMessage = error.message || error.toString() || 'Internal server error';
    return errorResponse(res, errorMessage, 500, { 
      name: error.name,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

module.exports = {
  validateDuplicate
};

