import express from 'express';
import authService from '../services/authService.js';
import databaseWalletService from '../services/databaseWalletService.js';
import { authenticate } from '../middleware/auth.js';
import { validationRules, handleValidationErrors } from '../middleware/validation.js';
import twoFactorRoutes from './twoFactorRoutes.js';
import sessionRoutes from './sessionRoutes.js';

const router = express.Router();

/**
 * @swagger
 * /auth/register:
 *   post:
 *     tags: [Authentication]
 *     summary: Register new user account
 *     description: |
 *       Create a new user account with email and password. Password must meet complexity requirements.
 *       
 *       **Rate Limit**: 5 attempts per 15 minutes per IP
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *                 description: Valid email address
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 example: SecurePass123!
 *                 description: Minimum 8 characters with uppercase, lowercase, number and symbol
 *               name:
 *                 type: string
 *                 maxLength: 100
 *                 example: John Doe
 *                 description: Optional display name
 *     responses:
 *       '201':
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: User registered successfully
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 token:
 *                   type: string
 *                   description: JWT access token
 *       '400':
 *         $ref: '#/components/responses/ValidationError'
 *       '409':
 *         description: Email already exists
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Error'
 *                 - properties:
 *                     errorCode:
 *                       const: USER_EXISTS
 *             example:
 *               success: false
 *               error: Email already registered
 *               errorCode: USER_EXISTS
 *               timestamp: 2025-11-12T10:30:00.000Z
 *       '429':
 *         $ref: '#/components/responses/RateLimitError'
 */
router.post('/register', validationRules.register, handleValidationErrors, async (req, res) => {
  try {
    const { email, password, displayName } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent');

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters long'
      });
    }

    const result = await authService.register(email, password, displayName, ipAddress, userAgent);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: result.user,
      token: result.accessToken,
      refreshToken: result.refreshToken
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Registration failed'
    });
  }
});

/**
 * @swagger
 * /auth/login:
 *   post:
 *     tags: [Authentication]
 *     summary: User login
 *     description: |
 *       Authenticate user with email and password. Returns JWT tokens for session management.
 *       
 *       **Rate Limit**: 5 attempts per 15 minutes per IP
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: SecurePass123!
 *               totpCode:
 *                 type: string
 *                 pattern: '^[0-9]{6}$'
 *                 example: '123456'
 *                 description: 6-digit TOTP code (required if 2FA enabled)
 *     responses:
 *       '200':
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Login successful
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 token:
 *                   type: string
 *                   description: JWT access token
 *                 requiresTwoFactor:
 *                   type: boolean
 *                   example: false
 *                   description: True if 2FA is enabled but not provided
 *       '400':
 *         $ref: '#/components/responses/ValidationError'
 *       '401':
 *         description: Invalid credentials or 2FA required
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Error'
 *                 - properties:
 *                     errorCode:
 *                       enum: [INVALID_CREDENTIALS, INVALID_2FA_CODE, 2FA_REQUIRED]
 *             examples:
 *               invalid_credentials:
 *                 summary: Wrong email or password
 *                 value:
 *                   success: false
 *                   error: Invalid email or password
 *                   errorCode: INVALID_CREDENTIALS
 *                   timestamp: 2025-11-12T10:30:00.000Z
 *               2fa_required:
 *                 summary: 2FA code required
 *                 value:
 *                   success: false
 *                   error: Two-factor authentication code required
 *                   errorCode: 2FA_REQUIRED
 *                   timestamp: 2025-11-12T10:30:00.000Z
 *       '429':
 *         $ref: '#/components/responses/RateLimitError'
 */
router.post('/login', validationRules.login, handleValidationErrors, async (req, res) => {
  try {
    const { email, password } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent');

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    const result = await authService.login(email, password, ipAddress, userAgent);

    if (!result.success) {
      return res.status(401).json(result);
    }

    res.json({
      success: true,
      message: 'Login successful',
      user: result.user,
      token: result.accessToken,
      refreshToken: result.refreshToken
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed'
    });
  }
});

/**
 * @swagger
 * /auth/profile:
 *   get:
 *     tags: [Authentication]
 *     summary: Get user profile
 *     description: Retrieve current user's profile information
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       '401':
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/profile', authenticate, async (req, res) => {
  try {
    res.json({
      success: true,
      user: req.user
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get profile'
    });
  }
});

/**
 * Update user preferences
 */
router.put('/preferences', authenticate, async (req, res) => {
  try {
    const { preferences } = req.body;
    const userId = req.userId;

    const result = await authService.updatePreferences(userId, preferences);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json({
      success: true,
      message: 'Preferences updated successfully',
      preferences: result.preferences
    });
  } catch (error) {
    console.error('Preferences update error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update preferences'
    });
  }
});

/**
 * Change password
 */
router.put('/change-password', authenticate, validationRules.changePassword, handleValidationErrors, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.userId;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'New password must be at least 8 characters long'
      });
    }

    const result = await authService.changePassword(userId, currentPassword, newPassword);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to change password'
    });
  }
});

/**
 * Import wallet from localStorage
 */
router.post('/import-wallet', authenticate, async (req, res) => {
  try {
    const { walletData, walletName } = req.body;
    const userId = req.userId;

    if (!walletData) {
      return res.status(400).json({
        success: false,
        error: 'Wallet data is required'
      });
    }

    const result = await databaseWalletService.importFromLocalStorage(
      userId, 
      walletData, 
      walletName || 'Imported Wallet'
    );

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json({
      success: true,
      message: 'Wallet imported successfully',
      wallet: result.wallet
    });
  } catch (error) {
    console.error('Import wallet error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to import wallet'
    });
  }
});

/**
 * Verify token (for client-side token validation)
 */
router.post('/verify-token', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Token is required'
      });
    }

    const result = authService.verifyToken(token);

    if (!result.success) {
      return res.status(401).json(result);
    }

    const userResult = await authService.getUserById(result.userId);

    if (!userResult.success) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      valid: true,
      user: userResult.user
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Token verification failed'
    });
  }
});

// Two-Factor Authentication routes
router.use('/2fa', twoFactorRoutes);

// Session Management routes  
router.use('/session', sessionRoutes);

export default router;