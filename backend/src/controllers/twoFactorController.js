import twoFactorService from '../services/twoFactorService.js';
import { sendBackupCodesEmail, send2FASetupEmail } from '../services/emailService.js';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import logger, { logAuth, logSecurity } from '../services/loggerService.js';

const prisma = new PrismaClient();

class TwoFactorController {

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

  async setupTOTP(req, res) {
    try {
      const userId = req.userId;

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

  async verifyTOTP(req, res) {
    try {
      const userId = req.userId;
      const { code } = req.body;

      const result = await twoFactorService.verifyTOTP(userId, code, true);

      if (!result.success) {
        return res.status(400).json(result);
      }

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

  async generateBackupCodes(req, res) {
    try {
      const userId = req.userId;

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

  async setupSMS(req, res) {
    try {
      const userId = req.userId;
      const { phoneNumber } = req.body;

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

  async verifySMS(req, res) {
    try {
      const userId = req.userId;
      const { code } = req.body;

      const result = await twoFactorService.verifySMSCode(userId, code);

      if (!result.success) {
        return res.status(400).json(result);
      }

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

  async disable2FA(req, res) {
    try {
      const userId = req.userId;
      const { password, code } = req.body;

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

      const twoFactorStatus = await twoFactorService.is2FAEnabled(userId);
      if (!twoFactorStatus.enabled) {
        return res.status(400).json({
          success: false,
          error: '2FA is not enabled',
        });
      }

      let verificationResult;

      if (code.length === 8 && /^[A-Fa-f0-9]+$/.test(code)) {
        verificationResult = await twoFactorService.verifyBackupCode(userId, code);
      } else {

        verificationResult = await twoFactorService.verifyTOTP(userId, code);
      }

      if (!verificationResult.success) {
        return res.status(400).json({
          success: false,
          error: 'Invalid verification code',
        });
      }

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
