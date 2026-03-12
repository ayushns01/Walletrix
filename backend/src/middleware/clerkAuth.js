import { verifyToken } from '@clerk/backend';
import logger from '../services/loggerService.js';

/**
 * Clerk Auth Middleware
 * Verifies the JWT signature using Clerk's backend SDK, then extracts the user ID.
 * Sets `req.clerkUserId` for downstream handlers.
 */
export const requireClerkAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required. Provide a Bearer token.',
            });
        }

        const token = authHeader.split(' ')[1];

        // Verify the JWT signature cryptographically using Clerk's JWKS
        const payload = await verifyToken(token, {
            secretKey: process.env.CLERK_SECRET_KEY,
        });

        if (!payload.sub) {
            return res.status(401).json({ success: false, error: 'Invalid token: no subject' });
        }

        req.clerkUserId = payload.sub;
        req.clerkEmail = payload.email || payload.sub;
        next();
    } catch (error) {
        logger.error('Clerk auth middleware error', { error: error.message });
        return res.status(401).json({ success: false, error: 'Authentication failed' });
    }
};

export default { requireClerkAuth };
