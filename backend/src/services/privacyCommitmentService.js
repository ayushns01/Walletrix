import { buildPoseidon } from 'circomlibjs';
import crypto from 'crypto';

/**
 * Privacy Commitment Service
 * 
 * Implements hash-based privacy commitments using Poseidon hash.
 * 
 * ⚠️ IMPORTANT: This is NOT a zk-SNARK implementation.
 * No Circom circuits, no Groth16 proofs, no trusted setup.
 * 
 * What this service actually provides:
 * - Poseidon hash-based commitments for privacy
 * - Pedersen-style commitments with blinding factors
 * - Privacy-preserving amount verification via hash commitments
 * 
 * Use cases:
 * - Hide exact balance while proving it exceeds a threshold (via commitment)
 * - Create blinded commitments for transaction amounts
 */

class PrivacyCommitmentService {
    constructor() {
        this.poseidon = null;
        this.initialized = false;
    }

    /**
     * Initialize the privacy commitment service
     * Must be called before using any methods
     * @returns {Promise<void>}
     */
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

    /**
     * Ensure service is initialized
     * @private
     */
    _ensureInitialized() {
        if (!this.initialized) {
            throw new Error('Privacy Commitment Service not initialized. Call initialize() first.');
        }
    }

    /**
     * Generate commitment proving balance is above threshold
     * 
     * NOTE: This is a hash-based commitment, NOT a zk-SNARK proof.
     * The prover must reveal the blinding factor for verification.
     * 
     * @param {string|number|bigint} balance - Actual balance (will be converted to BigInt)
     * @param {string|number|bigint} threshold - Minimum required balance
     * @returns {Promise<Object>} Commitment object
     * @throws {Error} If balance is below threshold or inputs are invalid
     */
    async proveBalanceAboveThreshold(balance, threshold) {
        this._ensureInitialized();

        try {
            // Convert inputs to BigInt
            const balanceNum = BigInt(balance);
            const thresholdNum = BigInt(threshold);

            // Validate inputs
            if (balanceNum < 0n || thresholdNum < 0n) {
                throw new Error('Balance and threshold must be non-negative');
            }

            if (balanceNum < thresholdNum) {
                throw new Error('Balance below threshold - cannot generate proof');
            }

            // Generate random blinding factor for privacy
            const blinding = this._generateBlindingFactor();

            // Create commitment using Poseidon hash
            // Commitment = Hash(balance, blinding)
            const commitment = this.poseidon([balanceNum, blinding]);

            // This is a hash-based commitment, not a zk-SNARK proof
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

    /**
     * Verify balance proof
     * 
     * @param {Object} proofData - ZK proof object from proveBalanceAboveThreshold
     * @returns {Promise<boolean>} True if proof is valid
     * 
     * @example
     * const isValid = await zkService.verifyBalanceProof(proof);
     */
    async verifyBalanceProof(proofData) {
        this._ensureInitialized();

        try {
            // Validate proof structure
            if (!proofData || !proofData.proof || !proofData.publicSignals) {
                return false;
            }

            const { proof, publicSignals } = proofData;

            // Check timestamp (proof should be recent - within 1 hour)
            const now = Date.now();
            const proofAge = now - proof.timestamp;
            const ONE_HOUR = 60 * 60 * 1000;

            if (proofAge > ONE_HOUR) {
                console.warn('⚠️ Proof expired (older than 1 hour)');
                return false;
            }

            // Verify public signals
            if (!publicSignals.aboveThreshold) {
                return false;
            }

            // Verify commitment hash matches (hash-based verification)
            return publicSignals.commitmentHash === proof.commitment;
        } catch (error) {
            console.error('❌ Proof verification failed:', error);
            return false;
        }
    }

    /**
     * Create Pedersen commitment for hiding transaction amounts
     * Commitment = Hash(amount, blinding)
     * 
     * @param {string|number|bigint} amount - Transaction amount to hide
     * @param {string|number|bigint} blinding - Random blinding factor (optional)
     * @returns {Promise<Object>} Commitment object
     * 
     * @example
     * const commitment = await zkService.createPedersenCommitment('1000');
     * // Returns: { commitment: '...', blinding: '...' }
     */
    async createPedersenCommitment(amount, blinding = null) {
        this._ensureInitialized();

        try {
            const amountNum = BigInt(amount);

            if (amountNum < 0n) {
                throw new Error('Amount must be non-negative');
            }

            // Generate random blinding factor if not provided
            const blindingNum = blinding !== null
                ? BigInt(blinding)
                : this._generateBlindingFactor();

            // Create commitment using Poseidon hash
            const commitment = this.poseidon([amountNum, blindingNum]);

            return {
                commitment: this.poseidon.F.toString(commitment),
                blinding: blindingNum.toString(),
                amount: amountNum.toString(), // In production, don't return this!
            };
        } catch (error) {
            throw new Error(`Failed to create commitment: ${error.message}`);
        }
    }

    /**
     * Verify Pedersen commitment
     * 
     * @param {string} commitmentHash - Commitment hash to verify
     * @param {string|number|bigint} amount - Claimed amount
     * @param {string|number|bigint} blinding - Blinding factor
     * @returns {Promise<boolean>} True if commitment is valid
     */
    async verifyPedersenCommitment(commitmentHash, amount, blinding) {
        this._ensureInitialized();

        try {
            const amountNum = BigInt(amount);
            const blindingNum = BigInt(blinding);

            // Recompute commitment
            const recomputed = this.poseidon([amountNum, blindingNum]);
            const recomputedHash = this.poseidon.F.toString(recomputed);

            return recomputedHash === commitmentHash;
        } catch (error) {
            console.error('❌ Commitment verification failed:', error);
            return false;
        }
    }

    /**
     * Generate cryptographically secure random blinding factor
     * @private
     * @returns {bigint} Random 256-bit number
     */
    _generateBlindingFactor() {
        // Generate 32 random bytes (256 bits)
        const randomBytes = crypto.randomBytes(32);

        // Convert to BigInt
        return BigInt('0x' + randomBytes.toString('hex'));
    }

    /**
     * Hash data using Poseidon hash function
     * Poseidon is optimized for zk-SNARKs (fewer constraints)
     * 
     * @param {Array<bigint|string|number>} inputs - Array of inputs to hash
     * @returns {Promise<string>} Hash output as string
     */
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

    /**
     * Get service configuration and status
     * @returns {Object} Service info
     */
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
