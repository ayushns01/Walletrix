import sessionService from '../services/sessionService.js';
import logger, { logAuth, logSecurity } from '../services/loggerService.js';

class SessionController {

  async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          error: 'Refresh token is required',
        });
      }

      const result = await sessionService.refreshAccessToken(refreshToken);

      if (!result.success) {

        if (result.code === 'TOKEN_EXPIRED' || result.code === 'TOKEN_INVALID') {
          logSecurity('Invalid Refresh Token Attempt', 'medium', {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            error: result.error,
          });
        }

        return res.status(401).json(result);
      }

      res.status(200).json({
        success: true,
        accessToken: result.accessToken,
      });
    } catch (error) {
      logger.error('Error refreshing token', {
        error: error.message,
        ip: req.ip,
      });
      res.status(500).json({
        success: false,
        error: 'Failed to refresh token',
      });
    }
  }

  async getCurrentSession(req, res) {
    try {
      const userId = req.userId;
      const token = req.get('Authorization')?.replace('Bearer ', '');

      const tokenResult = sessionService.verifyAccessToken(token);

      if (!tokenResult.success) {
        return res.status(401).json(tokenResult);
      }

      const sessionInfo = {
        userId,
        tokenIssuedAt: new Date(tokenResult.payload.iat * 1000).toISOString(),
        tokenExpiresAt: new Date(tokenResult.payload.exp * 1000).toISOString(),
        issuer: tokenResult.payload.iss,
        audience: tokenResult.payload.aud,
      };

      res.status(200).json({
        success: true,
        session: sessionInfo,
      });
    } catch (error) {
      logger.error('Error getting current session', {
        error: error.message,
        userId: req.userId,
      });
      res.status(500).json({
        success: false,
        error: 'Failed to get session info',
      });
    }
  }

  async getUserSessions(req, res) {
    try {
      const userId = req.userId;
      const result = sessionService.getUserSessions(userId);

      if (!result.success) {
        return res.status(500).json(result);
      }

      res.status(200).json({
        success: true,
        sessions: result.sessions,
        total: result.sessions.length,
      });
    } catch (error) {
      logger.error('Error getting user sessions', {
        error: error.message,
        userId: req.userId,
      });
      res.status(500).json({
        success: false,
        error: 'Failed to get sessions',
      });
    }
  }

  async invalidateSession(req, res) {
    try {
      const userId = req.userId;
      const { tokenId } = req.params;

      const userSessions = sessionService.getUserSessions(userId);
      const sessionExists = userSessions.sessions?.some(s => s.tokenId === tokenId);

      if (!sessionExists) {
        return res.status(404).json({
          success: false,
          error: 'Session not found or does not belong to user',
        });
      }

      const result = sessionService.invalidateRefreshToken(tokenId);

      if (!result.success) {
        return res.status(500).json(result);
      }

      logAuth('Session Invalidated by User', userId, { tokenId });

      res.status(200).json({
        success: true,
        message: 'Session invalidated successfully',
      });
    } catch (error) {
      logger.error('Error invalidating session', {
        error: error.message,
        userId: req.userId,
        tokenId: req.params.tokenId,
      });
      res.status(500).json({
        success: false,
        error: 'Failed to invalidate session',
      });
    }
  }

  async invalidateOtherSessions(req, res) {
    try {
      const userId = req.userId;
      const currentToken = req.get('Authorization')?.replace('Bearer ', '');

      const userSessions = sessionService.getUserSessions(userId);
      let currentTokenId = null;

      const result = sessionService.invalidateAllUserSessions(userId);

      if (!result.success) {
        return res.status(500).json(result);
      }

      logAuth('Other Sessions Invalidated', userId);

      res.status(200).json({
        success: true,
        message: 'All other sessions invalidated successfully',
      });
    } catch (error) {
      logger.error('Error invalidating other sessions', {
        error: error.message,
        userId: req.userId,
      });
      res.status(500).json({
        success: false,
        error: 'Failed to invalidate other sessions',
      });
    }
  }

  async invalidateAllSessions(req, res) {
    try {
      const userId = req.userId;
      const currentToken = req.get('Authorization')?.replace('Bearer ', '');

      const result = sessionService.invalidateAllUserSessions(userId);

      if (!result.success) {
        return res.status(500).json(result);
      }

      if (currentToken) {
        sessionService.blacklistAccessToken(currentToken);
      }

      logAuth('All Sessions Invalidated', userId);

      res.status(200).json({
        success: true,
        message: 'All sessions invalidated successfully',
      });
    } catch (error) {
      logger.error('Error invalidating all sessions', {
        error: error.message,
        userId: req.userId,
      });
      res.status(500).json({
        success: false,
        error: 'Failed to invalidate all sessions',
      });
    }
  }

  async getSessionStats(req, res) {
    try {
      const stats = sessionService.getSessionStatistics();

      res.status(200).json({
        success: true,
        statistics: stats,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error getting session stats', {
        error: error.message,
      });
      res.status(500).json({
        success: false,
        error: 'Failed to get session statistics',
      });
    }
  }
}

export default new SessionController();
