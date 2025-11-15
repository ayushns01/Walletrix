import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';
import sessionService from './sessionService.js';
import logger, { logAuth } from './loggerService.js';

class AuthService {
  /**
   * Register a new user
   */
  async register(email, password, displayName) {
    try {
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email }
      });

      if (existingUser) {
        throw new Error('User already exists with this email');
      }

      // Hash password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Create user
      const user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          displayName,
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
        ip: undefined, // Will be set by controller
        userAgent: undefined, // Will be set by controller  
        registrationTime: new Date().toISOString(),
      };

      const tokenResult = sessionService.generateTokenPair(user.id, sessionInfo);

      if (!tokenResult.success) {
        throw new Error('Failed to generate authentication tokens');
      }

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
   * Login user
   */
  async login(email, password) {
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
        throw new Error('Invalid email or password');
      }

      // Check password
      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        throw new Error('Invalid email or password');
      }

      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() }
      });

      // Generate token pair (access + refresh)
      const sessionInfo = {
        ip: undefined, // Will be set by controller
        userAgent: undefined, // Will be set by controller  
        loginTime: new Date().toISOString(),
      };

      const tokenResult = sessionService.generateTokenPair(user.id, sessionInfo);

      if (!tokenResult.success) {
        throw new Error('Failed to generate authentication tokens');
      }

      logAuth('User Logged In', user.id, {
        email,
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
  async updatePreferences(userId, preferences) {
    try {
      const updatedPreferences = await prisma.userPreferences.upsert({
        where: { userId },
        update: preferences,
        create: {
          userId,
          ...preferences
        }
      });

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
  async changePassword(userId, currentPassword, newPassword) {
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
        throw new Error('Current password is incorrect');
      }

      // Hash new password
      const saltRounds = 12;
      const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

      // Update password
      await prisma.user.update({
        where: { id: userId },
        data: { passwordHash: newPasswordHash }
      });

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