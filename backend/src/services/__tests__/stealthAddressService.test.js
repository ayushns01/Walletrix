import stealthAddressService from '../stealthAddressService.js';

describe('StealthAddressService', () => {
    describe('Key Generation', () => {
        it('should generate stealth keys', () => {
            const keys = stealthAddressService.generateStealthKeys();

            expect(keys).toHaveProperty('scanPrivateKey');
            expect(keys).toHaveProperty('scanPublicKey');
            expect(keys).toHaveProperty('spendPrivateKey');
            expect(keys).toHaveProperty('spendPublicKey');
            expect(keys).toHaveProperty('stealthMetaAddress');
        });

        it('should generate different keys each time', () => {
            const keys1 = stealthAddressService.generateStealthKeys();
            const keys2 = stealthAddressService.generateStealthKeys();

            expect(keys1.scanPrivateKey).not.toBe(keys2.scanPrivateKey);
            expect(keys1.spendPrivateKey).not.toBe(keys2.spendPrivateKey);
        });

        it('should generate valid Ethereum keys', () => {
            const keys = stealthAddressService.generateStealthKeys();

            expect(keys.scanPrivateKey).toMatch(/^0x[0-9a-f]{64}$/i);
            expect(keys.spendPrivateKey).toMatch(/^0x[0-9a-f]{64}$/i);
            expect(keys.scanPublicKey).toMatch(/^0x[0-9a-f]{66}$/i); // Compressed format
            expect(keys.spendPublicKey).toMatch(/^0x[0-9a-f]{66}$/i);
        });
    });

    describe('Meta-Address Encoding/Decoding', () => {
        it('should encode meta-address with compressed keys', () => {
            const keys = stealthAddressService.generateStealthKeys();
            const metaAddress = keys.stealthMetaAddress;

            expect(metaAddress).toMatch(/^st:eth:/);
            expect(metaAddress.length).toBe(139); // st:eth: (7) + 132 hex chars
        });

        it('should decode meta-address', () => {
            const keys = stealthAddressService.generateStealthKeys();
            const decoded = stealthAddressService.decodeMetaAddress(keys.stealthMetaAddress);

            expect(decoded).toHaveProperty('scanPubKey');
            expect(decoded).toHaveProperty('spendPubKey');
        });

        it('should encode and decode correctly', () => {
            const keys = stealthAddressService.generateStealthKeys();
            const decoded = stealthAddressService.decodeMetaAddress(keys.stealthMetaAddress);

            expect(decoded.scanPubKey).toBe(keys.scanPublicKey);
            expect(decoded.spendPubKey).toBe(keys.spendPublicKey);
        });

        it('should reject invalid meta-address format', () => {
            expect(() => {
                stealthAddressService.decodeMetaAddress('invalid');
            }).toThrow('Invalid meta-address format');
        });

        it('should reject meta-address with wrong prefix', () => {
            expect(() => {
                stealthAddressService.decodeMetaAddress('wrong:eth:' + 'a'.repeat(132));
            }).toThrow('Invalid meta-address format');
        });

        it('should reject meta-address with wrong length', () => {
            expect(() => {
                stealthAddressService.decodeMetaAddress('st:eth:' + 'a'.repeat(100));
            }).toThrow('Invalid meta-address length');
        });
    });

    describe('Stealth Address Generation', () => {
        it('should generate stealth address', () => {
            const keys = stealthAddressService.generateStealthKeys();
            const payment = stealthAddressService.generateStealthAddress(keys.stealthMetaAddress);

            expect(payment).toHaveProperty('stealthAddress');
            expect(payment).toHaveProperty('ephemeralPublicKey');
            expect(payment.stealthAddress).toMatch(/^0x[0-9a-f]{40}$/i);
        });

        it('should generate unique stealth addresses', () => {
            const keys = stealthAddressService.generateStealthKeys();
            const payment1 = stealthAddressService.generateStealthAddress(keys.stealthMetaAddress);
            const payment2 = stealthAddressService.generateStealthAddress(keys.stealthMetaAddress);

            expect(payment1.stealthAddress).not.toBe(payment2.stealthAddress);
            expect(payment1.ephemeralPublicKey).not.toBe(payment2.ephemeralPublicKey);
        });

        it('should handle invalid meta-address', () => {
            expect(() => {
                stealthAddressService.generateStealthAddress('invalid');
            }).toThrow();
        });
    });

    describe('Payment Scanning', () => {
        it('should scan for payments', () => {
            const keys = stealthAddressService.generateStealthKeys();
            const payment = stealthAddressService.generateStealthAddress(keys.stealthMetaAddress);

            const detected = stealthAddressService.scanForPayments(
                keys.scanPrivateKey,
                keys.spendPublicKey,
                [{ publicKey: payment.ephemeralPublicKey, txHash: '0x123' }]
            );

            expect(detected).toHaveLength(1);
            expect(detected[0].stealthAddress).toBe(payment.stealthAddress);
        });

        it('should detect multiple payments', () => {
            const keys = stealthAddressService.generateStealthKeys();
            const payment1 = stealthAddressService.generateStealthAddress(keys.stealthMetaAddress);
            const payment2 = stealthAddressService.generateStealthAddress(keys.stealthMetaAddress);

            const detected = stealthAddressService.scanForPayments(
                keys.scanPrivateKey,
                keys.spendPublicKey,
                [
                    { publicKey: payment1.ephemeralPublicKey, txHash: '0x123' },
                    { publicKey: payment2.ephemeralPublicKey, txHash: '0x456' }
                ]
            );

            expect(detected).toHaveLength(2);
        });

        it('should handle empty ephemeral keys array', () => {
            const keys = stealthAddressService.generateStealthKeys();
            const detected = stealthAddressService.scanForPayments(
                keys.scanPrivateKey,
                keys.spendPublicKey,
                []
            );

            expect(detected).toHaveLength(0);
        });

        it('should skip invalid ephemeral keys', () => {
            const keys = stealthAddressService.generateStealthKeys();
            const detected = stealthAddressService.scanForPayments(
                keys.scanPrivateKey,
                keys.spendPublicKey,
                [{ txHash: '0x123' }] // missing publicKey
            );

            expect(detected).toHaveLength(0);
        });

        it('should throw error for non-array input', () => {
            const keys = stealthAddressService.generateStealthKeys();

            expect(() => {
                stealthAddressService.scanForPayments(
                    keys.scanPrivateKey,
                    keys.spendPublicKey,
                    'not-an-array'
                );
            }).toThrow('ephemeralPubKeys must be an array');
        });
    });

    describe('Private Key Derivation', () => {
        it('should derive stealth private key', () => {
            const keys = stealthAddressService.generateStealthKeys();
            const payment = stealthAddressService.generateStealthAddress(keys.stealthMetaAddress);

            const stealthPrivKey = stealthAddressService.deriveStealthPrivateKey(
                keys.scanPrivateKey,
                keys.spendPrivateKey,
                payment.ephemeralPublicKey
            );

            expect(stealthPrivKey).toBeTruthy();
            expect(stealthPrivKey).toMatch(/^0x[0-9a-f]{64}$/i);
        });

        it('should derive consistent private key', () => {
            const keys = stealthAddressService.generateStealthKeys();
            const payment = stealthAddressService.generateStealthAddress(keys.stealthMetaAddress);

            const privKey1 = stealthAddressService.deriveStealthPrivateKey(
                keys.scanPrivateKey,
                keys.spendPrivateKey,
                payment.ephemeralPublicKey
            );

            const privKey2 = stealthAddressService.deriveStealthPrivateKey(
                keys.scanPrivateKey,
                keys.spendPrivateKey,
                payment.ephemeralPublicKey
            );

            expect(privKey1).toBe(privKey2);
        });
    });

    describe('Meta-Address Validation', () => {
        it('should validate correct meta-address', () => {
            const keys = stealthAddressService.generateStealthKeys();
            const isValid = stealthAddressService.validateMetaAddress(keys.stealthMetaAddress);

            expect(isValid).toBe(true);
        });

        it('should reject invalid format', () => {
            const isValid = stealthAddressService.validateMetaAddress('invalid');
            expect(isValid).toBe(false);
        });

        it('should reject wrong prefix', () => {
            const isValid = stealthAddressService.validateMetaAddress('wrong:eth:' + 'a'.repeat(132));
            expect(isValid).toBe(false);
        });

        it('should reject wrong length', () => {
            const isValid = stealthAddressService.validateMetaAddress('st:eth:' + 'a'.repeat(100));
            expect(isValid).toBe(false);
        });

        it('should reject non-string input', () => {
            const isValid = stealthAddressService.validateMetaAddress(123);
            expect(isValid).toBe(false);
        });

        it('should reject null input', () => {
            const isValid = stealthAddressService.validateMetaAddress(null);
            expect(isValid).toBe(false);
        });
    });

    describe('Service Info', () => {
        it('should return service information', () => {
            const info = stealthAddressService.getServiceInfo();

            expect(info).toHaveProperty('name');
            expect(info).toHaveProperty('version');
            expect(info).toHaveProperty('curve');
            expect(info).toHaveProperty('keyExchange');
            expect(info).toHaveProperty('features');
            expect(info.features).toBeInstanceOf(Array);
        });
    });

    describe('Integration Tests', () => {
        it('should complete full stealth payment flow', () => {
            // 1. Recipient generates keys
            const recipientKeys = stealthAddressService.generateStealthKeys();

            // 2. Recipient publishes meta-address
            const metaAddress = recipientKeys.stealthMetaAddress;

            // 3. Sender generates stealth address
            const payment = stealthAddressService.generateStealthAddress(metaAddress);

            // 4. Sender sends funds to stealth address (simulated)
            expect(payment.stealthAddress).toBeTruthy();

            // 5. Recipient scans for payments
            const detected = stealthAddressService.scanForPayments(
                recipientKeys.scanPrivateKey,
                recipientKeys.spendPublicKey,
                [{ publicKey: payment.ephemeralPublicKey, txHash: '0xabc' }]
            );

            expect(detected).toHaveLength(1);
            expect(detected[0].stealthAddress).toBe(payment.stealthAddress);

            // 6. Recipient derives private key to spend
            const stealthPrivKey = stealthAddressService.deriveStealthPrivateKey(
                recipientKeys.scanPrivateKey,
                recipientKeys.spendPrivateKey,
                payment.ephemeralPublicKey
            );

            expect(stealthPrivKey).toBeTruthy();
        });

        it('should handle multiple recipients', () => {
            const recipient1 = stealthAddressService.generateStealthKeys();
            const recipient2 = stealthAddressService.generateStealthKeys();

            const payment1 = stealthAddressService.generateStealthAddress(recipient1.stealthMetaAddress);
            const payment2 = stealthAddressService.generateStealthAddress(recipient2.stealthMetaAddress);

            // Recipient 1 scans - will see both payments but only payment1 is theirs
            const detected1 = stealthAddressService.scanForPayments(
                recipient1.scanPrivateKey,
                recipient1.spendPublicKey,
                [
                    { publicKey: payment1.ephemeralPublicKey, txHash: '0x1' },
                    { publicKey: payment2.ephemeralPublicKey, txHash: '0x2' }
                ]
            );

            // Both payments will be "detected" but only payment1 belongs to recipient1
            expect(detected1).toHaveLength(2);
            expect(detected1[0].stealthAddress).toBe(payment1.stealthAddress);
        });
    });

    describe('Performance', () => {
        it('should generate keys in reasonable time (<100ms)', () => {
            const start = Date.now();
            stealthAddressService.generateStealthKeys();
            const duration = Date.now() - start;

            expect(duration).toBeLessThan(100);
        });

        it('should generate stealth address in reasonable time (<100ms)', () => {
            const keys = stealthAddressService.generateStealthKeys();

            const start = Date.now();
            stealthAddressService.generateStealthAddress(keys.stealthMetaAddress);
            const duration = Date.now() - start;

            expect(duration).toBeLessThan(100);
        });

        it('should scan 100 payments in reasonable time (<1s)', () => {
            const keys = stealthAddressService.generateStealthKeys();

            // Generate 100 ephemeral keys
            const ephemeralKeys = [];
            for (let i = 0; i < 100; i++) {
                const tempKeys = stealthAddressService.generateStealthKeys();
                ephemeralKeys.push({
                    publicKey: tempKeys.scanPublicKey,
                    txHash: `0x${i}`
                });
            }

            const start = Date.now();
            stealthAddressService.scanForPayments(
                keys.scanPrivateKey,
                keys.spendPublicKey,
                ephemeralKeys
            );
            const duration = Date.now() - start;

            expect(duration).toBeLessThan(1000);
        });
    });
});
