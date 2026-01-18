import authService from '../services/authService.js';
import sessionService from '../services/sessionService.js';
import logger from '../services/loggerService.js';

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Access token required',
        code: 'TOKEN_MISSING',
      });
    }

    const token = authHeader.substring(7);
    const result = sessionService.verifyAccessToken(token);

    if (!result.success) {
      return res.status(401).json({
        success: false,
        error: result.error,
        code: result.code,
      });
    }

    const userResult = await authService.getUserById(result.payload.userId);
    if (!userResult.success) {
      return res.status(401).json({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND',
      });
    }

    if (!userResult.user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'User account is disabled',
        code: 'USER_DISABLED',
      });
    }

    req.user = userResult.user;
    req.userId = result.payload.userId;
    req.tokenPayload = result.payload;

    next();
  } catch (error) {
    logger.error('Authentication error', {
      error: error.message,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });
    return res.status(401).json({
      success: false,
      error: 'Authentication failed',
      code: 'AUTH_FAILED',
    });
  }
};

export const authenticateToken = authenticate;

export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const result = sessionService.verifyAccessToken(token);

      if (result.success) {
        const userResult = await authService.getUserById(result.payload.userId);
        if (userResult.success && userResult.user.isActive) {
          req.user = userResult.user;
          req.userId = result.payload.userId;
          req.tokenPayload = result.payload;
        }
      }
    }

    next();
  } catch (error) {

    next();
  }
};

export const verifyWalletAccess = async (req, res, next) => {
  try {
    const { walletId } = req.params;
    const userId = req.userId;

    if (!walletId) {
      return res.status(400).json({
        success: false,
        error: 'Wallet ID required'
      });
    }

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    req.walletId = walletId;
    next();
  } catch (error) {
    console.error('Wallet access verification error:', error);
    return res.status(500).json({
      success: false,
      error: 'Access verification failed'
    });
  }
};
