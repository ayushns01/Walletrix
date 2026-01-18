import request from 'supertest';
import app from '../../src/index.js';

jest.mock('../../src/lib/prisma.js');
jest.mock('../../src/services/emailService.js');
jest.mock('../../src/services/sessionService.js');

describe('Authentication Routes', () => {
  const testUser = {
    email: 'test@example.com',
    password: 'SecurePass123!',
    name: 'Test User'
  };

  describe('POST /api/v1/auth/register', () => {
    test('should register new user successfully', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(testUser)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'User registered successfully');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('email', testUser.email);
      expect(response.body.user).not.toHaveProperty('passwordHash');
      expect(response.body).toHaveProperty('token');
    });

    test('should fail with invalid email', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({ ...testUser, email: 'invalid-email' })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('errorCode', 'VALIDATION_ERROR');
    });

    test('should fail with weak password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({ ...testUser, password: 'weak' })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    test('should fail with missing required fields', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({ email: testUser.email })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    test('should respect rate limiting', async () => {

      const promises = Array(6).fill().map(() =>
        request(app)
          .post('/api/v1/auth/register')
          .send(testUser)
      );

      const responses = await Promise.all(promises);

      const rateLimited = responses.some(res => res.status === 429);
      expect(rateLimited).toBe(true);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    test('should login successfully with valid credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Login successful');
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
      expect(response.body.user).not.toHaveProperty('passwordHash');
    });

    test('should fail with invalid credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: 'wrong_password'
        })
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('errorCode', 'INVALID_CREDENTIALS');
    });

    test('should fail with non-existent user', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: testUser.password
        })
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('errorCode', 'INVALID_CREDENTIALS');
    });

    test('should fail with missing credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: testUser.email })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/v1/auth/profile', () => {
    let authToken;

    beforeEach(async () => {

      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });

      authToken = loginResponse.body.token;
    });

    test('should get user profile with valid token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('email');
      expect(response.body.user).not.toHaveProperty('passwordHash');
    });

    test('should fail without authentication token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/profile')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('errorCode', 'TOKEN_MISSING');
    });

    test('should fail with invalid token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', 'Bearer invalid_token')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('errorCode', 'TOKEN_INVALID');
    });

    test('should fail with malformed authorization header', async () => {
      const response = await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', 'InvalidFormat token')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('POST /api/v1/auth/change-password', () => {
    let authToken;

    beforeEach(async () => {
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });

      authToken = loginResponse.body.token;
    });

    test('should change password successfully', async () => {
      const response = await request(app)
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: testUser.password,
          newPassword: 'NewSecurePass456!'
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Password changed successfully');
    });

    test('should fail with incorrect current password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'wrong_password',
          newPassword: 'NewSecurePass456!'
        })
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('errorCode', 'INVALID_CURRENT_PASSWORD');
    });

    test('should fail with weak new password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: testUser.password,
          newPassword: 'weak'
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('errorCode', 'VALIDATION_ERROR');
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .post('/api/v1/auth/change-password')
        .send({
          currentPassword: testUser.password,
          newPassword: 'NewSecurePass456!'
        })
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('errorCode', 'TOKEN_MISSING');
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    let authToken;

    beforeEach(async () => {
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });

      authToken = loginResponse.body.token;
    });

    test('should logout successfully', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Logout successful');
    });

    test('should invalidate token after logout', async () => {

      await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const response = await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('errorCode', 'TOKEN_MISSING');
    });
  });

  describe('Error Handling', () => {
    test('should handle internal server errors gracefully', async () => {

    });

    test('should return consistent error format', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'invalid' })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    test('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send('invalid json')
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });
  });
});
