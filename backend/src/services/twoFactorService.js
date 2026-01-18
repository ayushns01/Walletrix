import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { randomBytes } from 'crypto';
import { PrismaClient } from '@prisma/client';
import logger, { logAuth, logSecurity } from './loggerService.js';
import { sendEmail } from './emailService.js';

const prisma = new PrismaClient();

export const TwoFactorMethod = {
  TOTP: 'totp',
  SMS: 'sms',
  EMAIL: 'email',
  BACKUP_CODE: 'backup_code',
};

export async function generateTOTPSecret(userId, userEmail) {
  try {
    const secret = speakeasy.generateSecret({
      name: `Walletrix (${userEmail})`,
      issuer: 'Walletrix',
      length: 32,
    });

    await prisma.userTwoFactor.upsert({
      where: { userId },
      update: {
        totpSecret: secret.base32,
        isEnabled: false,
        updatedAt: new Date(),
      },
      create: {
        userId,
        totpSecret: secret.base32,
        method: TwoFactorMethod.TOTP,
        isEnabled: false,
      },
    });

    const qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url);

    logAuth('TOTP Secret Generated', userId, {
      method: TwoFactorMethod.TOTP,
    });

    return {
      success: true,
      secret: secret.base32,
      qrCode: qrCodeDataUrl,
      manualEntry: secret.base32,
    };
  } catch (error) {
    logger.error('Error generating TOTP secret', {
      error: error.message,
      userId,
    });
    return {
      success: false,
      error: 'Failed to generate TOTP secret',
    };
  }
}

export async function verifyTOTP(userId, code, isSetup = false) {
  try {
    const twoFactor = await prisma.userTwoFactor.findUnique({
      where: { userId },
    });

    if (!twoFactor || !twoFactor.totpSecret) {
      return {
        success: false,
        error: 'TOTP not configured for this user',
      };
    }

    const verified = speakeasy.totp.verify({
      secret: twoFactor.totpSecret,
      encoding: 'base32',
      token: code,
      window: 2,
    });

    if (!verified) {
      logSecurity('Invalid TOTP Code Attempt', 'medium', {
        userId,
        code: code.substring(0, 2) + '****',
      });

      return {
        success: false,
        error: 'Invalid verification code',
      };
    }

    if (isSetup) {
      await prisma.userTwoFactor.update({
        where: { userId },
        data: {
          isEnabled: true,
          verifiedAt: new Date(),
        },
      });

      logAuth('2FA Enabled', userId, {
        method: TwoFactorMethod.TOTP,
      });
    }

    logAuth('TOTP Verified', userId, {
      isSetup,
      method: TwoFactorMethod.TOTP,
    });

    return { success: true };
  } catch (error) {
    logger.error('Error verifying TOTP', {
      error: error.message,
      userId,
    });
    return {
      success: false,
      error: 'Failed to verify code',
    };
  }
}

export async function generateBackupCodes(userId) {
  try {
    const codes = [];
    const hashedCodes = [];

    for (let i = 0; i < 10; i++) {
      const code = randomBytes(4).toString('hex').toUpperCase();
      codes.push(code);

      const bcrypt = await import('bcryptjs');
      const hashedCode = await bcrypt.default.hash(code, 10);
      hashedCodes.push(hashedCode);
    }

    await prisma.userBackupCode.deleteMany({
      where: { userId },
    });

    await prisma.userBackupCode.createMany({
      data: hashedCodes.map(code => ({
        userId,
        code,
        isUsed: false,
      })),
    });

    logAuth('Backup Codes Generated', userId, {
      count: codes.length,
    });

    return {
      success: true,
      codes,
    };
  } catch (error) {
    logger.error('Error generating backup codes', {
      error: error.message,
      userId,
    });
    return {
      success: false,
      error: 'Failed to generate backup codes',
    };
  }
}

export async function verifyBackupCode(userId, code) {
  try {
    const backupCodes = await prisma.userBackupCode.findMany({
      where: {
        userId,
        isUsed: false,
      },
    });

    const bcrypt = await import('bcryptjs');

    for (const backupCode of backupCodes) {
      const isValid = await bcrypt.default.compare(code, backupCode.code);

      if (isValid) {

        await prisma.userBackupCode.update({
          where: { id: backupCode.id },
          data: {
            isUsed: true,
            usedAt: new Date(),
          },
        });

        logAuth('Backup Code Used', userId, {
          codeId: backupCode.id,
        });

        const remainingCodes = await prisma.userBackupCode.count({
          where: {
            userId,
            isUsed: false,
          },
        });

        if (remainingCodes <= 2) {

          const user = await prisma.user.findUnique({
            where: { id: userId },
          });

          if (user?.email) {
            await sendBackupCodeWarning(user.email, remainingCodes);
          }
        }

        return {
          success: true,
          remainingCodes,
        };
      }
    }

    logSecurity('Invalid Backup Code Attempt', 'medium', {
      userId,
      code: code.substring(0, 2) + '****',
    });

    return {
      success: false,
      error: 'Invalid backup code',
    };
  } catch (error) {
    logger.error('Error verifying backup code', {
      error: error.message,
      userId,
    });
    return {
      success: false,
      error: 'Failed to verify backup code',
    };
  }
}

export async function sendSMSVerification(userId, phoneNumber) {
  try {

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.smsVerification.upsert({
      where: { userId },
      update: {
        code,
        expiresAt,
        attempts: 0,
        isUsed: false,
      },
      create: {
        userId,
        phoneNumber,
        code,
        expiresAt,
        attempts: 0,
        isUsed: false,
      },
    });

    if (process.env.NODE_ENV === 'development') {
      logger.info('SMS Verification Code (Development Only)', {
        userId,
        phoneNumber: phoneNumber.replace(/\d(?=\d{4})/g, '*'),
        code,
      });
    }

    logAuth('SMS Verification Sent', userId, {
      phoneNumber: phoneNumber.replace(/\d(?=\d{4})/g, '*'),
    });

    return {
      success: true,
      message: 'Verification code sent to your phone',
    };
  } catch (error) {
    logger.error('Error sending SMS verification', {
      error: error.message,
      userId,
    });
    return {
      success: false,
      error: 'Failed to send verification code',
    };
  }
}

export async function verifySMSCode(userId, code) {
  try {
    const smsVerification = await prisma.smsVerification.findUnique({
      where: { userId },
    });

    if (!smsVerification) {
      return {
        success: false,
        error: 'No verification code found',
      };
    }

    if (new Date() > smsVerification.expiresAt) {
      return {
        success: false,
        error: 'Verification code has expired',
      };
    }

    if (smsVerification.isUsed) {
      return {
        success: false,
        error: 'Verification code has already been used',
      };
    }

    if (smsVerification.attempts >= 5) {
      logSecurity('SMS Verification Max Attempts Exceeded', 'high', {
        userId,
        attempts: smsVerification.attempts,
      });

      return {
        success: false,
        error: 'Too many verification attempts',
      };
    }

    if (smsVerification.code !== code) {
      await prisma.smsVerification.update({
        where: { userId },
        data: {
          attempts: smsVerification.attempts + 1,
        },
      });

      logSecurity('Invalid SMS Code Attempt', 'medium', {
        userId,
        attempts: smsVerification.attempts + 1,
      });

      return {
        success: false,
        error: 'Invalid verification code',
      };
    }

    await prisma.smsVerification.update({
      where: { userId },
      data: {
        isUsed: true,
        verifiedAt: new Date(),
      },
    });

    logAuth('SMS Code Verified', userId);

    return { success: true };
  } catch (error) {
    logger.error('Error verifying SMS code', {
      error: error.message,
      userId,
    });
    return {
      success: false,
      error: 'Failed to verify code',
    };
  }
}

export async function is2FAEnabled(userId) {
  try {
    const twoFactor = await prisma.userTwoFactor.findUnique({
      where: { userId },
    });

    return {
      success: true,
      enabled: twoFactor?.isEnabled || false,
      method: twoFactor?.method || null,
      hasBackupCodes: twoFactor?.isEnabled ? await hasValidBackupCodes(userId) : false,
    };
  } catch (error) {
    logger.error('Error checking 2FA status', {
      error: error.message,
      userId,
    });
    return {
      success: false,
      error: 'Failed to check 2FA status',
    };
  }
}

export async function disable2FA(userId) {
  try {
    await prisma.userTwoFactor.update({
      where: { userId },
      data: {
        isEnabled: false,
        totpSecret: null,
        disabledAt: new Date(),
      },
    });

    await prisma.userBackupCode.deleteMany({
      where: { userId },
    });

    await prisma.smsVerification.deleteMany({
      where: { userId },
    });

    logAuth('2FA Disabled', userId);

    return { success: true };
  } catch (error) {
    logger.error('Error disabling 2FA', {
      error: error.message,
      userId,
    });
    return {
      success: false,
      error: 'Failed to disable 2FA',
    };
  }
}

async function hasValidBackupCodes(userId) {
  try {
    const count = await prisma.userBackupCode.count({
      where: {
        userId,
        isUsed: false,
      },
    });

    return count > 0;
  } catch (error) {
    logger.error('Error checking backup codes', {
      error: error.message,
      userId,
    });
    return false;
  }
}

async function sendBackupCodeWarning(email, remainingCodes) {
  try {
    const subject = 'Walletrix: Running Low on Backup Codes';
    const html = `
      <h2>Backup Codes Running Low</h2>
      <p>You have only ${remainingCodes} backup codes remaining for your Walletrix account.</p>
      <p>We recommend generating new backup codes to ensure you don't lose access to your account.</p>
      <p>You can generate new codes from your Security Settings.</p>
      <br>
      <p>If you didn't expect this email, please secure your account immediately.</p>
    `;

    await sendEmail(email, subject, html);
  } catch (error) {
    logger.error('Error sending backup code warning', {
      error: error.message,
      email,
    });
  }
}

export async function getAvailable2FAMethods(userId) {
  try {
    const twoFactor = await prisma.userTwoFactor.findUnique({
      where: { userId },
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    const methods = [];

    methods.push({
      method: TwoFactorMethod.TOTP,
      enabled: twoFactor?.isEnabled && twoFactor?.method === TwoFactorMethod.TOTP,
      configured: !!twoFactor?.totpSecret,
    });

    if (user?.phoneNumber) {
      methods.push({
        method: TwoFactorMethod.SMS,
        enabled: twoFactor?.isEnabled && twoFactor?.method === TwoFactorMethod.SMS,
        configured: true,
      });
    }

    methods.push({
      method: TwoFactorMethod.EMAIL,
      enabled: false,
      configured: !!user?.email,
    });

    return {
      success: true,
      methods,
    };
  } catch (error) {
    logger.error('Error getting 2FA methods', {
      error: error.message,
      userId,
    });
    return {
      success: false,
      error: 'Failed to get 2FA methods',
    };
  }
}

export default {
  TwoFactorMethod,
  generateTOTPSecret,
  verifyTOTP,
  generateBackupCodes,
  verifyBackupCode,
  sendSMSVerification,
  verifySMSCode,
  is2FAEnabled,
  disable2FA,
  getAvailable2FAMethods,
};
