import authService from '../services/authService.js';
import logger from '../services/loggerService.js';

/**
 * AuthController
 * Handles user registration, login, token refresh, and profile endpoints.
 */
class AuthController {
    async register(req, res) {
        try {
            const { email, password, name } = req.body;

            if (!email || !password) {
                return res.status(400).json({
                    success: false,
                    error: 'Email and password are required',
                });
            }

            if (password.length < 8) {
                return res.status(400).json({
                    success: false,
                    error: 'Password must be at least 8 characters',
                });
            }

            const result = await authService.register(email, password, name);

            if (!result.success) {
                return res.status(400).json(result);
            }

            res.status(201).json(result);
        } catch (error) {
            logger.error('Register endpoint failed', { error: error.message });
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    }

    async login(req, res) {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                return res.status(400).json({
                    success: false,
                    error: 'Email and password are required',
                });
            }

            const result = await authService.login(email, password);

            if (!result.success) {
                return res.status(401).json(result);
            }

            res.status(200).json(result);
        } catch (error) {
            logger.error('Login endpoint failed', { error: error.message });
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    }

    async refresh(req, res) {
        try {
            const { refreshToken } = req.body;

            if (!refreshToken) {
                return res.status(400).json({
                    success: false,
                    error: 'Refresh token is required',
                });
            }

            const result = await authService.refreshAccessToken(refreshToken);

            if (!result.success) {
                return res.status(401).json(result);
            }

            res.status(200).json(result);
        } catch (error) {
            logger.error('Refresh endpoint failed', { error: error.message });
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    }

    async getProfile(req, res) {
        try {
            const result = await authService.getUserProfile(req.userId);

            if (!result.success) {
                return res.status(404).json(result);
            }

            res.status(200).json(result);
        } catch (error) {
            logger.error('Get profile failed', { error: error.message });
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    }
}

export default new AuthController();
