import express from 'express';
import authService from '../services/authService.js';
import databaseWalletService from '../services/databaseWalletService.js';
import { authenticate } from '../middleware/auth.js';
import { validationRules, handleValidationErrors } from '../middleware/validation.js';
import twoFactorRoutes from './twoFactorRoutes.js';
import sessionRoutes from './sessionRoutes.js';

const router = express.Router();

router.post('/register', validationRules.register, handleValidationErrors, async (req, res) => {
  try {
    const { email, password, displayName } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent');

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

router.use('/2fa', twoFactorRoutes);

router.use('/session', sessionRoutes);

export default router;
