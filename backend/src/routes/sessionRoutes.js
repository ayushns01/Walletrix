import express from 'express';
import sessionController from '../controllers/sessionController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.post('/refresh', sessionController.refreshToken);

router.get('/current', authenticateToken, sessionController.getCurrentSession);

router.get('/list', authenticateToken, sessionController.getUserSessions);

router.delete('/:tokenId', authenticateToken, sessionController.invalidateSession);

router.post('/invalidate-others', authenticateToken, sessionController.invalidateOtherSessions);

router.post('/invalidate-all', authenticateToken, sessionController.invalidateAllSessions);

if (process.env.NODE_ENV === 'development') {
  router.get('/stats', sessionController.getSessionStats);
}

export default router;
