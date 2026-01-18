import express from 'express';
import twoFactorController from '../controllers/twoFactorController.js';
import { authenticateToken } from '../middleware/auth.js';
import { validateTwoFactor } from '../middleware/validation.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/status', twoFactorController.get2FAStatus);

router.get('/methods', twoFactorController.getAvailable2FAMethods);

router.post('/totp/setup', twoFactorController.setupTOTP);

router.post('/totp/verify', validateTwoFactor.verifyTOTP, twoFactorController.verifyTOTP);

router.post('/backup-codes/generate', twoFactorController.generateBackupCodes);

router.post('/backup-codes/verify', validateTwoFactor.verifyBackupCode, twoFactorController.verifyBackupCode);

router.post('/sms/setup', validateTwoFactor.setupSMS, twoFactorController.setupSMS);

router.post('/sms/verify', validateTwoFactor.verifySMS, twoFactorController.verifySMS);

router.post('/disable', validateTwoFactor.disable2FA, twoFactorController.disable2FA);

export default router;
