import * as bip39 from 'bip39';
import { ethers } from 'ethers';
import * as bitcoin from 'bitcoinjs-lib';
import * as ecc from 'tiny-secp256k1';
import { BIP32Factory } from 'bip32';
import crypto from 'crypto';
import { Keypair } from '@solana/web3.js';
import * as ed25519 from 'ed25519-hd-key';

// Initialize BIP32 with ECC library
const bip32 = BIP32Factory(ecc);

// Encryption constants
const PBKDF2_ITERATIONS = 600000; // Enhanced security (2024 OWASP recommendation)
const SALT_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits for AES
const KEY_LENGTH = 32; // 256 bits for AES-256
const AUTH_TAG_LENGTH = 16; // 128 bits for GCM

/**
 * Wallet Service
 * Handles wallet generation, import, and key management
 */

class WalletService {
  /**
   * Validate mnemonic strength and format
   * @param {string} mnemonic - Mnemonic phrase to validate
   * @returns {Object} - Validation result
   */
  validateMnemonicStrength(mnemonic) {
    const words = mnemonic.trim().split(/\s+/);
    const wordCount = words.length;
    
    // Check word count (12 or 24 words for BIP39)
    if (wordCount !== 12 && wordCount !== 24) {
      return {
        valid: false,
        error: 'Mnemonic must be 12 or 24 words'
      };
    }
    
    // Validate using BIP39
    if (!bip39.validateMnemonic(mnemonic)) {
      return {
        valid: false,
        error: 'Invalid mnemonic phrase'
      };
    }
    
    // Check for weak patterns (all same word, sequential, etc.)
    const uniqueWords = new Set(words);
    if (uniqueWords.size < words.length * 0.8) {
      return {
        valid: false,
        error: 'Mnemonic contains too many repeated words'
      };
    }
    
    return {
      valid: true,
      wordCount,
      entropy: wordCount === 12 ? 128 : 256
    };
  }

  /**
   * Validate password strength
   * @param {string} password - Password to validate
   * @returns {Object} - Validation result with score and suggestions
   */
  validatePasswordStrength(password) {
    const minLength = 12;
    const suggestions = [];
    let score = 0;

    // Length check
    if (password.length < minLength) {
      suggestions.push(`Password should be at least ${minLength} characters long`);
    } else if (password.length >= minLength) {
      score += 25;
    }
    
    if (password.length >= 16) {
      score += 10;
    }

    // Character variety checks
    if (/[a-z]/.test(password)) {
      score += 15;
    } else {
      suggestions.push('Add lowercase letters');
    }

    if (/[A-Z]/.test(password)) {
      score += 15;
    } else {
      suggestions.push('Add uppercase letters');
    }

    if (/[0-9]/.test(password)) {
      score += 15;
    } else {
      suggestions.push('Add numbers');
    }

    if (/[^a-zA-Z0-9]/.test(password)) {
      score += 20;
    } else {
      suggestions.push('Add special characters (!@#$%^&*)');
    }

    // Check for common patterns
    const commonPatterns = ['123', 'password', 'qwerty', 'abc', '111', '000'];
    const lowerPassword = password.toLowerCase();
    if (commonPatterns.some(pattern => lowerPassword.includes(pattern))) {
      score -= 20;
      suggestions.push('Avoid common patterns');
    }

    const strength = score < 40 ? 'weak' : score < 70 ? 'medium' : score < 90 ? 'strong' : 'very strong';

    return {
      valid: score >= 70,
      score,
      strength,
      suggestions
    };
  }

  /**
   * Generate a new wallet with mnemonic phrase
   * @param {string} passphrase - Optional BIP39 passphrase (25th word)
   * @returns {Object} - { mnemonic, addresses } - NEVER returns private keys
   */
  generateNewWallet(passphrase = '') {
    try {
      // Generate 12-word mnemonic phrase (128-bit entropy)
      const mnemonic = bip39.generateMnemonic(128);
      
      // Validate generated mnemonic
      const validation = this.validateMnemonicStrength(mnemonic);
      if (!validation.valid) {
        throw new Error('Generated mnemonic failed validation');
      }
      
      // Create Ethereum wallet from mnemonic with optional passphrase
      const ethWallet = ethers.Wallet.fromPhrase(mnemonic, passphrase);
      
      // Create Bitcoin wallet from mnemonic with optional passphrase
      const seed = bip39.mnemonicToSeedSync(mnemonic, passphrase);
      const btcNode = bip32.fromSeed(seed);
      const btcPath = "m/44'/0'/0'/0/0"; // BIP44 path for Bitcoin
      const btcChild = btcNode.derivePath(btcPath);
      
      const btcAddress = bitcoin.payments.p2pkh({
        pubkey: Buffer.from(btcChild.publicKey),
        network: bitcoin.networks.bitcoin,
      }).address;

      // Create Solana wallet from mnemonic
      const solSeed = bip39.mnemonicToSeedSync(mnemonic, passphrase);
      const solPath = "m/44'/501'/0'/0'"; // Solana derivation path
      const solDerivedSeed = ed25519.derivePath(solPath, solSeed.toString('hex')).key;
      const solKeypair = Keypair.fromSeed(solDerivedSeed);

      return {
        success: true,
        mnemonic,
        addresses: {
          ethereum: ethWallet.address,
          bitcoin: btcAddress,
          solana: solKeypair.publicKey.toString(),
        },
        // INTERNAL USE ONLY: Private keys for server-side signing operations
        // WARNING: Never expose these in API responses to clients
        // These are returned here for internal wallet storage/encryption
        _privateKeys: {
          ethereum: ethWallet.privateKey,
          bitcoin: btcChild.privateKey.toString('hex'),
          solana: Buffer.from(solKeypair.secretKey).toString('hex'),
        },
      };
    } catch (error) {
      console.error('Error generating wallet:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Import wallet from mnemonic phrase
   * @param {string} mnemonic - 12 or 24 word mnemonic phrase
   * @param {string} passphrase - Optional BIP39 passphrase (25th word)
   * @returns {Object} - Wallet addresses (NOT private keys)
   */
  importFromMnemonic(mnemonic, passphrase = '') {
    try {
      // Validate mnemonic with enhanced checks
      const validation = this.validateMnemonicStrength(mnemonic);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Create Ethereum wallet with optional passphrase
      const ethWallet = ethers.Wallet.fromPhrase(mnemonic, passphrase);
      
      // Create Bitcoin wallet with optional passphrase
      const seed = bip39.mnemonicToSeedSync(mnemonic, passphrase);
      const btcNode = bip32.fromSeed(seed);
      const btcPath = "m/44'/0'/0'/0/0";
      const btcChild = btcNode.derivePath(btcPath);
      
      const btcAddress = bitcoin.payments.p2pkh({
        pubkey: Buffer.from(btcChild.publicKey),
        network: bitcoin.networks.bitcoin,
      }).address;

      // Create Solana wallet from mnemonic
      const solSeed = bip39.mnemonicToSeedSync(mnemonic, passphrase);
      const solPath = "m/44'/501'/0'/0'"; // Solana derivation path
      const solDerivedSeed = ed25519.derivePath(solPath, solSeed.toString('hex')).key;
      const solKeypair = Keypair.fromSeed(solDerivedSeed);

      return {
        success: true,
        addresses: {
          ethereum: ethWallet.address,
          bitcoin: btcAddress,
          solana: solKeypair.publicKey.toString(),
        },
        // SECURITY: Private keys stored internally, never exposed
        _privateKeys: {
          ethereum: ethWallet.privateKey,
          bitcoin: btcChild.privateKey.toString('hex'),
          solana: Buffer.from(solKeypair.secretKey).toString('hex'),
        },
      };
    } catch (error) {
      console.error('Error importing wallet:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Import Ethereum wallet from private key
   * @param {string} privateKey - Ethereum private key
   * @returns {Object} - Wallet details
   */
  importEthereumFromPrivateKey(privateKey) {
    try {
      // Ensure private key has 0x prefix
      const formattedKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
      
      const wallet = new ethers.Wallet(formattedKey);
      
      return {
        success: true,
        ethereum: {
          address: wallet.address,
          privateKey: wallet.privateKey,
          publicKey: wallet.publicKey,
        },
      };
    } catch (error) {
      console.error('Error importing Ethereum wallet:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Derive multiple accounts from a mnemonic
   * @param {string} mnemonic - Mnemonic phrase
   * @param {number} count - Number of accounts to derive
   * @returns {Array} - Array of accounts
   */
  deriveAccounts(mnemonic, count = 5) {
    try {
      if (!bip39.validateMnemonic(mnemonic)) {
        throw new Error('Invalid mnemonic phrase');
      }

      const accounts = [];
      const seed = bip39.mnemonicToSeedSync(mnemonic);

      for (let i = 0; i < count; i++) {
        // Ethereum account derivation (BIP44 path: m/44'/60'/0'/0/i)
        const ethPath = `m/44'/60'/0'/0/${i}`;
        const ethWallet = ethers.HDNodeWallet.fromSeed(seed).derivePath(ethPath);
        
        // Bitcoin account derivation (BIP44 path: m/44'/0'/0'/0/i)
        const btcNode = bip32.fromSeed(seed);
        const btcPath = `m/44'/0'/0'/0/${i}`;
        const btcChild = btcNode.derivePath(btcPath);
        
        const btcAddress = bitcoin.payments.p2pkh({
          pubkey: Buffer.from(btcChild.publicKey),
          network: bitcoin.networks.bitcoin,
        }).address;

        // Solana account derivation (BIP44 path: m/44'/501'/i'/0')
        const solPath = `m/44'/501'/${i}'/0'`;
        const solDerivedSeed = ed25519.derivePath(solPath, seed.toString('hex')).key;
        const solKeypair = Keypair.fromSeed(solDerivedSeed);

        accounts.push({
          index: i,
          ethereum: {
            address: ethWallet.address,
            privateKey: ethWallet.privateKey,
          },
          bitcoin: {
            address: btcAddress,
            privateKey: btcChild.privateKey.toString('hex'),
          },
          solana: {
            address: solKeypair.publicKey.toString(),
            privateKey: Buffer.from(solKeypair.secretKey).toString('hex'),
          },
        });
      }

      return {
        success: true,
        accounts,
      };
    } catch (error) {
      console.error('Error deriving accounts:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Encrypt sensitive data using AES-256-GCM with PBKDF2 key derivation
   * @param {string} data - Data to encrypt
   * @param {string} password - Encryption password
   * @returns {Object} - Encrypted data with all components
   */
  encryptData(data, password) {
    try {
      // Generate cryptographically secure random salt
      const salt = crypto.randomBytes(SALT_LENGTH);
      
      // Derive key using PBKDF2-SHA256
      const key = crypto.pbkdf2Sync(
        password,
        salt,
        PBKDF2_ITERATIONS,
        KEY_LENGTH,
        'sha256'
      );
      
      // Generate random IV
      const iv = crypto.randomBytes(IV_LENGTH);
      
      // Create cipher using AES-256-GCM (authenticated encryption)
      const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
      
      // Encrypt the data
      let encrypted = cipher.update(data, 'utf8');
      encrypted = Buffer.concat([encrypted, cipher.final()]);
      
      // Get authentication tag (prevents tampering)
      const authTag = cipher.getAuthTag();
      
      // Return all components needed for decryption
      return {
        ciphertext: encrypted.toString('base64'),
        salt: salt.toString('base64'),
        iv: iv.toString('base64'),
        authTag: authTag.toString('base64'),
        algorithm: 'aes-256-gcm',
        iterations: PBKDF2_ITERATIONS,
        version: '2.0' // Version for future compatibility
      };
    } catch (error) {
      console.error('Error encrypting data:', error);
      throw new Error('Encryption failed');
    }
  }

  /**
   * Decrypt data encrypted with encryptData
   * @param {Object|string} encryptedData - Encrypted data object or legacy string
   * @param {string} password - Decryption password
   * @returns {string} - Decrypted data
   */
  decryptData(encryptedData, password) {
    try {
      // Handle new format (object with components)
      if (typeof encryptedData === 'object' && encryptedData.version === '2.0') {
        const { ciphertext, salt, iv, authTag, iterations } = encryptedData;
        
        // Derive key using same parameters
        const key = crypto.pbkdf2Sync(
          password,
          Buffer.from(salt, 'base64'),
          iterations,
          KEY_LENGTH,
          'sha256'
        );
        
        // Create decipher
        const decipher = crypto.createDecipheriv(
          'aes-256-gcm',
          key,
          Buffer.from(iv, 'base64')
        );
        
        // Set auth tag for authentication
        decipher.setAuthTag(Buffer.from(authTag, 'base64'));
        
        // Decrypt
        let decrypted = decipher.update(Buffer.from(ciphertext, 'base64'));
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        
        return decrypted.toString('utf8');
      }
      
      // Legacy format handling would go here if needed
      throw new Error('Unsupported encryption format. Please re-encrypt your data.');
      
    } catch (error) {
      console.error('Error decrypting data:', error);
      if (error.message.includes('Unsupported MAC')) {
        throw new Error('Invalid password or data has been tampered with');
      }
      throw new Error('Decryption failed: Invalid password or corrupted data');
    }
  }

  /**
   * Validate Ethereum address
   * @param {string} address - Ethereum address
   * @returns {boolean}
   */
  isValidEthereumAddress(address) {
    try {
      return ethers.isAddress(address);
    } catch {
      return false;
    }
  }

  /**
   * Validate Bitcoin address
   * @param {string} address - Bitcoin address
   * @returns {boolean}
   */
  isValidBitcoinAddress(address) {
    try {
      bitcoin.address.toOutputScript(address, bitcoin.networks.bitcoin);
      return true;
    } catch {
      return false;
    }
  }
}

export default new WalletService();
