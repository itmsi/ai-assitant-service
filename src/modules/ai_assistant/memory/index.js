/**
 * Memory Routes — Admin endpoints untuk manage memory pengguna
 *
 * GET    /memory               — List memories (all users or by user_id)
 * GET    /memory/:userId       — Get memories for a specific user
 * DELETE /memory/:id           — Delete a memory by ID
 * POST   /memory/cleanup       — Cleanup expired memories
 * POST   /memory               — Create/update memory manually
 */

const express = require('express');
const router = express.Router();
const { baseResponseGeneral } = require('../../../utils/exception');
const { Logger } = require('../../../utils/logger');
const logger = Logger;

let memoryService = null;
try {
  memoryService = require('./memoryService');
} catch (err) {
  logger.warn(`Memory service not available: ${err.message}`);
}

/**
 * GET /memory — List memories
 * Query: ?userId=xxx&page=1&limit=50
 */
router.get('/', async (req, res) => {
  try {
    if (!memoryService) {
      return baseResponseGeneral(res, { success: false, message: 'Memory service not available' });
    }

    const { userId, page, limit } = req.query;
    const result = await memoryService.listMemories({
      userId: userId || null,
      page: parseInt(page || '1', 10),
      limit: parseInt(limit || '50', 10),
    });

    return baseResponseGeneral(res, {
      success: true,
      message: 'Memories retrieved',
      data: result,
    });
  } catch (error) {
    logger.error(`Error listing memories: ${error.message || error}`);
    return baseResponseGeneral(res.status(500), {
      success: false,
      message: error.message || 'Failed to list memories',
    });
  }
});

/**
 * POST /memory — Create or update memory manually
 * Body: { userId, type, key, value, confidence, source, metadata }
 */
router.post('/', async (req, res) => {
  try {
    if (!memoryService) {
      return baseResponseGeneral(res, { success: false, message: 'Memory service not available' });
    }

    const { userId, type, key, value, confidence, source, metadata } = req.body;

    if (!userId || !key || !value) {
      return baseResponseGeneral(res, {
        success: false,
        message: 'userId, key, dan value wajib diisi',
      });
    }

    const saved = await memoryService.updateMemory({
      userId,
      type: type || 'fact',
      key,
      value,
      confidence: parseFloat(confidence || '0.95'),
      source: source || 'admin',
      metadata: metadata || {},
    });

    return baseResponseGeneral(res, {
      success: true,
      message: 'Memory saved',
      data: saved,
    });
  } catch (error) {
    logger.error(`Error creating memory: ${error.message || error}`);
    return baseResponseGeneral(res.status(500), {
      success: false,
      message: error.message || 'Failed to save memory',
    });
  }
});

/**
 * DELETE /memory/:id — Delete a memory by ID
 */
router.delete('/:id', async (req, res) => {
  try {
    if (!memoryService) {
      return baseResponseGeneral(res, { success: false, message: 'Memory service not available' });
    }

    const { id } = req.params;
    const deleted = await memoryService.deleteMemory(id);

    return baseResponseGeneral(res, {
      success: deleted,
      message: deleted ? 'Memory deleted' : 'Memory not found',
    });
  } catch (error) {
    logger.error(`Error deleting memory: ${error.message || error}`);
    return baseResponseGeneral(res.status(500), {
      success: false,
      message: error.message || 'Failed to delete memory',
    });
  }
});

/**
 * POST /memory/cleanup — Cleanup expired memories
 */
router.post('/cleanup', async (req, res) => {
  try {
    if (!memoryService) {
      return baseResponseGeneral(res, { success: false, message: 'Memory service not available' });
    }

    const count = await memoryService.cleanupExpired();

    return baseResponseGeneral(res, {
      success: true,
      message: `${count} expired memories cleaned up`,
      data: { deletedCount: count },
    });
  } catch (error) {
    logger.error(`Error cleaning up memories: ${error.message || error}`);
    return baseResponseGeneral(res.status(500), {
      success: false,
      message: error.message || 'Failed to cleanup memories',
    });
  }
});

module.exports = router;
