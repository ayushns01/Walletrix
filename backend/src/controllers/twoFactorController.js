/**
 * Two-Factor Authentication Controller
 * Handles 2FA HTTP requests and responses
 */

import twoFactorService from '../services/twoFactorService.js';
import { sendBackupCodesEmail, send2FASetupEmail } from '../services/emailService.js';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import logger, { logAuth, logSecurity } from '../services/loggerService.js';

const prisma = new PrismaClient();

class TwoFactorController {
  /**
   * Get 2FA status
   * GET /api/v1/auth/2fa/status
   */
  async get2FAStatus(req, res) {
    try {
      const userId = req.userId;
      const result = await twoFactorService.is2FAEnabled(userId);

      if (!result.success) {
        return res.status(500).json(result);
      }

      res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error) {
      logger.error('Error getting 2FA status', {
        error: error.message,
        userId: req.userId,
      });
      res.status(500).json({
        success: false,
        error: 'Failed to get 2FA status',
      });
    }
  }

  /**
   * Get available 2FA methods
   * GET /api/v1/auth/2fa/methods
   */
  async getAvailable2FAMethods(req, res) {
    try {
      const userId = req.userId;
      const result = await twoFactorService.getAvailable2FAMethods(userId);

      if (!result.success) {
        return res.status(500).json(result);
      }

      res.status(200).json(result);
    } catch (error) {
      logger.error('Error getting 2FA methods', {
        error: error.message,
        userId: req.userId,
      });
      res.status(500).json({
        success: false,
        error: 'Failed to get 2FA methods',
      });
    }
  }

  /**
   * Setup TOTP
   * POST /api/v1/auth/2fa/totp/setup
   */
  async setupTOTP(req, res) {
    try {
      const userId = req.userId;
      
      // Get user email for QR code
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
        });
      }

      const result = await twoFactorService.generateTOTPSecret(userId, user.email);

      if (!result.success) {
        return res.status(500).json(result);
      }

      res.status(200).json({
        success: true,
        qrCode: result.qrCode,
        secret: result.secret,
        manualEntry: result.manualEntry,
      });
    } catch (error) {
      logger.error('Error setting up TOTP', {
        error: error.message,
        userId: req.userId,
      });
      res.status(500).json({
        success: false,
        error: 'Failed to setup TOTP',
      });
    }
  }

  /**
   * Verify TOTP and enable 2FA
   * POST /api/v1/auth/2fa/totp/verify
   */
  async verifyTOTP(req, res) {
    try {
      const userId = req.userId;
      const { code } = req.body;

      const result = await twoFactorService.verifyTOTP(userId, code, true);

      if (!result.success) {
        return res.status(400).json(result);
      }

      // Send confirmation email
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      });

      if (user?.email) {
        await send2FASetupEmail(user.email, 'TOTP');
      }

      res.status(200).json({
        success: true,
        message: '2FA enabled successfully',
      });
    } catch (error) {
      logger.error('Error verifying TOTP', {
        error: error.message,
        userId: req.userId,
      });
      res.status(500).json({
        success: false,
        error: 'Failed to verify TOTP',
      });
    }
  }

  /**
   * Generate backup codes
   * POST /api/v1/auth/2fa/backup-codes/generate
   */
  async generateBackupCodes(req, res) {
    try {
      const userId = req.userId;

      // Check if 2FA is enabled
      const twoFactorStatus = await twoFactorService.is2FAEnabled(userId);
      if (!twoFactorStatus.enabled) {
        return res.status(400).json({
          success: false,
          error: '2FA must be enabled to generate backup codes',
        });
      }

      const result = await twoFactorService.generateBackupCodes(userId);

      if (!result.success) {
        return res.status(500).json(result);
      }

      // Send backup codes via email
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      });

      if (user?.email) {
        await sendBackupCodesEmail(user.email, result.codes);
      }

      res.status(200).json({
        success: true,
        codes: result.codes,
        message: 'Backup codes generated and sent to your email',
      });
    } catch (error) {
      logger.error('Error generating backup codes', {
        error: error.message,
        userId: req.userId,
      });
      res.status(500).json({
        success: false,
        error: 'Failed to generate backup codes',
      });
    }
  }

  /**
   * Verify backup code
   * POST /api/v1/auth/2fa/backup-codes/verify
   */
  async verifyBackupCode(req, res) {
    try {
      const userId = req.userId;
      const { code } = req.body;

      const result = await twoFactorService.verifyBackupCode(userId, code);

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.status(200).json({
        success: true,
        message: 'Backup code verified successfully',
        remainingCodes: result.remainingCodes,
      });
    } catch (error) {
      logger.error('Error verifying backup code', {
        error: error.message,
        userId: req.userId,
      });
      res.status(500).json({
        success: false,
        error: 'Failed to verify backup code',
      });
    }
  }

  /**
   * Setup SMS 2FA
   * POST /api/v1/auth/2fa/sms/setup
   */
  async setupSMS(req, res) {
    try {
      const userId = req.userId;
      const { phoneNumber } = req.body;

      // Update user's phone number
      await prisma.user.update({
        where: { id: userId },
        data: { phoneNumber },
      });

      const result = await twoFactorService.sendSMSVerification(userId, phoneNumber);

      if (!result.success) {
        return res.status(500).json(result);
      }

      res.status(200).json({
        success: true,
        message: 'Verification code sent to your phone',
      });
    } catch (error) {
      logger.error('Error setting up SMS 2FA', {
        error: error.message,
        userId: req.userId,
      });
      res.status(500).json({
        success: false,
        error: 'Failed to setup SMS 2FA',
      });
    }
  }

  /**
   * Verify SMS code
   * POST /api/v1/auth/2fa/sms/verify
   */
  async verifySMS(req, res) {
    try {
      const userId = req.userId;
      const { code } = req.body;

      const result = await twoFactorService.verifySMSCode(userId, code);

      if (!result.success) {
        return res.status(400).json(result);
      }

      // Enable SMS 2FA
      await prisma.userTwoFactor.upsert({
        where: { userId },
        update: {
          method: 'sms',
          isEnabled: true,
          verifiedAt: new Date(),
        },
        create: {
          userId,
          method: 'sms',
          isEnabled: true,
          verifiedAt: new Date(),
        },
      });

      // Send confirmation email
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      });

      if (user?.email) {
        await send2FASetupEmail(user.email, 'SMS');
      }

      logAuth('SMS 2FA Enabled', userId);

      res.status(200).json({
        success: true,
        message: 'SMS 2FA enabled successfully',
      });
    } catch (error) {
      logger.error('Error verifying SMS code', {
        error: error.message,
        userId: req.userId,
      });
      res.status(500).json({
        success: false,
        error: 'Failed to verify SMS code',
      });
    }
  }

  /**
   * Disable 2FA
   * POST /api/v1/auth/2fa/disable
   */
  async disable2FA(req, res) {
    try {
      const userId = req.userId;
      const { password, code } = req.body;

      // Verify password
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
        });
      }

      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        logSecurity('Invalid Password for 2FA Disable', 'high', {
          userId,
          ip: req.ip,
        });

        return res.status(400).json({
          success: false,
          error: 'Invalid password',
        });
      }

      // Check if 2FA is enabled
      const twoFactorStatus = await twoFactorService.is2FAEnabled(userId);
      if (!twoFactorStatus.enabled) {
        return res.status(400).json({
          success: false,
          error: '2FA is not enabled',
        });
      }

      // Verify 2FA code
      let verificationResult;
      
      // Check if it's a backup code (8 characters, alphanumeric)
      if (code.length === 8 && /^[A-Fa-f0-9]+$/.test(code)) {
        verificationResult = await twoFactorService.verifyBackupCode(userId, code);
      } else {
        // Assume it's a TOTP code
        verificationResult = await twoFactorService.verifyTOTP(userId, code);
      }

      if (!verificationResult.success) {
        return res.status(400).json({
          success: false,
          error: 'Invalid verification code',
        });
      }

      // Disable 2FA
      const result = await twoFactorService.disable2FA(userId);

      if (!result.success) {
        return res.status(500).json(result);
      }

      res.status(200).json({
        success: true,
        message: '2FA disabled successfully',
      });
    } catch (error) {
      logger.error('Error disabling 2FA', {
        error: error.message,
        userId: req.userId,
      });
      res.status(500).json({
        success: false,
        error: 'Failed to disable 2FA',
      });
    }
  }
}

export default new TwoFactorController();