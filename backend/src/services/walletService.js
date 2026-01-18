import * as bip39 from 'bip39';
import { ethers } from 'ethers';
import * as bitcoin from 'bitcoinjs-lib';
import * as ecc from 'tiny-secp256k1';
import { BIP32Factory } from 'bip32';
import crypto from 'crypto';
import { Keypair } from '@solana/web3.js';
import * as ed25519 from 'ed25519-hd-key';

const bip32 = BIP32Factory(ecc);

const PBKDF2_ITERATIONS = 600000;
const SALT_LENGTH = 32;
const IV_LENGTH = 16;
const KEY_LENGTH = 32;
const AUTH_TAG_LENGTH = 16;

class WalletService {

  validateMnemonicStrength(mnemonic) {
    const words = mnemonic.trim().split(/\s+/);
    const wordCount = words.length;

    if (wordCount !== 12 && wordCount !== 24) {
      return {
        valid: false,
        error: 'Mnemonic must be 12 or 24 words'
      };
    }

    if (!bip39.validateMnemonic(mnemonic)) {
      return {
        valid: false,
        error: 'Invalid mnemonic phrase'
      };
    }

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

  validatePasswordStrength(password) {
    const minLength = 12;
    const suggestions = [];
    let score = 0;

    if (password.length < minLength) {
      suggestions.push(`Password should be at least ${minLength} characters long`);
    } else if (password.length >= minLength) {
      score += 25;
    }

    if (password.length >= 16) {
      score += 10;
    }

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

  generateNewWallet(passphrase = '') {
    try {

      const mnemonic = bip39.generateMnemonic(128);

      const validation = this.validateMnemonicStrength(mnemonic);
      if (!validation.valid) {
        throw new Error('Generated mnemonic failed validation');
      }

      const ethWallet = ethers.Wallet.fromPhrase(mnemonic, passphrase);

      const seed = bip39.mnemonicToSeedSync(mnemonic, passphrase);
      const btcNode = bip32.fromSeed(seed);
      const btcPath = "m/44'/0'/0'/0/0";
      const btcChild = btcNode.derivePath(btcPath);

      const btcAddress = bitcoin.payments.p2pkh({
        pubkey: Buffer.from(btcChild.publicKey),
        network: bitcoin.networks.bitcoin,
      }).address;

      const solSeed = bip39.mnemonicToSeedSync(mnemonic, passphrase);
      const solPath = "m/44'/501'/0'/0'";
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

  importFromMnemonic(mnemonic, passphrase = '') {
    try {

      const validation = this.validateMnemonicStrength(mnemonic);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      const ethWallet = ethers.Wallet.fromPhrase(mnemonic, passphrase);

      const seed = bip39.mnemonicToSeedSync(mnemonic, passphrase);
      const btcNode = bip32.fromSeed(seed);
      const btcPath = "m/44'/0'/0'/0/0";
      const btcChild = btcNode.derivePath(btcPath);

      const btcAddress = bitcoin.payments.p2pkh({
        pubkey: Buffer.from(btcChild.publicKey),
        network: bitcoin.networks.bitcoin,
      }).address;

      const solSeed = bip39.mnemonicToSeedSync(mnemonic, passphrase);
      const solPath = "m/44'/501'/0'/0'";
      const solDerivedSeed = ed25519.derivePath(solPath, solSeed.toString('hex')).key;
      const solKeypair = Keypair.fromSeed(solDerivedSeed);

      return {
        success: true,
        addresses: {
          ethereum: ethWallet.address,
          bitcoin: btcAddress,
          solana: solKeypair.publicKey.toString(),
        },

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

  importEthereumFromPrivateKey(privateKey) {
    try {

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

  deriveAccounts(mnemonic, count = 5) {
    try {
      if (!bip39.validateMnemonic(mnemonic)) {
        throw new Error('Invalid mnemonic phrase');
      }

      const accounts = [];
      const seed = bip39.mnemonicToSeedSync(mnemonic);

      for (let i = 0; i < count; i++) {

        const ethPath = `m/44'/60'/0'/0/${i}`;
        const ethWallet = ethers.HDNodeWallet.fromSeed(seed).derivePath(ethPath);

        const btcNode = bip32.fromSeed(seed);
        const btcPath = `m/44'/0'/0'/0/${i}`;
        const btcChild = btcNode.derivePath(btcPath);

        const btcAddress = bitcoin.payments.p2pkh({
          pubkey: Buffer.from(btcChild.publicKey),
          network: bitcoin.networks.bitcoin,
        }).address;

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

  encryptData(data, password) {
    try {

      const salt = crypto.randomBytes(SALT_LENGTH);

      const key = crypto.pbkdf2Sync(
        password,
        salt,
        PBKDF2_ITERATIONS,
        KEY_LENGTH,
        'sha256'
      );

      const iv = crypto.randomBytes(IV_LENGTH);

      const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

      let encrypted = cipher.update(data, 'utf8');
      encrypted = Buffer.concat([encrypted, cipher.final()]);

      const authTag = cipher.getAuthTag();

      return {
        ciphertext: encrypted.toString('base64'),
        salt: salt.toString('base64'),
        iv: iv.toString('base64'),
        authTag: authTag.toString('base64'),
        algorithm: 'aes-256-gcm',
        iterations: PBKDF2_ITERATIONS,
        version: '2.0'
      };
    } catch (error) {
      console.error('Error encrypting data:', error);
      throw new Error('Encryption failed');
    }
  }

  decryptData(encryptedData, password) {
    try {

      if (typeof encryptedData === 'object' && encryptedData.version === '2.0') {
        const { ciphertext, salt, iv, authTag, iterations } = encryptedData;

        const key = crypto.pbkdf2Sync(
          password,
          Buffer.from(salt, 'base64'),
          iterations,
          KEY_LENGTH,
          'sha256'
        );

        const decipher = crypto.createDecipheriv(
          'aes-256-gcm',
          key,
          Buffer.from(iv, 'base64')
        );

        decipher.setAuthTag(Buffer.from(authTag, 'base64'));

        let decrypted = decipher.update(Buffer.from(ciphertext, 'base64'));
        decrypted = Buffer.concat([decrypted, decipher.final()]);

        return decrypted.toString('utf8');
      }

      throw new Error('Unsupported encryption format. Please re-encrypt your data.');

    } catch (error) {
      console.error('Error decrypting data:', error);
      if (error.message.includes('Unsupported MAC')) {
        throw new Error('Invalid password or data has been tampered with');
      }
      throw new Error('Decryption failed: Invalid password or corrupted data');
    }
  }

  isValidEthereumAddress(address) {
    try {
      return ethers.isAddress(address);
    } catch {
      return false;
    }
  }

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
