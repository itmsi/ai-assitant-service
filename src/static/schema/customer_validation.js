/**
 * Swagger Schema Definitions for Customer Validation Module
 */

const customerValidationSchemas = {
  CustomerValidationInput: {
    type: 'object',
    required: ['customer_name'],
    properties: {
      customer_name: {
        type: 'array',
        description: 'Array of customer names to validate',
        items: {
          type: 'string',
          minLength: 1,
          maxLength: 255,
          example: 'PT Motor Sights International'
        },
        example: ['PT Motor Sights International', 'PT MSI', 'Motor Sights']
      }
    }
  },
  CustomerValidationResponse: {
    type: 'object',
    properties: {
      hasDuplicates: {
        type: 'boolean',
        description: 'Whether duplicates were found',
        example: true
      },
      duplicates: {
        type: 'array',
        description: 'List of duplicate customer names',
        items: {
          type: 'object',
          properties: {
            requestName: {
              type: 'string',
              description: 'Customer name from request',
              example: 'PT Motor Sights International'
            },
            matchedName: {
              type: 'string',
              description: 'Matching customer name from database',
              example: 'PT Motor Sights Intl'
            },
            matchType: {
              type: 'string',
              enum: ['identical', 'similar', 'duplicate'],
              description: 'Type of match: identical (exact match), similar (typo/variation), duplicate (close match)',
              example: 'similar'
            },
            similarity: {
              type: 'string',
              description: 'Similarity percentage',
              example: '85%'
            }
          }
        },
        example: [
          {
            requestName: 'PT Motor Sights International',
            matchedName: 'PT Motor Sights Intl',
            matchType: 'similar',
            similarity: '85%'
          }
        ]
      },
      message: {
        type: 'string',
        description: 'Validation result message',
        example: 'Ditemukan 1 nama customer yang duplikat'
      },
      requestCount: {
        type: 'integer',
        description: 'Number of customer names in request',
        example: 3
      }
    }
  }
};

module.exports = customerValidationSchemas;

