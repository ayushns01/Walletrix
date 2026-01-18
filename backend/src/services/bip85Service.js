import * as bip39 from 'bip39';
import { BIP32Factory } from 'bip32';
import * as ecc from 'tiny-secp256k1';
import crypto from 'crypto';

const bip32 = BIP32Factory(ecc);

class BIP85Service {

    deriveChildMnemonic(masterMnemonic, index = 0, wordCount = 12, language = 0) {

        if (!bip39.validateMnemonic(masterMnemonic)) {
            throw new Error('Invalid master mnemonic');
        }

        if (![12, 18, 24].includes(wordCount)) {
            throw new Error('Word count must be 12, 18, or 24');
        }

        if (index < 0 || index >= Math.pow(2, 31)) {
            throw new Error('Index must be between 0 and 2^31-1');
        }

        if (language < 0 || language > 8) {
            throw new Error('Language code must be between 0 and 8');
        }

        try {

            const seed = bip39.mnemonicToSeedSync(masterMnemonic);
            const root = bip32.fromSeed(seed);

            const entropyBits = wordCount === 12 ? 128 : wordCount === 18 ? 192 : 256;
            const entropyBytes = entropyBits / 8;

            const wordsPath = (wordCount - 12) / 6;

            const BIP85_PURPOSE = 83696968;
            const APPLICATION_BIP39 = 39;
            const path = `m/${BIP85_PURPOSE}'/${APPLICATION_BIP39}'/0'/${language}'/0'/${wordsPath}'/${index}'`;

            const child = root.derivePath(path);

            const entropy = child.privateKey.slice(0, entropyBytes);

            const derivedMnemonic = bip39.entropyToMnemonic(entropy);

            return derivedMnemonic;
        } catch (error) {
            console.error('BIP-85 derivation error:', error.message);
            throw new Error('Failed to derive child mnemonic: ' + error.message);
        }
    }

    deriveMultipleWallets(masterMnemonic, count = 3, wordCount = 12) {
        if (!bip39.validateMnemonic(masterMnemonic)) {
            throw new Error('Invalid master mnemonic');
        }

        if (count < 1 || count > 100) {
            throw new Error('Count must be between 1 and 100');
        }

        const wallets = [];

        for (let i = 0; i < count; i++) {
            try {
                const childMnemonic = this.deriveChildMnemonic(masterMnemonic, i, wordCount);

                wallets.push({
                    index: i,
                    mnemonic: childMnemonic,
                    purpose: `Child Wallet ${i + 1}`,
                    wordCount,
                    derivationPath: `m/83696968'/39'/0'/0'/0'/${(wordCount - 12) / 6}'/${i}'`,
                });
            } catch (error) {
                console.error(`Failed to derive wallet ${i}:`, error.message);
            }
        }

        return wallets;
    }

    createWalletHierarchy(masterMnemonic, structure = {}) {
        const defaultStructure = {
            personal: { index: 0, wordCount: 12 },
            business: { index: 1, wordCount: 12 },
            savings: { index: 2, wordCount: 24 },
            trading: { index: 3, wordCount: 12 },
        };

        const walletStructure = { ...defaultStructure, ...structure };
        const hierarchy = {};

        for (const [purpose, config] of Object.entries(walletStructure)) {
            try {
                const mnemonic = this.deriveChildMnemonic(
                    masterMnemonic,
                    config.index,
                    config.wordCount
                );

                hierarchy[purpose] = {
                    mnemonic,
                    index: config.index,
                    wordCount: config.wordCount,
                    purpose,
                };
            } catch (error) {
                console.error(`Failed to create ${purpose} wallet:`, error.message);
            }
        }

        return hierarchy;
    }

    validateDerivation(masterMnemonic, derivedMnemonic, index, wordCount) {
        try {
            const expectedMnemonic = this.deriveChildMnemonic(
                masterMnemonic,
                index,
                wordCount
            );
            return expectedMnemonic === derivedMnemonic;
        } catch (error) {
            return false;
        }
    }

    getDerivationInfo(index, wordCount = 12, language = 0) {
        const wordsPath = (wordCount - 12) / 6;
        const path = `m/83696968'/39'/0'/${language}'/0'/${wordsPath}'/${index}'`;

        return {
            index,
            wordCount,
            language,
            path,
            purpose: 'BIP-85 Deterministic Entropy',
            standard: 'BIP-85',
        };
    }

    generateRecoveryInstructions(derivedWallets) {
        return `
BIP-85 WALLET RECOVERY INSTRUCTIONS
===================================

Your wallets are derived using BIP-85 deterministic entropy.
This means all child wallets can be recovered from your master seed.

Master Seed:
- Keep your master mnemonic phrase extremely secure
- NEVER share it with anyone
- Store it offline in multiple secure locations

Derived Wallets:
${derivedWallets.map((w, i) => `
${i + 1}. ${w.purpose}
   - Index: ${w.index}
   - Word Count: ${w.wordCount}
   - Path: ${w.derivationPath}
`).join('')}

To Recover:
1. Import your master mnemonic into a BIP-85 compatible wallet
2. Derive child wallets using the same indices
3. All funds will be accessible

Security Notes:
- If master seed is compromised, ALL child wallets are compromised
- Child mnemonics are independent - losing one doesn't affect others
- You only need to backup the master mnemonic
    `.trim();
    }
}

export default new BIP85Service();
