import * as bip39 from 'bip39';
import { BIP32Factory } from 'bip32';
import * as ecc from 'tiny-secp256k1';
import crypto from 'crypto';

const bip32 = BIP32Factory(ecc);

/**
 * BIP-85 Service - Deterministic Entropy From BIP32 Keychains
 * 
 * Allows deriving multiple independent mnemonics from a single master seed
 * This is useful for:
 * - Creating separate wallets for different purposes (personal, business, savings)
 * - Generating child wallets without exposing the master seed
 * - Deterministic wallet generation for backup purposes
 * 
 * Derivation Path: m/83696968'/39'/0'/{language}'/0'/{words}'/index'
 * 
 * Reference: https://github.com/bitcoin/bips/blob/master/bip-0085.mediawiki
 */

class BIP85Service {
    /**
     * Derive child mnemonic from master mnemonic using BIP-85
     * @param {string} masterMnemonic - Master mnemonic phrase (12, 18, or 24 words)
     * @param {number} index - Child index (0-2^31-1)
     * @param {number} wordCount - Words in derived mnemonic (12, 18, or 24)
     * @param {number} language - Language code (0 = English)
     * @returns {string} - Derived mnemonic phrase
     */
    deriveChildMnemonic(masterMnemonic, index = 0, wordCount = 12, language = 0) {
        // Validation
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
            // Convert mnemonic to seed
            const seed = bip39.mnemonicToSeedSync(masterMnemonic);
            const root = bip32.fromSeed(seed);

            // Calculate entropy bits needed
            const entropyBits = wordCount === 12 ? 128 : wordCount === 18 ? 192 : 256;
            const entropyBytes = entropyBits / 8;

            // Calculate words path component
            // 12 words = 0, 18 words = 1, 24 words = 2
            const wordsPath = (wordCount - 12) / 6;

            // BIP-85 derivation path
            // m/83696968'/39'/0'/{language}'/0'/{words}'/index'
            const BIP85_PURPOSE = 83696968;
            const APPLICATION_BIP39 = 39;
            const path = `m/${BIP85_PURPOSE}'/${APPLICATION_BIP39}'/0'/${language}'/0'/${wordsPath}'/${index}'`;

            // Derive child key
            const child = root.derivePath(path);

            // Extract entropy from private key
            const entropy = child.privateKey.slice(0, entropyBytes);

            // Convert entropy to mnemonic
            const derivedMnemonic = bip39.entropyToMnemonic(entropy);

            return derivedMnemonic;
        } catch (error) {
            console.error('BIP-85 derivation error:', error.message);
            throw new Error('Failed to derive child mnemonic: ' + error.message);
        }
    }

    /**
     * Derive multiple child wallets from master mnemonic
     * @param {string} masterMnemonic - Master mnemonic
     * @param {number} count - Number of child wallets to derive
     * @param {number} wordCount - Words per child mnemonic
     * @returns {Array<Object>} - Array of derived wallets
     */
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

    /**
     * Create hierarchical wallet structure
     * @param {string} masterMnemonic - Master mnemonic
     * @param {Object} structure - Wallet structure definition
     * @returns {Object} - Hierarchical wallet structure
     */
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

    /**
     * Validate BIP-85 derivation
     * @param {string} masterMnemonic - Master mnemonic
     * @param {string} derivedMnemonic - Derived mnemonic to validate
     * @param {number} index - Expected index
     * @param {number} wordCount - Expected word count
     * @returns {boolean} - True if derivation is valid
     */
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

    /**
     * Get derivation info without exposing the mnemonic
     * @param {number} index - Child index
     * @param {number} wordCount - Word count
     * @param {number} language - Language code
     * @returns {Object} - Derivation information
     */
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

    /**
     * Generate recovery instructions for BIP-85 wallets
     * @param {string} masterMnemonic - Master mnemonic (for display purposes only)
     * @param {Array<Object>} derivedWallets - List of derived wallets
     * @returns {string} - Recovery instructions
     */
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
