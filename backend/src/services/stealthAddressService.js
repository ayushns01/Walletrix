import { ethers } from 'ethers';
import * as secp256k1 from '@noble/secp256k1';
import { sha256 } from '@noble/hashes/sha2.js';
import { keccak_256 } from '@noble/hashes/sha3.js';

/**
 * Stealth Address Service
 * Implements stealth addresses for enhanced privacy using proper ECDH
 * 
 * How it works:
 * 1. Recipient publishes meta-address (scan key + spend key)
 * 2. Sender generates ephemeral key for each payment
 * 3. Sender computes shared secret via ECDH (actual ECC point multiplication)
 * 4. Sender derives one-time stealth address using ECC point addition
 * 5. Recipient scans blockchain to detect payments
 * 6. Recipient derives private key to spend funds
 * 
 * Technology: ECDH key exchange on secp256k1 curve using @noble/secp256k1
 */

class StealthAddressService {
    /**
     * Generate stealth address key pair (scan key + spend key)
     * @returns {Object} Stealth address keys
     * 
     * @example
     * const keys = stealthService.generateStealthKeys();
     * // Returns: { scanPrivateKey, scanPublicKey, spendPrivateKey, spendPublicKey, stealthMetaAddress }
     */
    generateStealthKeys() {
        try {
            // Generate scan key (for detecting payments)
            const scanPrivateKey = secp256k1.utils.randomSecretKey();
            const scanPublicKey = secp256k1.getPublicKey(scanPrivateKey, true); // compressed

            // Generate spend key (for spending funds)
            const spendPrivateKey = secp256k1.utils.randomSecretKey();
            const spendPublicKey = secp256k1.getPublicKey(spendPrivateKey, true); // compressed

            return {
                scanPrivateKey: '0x' + Buffer.from(scanPrivateKey).toString('hex'),
                scanPublicKey: '0x' + Buffer.from(scanPublicKey).toString('hex'),
                spendPrivateKey: '0x' + Buffer.from(spendPrivateKey).toString('hex'),
                spendPublicKey: '0x' + Buffer.from(spendPublicKey).toString('hex'),
                stealthMetaAddress: this.encodeMetaAddress(
                    '0x' + Buffer.from(scanPublicKey).toString('hex'),
                    '0x' + Buffer.from(spendPublicKey).toString('hex')
                ),
            };
        } catch (error) {
            throw new Error(`Failed to generate stealth keys: ${error.message}`);
        }
    }

    /**
     * Encode meta-address from scan and spend public keys
     * Format: st:eth:{scanPubKey}{spendPubKey}
     * 
     * @param {string} scanPubKey - Scan public key (0x... compressed 33 bytes)
     * @param {string} spendPubKey - Spend public key (0x... compressed 33 bytes)
     * @returns {string} Encoded meta-address
     */
    encodeMetaAddress(scanPubKey, spendPubKey) {
        if (!scanPubKey || !spendPubKey) {
            throw new Error('Scan and spend public keys are required');
        }

        // Remove 0x prefix and concatenate
        const scanKey = scanPubKey.startsWith('0x') ? scanPubKey.slice(2) : scanPubKey;
        const spendKey = spendPubKey.startsWith('0x') ? spendPubKey.slice(2) : spendPubKey;

        return `st:eth:${scanKey}${spendKey}`;
    }

    /**
     * Decode meta-address into scan and spend public keys
     * @param {string} metaAddress - Stealth meta-address
     * @returns {Object} Decoded keys
     */
    decodeMetaAddress(metaAddress) {
        try {
            const parts = metaAddress.split(':');

            if (parts.length !== 3 || parts[0] !== 'st' || parts[1] !== 'eth') {
                throw new Error('Invalid meta-address format');
            }

            const keys = parts[2];

            // Compressed public keys are 33 bytes = 66 hex chars each = 132 total
            if (keys.length !== 132) {
                throw new Error('Invalid meta-address length');
            }

            const scanPubKey = '0x' + keys.slice(0, 66);
            const spendPubKey = '0x' + keys.slice(66);

            return { scanPubKey, spendPubKey };
        } catch (error) {
            throw new Error(`Failed to decode meta-address: ${error.message}`);
        }
    }

    /**
     * Generate one-time stealth address for payment
     * @param {string} recipientMetaAddress - Recipient's meta-address
     * @returns {Object} Stealth payment details
     * 
     * @example
     * const payment = stealthService.generateStealthAddress(metaAddress);
     * // Send funds to payment.stealthAddress
     * // Publish payment.ephemeralPublicKey on-chain
     */
    generateStealthAddress(recipientMetaAddress) {
        try {
            // Decode recipient's meta-address
            const { scanPubKey, spendPubKey } = this.decodeMetaAddress(recipientMetaAddress);

            // Generate ephemeral key pair
            const ephemeralPrivateKey = secp256k1.utils.randomSecretKey();
            const ephemeralPublicKey = secp256k1.getPublicKey(ephemeralPrivateKey, true);

            // Compute shared secret using ECDH (actual elliptic curve point multiplication)
            const sharedSecret = this._computeSharedSecret(ephemeralPrivateKey, scanPubKey);

            // Derive stealth address using proper ECC point addition
            const stealthAddress = this._deriveStealthAddress(spendPubKey, sharedSecret);

            return {
                stealthAddress,
                ephemeralPublicKey: '0x' + Buffer.from(ephemeralPublicKey).toString('hex'),
                // Ephemeral private key is intentionally not exposed
                // The sender does not need it after generating the stealth address
            };
        } catch (error) {
            throw new Error(`Failed to generate stealth address: ${error.message}`);
        }
    }

    /**
     * Compute ECDH shared secret using actual elliptic curve point multiplication
     * SharedSecret = Hash(ephemeralPrivKey * scanPubKey)
     * 
     * @private
     * @param {Uint8Array|string} privateKey - Private key (raw bytes or hex)
     * @param {string} publicKey - Public key (hex with 0x prefix)
     * @returns {Uint8Array} Shared secret (32 bytes)
     */
    _computeSharedSecret(privateKey, publicKey) {
        try {
            // Convert private key to Uint8Array if string
            const privKeyBytes = typeof privateKey === 'string'
                ? this._hexToBytes(privateKey)
                : privateKey;

            // Convert public key to Uint8Array
            const pubKeyBytes = this._hexToBytes(publicKey);

            // Perform ECDH: multiply public key point by private key scalar
            // This is the actual elliptic curve point multiplication
            const sharedPoint = secp256k1.getSharedSecret(privKeyBytes, pubKeyBytes);

            // Hash the shared point to get the shared secret
            // Use only the x-coordinate (first 32 bytes after the prefix)
            return sha256(sharedPoint.slice(1, 33));
        } catch (error) {
            throw new Error(`Failed to compute shared secret: ${error.message}`);
        }
    }

    /**
     * Derive stealth address from spend key and shared secret
     * Uses proper ECC point addition: stealthPubKey = spendPubKey + Hash(sharedSecret) * G
     * 
     * @private
     * @param {string} spendPubKey - Spend public key (hex)
     * @param {Uint8Array} sharedSecret - Shared secret from ECDH
     * @returns {string} Stealth Ethereum address
     */
    _deriveStealthAddress(spendPubKey, sharedSecret) {
        try {
            // Hash shared secret to get scalar for G multiplication
            const secretScalar = sha256(sharedSecret);

            // Compute offset public key: secretScalar * G (uncompressed)
            const offsetPubKey = secp256k1.getPublicKey(secretScalar, false);

            // Get spend public key as Point (expects hex string without 0x)
            const spendPubKeyHex = spendPubKey.startsWith('0x') ? spendPubKey.slice(2) : spendPubKey;
            const spendPoint = secp256k1.Point.fromHex(spendPubKeyHex);

            // Get offset point from uncompressed bytes
            const offsetPubKeyHex = Buffer.from(offsetPubKey).toString('hex');
            const offsetPoint = secp256k1.Point.fromHex(offsetPubKeyHex);

            // Perform ECC point addition: stealthPubKey = spendPubKey + offsetPubKey
            const stealthPoint = spendPoint.add(offsetPoint);

            // Convert to uncompressed public key bytes (65 bytes: 0x04 || x || y)
            const stealthPubKeyBytes = stealthPoint.toBytes(false);

            // Derive Ethereum address from public key
            // Ethereum address = last 20 bytes of keccak256(pubkey[1:])
            const pubKeyHash = keccak_256(stealthPubKeyBytes.slice(1));
            const address = '0x' + Buffer.from(pubKeyHash.slice(-20)).toString('hex');

            return ethers.getAddress(address); // Checksum address
        } catch (error) {
            throw new Error(`Failed to derive stealth address: ${error.message}`);
        }
    }

    /**
     * Derive private key for stealth address (recipient side)
     * stealthPrivKey = spendPrivKey + Hash(Hash(scanPrivKey * ephemeralPubKey))
     * 
     * @param {string} scanPrivateKey - Recipient's scan private key
     * @param {string} spendPrivateKey - Recipient's spend private key
     * @param {string} ephemeralPublicKey - Sender's ephemeral public key
     * @returns {string} Private key for stealth address (hex with 0x prefix)
     */
    deriveStealthPrivateKey(scanPrivateKey, spendPrivateKey, ephemeralPublicKey) {
        try {
            // Compute shared secret using scan private key and ephemeral public key
            const scanPrivBytes = this._hexToBytes(scanPrivateKey);
            const sharedSecret = this._computeSharedSecret(scanPrivBytes, ephemeralPublicKey);

            // Hash shared secret to get scalar offset
            const secretScalar = sha256(sharedSecret);

            // Convert spend private key to BigInt
            const spendPrivBytes = this._hexToBytes(spendPrivateKey);
            const spendPrivBigInt = BigInt('0x' + Buffer.from(spendPrivBytes).toString('hex'));

            // Convert secret scalar to BigInt
            const secretBigInt = BigInt('0x' + Buffer.from(secretScalar).toString('hex'));

            // Compute stealth private key: (spendPrivKey + secretScalar) mod n
            const n = BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141');
            const stealthPrivBigInt = (spendPrivBigInt + secretBigInt) % n;

            // Convert back to hex
            const stealthPrivHex = stealthPrivBigInt.toString(16).padStart(64, '0');
            return '0x' + stealthPrivHex;
        } catch (error) {
            throw new Error(`Failed to derive stealth private key: ${error.message}`);
        }
    }

    /**
     * Scan for incoming stealth payments
     * @param {string} scanPrivateKey - Recipient's scan private key
     * @param {string} spendPublicKey - Recipient's spend public key
     * @param {Array<Object>} ephemeralPubKeys - Array of ephemeral keys from blockchain
     * @returns {Array<Object>} Detected stealth payments
     * 
     * @example
     * const payments = stealthService.scanForPayments(
     *   scanPrivKey,
     *   spendPubKey,
     *   [{ publicKey: '0x...', txHash: '0x...' }]
     * );
     */
    scanForPayments(scanPrivateKey, spendPublicKey, ephemeralPubKeys) {
        if (!Array.isArray(ephemeralPubKeys)) {
            throw new Error('ephemeralPubKeys must be an array');
        }

        const detectedPayments = [];

        try {
            const scanPrivBytes = this._hexToBytes(scanPrivateKey);

            for (const ephPubKey of ephemeralPubKeys) {
                if (!ephPubKey.publicKey) {
                    continue;
                }

                try {
                    // Compute shared secret
                    const sharedSecret = this._computeSharedSecret(
                        scanPrivBytes,
                        ephPubKey.publicKey
                    );

                    // Derive stealth address
                    const stealthAddress = this._deriveStealthAddress(
                        spendPublicKey,
                        sharedSecret
                    );

                    detectedPayments.push({
                        stealthAddress,
                        ephemeralPublicKey: ephPubKey.publicKey,
                        txHash: ephPubKey.txHash || null,
                        blockNumber: ephPubKey.blockNumber || null,
                        timestamp: ephPubKey.timestamp || Date.now(),
                    });
                } catch (e) {
                    // Skip invalid ephemeral keys
                    continue;
                }
            }

            return detectedPayments;
        } catch (error) {
            throw new Error(`Failed to scan for payments: ${error.message}`);
        }
    }

    /**
     * Validate stealth meta-address format
     * @param {string} metaAddress - Meta-address to validate
     * @returns {boolean} True if valid
     */
    validateMetaAddress(metaAddress) {
        try {
            if (typeof metaAddress !== 'string') {
                return false;
            }

            const parts = metaAddress.split(':');

            if (parts.length !== 3) {
                return false;
            }

            if (parts[0] !== 'st' || parts[1] !== 'eth') {
                return false;
            }

            // Check key length (2 compressed public keys = 132 hex chars)
            if (parts[2].length !== 132) {
                return false;
            }

            // Try to decode
            this.decodeMetaAddress(metaAddress);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Convert hex string to Uint8Array
     * @private
     * @param {string} hex - Hex string (with or without 0x prefix)
     * @returns {Uint8Array}
     */
    _hexToBytes(hex) {
        const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
        const bytes = new Uint8Array(cleanHex.length / 2);
        for (let i = 0; i < bytes.length; i++) {
            bytes[i] = parseInt(cleanHex.substr(i * 2, 2), 16);
        }
        return bytes;
    }

    /**
     * Get service information
     * @returns {Object} Service info
     */
    getServiceInfo() {
        return {
            name: 'Stealth Address Service',
            version: '2.0.0',
            curve: 'secp256k1',
            library: '@noble/secp256k1',
            keyExchange: 'ECDH (actual elliptic curve point multiplication)',
            features: [
                'Proper ECDH via secp256k1 scalar multiplication',
                'ECC point addition for stealth key derivation',
                'One-time addresses per payment',
                'Blockchain scanning for payment detection',
                'Private key derivation for spending',
            ],
        };
    }
}

export default new StealthAddressService();
