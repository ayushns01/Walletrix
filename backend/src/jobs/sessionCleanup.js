import prisma from '../lib/prisma.js';
import logger from '../services/loggerService.js';

class SessionCleanupJob {
  constructor() {
    this.isRunning = false;
    this.intervalId = null;

    this.intervalMs = 6 * 60 * 60 * 1000;
  }

  start() {
    if (this.isRunning) {
      logger.warn('Session cleanup job is already running');
      return;
    }

    logger.info('Starting session cleanup job', {
      intervalHours: this.intervalMs / (60 * 60 * 1000)
    });

    this.isRunning = true;

    this.runCleanup();

    this.intervalId = setInterval(() => {
      this.runCleanup();
    }, this.intervalMs);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    logger.info('Session cleanup job stopped');
  }

  async runCleanup() {
    const startTime = Date.now();
    logger.info('Running session cleanup...');

    try {

      const result = await prisma.userSession.deleteMany({
        where: {
          expiresAt: {
            lt: new Date()
          }
        }
      });

      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const inactiveResult = await prisma.userSession.updateMany({
        where: {
          lastUsedAt: {
            lt: thirtyDaysAgo
          },
          isActive: true
        },
        data: {
          isActive: false
        }
      });

      const duration = Date.now() - startTime;

      logger.info('Session cleanup completed', {
        expiredSessionsDeleted: result.count,
        inactiveSessionsMarked: inactiveResult.count,
        durationMs: duration
      });

      return {
        success: true,
        expiredSessionsDeleted: result.count,
        inactiveSessionsMarked: inactiveResult.count,
        duration
      };
    } catch (error) {
      logger.error('Session cleanup failed', {
        error: error.message,
        stack: error.stack
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  async runManual() {
    logger.info('Manual session cleanup triggered');
    return this.runCleanup();
  }

  async getStats() {
    try {
      const total = await prisma.userSession.count();
      const active = await prisma.userSession.count({
        where: { isActive: true }
      });
      const expired = await prisma.userSession.count({
        where: {
          expiresAt: {
            lt: new Date()
          }
        }
      });

      const oldestSession = await prisma.userSession.findFirst({
        orderBy: { createdAt: 'asc' },
        select: { createdAt: true }
      });

      return {
        success: true,
        stats: {
          total,
          active,
          inactive: total - active,
          expired,
          oldestSession: oldestSession?.createdAt || null
        }
      };
    } catch (error) {
      logger.error('Failed to get session stats', {
        error: error.message
      });

      return {
        success: false,
        error: error.message
      };
    }
  }
}

const sessionCleanupJob = new SessionCleanupJob();
export default sessionCleanupJob;
