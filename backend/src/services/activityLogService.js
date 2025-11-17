/**
 * Activity Log Service
 * Writes security and user activity events to database for audit trail
 */

import prisma from '../lib/prisma.js';
import logger from './loggerService.js';

class ActivityLogService {
  /**
   * Log an activity to the database
   */
  async logActivity({
    userId = null,
    action,
    resourceType = null,
    resourceId = null,
    details = null,
    ipAddress = null,
    userAgent = null,
    success = true
  }) {
    try {
      const log = await prisma.activityLog.create({
        data: {
          userId,
          action,
          resourceType,
          resourceId,
          details,
          ipAddress,
          userAgent,
          success,
          timestamp: new Date()
        }
      });

      return { success: true, log };
    } catch (error) {
      logger.error('Failed to log activity to database', {
        error: error.message,
        action,
        userId
      });
      return { success: false, error: error.message };
    }
  }

  /**
   * Log user registration
   */
  async logRegistration(userId, ipAddress, userAgent) {
    return this.logActivity({
      userId,
      action: 'USER_REGISTRATION',
      resourceType: 'user',
      resourceId: userId,
      details: {
        registeredAt: new Date().toISOString()
      },
      ipAddress,
      userAgent,
      success: true
    });
  }

  /**
   * Log user login
   */
  async logLogin(userId, ipAddress, userAgent, success = true, failureReason = null) {
    return this.logActivity({
      userId,
      action: 'USER_LOGIN',
      resourceType: 'user',
      resourceId: userId,
      details: success ? {
        loginAt: new Date().toISOString()
      } : {
        failureReason,
        attemptedAt: new Date().toISOString()
      },
      ipAddress,
      userAgent,
      success
    });
  }

  /**
   * Log user logout
   */
  async logLogout(userId, ipAddress, userAgent) {
    return this.logActivity({
      userId,
      action: 'USER_LOGOUT',
      resourceType: 'user',
      resourceId: userId,
      details: {
        logoutAt: new Date().toISOString()
      },
      ipAddress,
      userAgent,
      success: true
    });
  }

  /**
   * Log password change
   */
  async logPasswordChange(userId, ipAddress, userAgent, success = true) {
    return this.logActivity({
      userId,
      action: 'PASSWORD_CHANGE',
      resourceType: 'user',
      resourceId: userId,
      details: {
        changedAt: new Date().toISOString()
      },
      ipAddress,
      userAgent,
      success
    });
  }

  /**
   * Log 2FA enable/disable
   */
  async log2FAChange(userId, action, ipAddress, userAgent, success = true) {
    return this.logActivity({
      userId,
      action: action === 'enable' ? 'TWO_FA_ENABLE' : 'TWO_FA_DISABLE',
      resourceType: 'user',
      resourceId: userId,
      details: {
        modifiedAt: new Date().toISOString()
      },
      ipAddress,
      userAgent,
      success
    });
  }

  /**
   * Log wallet creation
   */
  async logWalletCreate(userId, walletId, walletType, ipAddress, userAgent) {
    return this.logActivity({
      userId,
      action: 'WALLET_CREATE',
      resourceType: 'wallet',
      resourceId: walletId,
      details: {
        walletType,
        createdAt: new Date().toISOString()
      },
      ipAddress,
      userAgent,
      success: true
    });
  }

  /**
   * Log wallet deletion
   */
  async logWalletDelete(userId, walletId, ipAddress, userAgent) {
    return this.logActivity({
      userId,
      action: 'WALLET_DELETE',
      resourceType: 'wallet',
      resourceId: walletId,
      details: {
        deletedAt: new Date().toISOString()
      },
      ipAddress,
      userAgent,
      success: true
    });
  }

  /**
   * Log transaction send
   */
  async logTransactionSend(userId, transactionId, network, amount, toAddress, ipAddress, userAgent, success = true) {
    return this.logActivity({
      userId,
      action: 'TRANSACTION_SEND',
      resourceType: 'transaction',
      resourceId: transactionId,
      details: {
        network,
        amount: amount.toString(),
        toAddress,
        sentAt: new Date().toISOString()
      },
      ipAddress,
      userAgent,
      success
    });
  }

  /**
   * Log settings update
   */
  async logSettingsUpdate(userId, settingType, ipAddress, userAgent) {
    return this.logActivity({
      userId,
      action: 'SETTINGS_UPDATE',
      resourceType: 'user_preferences',
      resourceId: userId,
      details: {
        settingType,
        updatedAt: new Date().toISOString()
      },
      ipAddress,
      userAgent,
      success: true
    });
  }

  /**
   * Log failed login attempts
   */
  async logFailedLogin(email, ipAddress, userAgent, reason) {
    return this.logActivity({
      userId: null,
      action: 'FAILED_LOGIN',
      resourceType: 'user',
      resourceId: null,
      details: {
        email,
        reason,
        attemptedAt: new Date().toISOString()
      },
      ipAddress,
      userAgent,
      success: false
    });
  }

  /**
   * Log suspicious activity
   */
  async logSuspiciousActivity(userId, activityType, details, ipAddress, userAgent) {
    return this.logActivity({
      userId,
      action: 'SUSPICIOUS_ACTIVITY',
      resourceType: 'security',
      resourceId: null,
      details: {
        activityType,
        ...details,
        detectedAt: new Date().toISOString()
      },
      ipAddress,
      userAgent,
      success: false
    });
  }

  /**
   * Get user activity logs
   */
  async getUserActivityLogs(userId, limit = 50, offset = 0) {
    try {
      const logs = await prisma.activityLog.findMany({
        where: { userId },
        orderBy: { timestamp: 'desc' },
        take: limit,
        skip: offset
      });

      const total = await prisma.activityLog.count({
        where: { userId }
      });

      return {
        success: true,
        logs,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total
        }
      };
    } catch (error) {
      logger.error('Failed to retrieve activity logs', {
        error: error.message,
        userId
      });
      return { success: false, error: error.message };
    }
  }

  /**
   * Get recent failed login attempts
   */
  async getRecentFailedLogins(limit = 20) {
    try {
      const logs = await prisma.activityLog.findMany({
        where: {
          action: 'FAILED_LOGIN',
          success: false
        },
        orderBy: { timestamp: 'desc' },
        take: limit
      });

      return { success: true, logs };
    } catch (error) {
      logger.error('Failed to retrieve failed login attempts', {
        error: error.message
      });
      return { success: false, error: error.message };
    }
  }

  /**
   * Clean up old activity logs (keep last 90 days)
   */
  async cleanupOldLogs(daysToKeep = 90) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const result = await prisma.activityLog.deleteMany({
        where: {
          timestamp: {
            lt: cutoffDate
          }
        }
      });

      logger.info('Activity logs cleanup completed', {
        deletedCount: result.count,
        cutoffDate: cutoffDate.toISOString()
      });

      return { success: true, deletedCount: result.count };
    } catch (error) {
      logger.error('Failed to cleanup activity logs', {
        error: error.message
      });
      return { success: false, error: error.message };
    }
  }
}

export default new ActivityLogService();
