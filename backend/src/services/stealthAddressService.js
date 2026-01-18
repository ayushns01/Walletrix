import { ethers } from 'ethers';
import * as secp256k1 from '@noble/secp256k1';
import { sha256 } from '@noble/hashes/sha2.js';
import { keccak_256 } from '@noble/hashes/sha3.js';

class StealthAddressService {

    generateStealthKeys() {
        try {

            const scanPrivateKey = secp256k1.utils.randomSecretKey();
            const scanPublicKey = secp256k1.getPublicKey(scanPrivateKey, true);

            const spendPrivateKey = secp256k1.utils.randomSecretKey();
            const spendPublicKey = secp256k1.getPublicKey(spendPrivateKey, true);

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

    encodeMetaAddress(scanPubKey, spendPubKey) {
        if (!scanPubKey || !spendPubKey) {
            throw new Error('Scan and spend public keys are required');
        }

        const scanKey = scanPubKey.startsWith('0x') ? scanPubKey.slice(2) : scanPubKey;
        const spendKey = spendPubKey.startsWith('0x') ? spendPubKey.slice(2) : spendPubKey;

        return `st:eth:${scanKey}${spendKey}`;
    }

    decodeMetaAddress(metaAddress) {
        try {
            const parts = metaAddress.split(':');

            if (parts.length !== 3 || parts[0] !== 'st' || parts[1] !== 'eth') {
                throw new Error('Invalid meta-address format');
            }

            const keys = parts[2];

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

    generateStealthAddress(recipientMetaAddress) {
        try {

            const { scanPubKey, spendPubKey } = this.decodeMetaAddress(recipientMetaAddress);

            const ephemeralPrivateKey = secp256k1.utils.randomSecretKey();
            const ephemeralPublicKey = secp256k1.getPublicKey(ephemeralPrivateKey, true);

            const sharedSecret = this._computeSharedSecret(ephemeralPrivateKey, scanPubKey);

            const stealthAddress = this._deriveStealthAddress(spendPubKey, sharedSecret);

            return {
                stealthAddress,
                ephemeralPublicKey: '0x' + Buffer.from(ephemeralPublicKey).toString('hex'),

            };
        } catch (error) {
            throw new Error(`Failed to generate stealth address: ${error.message}`);
        }
    }

    _computeSharedSecret(privateKey, publicKey) {
        try {

            const privKeyBytes = typeof privateKey === 'string'
                ? this._hexToBytes(privateKey)
                : privateKey;

            const pubKeyBytes = this._hexToBytes(publicKey);

            const sharedPoint = secp256k1.getSharedSecret(privKeyBytes, pubKeyBytes);

            return sha256(sharedPoint.slice(1, 33));
        } catch (error) {
            throw new Error(`Failed to compute shared secret: ${error.message}`);
        }
    }

    _deriveStealthAddress(spendPubKey, sharedSecret) {
        try {

            const secretScalar = sha256(sharedSecret);

            const offsetPubKey = secp256k1.getPublicKey(secretScalar, false);

            const spendPubKeyHex = spendPubKey.startsWith('0x') ? spendPubKey.slice(2) : spendPubKey;
            const spendPoint = secp256k1.Point.fromHex(spendPubKeyHex);

            const offsetPubKeyHex = Buffer.from(offsetPubKey).toString('hex');
            const offsetPoint = secp256k1.Point.fromHex(offsetPubKeyHex);

            const stealthPoint = spendPoint.add(offsetPoint);

            const stealthPubKeyBytes = stealthPoint.toBytes(false);

            const pubKeyHash = keccak_256(stealthPubKeyBytes.slice(1));
            const address = '0x' + Buffer.from(pubKeyHash.slice(-20)).toString('hex');

            return ethers.getAddress(address);
        } catch (error) {
            throw new Error(`Failed to derive stealth address: ${error.message}`);
        }
    }

    deriveStealthPrivateKey(scanPrivateKey, spendPrivateKey, ephemeralPublicKey) {
        try {

            const scanPrivBytes = this._hexToBytes(scanPrivateKey);
            const sharedSecret = this._computeSharedSecret(scanPrivBytes, ephemeralPublicKey);

            const secretScalar = sha256(sharedSecret);

            const spendPrivBytes = this._hexToBytes(spendPrivateKey);
            const spendPrivBigInt = BigInt('0x' + Buffer.from(spendPrivBytes).toString('hex'));

            const secretBigInt = BigInt('0x' + Buffer.from(secretScalar).toString('hex'));

            const n = BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141');
            const stealthPrivBigInt = (spendPrivBigInt + secretBigInt) % n;

            const stealthPrivHex = stealthPrivBigInt.toString(16).padStart(64, '0');
            return '0x' + stealthPrivHex;
        } catch (error) {
            throw new Error(`Failed to derive stealth private key: ${error.message}`);
        }
    }

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

                    const sharedSecret = this._computeSharedSecret(
                        scanPrivBytes,
                        ephPubKey.publicKey
                    );

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

                    continue;
                }
            }

            return detectedPayments;
        } catch (error) {
            throw new Error(`Failed to scan for payments: ${error.message}`);
        }
    }

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

            if (parts[2].length !== 132) {
                return false;
            }

            this.decodeMetaAddress(metaAddress);
            return true;
        } catch {
            return false;
        }
    }

    _hexToBytes(hex) {
        const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
        const bytes = new Uint8Array(cleanHex.length / 2);
        for (let i = 0; i < bytes.length; i++) {
            bytes[i] = parseInt(cleanHex.substr(i * 2, 2), 16);
        }
        return bytes;
    }

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
