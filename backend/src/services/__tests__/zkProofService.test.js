import zkProofService from '../zkProofService.js';

describe('ZKProofService', () => {
    beforeAll(async () => {
        // Initialize the service before running tests
        await zkProofService.initialize();
    });

    describe('Initialization', () => {
        it('should initialize successfully', () => {
            const info = zkProofService.getServiceInfo();
            expect(info.initialized).toBe(true);
            expect(info.hashFunction).toBe('Poseidon');
        });

        it('should return service information', () => {
            const info = zkProofService.getServiceInfo();
            expect(info).toHaveProperty('initialized');
            expect(info).toHaveProperty('hashFunction');
            expect(info).toHaveProperty('proofSystem');
            expect(info).toHaveProperty('features');
            expect(info.features).toBeInstanceOf(Array);
        });
    });

    describe('Balance Proofs', () => {
        it('should generate valid balance proof when balance exceeds threshold', async () => {
            const proof = await zkProofService.proveBalanceAboveThreshold('1000', '500');

            expect(proof).toHaveProperty('proof');
            expect(proof).toHaveProperty('publicSignals');
            expect(proof.publicSignals.aboveThreshold).toBe(true);
            expect(proof.publicSignals.threshold).toBe('500');
        });

        it('should generate proof with exact threshold balance', async () => {
            const proof = await zkProofService.proveBalanceAboveThreshold('500', '500');

            expect(proof.publicSignals.aboveThreshold).toBe(true);
        });

        it('should reject proof when balance is below threshold', async () => {
            await expect(
                zkProofService.proveBalanceAboveThreshold('100', '500')
            ).rejects.toThrow('Balance below threshold');
        });

        it('should reject negative balance', async () => {
            await expect(
                zkProofService.proveBalanceAboveThreshold('-100', '500')
            ).rejects.toThrow('Balance and threshold must be non-negative');
        });

        it('should reject negative threshold', async () => {
            await expect(
                zkProofService.proveBalanceAboveThreshold('1000', '-500')
            ).rejects.toThrow('Balance and threshold must be non-negative');
        });

        it('should handle large numbers (BigInt)', async () => {
            const largeBalance = '1000000000000000000'; // 1 ETH in wei
            const threshold = '500000000000000000';    // 0.5 ETH in wei

            const proof = await zkProofService.proveBalanceAboveThreshold(largeBalance, threshold);
            expect(proof.publicSignals.aboveThreshold).toBe(true);
        });

        it('should generate different commitments for same balance (due to random blinding)', async () => {
            const proof1 = await zkProofService.proveBalanceAboveThreshold('1000', '500');
            const proof2 = await zkProofService.proveBalanceAboveThreshold('1000', '500');

            // Commitments should be different due to random blinding factors
            expect(proof1.proof.commitment).not.toBe(proof2.proof.commitment);
        });
    });

    describe('Proof Verification', () => {
        it('should verify valid proof', async () => {
            const proof = await zkProofService.proveBalanceAboveThreshold('1000', '500');
            const isValid = await zkProofService.verifyBalanceProof(proof);

            expect(isValid).toBe(true);
        });

        it('should reject invalid proof structure', async () => {
            const invalidProof = { invalid: 'data' };
            const isValid = await zkProofService.verifyBalanceProof(invalidProof);

            expect(isValid).toBe(false);
        });

        it('should reject proof with missing fields', async () => {
            const invalidProof = {
                proof: { commitment: '123' },
                // missing publicSignals
            };
            const isValid = await zkProofService.verifyBalanceProof(invalidProof);

            expect(isValid).toBe(false);
        });

        it('should reject null proof', async () => {
            const isValid = await zkProofService.verifyBalanceProof(null);
            expect(isValid).toBe(false);
        });

        it('should reject tampered proof', async () => {
            const proof = await zkProofService.proveBalanceAboveThreshold('1000', '500');

            // Tamper with the commitment
            proof.proof.commitment = 'tampered_commitment';

            const isValid = await zkProofService.verifyBalanceProof(proof);
            expect(isValid).toBe(false);
        });

        it('should reject expired proof (older than 1 hour)', async () => {
            const proof = await zkProofService.proveBalanceAboveThreshold('1000', '500');

            // Set timestamp to 2 hours ago
            proof.proof.timestamp = Date.now() - (2 * 60 * 60 * 1000);

            const isValid = await zkProofService.verifyBalanceProof(proof);
            expect(isValid).toBe(false);
        });
    });

    describe('Pedersen Commitments', () => {
        it('should create Pedersen commitment', async () => {
            const commitment = await zkProofService.createPedersenCommitment('1000');

            expect(commitment).toHaveProperty('commitment');
            expect(commitment).toHaveProperty('blinding');
            expect(commitment).toHaveProperty('amount');
            expect(commitment.amount).toBe('1000');
        });

        it('should create commitment with custom blinding factor', async () => {
            const customBlinding = '12345678901234567890';
            const commitment = await zkProofService.createPedersenCommitment('1000', customBlinding);

            expect(commitment.blinding).toBe(customBlinding);
        });

        it('should create different commitments for same amount (random blinding)', async () => {
            const commitment1 = await zkProofService.createPedersenCommitment('1000');
            const commitment2 = await zkProofService.createPedersenCommitment('1000');

            expect(commitment1.commitment).not.toBe(commitment2.commitment);
            expect(commitment1.blinding).not.toBe(commitment2.blinding);
        });

        it('should reject negative amount', async () => {
            await expect(
                zkProofService.createPedersenCommitment('-1000')
            ).rejects.toThrow('Amount must be non-negative');
        });

        it('should handle zero amount', async () => {
            const commitment = await zkProofService.createPedersenCommitment('0');

            expect(commitment.amount).toBe('0');
            expect(commitment).toHaveProperty('commitment');
        });

        it('should handle large amounts', async () => {
            const largeAmount = '999999999999999999999999';
            const commitment = await zkProofService.createPedersenCommitment(largeAmount);

            expect(commitment.amount).toBe(largeAmount);
        });
    });

    describe('Commitment Verification', () => {
        it('should verify valid commitment', async () => {
            const commitment = await zkProofService.createPedersenCommitment('1000');

            const isValid = await zkProofService.verifyPedersenCommitment(
                commitment.commitment,
                commitment.amount,
                commitment.blinding
            );

            expect(isValid).toBe(true);
        });

        it('should reject commitment with wrong amount', async () => {
            const commitment = await zkProofService.createPedersenCommitment('1000');

            const isValid = await zkProofService.verifyPedersenCommitment(
                commitment.commitment,
                '2000', // wrong amount
                commitment.blinding
            );

            expect(isValid).toBe(false);
        });

        it('should reject commitment with wrong blinding factor', async () => {
            const commitment = await zkProofService.createPedersenCommitment('1000');

            const isValid = await zkProofService.verifyPedersenCommitment(
                commitment.commitment,
                commitment.amount,
                '99999' // wrong blinding
            );

            expect(isValid).toBe(false);
        });

        it('should reject commitment with tampered hash', async () => {
            const commitment = await zkProofService.createPedersenCommitment('1000');

            const isValid = await zkProofService.verifyPedersenCommitment(
                'tampered_hash',
                commitment.amount,
                commitment.blinding
            );

            expect(isValid).toBe(false);
        });
    });

    describe('Poseidon Hash', () => {
        it('should hash single input', async () => {
            const hash = await zkProofService.hashPoseidon(['123']);

            expect(hash).toBeTruthy();
            expect(typeof hash).toBe('string');
        });

        it('should hash multiple inputs', async () => {
            const hash = await zkProofService.hashPoseidon(['123', '456', '789']);

            expect(hash).toBeTruthy();
        });

        it('should produce consistent hashes for same inputs', async () => {
            const hash1 = await zkProofService.hashPoseidon(['123', '456']);
            const hash2 = await zkProofService.hashPoseidon(['123', '456']);

            expect(hash1).toBe(hash2);
        });

        it('should produce different hashes for different inputs', async () => {
            const hash1 = await zkProofService.hashPoseidon(['123']);
            const hash2 = await zkProofService.hashPoseidon(['456']);

            expect(hash1).not.toBe(hash2);
        });

        it('should handle BigInt inputs', async () => {
            const hash = await zkProofService.hashPoseidon([BigInt(123), BigInt(456)]);

            expect(hash).toBeTruthy();
        });

        it('should handle empty array', async () => {
            await expect(
                zkProofService.hashPoseidon([])
            ).rejects.toThrow();
        });
    });

    describe('Error Handling', () => {
        it('should throw error if service not initialized', async () => {
            const uninitializedService = Object.create(Object.getPrototypeOf(zkProofService));
            uninitializedService.initialized = false;

            await expect(
                uninitializedService.proveBalanceAboveThreshold('1000', '500')
            ).rejects.toThrow('ZK Proof Service not initialized');
        });

        it('should handle invalid input types gracefully', async () => {
            await expect(
                zkProofService.proveBalanceAboveThreshold('invalid', '500')
            ).rejects.toThrow();
        });

        it('should handle null inputs', async () => {
            await expect(
                zkProofService.proveBalanceAboveThreshold(null, '500')
            ).rejects.toThrow();
        });
    });

    describe('Performance', () => {
        it('should generate proof in reasonable time (<2 seconds)', async () => {
            const startTime = Date.now();
            await zkProofService.proveBalanceAboveThreshold('1000', '500');
            const endTime = Date.now();

            const duration = endTime - startTime;
            expect(duration).toBeLessThan(2000); // Less than 2 seconds
        });

        it('should verify proof in reasonable time (<500ms)', async () => {
            const proof = await zkProofService.proveBalanceAboveThreshold('1000', '500');

            const startTime = Date.now();
            await zkProofService.verifyBalanceProof(proof);
            const endTime = Date.now();

            const duration = endTime - startTime;
            expect(duration).toBeLessThan(500); // Less than 500ms
        });

        it('should create commitment in reasonable time (<100ms)', async () => {
            const startTime = Date.now();
            await zkProofService.createPedersenCommitment('1000');
            const endTime = Date.now();

            const duration = endTime - startTime;
            expect(duration).toBeLessThan(100); // Less than 100ms
        });
    });
});
