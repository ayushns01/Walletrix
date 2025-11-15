/**
 * Two-Factor Authentication Routes
 * Handles 2FA setup, verification, and management
 */

import express from 'express';
import twoFactorController from '../controllers/twoFactorController.js';
import { authenticateToken } from '../middleware/auth.js';
import { validateTwoFactor } from '../middleware/validation.js';

const router = express.Router();

// All 2FA routes require authentication
router.use(authenticateToken);

/**
 * Get 2FA status and available methods
 * GET /api/v1/auth/2fa/status
 */
router.get('/status', twoFactorController.get2FAStatus);

/**
 * Get available 2FA methods
 * GET /api/v1/auth/2fa/methods
 */
router.get('/methods', twoFactorController.getAvailable2FAMethods);

/**
 * Generate TOTP secret and QR code
 * POST /api/v1/auth/2fa/totp/setup
 */
router.post('/totp/setup', twoFactorController.setupTOTP);

/**
 * Verify TOTP and enable 2FA
 * POST /api/v1/auth/2fa/totp/verify
 * Body: { code }
 */
router.post('/totp/verify', validateTwoFactor.verifyTOTP, twoFactorController.verifyTOTP);

/**
 * Generate backup codes
 * POST /api/v1/auth/2fa/backup-codes/generate
 */
router.post('/backup-codes/generate', twoFactorController.generateBackupCodes);

/**
 * Verify backup code
 * POST /api/v1/auth/2fa/backup-codes/verify
 * Body: { code }
 */
router.post('/backup-codes/verify', validateTwoFactor.verifyBackupCode, twoFactorController.verifyBackupCode);

/**
 * Setup SMS 2FA
 * POST /api/v1/auth/2fa/sms/setup
 * Body: { phoneNumber }
 */
router.post('/sms/setup', validateTwoFactor.setupSMS, twoFactorController.setupSMS);

/**
 * Verify SMS code
 * POST /api/v1/auth/2fa/sms/verify
 * Body: { code }
 */
router.post('/sms/verify', validateTwoFactor.verifySMS, twoFactorController.verifySMS);

/**
 * Disable 2FA
 * POST /api/v1/auth/2fa/disable
 * Body: { password, code }
 */
router.post('/disable', validateTwoFactor.disable2FA, twoFactorController.disable2FA);

export default router;