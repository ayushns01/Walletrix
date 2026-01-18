import request from 'supertest';
import app from '../index.js';

describe('Phase 1 Integration Tests', () => {
    describe('Security Headers', () => {
        it('should apply security headers to all responses', async () => {
            const response = await request(app).get('/health');

            expect(response.status).toBe(200);

            expect(response.headers).toHaveProperty('x-content-type-options');
            expect(response.headers['x-content-type-options']).toBe('nosniff');

            expect(response.headers).toHaveProperty('x-frame-options');
            expect(response.headers['x-frame-options']).toBe('DENY');

            expect(response.headers).toHaveProperty('x-xss-protection');
            expect(response.headers['x-xss-protection']).toBe('1; mode=block');

            expect(response.headers).toHaveProperty('strict-transport-security');
            expect(response.headers['strict-transport-security']).toContain('max-age=');

            expect(response.headers).toHaveProperty('content-security-policy');
        });
    });

    describe('Argon2id Password Hashing', () => {
        const testEmail = `test-argon2-${Date.now()}@example.com`;
        const testPassword = 'TestPassword123!';
        let accessToken;

        it('should register new user with Argon2id', async () => {
            const response = await request(app)
                .post('/api/v1/auth/register')
                .send({
                    email: testEmail,
                    password: testPassword,
                    displayName: 'Test User Argon2'
                });

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.user).toHaveProperty('email', testEmail);
            expect(response.body).toHaveProperty('accessToken');

            accessToken = response.body.accessToken;
        });

        it('should login with Argon2id hashed password', async () => {
            const response = await request(app)
                .post('/api/v1/auth/login')
                .send({
                    email: testEmail,
                    password: testPassword
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.user).toHaveProperty('email', testEmail);
            expect(response.body).toHaveProperty('accessToken');
        });

        it('should reject invalid password', async () => {
            const response = await request(app)
                .post('/api/v1/auth/login')
                .send({
                    email: testEmail,
                    password: 'WrongPassword123!'
                });

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
        });

        it('should change password using Argon2id', async () => {
            const newPassword = 'NewTestPassword456!';

            const response = await request(app)
                .post('/api/v1/auth/change-password')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    currentPassword: testPassword,
                    newPassword: newPassword
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);

            const loginResponse = await request(app)
                .post('/api/v1/auth/login')
                .send({
                    email: testEmail,
                    password: newPassword
                });

            expect(loginResponse.status).toBe(200);
            expect(loginResponse.body.success).toBe(true);
        });
    });
});
