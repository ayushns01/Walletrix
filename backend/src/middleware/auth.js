import authService from '../services/authService.js';

/**
 * Authentication middleware
 * Verifies JWT token and adds user info to request
 */
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Access token required'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const result = authService.verifyToken(token);

    if (!result.success) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }

    // Get user data
    const userResult = await authService.getUserById(result.userId);
    if (!userResult.success) {
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }

    // Add user to request object
    req.user = userResult.user;
    req.userId = result.userId;

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({
      success: false,
      error: 'Authentication failed'
    });
  }
};

/**
 * Optional authentication middleware
 * Adds user info if token is present, but doesn't require it
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const result = authService.verifyToken(token);

      if (result.success) {
        const userResult = await authService.getUserById(result.userId);
        if (userResult.success) {
          req.user = userResult.user;
          req.userId = result.userId;
        }
      }
    }

    next();
  } catch (error) {
    // In optional auth, we continue even if there's an error
    next();
  }
};

/**
 * Wallet access middleware
 * Verifies user has access to the specified wallet
 */
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

    // This will be checked in the wallet service itself
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