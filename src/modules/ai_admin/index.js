const path = require('path');
const express = require('express');
const rateLimit = require('express-rate-limit');
const handler = require('./handler');
const { requireAdmin } = require('./auth');

const router = express.Router();

/**
 * UI admin AI (static, tanpa build)
 * Buka: /api/mosa/ai-admin/ui/
 */
router.use('/ui', express.static(path.join(__dirname, 'ui'), { index: 'index.html' }));

// Batasi percobaan login untuk mencegah brute force
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Terlalu banyak percobaan login, coba lagi dalam 15 menit' },
});

/**
 * @route   POST /api/mosa/ai-admin/login
 * @body    { username: string, password: string }
 */
router.post('/login', loginLimiter, handler.login);

// Semua endpoint di bawah ini wajib token admin
router.use(requireAdmin);

router.get('/me', handler.me);

// Monitoring
router.get('/overview', handler.overview); // ?range=1h|24h|7d|30d
router.get('/logs', handler.listLogs); // ?page&limit&purpose&success&model

// Provider AI
router.get('/providers', handler.listProviders);
router.post('/providers', handler.createProvider);
router.put('/providers/:id', handler.updateProvider);
router.delete('/providers/:id', handler.deleteProvider);
router.get('/providers/:id/remote-models', handler.listRemoteModels);

// Model AI
router.get('/models', handler.listModels);
router.post('/models', handler.createModels); // objek atau array
router.put('/models/:id', handler.updateModel);
router.delete('/models/:id', handler.deleteModel);
router.post('/models/:id/test', handler.testModel);

// Prompt
router.get('/prompts', handler.listPrompts);
router.post('/prompts', handler.createPrompt);
router.put('/prompts/:key', handler.updatePrompt);
router.delete('/prompts/:key', handler.deletePrompt);
router.get('/prompts/:key/history', handler.listPromptHistory);
router.post('/prompts/:key/restore/:historyId', handler.restorePrompt);

// Pengaturan runtime
router.get('/settings', handler.getSettings);
router.put('/settings', handler.updateSettings);

module.exports = router;
