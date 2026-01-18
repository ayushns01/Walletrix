import { clerkClient } from '@clerk/clerk-sdk-node';
import logger from '../services/loggerService.js';
import { prisma } from '../lib/prisma.js';

async function ensureUserExists(clerkUser) {
  try {
    const email = clerkUser.emailAddresses.find(e => e.id === clerkUser.primaryEmailAddressId)?.emailAddress;

    if (!email) {
      logger.warn('Clerk user has no email address', { userId: clerkUser.id });
      return null;
    }

    let user = await prisma.user.findUnique({
      where: { id: clerkUser.id }
    });

    if (!user) {

      user = await prisma.user.create({
        data: {
          id: clerkUser.id,
          email: email,
          displayName: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || email,
          emailVerified: true,
          authProvider: 'clerk',
          profilePicture: clerkUser.imageUrl || clerkUser.profileImageUrl,
          isActive: true,
          lastLoginAt: new Date(),
        }
      });

      logger.info('Created new user from Clerk', { userId: clerkUser.id, email });
    } else {

      await prisma.user.update({
        where: { id: clerkUser.id },
        data: {
          lastLoginAt: new Date(),
          profilePicture: clerkUser.imageUrl || clerkUser.profileImageUrl,
          displayName: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || email,
          email: email,
        }
      });

      logger.info('Updated existing user from Clerk', { userId: clerkUser.id, email });
    }

    return user;
  } catch (error) {
    logger.error('Error ensuring user exists:', error);
    throw error;
  }
}

export const authenticateClerk = async (req, res, next) => {
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

    try {

      const payload = await clerkClient.verifyToken(token);

      if (!payload || !payload.sub) {
        return res.status(401).json({
          success: false,
          error: 'Invalid or expired token',
          code: 'INVALID_TOKEN',
        });
      }

      const user = await clerkClient.users.getUser(payload.sub);

      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND',
        });
      }

      try {
        await ensureUserExists(user);
      } catch (dbError) {
        logger.error('Failed to create/update user in database:', dbError);

      }

      req.user = {
        id: user.id,
        email: user.emailAddresses.find(e => e.id === user.primaryEmailAddressId)?.emailAddress,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: `${user.firstName} ${user.lastName}`.trim(),
        profileImageUrl: user.profileImageUrl,
        clerkUserId: user.id,
      };

      req.userId = user.id;

      logger.info('User authenticated via Clerk', {
        userId: user.id,
        email: req.user.email,
      });

      next();
    } catch (error) {
      logger.error('Clerk token verification failed:', error);
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
        code: 'INVALID_TOKEN',
      });
    }
  } catch (error) {
    logger.error('Authentication middleware error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication failed',
      code: 'AUTH_ERROR',
    });
  }
};

export const optionalAuthClerk = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {

      req.user = null;
      return next();
    }

    const token = authHeader.substring(7);

    try {
      const session = await clerkClient.sessions.verifySession(token);

      if (session) {
        const user = await clerkClient.users.getUser(session.userId);

        if (user) {
          req.user = {
            id: user.id,
            email: user.emailAddresses.find(e => e.id === user.primaryEmailAddressId)?.emailAddress,
            firstName: user.firstName,
            lastName: user.lastName,
            fullName: `${user.firstName} ${user.lastName}`.trim(),
            profileImageUrl: user.profileImageUrl,
            clerkUserId: user.id,
          };
          req.session = session;
        }
      }
    } catch (error) {

      logger.warn('Optional auth token invalid:', error.message);
    }

    next();
  } catch (error) {
    logger.error('Optional auth middleware error:', error);
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
    logger.error('Wallet access verification error:', error);
    return res.status(500).json({
      success: false,
      error: 'Access verification failed'
    });
  }
};

export { authenticate } from './auth.js';
