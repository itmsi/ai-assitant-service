const express = require('express')
// const { verifyToken } = require('../../middlewares')

const routing = express.Router();
const API_TAG = '/api/mosa';

/* RULE
naming convention endpoint: using plural
Example:
- GET /api/examples
- POST /api/examples
- GET /api/examples/:id
- PUT /api/examples/:id
- DELETE /api/examples/:id
*/

// Example Module (Template untuk module Anda)
const exampleModule = require('../../modules/example')
routing.use(`${API_TAG}/examples`, exampleModule)

// AI Assistant Module
const aiAssistantModule = require('../../modules/ai_assistant')
routing.use(`${API_TAG}/ai-assistant`, aiAssistantModule)

// Customer Validation Module
const customerValidationModule = require('../../modules/customer_validation')
routing.use(`${API_TAG}/customer-validation`, customerValidationModule)

// AI Admin (UI monitoring + konfigurasi provider/model/prompt)
const aiAdminModule = require('../../modules/ai_admin')
routing.use(`${API_TAG}/ai-admin`, aiAdminModule)

// Tambahkan routes module Anda di sini
// Example:
// const yourModule = require('../../modules/yourModule')
// routing.use(`${API_TAG}/your-endpoint`, yourModule)

module.exports = routing;
