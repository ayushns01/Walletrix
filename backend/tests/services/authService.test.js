import authService from '../authService.js';
import prisma from '../lib/prisma.js';

jest.mock('../lib/prisma.js', () => ({
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
}));

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed_password'),
  compare: jest.fn(),
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mock_jwt_token'),
  verify: jest.fn().mockReturnValue({ userId: 'user123' }),
}));

jest.mock('../sessionService.js', () => ({
  createSession: jest.fn().mockResolvedValue({
    accessToken: 'mock_access_token',
    refreshToken: 'mock_refresh_token'
  }),
  validateSession: jest.fn().mockResolvedValue(true),
}));

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import sessionService from '../sessionService.js';

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    test('should register new user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'SecurePass123!',
        name: 'Test User'
      };

      prisma.user.findUnique.mockResolvedValue(null);

      const mockUser = {
        id: 'user123',
        email: userData.email,
        name: userData.name,
        passwordHash: 'hashed_password',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      prisma.user.create.mockResolvedValue(mockUser);

      const result = await authService.register(userData.email, userData.password, userData.name);

      expect(result.success).toBe(true);
      expect(result.user).toHaveProperty('id', 'user123');
      expect(result.user).toHaveProperty('email', userData.email);
      expect(result.user).not.toHaveProperty('passwordHash');
      expect(result.tokens).toHaveProperty('accessToken');
      expect(result.tokens).toHaveProperty('refreshToken');

      expect(bcrypt.hash).toHaveBeenCalledWith(userData.password, 12);
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          email: userData.email,
          passwordHash: 'hashed_password',
          name: userData.name
        }
      });
    });

    test('should fail when user already exists', async () => {
      const userData = {
        email: 'existing@example.com',
        password: 'SecurePass123!'
      };

      prisma.user.findUnique.mockResolvedValue({
        id: 'existing_user',
        email: userData.email
      });

      const result = await authService.register(userData.email, userData.password);

      expect(result.success).toBe(false);
      expect(result.error).toBe('User with this email already exists');
      expect(result.errorCode).toBe('USER_EXISTS');
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    test('should validate email format', async () => {
      const result = await authService.register('invalid-email', 'SecurePass123!');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid email format');
      expect(result.errorCode).toBe('INVALID_EMAIL');
    });

    test('should validate password strength', async () => {
      const result = await authService.register('test@example.com', 'weak');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Password must be at least 8 characters long');
      expect(result.errorCode).toBe('WEAK_PASSWORD');
    });

    test('should handle database errors', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockRejectedValue(new Error('Database error'));

      const result = await authService.register('test@example.com', 'SecurePass123!');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Registration failed');
      expect(result.errorCode).toBe('REGISTRATION_FAILED');
    });
  });

  describe('login', () => {
    test('should login successfully with correct credentials', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'SecurePass123!'
      };

      const mockUser = {
        id: 'user123',
        email: userData.email,
        name: 'Test User',
        passwordHash: 'hashed_password',
        isActive: true,
        twoFactorEnabled: false
      };

      prisma.user.findUnique.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(true);

      const result = await authService.login(userData.email, userData.password);

      expect(result.success).toBe(true);
      expect(result.user).toHaveProperty('id', 'user123');
      expect(result.user).not.toHaveProperty('passwordHash');
      expect(result.tokens).toHaveProperty('accessToken');
      expect(result.tokens).toHaveProperty('refreshToken');

      expect(bcrypt.compare).toHaveBeenCalledWith(userData.password, 'hashed_password');
      expect(sessionService.createSession).toHaveBeenCalledWith(mockUser.id);
    });

    test('should fail with non-existent user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const result = await authService.login('nonexistent@example.com', 'password');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid email or password');
      expect(result.errorCode).toBe('INVALID_CREDENTIALS');
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    test('should fail with incorrect password', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        passwordHash: 'hashed_password',
        isActive: true
      };

      prisma.user.findUnique.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(false);

      const result = await authService.login('test@example.com', 'wrong_password');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid email or password');
      expect(result.errorCode).toBe('INVALID_CREDENTIALS');
    });

    test('should fail with inactive user', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        passwordHash: 'hashed_password',
        isActive: false
      };

      prisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await authService.login('test@example.com', 'correct_password');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Account is deactivated');
      expect(result.errorCode).toBe('ACCOUNT_INACTIVE');
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    test('should handle 2FA requirement', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        passwordHash: 'hashed_password',
        isActive: true,
        twoFactorEnabled: true
      };

      prisma.user.findUnique.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(true);

      const result = await authService.login('test@example.com', 'correct_password');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Two-factor authentication required');
      expect(result.errorCode).toBe('2FA_REQUIRED');
      expect(result.requiresTwoFactor).toBe(true);
    });

    test('should validate email format', async () => {
      const result = await authService.login('invalid-email', 'password');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid email format');
      expect(result.errorCode).toBe('INVALID_EMAIL');
    });
  });

  describe('verifyToken', () => {
    test('should verify valid token', async () => {
      const token = 'valid_jwt_token';
      const mockPayload = { userId: 'user123' };

      jwt.verify.mockReturnValue(mockPayload);

      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        isActive: true
      };

      prisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await authService.verifyToken(token);

      expect(result.success).toBe(true);
      expect(result.user).toHaveProperty('id', 'user123');
      expect(jwt.verify).toHaveBeenCalledWith(token, process.env.JWT_SECRET);
    });

    test('should fail with invalid token', async () => {
      jwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const result = await authService.verifyToken('invalid_token');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid token');
      expect(result.errorCode).toBe('INVALID_TOKEN');
    });

    test('should fail with expired token', async () => {
      jwt.verify.mockImplementation(() => {
        const error = new Error('Token expired');
        error.name = 'TokenExpiredError';
        throw error;
      });

      const result = await authService.verifyToken('expired_token');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Token expired');
      expect(result.errorCode).toBe('TOKEN_EXPIRED');
    });

    test('should fail with user not found', async () => {
      jwt.verify.mockReturnValue({ userId: 'nonexistent' });
      prisma.user.findUnique.mockResolvedValue(null);

      const result = await authService.verifyToken('valid_token');

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
      expect(result.errorCode).toBe('USER_NOT_FOUND');
    });

    test('should fail with inactive user', async () => {
      jwt.verify.mockReturnValue({ userId: 'user123' });

      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        isActive: false
      };

      prisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await authService.verifyToken('valid_token');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Account is deactivated');
      expect(result.errorCode).toBe('ACCOUNT_INACTIVE');
    });
  });

  describe('changePassword', () => {
    test('should change password successfully', async () => {
      const userId = 'user123';
      const currentPassword = 'old_password';
      const newPassword = 'new_secure_password';

      const mockUser = {
        id: userId,
        passwordHash: 'old_hashed_password'
      };

      prisma.user.findUnique.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(true);
      bcrypt.hash.mockResolvedValue('new_hashed_password');
      prisma.user.update.mockResolvedValue({ ...mockUser, passwordHash: 'new_hashed_password' });

      const result = await authService.changePassword(userId, currentPassword, newPassword);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Password changed successfully');

      expect(bcrypt.compare).toHaveBeenCalledWith(currentPassword, 'old_hashed_password');
      expect(bcrypt.hash).toHaveBeenCalledWith(newPassword, 12);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { passwordHash: 'new_hashed_password' }
      });
    });

    test('should fail with incorrect current password', async () => {
      const userId = 'user123';
      const mockUser = { id: userId, passwordHash: 'hashed_password' };

      prisma.user.findUnique.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(false);

      const result = await authService.changePassword(userId, 'wrong_password', 'new_password');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Current password is incorrect');
      expect(result.errorCode).toBe('INVALID_CURRENT_PASSWORD');
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    test('should validate new password strength', async () => {
      const result = await authService.changePassword('user123', 'current', 'weak');

      expect(result.success).toBe(false);
      expect(result.error).toBe('New password must be at least 8 characters long');
      expect(result.errorCode).toBe('WEAK_PASSWORD');
    });

    test('should fail with user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const result = await authService.changePassword('nonexistent', 'current', 'new_password');

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
      expect(result.errorCode).toBe('USER_NOT_FOUND');
    });
  });

  describe('refreshToken', () => {
    test('should refresh token successfully', async () => {
      const refreshToken = 'valid_refresh_token';
      const mockPayload = { userId: 'user123', type: 'refresh' };

      jwt.verify.mockReturnValue(mockPayload);

      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        isActive: true
      };

      prisma.user.findUnique.mockResolvedValue(mockUser);
      sessionService.validateSession.mockResolvedValue(true);

      const result = await authService.refreshToken(refreshToken);

      expect(result.success).toBe(true);
      expect(result.tokens).toHaveProperty('accessToken');
      expect(result.tokens).toHaveProperty('refreshToken');
    });

    test('should fail with invalid refresh token', async () => {
      jwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const result = await authService.refreshToken('invalid_token');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid refresh token');
      expect(result.errorCode).toBe('INVALID_REFRESH_TOKEN');
    });
  });
});
