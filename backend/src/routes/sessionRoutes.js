/**
 * Session Management Routes
 * Handles session refresh, invalidation, and management
 */

import express from 'express';
import sessionController from '../controllers/sessionController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * Refresh access token
 * POST /api/v1/auth/session/refresh
 * Body: { refreshToken }
 */
router.post('/refresh', sessionController.refreshToken);

/**
 * Get current session info
 * GET /api/v1/auth/session/current
 */
router.get('/current', authenticateToken, sessionController.getCurrentSession);

/**
 * Get all user sessions
 * GET /api/v1/auth/session/list
 */
router.get('/list', authenticateToken, sessionController.getUserSessions);

/**
 * Invalidate specific session
 * DELETE /api/v1/auth/session/:tokenId
 */
router.delete('/:tokenId', authenticateToken, sessionController.invalidateSession);

/**
 * Invalidate all sessions except current
 * POST /api/v1/auth/session/invalidate-others
 */
router.post('/invalidate-others', authenticateToken, sessionController.invalidateOtherSessions);

/**
 * Invalidate all sessions (logout from all devices)
 * POST /api/v1/auth/session/invalidate-all
 */
router.post('/invalidate-all', authenticateToken, sessionController.invalidateAllSessions);

/**
 * Get session statistics (admin/debug)
 * GET /api/v1/auth/session/stats
 */
if (process.env.NODE_ENV === 'development') {
  router.get('/stats', sessionController.getSessionStats);
}

export default router;