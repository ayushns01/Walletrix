import shamirSecretService from '../shamirSecretService.js';

describe('ShamirSecretService', () => {
    const testSecret = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

    describe('splitSecret', () => {
        it('should split secret into shares', () => {
            const shares = shamirSecretService.splitSecret(testSecret, 5, 3);

            expect(shares).toHaveLength(5);
            expect(shares[0]).toHaveProperty('share');
            expect(shares[0]).toHaveProperty('index');
            expect(shares[0]).toHaveProperty('threshold', 3);
            expect(shares[0]).toHaveProperty('totalShares', 5);
        });

        it('should create valid base64 shares', () => {
            const shares = shamirSecretService.splitSecret(testSecret, 5, 3);

            shares.forEach(shareData => {
                expect(() => Buffer.from(shareData.share, 'base64')).not.toThrow();
            });
        });

        it('should reject invalid threshold', () => {
            expect(() => shamirSecretService.splitSecret(testSecret, 5, 6)).toThrow();
            expect(() => shamirSecretService.splitSecret(testSecret, 5, 1)).toThrow();
        });

        it('should reject invalid total shares', () => {
            expect(() => shamirSecretService.splitSecret(testSecret, 1, 1)).toThrow();
            expect(() => shamirSecretService.splitSecret(testSecret, 256, 3)).toThrow();
        });

        it('should reject empty secret', () => {
            expect(() => shamirSecretService.splitSecret('', 5, 3)).toThrow();
            expect(() => shamirSecretService.splitSecret(null, 5, 3)).toThrow();
        });
    });

    describe('recoverSecret', () => {
        it('should recover secret from threshold shares', () => {
            const shares = shamirSecretService.splitSecret(testSecret, 5, 3);
            const selectedShares = [shares[0].share, shares[2].share, shares[4].share];

            const recovered = shamirSecretService.recoverSecret(selectedShares);
            expect(recovered).toBe(testSecret);
        });

        it('should recover secret from any combination of threshold shares', () => {
            const shares = shamirSecretService.splitSecret(testSecret, 5, 3);

            // Test different combinations
            const combo1 = [shares[0].share, shares[1].share, shares[2].share];
            const combo2 = [shares[1].share, shares[3].share, shares[4].share];
            const combo3 = [shares[0].share, shares[2].share, shares[4].share];

            expect(shamirSecretService.recoverSecret(combo1)).toBe(testSecret);
            expect(shamirSecretService.recoverSecret(combo2)).toBe(testSecret);
            expect(shamirSecretService.recoverSecret(combo3)).toBe(testSecret);
        });

        it('should fail with insufficient shares', () => {
            const shares = shamirSecretService.splitSecret(testSecret, 5, 3);
            const insufficientShares = [shares[0].share, shares[1].share];

            expect(() => shamirSecretService.recoverSecret(insufficientShares)).toThrow();
        });

        it('should reject invalid shares array', () => {
            expect(() => shamirSecretService.recoverSecret(null)).toThrow();
            expect(() => shamirSecretService.recoverSecret([])).toThrow();
            expect(() => shamirSecretService.recoverSecret(['single'])).toThrow();
        });
    });

    describe('createSocialRecovery', () => {
        const guardians = [
            { id: '1', email: 'guardian1@example.com', name: 'Alice' },
            { id: '2', email: 'guardian2@example.com', name: 'Bob' },
            { id: '3', email: 'guardian3@example.com', name: 'Charlie' },
            { id: '4', email: 'guardian4@example.com', name: 'David' },
            { id: '5', email: 'guardian5@example.com', name: 'Eve' },
        ];

        it('should create social recovery setup', async () => {
            const recovery = await shamirSecretService.createSocialRecovery(
                testSecret,
                guardians
            );

            expect(recovery).toHaveProperty('threshold');
            expect(recovery).toHaveProperty('totalShares', 5);
            expect(recovery).toHaveProperty('guardianShares');
            expect(recovery.guardianShares).toHaveLength(5);
            expect(recovery.threshold).toBe(3); // 60% of 5
        });

        it('should assign shares to guardians', async () => {
            const recovery = await shamirSecretService.createSocialRecovery(
                testSecret,
                guardians
            );

            recovery.guardianShares.forEach((guardianShare, index) => {
                expect(guardianShare.guardianId).toBe(guardians[index].id);
                expect(guardianShare.guardianEmail).toBe(guardians[index].email);
                expect(guardianShare.guardianName).toBe(guardians[index].name);
                expect(guardianShare).toHaveProperty('share');
                expect(guardianShare).toHaveProperty('shareIndex');
            });
        });

        it('should support custom threshold', async () => {
            const recovery = await shamirSecretService.createSocialRecovery(
                testSecret,
                guardians,
                4
            );

            expect(recovery.threshold).toBe(4);
        });

        it('should reject insufficient guardians', async () => {
            const tooFewGuardians = [guardians[0]];
            await expect(
                shamirSecretService.createSocialRecovery(testSecret, tooFewGuardians)
            ).rejects.toThrow();
        });

        it('should allow recovery with guardian shares', async () => {
            const recovery = await shamirSecretService.createSocialRecovery(
                testSecret,
                guardians
            );

            const selectedShares = [
                recovery.guardianShares[0].share,
                recovery.guardianShares[2].share,
                recovery.guardianShares[4].share,
            ];

            const recovered = shamirSecretService.recoverSecret(selectedShares);
            expect(recovered).toBe(testSecret);
        });
    });

    describe('validateShare', () => {
        it('should validate valid share', () => {
            const shares = shamirSecretService.splitSecret(testSecret, 5, 3);
            const isValid = shamirSecretService.validateShare(shares[0].share);

            expect(isValid).toBe(true);
        });

        it('should reject invalid share', () => {
            const isValid = shamirSecretService.validateShare('invalid-share');
            expect(isValid).toBe(false);
        });
    });

    describe('assessSecurity', () => {
        it('should assess high security for 70%+ threshold', () => {
            const assessment = shamirSecretService.assessSecurity(4, 5);
            expect(assessment.level).toBe('high');
            expect(assessment.ratio).toBe('80.0%');
        });

        it('should assess medium security for 50-70% threshold', () => {
            const assessment = shamirSecretService.assessSecurity(3, 5);
            expect(assessment.level).toBe('medium');
            expect(assessment.ratio).toBe('60.0%');
        });

        it('should assess low security for <50% threshold', () => {
            const assessment = shamirSecretService.assessSecurity(2, 5);
            expect(assessment.level).toBe('low');
            expect(assessment.ratio).toBe('40.0%');
        });
    });

    describe('generateRecoveryInstructions', () => {
        it('should generate human-readable instructions', async () => {
            const guardians = [
                { id: '1', email: 'alice@example.com', name: 'Alice' },
                { id: '2', email: 'bob@example.com', name: 'Bob' },
                { id: '3', email: 'charlie@example.com', name: 'Charlie' },
            ];

            const recovery = await shamirSecretService.createSocialRecovery(
                testSecret,
                guardians
            );

            const instructions = shamirSecretService.generateRecoveryInstructions(recovery);

            expect(instructions).toContain('WALLET RECOVERY INSTRUCTIONS');
            expect(instructions).toContain('Total Guardians: 3');
            expect(instructions).toContain('Alice');
            expect(instructions).toContain('Bob');
            expect(instructions).toContain('Charlie');
        });
    });
});
