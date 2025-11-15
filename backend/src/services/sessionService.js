/**
 * Advanced JWT Service
 * Handles access tokens, refresh tokens, and session management
 */

import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import logger, { logAuth, logSecurity } from './loggerService.js';

// In-memory store for refresh tokens (in production, use Redis)
const refreshTokenStore = new Map();
const userSessions = new Map(); // Track active sessions per user
const blacklistedTokens = new Set(); // Blacklisted access tokens

/**
 * Token configuration
 */
const TOKEN_CONFIG = {
  accessToken: {
    expiresIn: process.env.ACCESS_TOKEN_EXPIRES || '15m',
    secret: process.env.JWT_SECRET,
  },
  refreshToken: {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRES || '7d',
    secret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
  },
};

/**
 * Session limits
 */
const SESSION_LIMITS = {
  maxConcurrentSessions: parseInt(process.env.MAX_CONCURRENT_SESSIONS || '5'),
  maxRefreshTokenAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
};

/**
 * Generate access token
 */
export function generateAccessToken(payload) {
  try {
    const token = jwt.sign(payload, TOKEN_CONFIG.accessToken.secret, {
      expiresIn: TOKEN_CONFIG.accessToken.expiresIn,
      issuer: 'walletrix',
      audience: 'walletrix-users',
    });

    logAuth('Access Token Generated', payload.userId, {
      expiresIn: TOKEN_CONFIG.accessToken.expiresIn,
    });

    return { success: true, token };
  } catch (error) {
    logger.error('Error generating access token', {
      error: error.message,
      userId: payload.userId,
    });
    return { success: false, error: 'Failed to generate access token' };
  }
}

/**
 * Generate refresh token
 */
export function generateRefreshToken(userId, sessionInfo = {}) {
  try {
    const tokenId = randomBytes(16).toString('hex');
    const payload = {
      userId,
      tokenId,
      type: 'refresh',
      sessionInfo,
    };

    const token = jwt.sign(payload, TOKEN_CONFIG.refreshToken.secret, {
      expiresIn: TOKEN_CONFIG.refreshToken.expiresIn,
      issuer: 'walletrix',
      audience: 'walletrix-users',
    });

    // Store refresh token with metadata
    const expiresAt = Date.now() + SESSION_LIMITS.maxRefreshTokenAge;
    refreshTokenStore.set(tokenId, {
      userId,
      token,
      expiresAt,
      createdAt: Date.now(),
      lastUsed: Date.now(),
      sessionInfo,
      isActive: true,
    });

    // Track user sessions
    if (!userSessions.has(userId)) {
      userSessions.set(userId, new Set());
    }
    userSessions.get(userId).add(tokenId);

    // Enforce session limits
    enforceSessionLimits(userId);

    logAuth('Refresh Token Generated', userId, {
      tokenId,
      sessionInfo,
    });

    return { success: true, token, tokenId };
  } catch (error) {
    logger.error('Error generating refresh token', {
      error: error.message,
      userId,
    });
    return { success: false, error: 'Failed to generate refresh token' };
  }
}

/**
 * Generate token pair (access + refresh)
 */
export function generateTokenPair(userId, sessionInfo = {}) {
  const accessResult = generateAccessToken({ userId });
  const refreshResult = generateRefreshToken(userId, sessionInfo);

  if (!accessResult.success || !refreshResult.success) {
    return {
      success: false,
      error: 'Failed to generate token pair',
    };
  }

  return {
    success: true,
    accessToken: accessResult.token,
    refreshToken: refreshResult.token,
    tokenId: refreshResult.tokenId,
  };
}

/**
 * Verify access token
 */
export function verifyAccessToken(token) {
  try {
    // Check if token is blacklisted
    if (blacklistedTokens.has(token)) {
      return {
        success: false,
        error: 'Token has been invalidated',
        code: 'TOKEN_BLACKLISTED',
      };
    }

    const decoded = jwt.verify(token, TOKEN_CONFIG.accessToken.secret, {
      issuer: 'walletrix',
      audience: 'walletrix-users',
    });

    return { success: true, payload: decoded };
  } catch (error) {
    let errorCode = 'TOKEN_INVALID';
    let errorMessage = 'Invalid token';

    if (error.name === 'TokenExpiredError') {
      errorCode = 'TOKEN_EXPIRED';
      errorMessage = 'Token has expired';
    } else if (error.name === 'JsonWebTokenError') {
      errorCode = 'TOKEN_MALFORMED';
      errorMessage = 'Malformed token';
    }

    return {
      success: false,
      error: errorMessage,
      code: errorCode,
    };
  }
}

/**
 * Verify refresh token
 */
export function verifyRefreshToken(token) {
  try {
    const decoded = jwt.verify(token, TOKEN_CONFIG.refreshToken.secret, {
      issuer: 'walletrix',
      audience: 'walletrix-users',
    });

    const tokenData = refreshTokenStore.get(decoded.tokenId);

    if (!tokenData) {
      return {
        success: false,
        error: 'Refresh token not found',
        code: 'TOKEN_NOT_FOUND',
      };
    }

    if (!tokenData.isActive) {
      return {
        success: false,
        error: 'Refresh token has been revoked',
        code: 'TOKEN_REVOKED',
      };
    }

    if (Date.now() > tokenData.expiresAt) {
      // Clean up expired token
      invalidateRefreshToken(decoded.tokenId);
      return {
        success: false,
        error: 'Refresh token has expired',
        code: 'TOKEN_EXPIRED',
      };
    }

    // Update last used timestamp
    tokenData.lastUsed = Date.now();

    return { success: true, payload: decoded, tokenData };
  } catch (error) {
    return {
      success: false,
      error: 'Invalid refresh token',
      code: 'TOKEN_INVALID',
    };
  }
}

/**
 * Refresh access token using refresh token
 */
export function refreshAccessToken(refreshToken) {
  try {
    const refreshResult = verifyRefreshToken(refreshToken);

    if (!refreshResult.success) {
      return refreshResult;
    }

    const { payload } = refreshResult;
    const newAccessToken = generateAccessToken({ userId: payload.userId });

    if (!newAccessToken.success) {
      return newAccessToken;
    }

    logAuth('Access Token Refreshed', payload.userId, {
      tokenId: payload.tokenId,
    });

    return {
      success: true,
      accessToken: newAccessToken.token,
    };
  } catch (error) {
    logger.error('Error refreshing access token', {
      error: error.message,
    });
    return {
      success: false,
      error: 'Failed to refresh access token',
    };
  }
}

/**
 * Invalidate refresh token
 */
export function invalidateRefreshToken(tokenId) {
  try {
    const tokenData = refreshTokenStore.get(tokenId);

    if (tokenData) {
      tokenData.isActive = false;
      
      // Remove from user sessions
      const userSessionSet = userSessions.get(tokenData.userId);
      if (userSessionSet) {
        userSessionSet.delete(tokenId);
        if (userSessionSet.size === 0) {
          userSessions.delete(tokenData.userId);
        }
      }

      logAuth('Refresh Token Invalidated', tokenData.userId, {
        tokenId,
      });
    }

    // Clean up after a delay to allow for any in-flight requests
    setTimeout(() => {
      refreshTokenStore.delete(tokenId);
    }, 30000); // 30 seconds

    return { success: true };
  } catch (error) {
    logger.error('Error invalidating refresh token', {
      error: error.message,
      tokenId,
    });
    return { success: false };
  }
}

/**
 * Blacklist access token (for immediate invalidation)
 */
export function blacklistAccessToken(token) {
  blacklistedTokens.add(token);
  
  // Clean up blacklisted tokens after they would naturally expire
  setTimeout(() => {
    blacklistedTokens.delete(token);
  }, 15 * 60 * 1000); // 15 minutes (access token lifetime)
  
  return { success: true };
}

/**
 * Invalidate all sessions for a user
 */
export function invalidateAllUserSessions(userId) {
  try {
    const userSessionSet = userSessions.get(userId);

    if (userSessionSet) {
      for (const tokenId of userSessionSet) {
        invalidateRefreshToken(tokenId);
      }
      userSessions.delete(userId);
    }

    logAuth('All Sessions Invalidated', userId);

    return { success: true };
  } catch (error) {
    logger.error('Error invalidating all user sessions', {
      error: error.message,
      userId,
    });
    return { success: false };
  }
}

/**
 * Get user sessions
 */
export function getUserSessions(userId) {
  try {
    const sessionSet = userSessions.get(userId);
    if (!sessionSet) {
      return { success: true, sessions: [] };
    }

    const sessions = [];
    for (const tokenId of sessionSet) {
      const tokenData = refreshTokenStore.get(tokenId);
      if (tokenData && tokenData.isActive) {
        sessions.push({
          tokenId,
          createdAt: new Date(tokenData.createdAt).toISOString(),
          lastUsed: new Date(tokenData.lastUsed).toISOString(),
          sessionInfo: tokenData.sessionInfo,
        });
      }
    }

    return { success: true, sessions };
  } catch (error) {
    logger.error('Error getting user sessions', {
      error: error.message,
      userId,
    });
    return { success: false, sessions: [] };
  }
}

/**
 * Enforce session limits for a user
 */
function enforceSessionLimits(userId) {
  const sessionSet = userSessions.get(userId);
  if (!sessionSet || sessionSet.size <= SESSION_LIMITS.maxConcurrentSessions) {
    return;
  }

  // Get all session data and sort by creation time
  const sessions = Array.from(sessionSet)
    .map(tokenId => ({
      tokenId,
      data: refreshTokenStore.get(tokenId),
    }))
    .filter(session => session.data && session.data.isActive)
    .sort((a, b) => a.data.createdAt - b.data.createdAt);

  // Remove oldest sessions
  const sessionsToRemove = sessions.length - SESSION_LIMITS.maxConcurrentSessions;
  for (let i = 0; i < sessionsToRemove; i++) {
    invalidateRefreshToken(sessions[i].tokenId);
    
    logSecurity('Session Limit Exceeded - Oldest Session Removed', 'medium', {
      userId,
      removedTokenId: sessions[i].tokenId,
      totalSessions: sessions.length,
      limit: SESSION_LIMITS.maxConcurrentSessions,
    });
  }
}

/**
 * Clean up expired tokens (should be called periodically)
 */
export function cleanupExpiredTokens() {
  const now = Date.now();
  let cleanupCount = 0;

  for (const [tokenId, tokenData] of refreshTokenStore.entries()) {
    if (now > tokenData.expiresAt) {
      invalidateRefreshToken(tokenId);
      cleanupCount++;
    }
  }

  if (cleanupCount > 0) {
    logger.info('Cleaned up expired tokens', {
      cleanupCount,
      remainingTokens: refreshTokenStore.size,
    });
  }

  return { cleanupCount, remainingTokens: refreshTokenStore.size };
}

/**
 * Get session statistics
 */
export function getSessionStatistics() {
  const totalSessions = refreshTokenStore.size;
  const activeUsers = userSessions.size;
  const blacklistedCount = blacklistedTokens.size;

  const sessionsByUser = {};
  for (const [userId, sessionSet] of userSessions.entries()) {
    sessionsByUser[userId] = sessionSet.size;
  }

  return {
    totalSessions,
    activeUsers,
    blacklistedTokens: blacklistedCount,
    sessionsByUser,
    limits: SESSION_LIMITS,
  };
}

// Clean up expired tokens every hour
setInterval(cleanupExpiredTokens, 60 * 60 * 1000);

export default {
  generateAccessToken,
  generateRefreshToken,
  generateTokenPair,
  verifyAccessToken,
  verifyRefreshToken,
  refreshAccessToken,
  invalidateRefreshToken,
  blacklistAccessToken,
  invalidateAllUserSessions,
  getUserSessions,
  cleanupExpiredTokens,
  getSessionStatistics,
};