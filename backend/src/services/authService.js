import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';
import sessionService from './sessionService.js';
import logger, { logAuth } from './loggerService.js';
import activityLogService from './activityLogService.js';
import argon2Service from './argon2Service.js'; // Phase 1: Argon2id integration

class AuthService {
  /**
   * Register a new user
   */
  async register(email, password, displayName, ipAddress = null, userAgent = null) {
    try {
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email }
      });

      if (existingUser) {
        throw new Error('User already exists with this email');
      }

      // Hash password with Argon2id (Phase 1)
      const passwordHash = await argon2Service.hashPassword(password);

      // Create user
      const user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          passwordHashAlgorithm: 'argon2id', // Phase 1: Track hash algorithm
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

      // Generate token pair (access + refresh)
      const sessionInfo = {
        ip: ipAddress,
        userAgent: userAgent,
        registrationTime: new Date().toISOString(),
      };

      const tokenResult = sessionService.generateTokenPair(user.id, sessionInfo);

      if (!tokenResult.success) {
        throw new Error('Failed to generate authentication tokens');
      }

      // Create session in database
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
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

      // Log registration activity
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

  /**
   * Note: OAuth authentication is now handled by Clerk
   * Legacy OAuth methods have been removed
   */

  /**
   * Login user
   */
  async login(email, password, ipAddress = null, userAgent = null) {
    try {
      // Find user
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
        // Log failed login attempt
        await activityLogService.logFailedLogin(email, ipAddress, userAgent, 'User not found');
        throw new Error('Invalid email or password');
      }

      // Check password (Phase 1: Support both bcrypt and Argon2id)
      let isValidPassword = false;
      let needsMigration = false;

      if (user.passwordHashAlgorithm === 'argon2id') {
        // Verify with Argon2
        isValidPassword = await argon2Service.verifyPassword(password, user.passwordHash);
      } else {
        // Legacy bcrypt verification
        isValidPassword = await bcrypt.compare(password, user.passwordHash);
        needsMigration = isValidPassword; // Migrate to Argon2 on successful login
      }

      if (!isValidPassword) {
        // Log failed login attempt
        await activityLogService.logFailedLogin(email, ipAddress, userAgent, 'Invalid password');
        throw new Error('Invalid email or password');
      }

      // Migrate from bcrypt to Argon2id if needed (Phase 1)
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

      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() }
      });

      // Generate token pair (access + refresh)
      const sessionInfo = {
        ip: ipAddress,
        userAgent: userAgent,
        loginTime: new Date().toISOString(),
      };

      const tokenResult = sessionService.generateTokenPair(user.id, sessionInfo);

      if (!tokenResult.success) {
        throw new Error('Failed to generate authentication tokens');
      }

      // Create session in database
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
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

      // Log successful login
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

  /**
   * Get user by ID
   */
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

  /**
   * Update user preferences
   */
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

      // Log settings update
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

  /**
   * Generate JWT token
   */
  generateToken(userId) {
    return jwt.sign(
      { userId },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
  }

  /**
   * Verify JWT token
   */
  verifyToken(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      return { success: true, userId: decoded.userId };
    } catch (error) {
      return { success: false, error: 'Invalid token' };
    }
  }

  /**
   * Change password
   */
  async changePassword(userId, currentPassword, newPassword, ipAddress = null, userAgent = null) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isValidPassword) {
        // Log failed password change
        await activityLogService.logPasswordChange(userId, ipAddress, userAgent, false);
        throw new Error('Current password is incorrect');
      }

      // Hash new password with Argon2id (Phase 1)
      const newPasswordHash = await argon2Service.hashPassword(newPassword);

      // Update password
      await prisma.user.update({
        where: { id: userId },
        data: {
          passwordHash: newPasswordHash,
          passwordHashAlgorithm: 'argon2id' // Phase 1: Update algorithm
        }
      });

      // Log successful password change
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