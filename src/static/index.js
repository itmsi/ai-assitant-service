const info = {
  description: 'Express.js API Boilerplate - Template untuk pengembangan REST API dengan fitur lengkap',
  version: '1.0.0',
  title: 'Express.js API Boilerplate Documentation',
  contact: {
    email: 'your-email@example.com'
  },
  license: {
    name: 'MIT',
    url: 'https://opensource.org/licenses/MIT'
  }
}

const servers = [
  {
    url: '/api/mosa/',
    description: 'Development server'
  },
  {
    url: 'https://gateway.motorsights.com/api/mosa/',
    description: 'Gateway server'
  }
]

// Import schemas
// Tambahkan schema module Anda di sini
// const exampleSchema = require('./schema/example');
const aiAssistantSchema = require('./schema/ai_assistant');
const customerValidationSchema = require('./schema/customer_validation');

// Import paths
// Tambahkan path module Anda di sini
// const examplePaths = require('./path/example');
const aiAssistantPaths = require('./path/ai_assistant');
const customerValidationPaths = require('./path/customer_validation');

// Combine all schemas
const schemas = {
  // ...exampleSchema,
  ...aiAssistantSchema,
  ...customerValidationSchema,
  // ...yourModuleSchema,
};

// Combine all paths
const paths = {
  // ...examplePaths,
  ...aiAssistantPaths,
  ...customerValidationPaths,
  // ...yourModulePaths,
};

const index = {
  openapi: '3.0.0',
  info,
  servers,
  paths,
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    },
    schemas
  }
}

module.exports = {
  index
}
