import authService from '../services/authService.js';
import logger from '../services/loggerService.js';

/**
 * JWT Auth Middleware
 * Extracts and verifies the Bearer token from the Authorization header.
 * Attaches `req.userId` and `req.userEmail` for downstream handlers.
 */
export const requireAuth = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required. Provide a Bearer token.',
            });
        }

        const token = authHeader.split(' ')[1];
        const result = authService.verifyAccessToken(token);

        if (!result.valid) {
            return res.status(401).json({
                success: false,
                error: 'Invalid or expired token',
            });
        }

        req.userId = result.userId;
        req.userEmail = result.email;
        next();
    } catch (error) {
        logger.error('Auth middleware error', { error: error.message });
        return res.status(401).json({
            success: false,
            error: 'Authentication failed',
        });
    }
};

/**
 * Optional auth — doesn't block the request if no token is present,
 * but attaches user info if a valid token exists.
 */
export const optionalAuth = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            const result = authService.verifyAccessToken(token);
            if (result.valid) {
                req.userId = result.userId;
                req.userEmail = result.email;
            }
        }
        next();
    } catch (error) {
        next(); // Silently continue
    }
};

export default { requireAuth, optionalAuth };
