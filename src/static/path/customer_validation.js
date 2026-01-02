/**
 * Swagger API Path Definitions for Customer Validation Module
 */

const customerValidationPaths = {
  '/customer-validation/validate-duplicate': {
    post: {
      tags: ['Customer Validation'],
      summary: 'Validate duplicate customer names',
      description: 'Validasi duplikat nama customer dengan membandingkan dengan data yang sudah ada di database menggunakan AI',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/CustomerValidationInput' }
          }
        }
      },
      responses: {
        200: {
          description: 'Validation successful',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: { $ref: '#/components/schemas/CustomerValidationResponse' },
                  message: { type: 'string', example: 'Tidak ada duplikat ditemukan' }
                }
              }
            }
          }
        },
        400: {
          description: 'Validation error',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' }
            }
          }
        },
        500: {
          description: 'Server error',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' }
            }
          }
        }
      }
    }
  }
};

module.exports = customerValidationPaths;

