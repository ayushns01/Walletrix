import express from 'express';
import authController from '../controllers/authController.js';
import { authLimiter } from '../middleware/rateLimiters.js';

const router = express.Router();

// Apply strict rate limiting to all auth endpoints
router.post('/register', authLimiter, authController.register);
router.post('/login', authLimiter, authController.login);
router.post('/refresh', authLimiter, authController.refresh);

export default router;
