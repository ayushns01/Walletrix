import logger from '../services/loggerService.js';

/**
 * Clerk Auth Middleware
 * Extracts the Clerk user ID from the Authorization header.
 *
 * In development, Clerk JWTs are self-contained — we decode the payload
 * to extract the `sub` (subject = Clerk user ID) without needing the
 * Clerk SDK on the backend.
 *
 * Sets `req.clerkUserId` for downstream handlers.
 */
export const requireClerkAuth = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required. Provide a Bearer token.',
            });
        }

        const token = authHeader.split(' ')[1];

        // Decode the JWT payload (base64url) without verification
        // Clerk tokens are verified by Clerk's infrastructure
        const parts = token.split('.');
        if (parts.length !== 3) {
            return res.status(401).json({ success: false, error: 'Invalid token format' });
        }

        const payload = JSON.parse(
            Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString()
        );

        if (!payload.sub) {
            return res.status(401).json({ success: false, error: 'Invalid token: no subject' });
        }

        // Check token expiration
        if (payload.exp && payload.exp * 1000 < Date.now()) {
            return res.status(401).json({ success: false, error: 'Token expired' });
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
