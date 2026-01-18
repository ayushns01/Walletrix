import argon2Service from '../argon2Service.js';

describe('Argon2Service', () => {
    describe('hashPassword', () => {
        it('should hash a password successfully', async () => {
            const password = 'TestPassword123!';
            const hash = await argon2Service.hashPassword(password);

            expect(hash).toBeDefined();
            expect(hash).toContain('$argon2id$');
            expect(hash.length).toBeGreaterThan(50);
        });

        it('should generate different hashes for same password', async () => {
            const password = 'TestPassword123!';
            const hash1 = await argon2Service.hashPassword(password);
            const hash2 = await argon2Service.hashPassword(password);

            expect(hash1).not.toEqual(hash2);
        });

        it('should reject passwords shorter than 8 characters', async () => {
            await expect(argon2Service.hashPassword('short')).rejects.toThrow();
        });

        it('should reject non-string passwords', async () => {
            await expect(argon2Service.hashPassword(null)).rejects.toThrow();
            await expect(argon2Service.hashPassword(123)).rejects.toThrow();
        });
    });

    describe('verifyPassword', () => {
        it('should verify correct password', async () => {
            const password = 'TestPassword123!';
            const hash = await argon2Service.hashPassword(password);
            const isValid = await argon2Service.verifyPassword(hash, password);

            expect(isValid).toBe(true);
        });

        it('should reject incorrect password', async () => {
            const password = 'TestPassword123!';
            const hash = await argon2Service.hashPassword(password);
            const isValid = await argon2Service.verifyPassword(hash, 'WrongPassword');

            expect(isValid).toBe(false);
        });

        it('should handle invalid hash gracefully', async () => {
            const isValid = await argon2Service.verifyPassword('invalid-hash', 'password');
            expect(isValid).toBe(false);
        });
    });

    describe('needsRehash', () => {
        it('should return false for fresh hash', async () => {
            const password = 'TestPassword123!';
            const hash = await argon2Service.hashPassword(password);
            const needsRehash = await argon2Service.needsRehash(hash);

            expect(needsRehash).toBe(false);
        });

        it('should return true for invalid hash', async () => {
            const needsRehash = await argon2Service.needsRehash('invalid-hash');
            expect(needsRehash).toBe(true);
        });
    });

    describe('getHashAlgorithm', () => {
        it('should identify argon2id hash', async () => {
            const password = 'TestPassword123!';
            const hash = await argon2Service.hashPassword(password);
            const algorithm = argon2Service.getHashAlgorithm(hash);

            expect(algorithm).toBe('argon2id');
        });

        it('should identify bcrypt hash', () => {
            const bcryptHash = '$2b$10$abcdefghijklmnopqrstuv';
            const algorithm = argon2Service.getHashAlgorithm(bcryptHash);

            expect(algorithm).toBe('bcrypt');
        });

        it('should return unknown for invalid hash', () => {
            const algorithm = argon2Service.getHashAlgorithm('invalid-hash');
            expect(algorithm).toBe('unknown');
        });
    });

    describe('verifyWithMigration', () => {
        it('should verify argon2 hash and not need rehash', async () => {
            const password = 'TestPassword123!';
            const hash = await argon2Service.hashPassword(password);
            const result = await argon2Service.verifyWithMigration(hash, password);

            expect(result.valid).toBe(true);
            expect(result.algorithm).toBe('argon2id');
            expect(result.needsRehash).toBe(false);
        });

        it('should reject invalid password', async () => {
            const password = 'TestPassword123!';
            const hash = await argon2Service.hashPassword(password);
            const result = await argon2Service.verifyWithMigration(hash, 'WrongPassword');

            expect(result.valid).toBe(false);
        });
    });

    describe('getConfig', () => {
        it('should return configuration object', () => {
            const config = argon2Service.getConfig();

            expect(config).toBeDefined();
            expect(config.type).toBe('argon2id');
            expect(config.memoryCost).toBe(65536);
            expect(config.timeCost).toBe(3);
            expect(config.parallelism).toBe(4);
        });
    });

    describe('Performance', () => {
        it('should hash password in reasonable time', async () => {
            const password = 'TestPassword123!';
            const startTime = Date.now();
            await argon2Service.hashPassword(password);
            const endTime = Date.now();
            const duration = endTime - startTime;

            expect(duration).toBeLessThan(1000);
        });
    });
});
