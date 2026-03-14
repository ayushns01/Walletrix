import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import prisma from '../lib/prisma.js';
import argon2Service from './argon2Service.js';
import logger from './loggerService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure env is loaded even if this module initializes before index.js dotenv.config()
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/**
 * AuthService
 * Handles user registration, login, and JWT token management.
 * Uses Prisma User model + Argon2 password hashing.
 */
class AuthService {
    constructor() {
        // Enforce distinct secrets for access and refresh tokens
        const accessSecret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
        const refreshSecret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;

        if (!accessSecret || accessSecret.length < 32) {
            throw new Error('JWT_ACCESS_SECRET (or JWT_SECRET) must be set and at least 32 characters');
        }
        if (!refreshSecret || refreshSecret.length < 32) {
            throw new Error('JWT_REFRESH_SECRET (or JWT_SECRET) must be set and at least 32 characters');
        }
        if (accessSecret === refreshSecret) {
            logger.warn('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET are the same — strongly recommend using distinct secrets');
        }

        this.accessSecret = accessSecret;
        this.refreshSecret = refreshSecret;
        this.accessTokenExpiry = '15m';
        this.refreshTokenExpiry = '7d';
    }

    /**
     * Register a new user.
     */
    async register(email, password, name) {
        try {
            // Check if user already exists
            const existing = await prisma.user.findUnique({ where: { email } });
            if (existing) {
                return { success: false, error: 'Email already registered' };
            }

            // Hash password with Argon2
            const hashedPassword = await argon2Service.hashPassword(password);

            // Create user
            const user = await prisma.user.create({
                data: {
                    email,
                    name,
                    passwordHash: hashedPassword,
                },
                select: { id: true, email: true, name: true, createdAt: true },
            });

            // Generate tokens
            const tokens = this._generateTokens(user);

            // Log activity
            await this._logActivity(user.id, 'REGISTER', { email });

            logger.info('User registered', { userId: user.id, email });

            return {
                success: true,
                data: { user, ...tokens },
            };
        } catch (error) {
            logger.error('Registration failed', { error: error.message });
            return { success: false, error: error.message };
        }
    }

    /**
     * Login an existing user.
     */
    async login(email, password) {
        try {
            const user = await prisma.user.findUnique({
                where: { email },
                select: { id: true, email: true, name: true, passwordHash: true, createdAt: true },
            });

            if (!user) {
                return { success: false, error: 'Invalid email or password' };
            }

            // Verify password
            const isValid = await argon2Service.verifyPassword(user.passwordHash, password);
            if (!isValid) {
                return { success: false, error: 'Invalid email or password' };
            }

            // Generate tokens
            const { passwordHash, ...safeUser } = user;
            const tokens = this._generateTokens(safeUser);

            await this._logActivity(user.id, 'LOGIN', { email });

            logger.info('User logged in', { userId: user.id });

            return {
                success: true,
                data: { user: safeUser, ...tokens },
            };
        } catch (error) {
            logger.error('Login failed', { error: error.message });
            return { success: false, error: error.message };
        }
    }

    /**
     * Refresh access token using refresh token.
     */
    async refreshAccessToken(refreshToken) {
        try {
            const decoded = jwt.verify(refreshToken, this.refreshSecret);

            const user = await prisma.user.findUnique({
                where: { id: decoded.userId },
                select: { id: true, email: true, name: true },
            });

            if (!user) {
                return { success: false, error: 'User not found' };
            }

            const accessToken = this._generateAccessToken(user);
            return { success: true, data: { accessToken } };
        } catch (error) {
            return { success: false, error: 'Invalid or expired refresh token' };
        }
    }

    /**
     * Verify an access token and return the user.
     */
    verifyAccessToken(token) {
        try {
            const decoded = jwt.verify(token, this.accessSecret);
            return { valid: true, userId: decoded.userId, email: decoded.email };
        } catch (error) {
            return { valid: false, error: error.message };
        }
    }

    /**
     * Get user profile by ID.
     */
    async getUserProfile(userId) {
        try {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: {
                    id: true, email: true, name: true, avatarUrl: true, createdAt: true,
                    wallets: {
                        select: { id: true, label: true, network: true, address: true, type: true, isActive: true },
                        where: { isActive: true },
                    },
                },
            });
            if (!user) return { success: false, error: 'User not found' };
            return { success: true, data: user };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // ─── Private Helpers ───────────────────────────────

    _generateTokens(user) {
        return {
            accessToken: this._generateAccessToken(user),
            refreshToken: jwt.sign(
                { userId: user.id, email: user.email, type: 'refresh' },
                this.refreshSecret,
                { expiresIn: this.refreshTokenExpiry }
            ),
        };
    }

    _generateAccessToken(user) {
        return jwt.sign(
            { userId: user.id, email: user.email, type: 'access' },
            this.accessSecret,
            { expiresIn: this.accessTokenExpiry }
        );
    }

    async _logActivity(userId, action, details) {
        try {
            await prisma.activityLog.create({
                data: { userId, action, details },
            });
        } catch (error) {
            logger.warn('Failed to log activity', { error: error.message });
        }
    }
}

export default new AuthService();
