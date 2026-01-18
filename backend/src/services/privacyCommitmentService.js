import { buildPoseidon } from 'circomlibjs';
import crypto from 'crypto';

class PrivacyCommitmentService {
    constructor() {
        this.poseidon = null;
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) {
            return;
        }

        try {
            this.poseidon = await buildPoseidon();
            this.initialized = true;
            console.log('✅ Privacy Commitment Service initialized');
        } catch (error) {
            console.error('❌ Failed to initialize Privacy Commitment Service:', error);
            throw new Error('Privacy Commitment Service initialization failed');
        }
    }

    _ensureInitialized() {
        if (!this.initialized) {
            throw new Error('Privacy Commitment Service not initialized. Call initialize() first.');
        }
    }

    async proveBalanceAboveThreshold(balance, threshold) {
        this._ensureInitialized();

        try {

            const balanceNum = BigInt(balance);
            const thresholdNum = BigInt(threshold);

            if (balanceNum < 0n || thresholdNum < 0n) {
                throw new Error('Balance and threshold must be non-negative');
            }

            if (balanceNum < thresholdNum) {
                throw new Error('Balance below threshold - cannot generate proof');
            }

            const blinding = this._generateBlindingFactor();

            const commitment = this.poseidon([balanceNum, blinding]);

            const proof = {
                commitment: this.poseidon.F.toString(commitment),
                blinding: blinding.toString(),
                threshold: thresholdNum.toString(),
                timestamp: Date.now(),
            };

            return {
                proof,
                publicSignals: {
                    aboveThreshold: true,
                    threshold: thresholdNum.toString(),
                    commitmentHash: this.poseidon.F.toString(commitment),
                },
            };
        } catch (error) {
            if (error.message.includes('Balance below threshold')) {
                throw error;
            }
            throw new Error(`Failed to generate balance proof: ${error.message}`);
        }
    }

    async verifyBalanceProof(proofData) {
        this._ensureInitialized();

        try {

            if (!proofData || !proofData.proof || !proofData.publicSignals) {
                return false;
            }

            const { proof, publicSignals } = proofData;

            const now = Date.now();
            const proofAge = now - proof.timestamp;
            const ONE_HOUR = 60 * 60 * 1000;

            if (proofAge > ONE_HOUR) {
                console.warn('⚠️ Proof expired (older than 1 hour)');
                return false;
            }

            if (!publicSignals.aboveThreshold) {
                return false;
            }

            return publicSignals.commitmentHash === proof.commitment;
        } catch (error) {
            console.error('❌ Proof verification failed:', error);
            return false;
        }
    }

    async createPedersenCommitment(amount, blinding = null) {
        this._ensureInitialized();

        try {
            const amountNum = BigInt(amount);

            if (amountNum < 0n) {
                throw new Error('Amount must be non-negative');
            }

            const blindingNum = blinding !== null
                ? BigInt(blinding)
                : this._generateBlindingFactor();

            const commitment = this.poseidon([amountNum, blindingNum]);

            return {
                commitment: this.poseidon.F.toString(commitment),
                blinding: blindingNum.toString(),
                amount: amountNum.toString(),
            };
        } catch (error) {
            throw new Error(`Failed to create commitment: ${error.message}`);
        }
    }

    async verifyPedersenCommitment(commitmentHash, amount, blinding) {
        this._ensureInitialized();

        try {
            const amountNum = BigInt(amount);
            const blindingNum = BigInt(blinding);

            const recomputed = this.poseidon([amountNum, blindingNum]);
            const recomputedHash = this.poseidon.F.toString(recomputed);

            return recomputedHash === commitmentHash;
        } catch (error) {
            console.error('❌ Commitment verification failed:', error);
            return false;
        }
    }

    _generateBlindingFactor() {

        const randomBytes = crypto.randomBytes(32);

        return BigInt('0x' + randomBytes.toString('hex'));
    }

    async hashPoseidon(inputs) {
        this._ensureInitialized();

        try {
            const bigIntInputs = inputs.map(input => BigInt(input));
            const hash = this.poseidon(bigIntInputs);
            return this.poseidon.F.toString(hash);
        } catch (error) {
            throw new Error(`Poseidon hash failed: ${error.message}`);
        }
    }

    getServiceInfo() {
        return {
            initialized: this.initialized,
            hashFunction: 'Poseidon',
            proofSystem: 'Hash-based commitments (NOT zk-SNARKs)',
            version: '1.0.0',
            features: [
                'Poseidon hash-based balance commitments',
                'Pedersen-style commitments with blinding',
                'Privacy-preserving amount hiding via hashing',
            ],
            limitations: [
                'Not a true zero-knowledge proof',
                'Prover must reveal blinding factor for verification',
                'No on-chain verification without revealing secrets',
            ],
        };
    }
}

export default new PrivacyCommitmentService();
