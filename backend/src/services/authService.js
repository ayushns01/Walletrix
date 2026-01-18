import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';
import sessionService from './sessionService.js';
import logger, { logAuth } from './loggerService.js';
import activityLogService from './activityLogService.js';
import argon2Service from './argon2Service.js';

class AuthService {

  async register(email, password, displayName, ipAddress = null, userAgent = null) {
    try {

      const existingUser = await prisma.user.findUnique({
        where: { email }
      });

      if (existingUser) {
        throw new Error('User already exists with this email');
      }

      const passwordHash = await argon2Service.hashPassword(password);

      const user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          passwordHashAlgorithm: 'argon2id',
          displayName,
          authProvider: 'local',
          emailVerified: false,
          preferences: {
            create: {
              defaultNetwork: 'ethereum-mainnet',
              preferredCurrency: 'USD',
              theme: 'dark',
              notifications: {},
              language: 'en',
              timezone: 'UTC'
            }
          }
        },
        include: {
          preferences: true
        }
      });

      const sessionInfo = {
        ip: ipAddress,
        userAgent: userAgent,
        registrationTime: new Date().toISOString(),
      };

      const tokenResult = sessionService.generateTokenPair(user.id, sessionInfo);

      if (!tokenResult.success) {
        throw new Error('Failed to generate authentication tokens');
      }

      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await prisma.userSession.create({
        data: {
          userId: user.id,
          sessionToken: tokenResult.accessToken,
          refreshToken: tokenResult.refreshToken,
          expiresAt,
          ipAddress,
          userAgent,
          isActive: true
        }
      });

      await activityLogService.logRegistration(user.id, ipAddress, userAgent);

      logAuth('User Registered', user.id, {
        email,
      });

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          preferences: user.preferences
        },
        accessToken: tokenResult.accessToken,
        refreshToken: tokenResult.refreshToken,
        tokenId: tokenResult.tokenId,
      };
    } catch (error) {
      console.error('Error registering user:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async login(email, password, ipAddress = null, userAgent = null) {
    try {

      const user = await prisma.user.findUnique({
        where: { email },
        include: {
          preferences: true,
          wallets: {
            where: { isActive: true },
            select: {
              id: true,
              name: true,
              addresses: true,
              createdAt: true,
              lastAccessedAt: true
            }
          }
        }
      });

      if (!user) {

        await activityLogService.logFailedLogin(email, ipAddress, userAgent, 'User not found');
        throw new Error('Invalid email or password');
      }

      let isValidPassword = false;
      let needsMigration = false;

      if (user.passwordHashAlgorithm === 'argon2id') {

        isValidPassword = await argon2Service.verifyPassword(password, user.passwordHash);
      } else {

        isValidPassword = await bcrypt.compare(password, user.passwordHash);
        needsMigration = isValidPassword;
      }

      if (!isValidPassword) {

        await activityLogService.logFailedLogin(email, ipAddress, userAgent, 'Invalid password');
        throw new Error('Invalid email or password');
      }

      if (needsMigration) {
        const newPasswordHash = await argon2Service.hashPassword(password);
        await prisma.user.update({
          where: { id: user.id },
          data: {
            passwordHash: newPasswordHash,
            passwordHashAlgorithm: 'argon2id'
          }
        });
        logger.info('Migrated user password from bcrypt to Argon2id', { userId: user.id });
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() }
      });

      const sessionInfo = {
        ip: ipAddress,
        userAgent: userAgent,
        loginTime: new Date().toISOString(),
      };

      const tokenResult = sessionService.generateTokenPair(user.id, sessionInfo);

      if (!tokenResult.success) {
        throw new Error('Failed to generate authentication tokens');
      }

      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await prisma.userSession.create({
        data: {
          userId: user.id,
          sessionToken: tokenResult.accessToken,
          refreshToken: tokenResult.refreshToken,
          expiresAt,
          ipAddress,
          userAgent,
          isActive: true
        }
      });

      await activityLogService.logLogin(user.id, ipAddress, userAgent, true);

      logAuth('User Logged In', user.id, {
        email: emailValidation.email,
        sessionInfo,
      });

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          preferences: user.preferences,
          wallets: user.wallets
        },
        accessToken: tokenResult.accessToken,
        refreshToken: tokenResult.refreshToken,
        tokenId: tokenResult.tokenId,
      };
    } catch (error) {
      console.error('Error logging in user:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getUserById(userId) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          preferences: true,
          wallets: {
            where: { isActive: true },
            select: {
              id: true,
              name: true,
              addresses: true,
              createdAt: true,
              lastAccessedAt: true
            }
          }
        }
      });

      if (!user) {
        throw new Error('User not found');
      }

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          isActive: user.isActive,
          emailVerified: user.emailVerified,
          preferences: user.preferences,
          wallets: user.wallets
        }
      };
    } catch (error) {
      console.error('Error getting user:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async updatePreferences(userId, preferences, ipAddress = null, userAgent = null) {
    try {
      const updatedPreferences = await prisma.userPreferences.upsert({
        where: { userId },
        update: preferences,
        create: {
          userId,
          ...preferences
        }
      });

      await activityLogService.logSettingsUpdate(userId, 'preferences', ipAddress, userAgent);

      return {
        success: true,
        preferences: updatedPreferences
      };
    } catch (error) {
      console.error('Error updating preferences:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  generateToken(userId) {
    return jwt.sign(
      { userId },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
  }

  verifyToken(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      return { success: true, userId: decoded.userId };
    } catch (error) {
      return { success: false, error: 'Invalid token' };
    }
  }

  async changePassword(userId, currentPassword, newPassword, ipAddress = null, userAgent = null) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        throw new Error('User not found');
      }

      const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isValidPassword) {

        await activityLogService.logPasswordChange(userId, ipAddress, userAgent, false);
        throw new Error('Current password is incorrect');
      }

      const newPasswordHash = await argon2Service.hashPassword(newPassword);

      await prisma.user.update({
        where: { id: userId },
        data: {
          passwordHash: newPasswordHash,
          passwordHashAlgorithm: 'argon2id'
        }
      });

      await activityLogService.logPasswordChange(userId, ipAddress, userAgent, true);

      return {
        success: true,
        message: 'Password updated successfully'
      };
    } catch (error) {
      console.error('Error changing password:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default new AuthService();
