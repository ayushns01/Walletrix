import * as bip39 from 'bip39';
import { ethers } from 'ethers';
import * as bitcoin from 'bitcoinjs-lib';
import * as ecc from 'tiny-secp256k1';
import { BIP32Factory } from 'bip32';
import CryptoJS from 'crypto-js';

// Initialize BIP32 with ECC library
const bip32 = BIP32Factory(ecc);

/**
 * Wallet Service
 * Handles wallet generation, import, and key management
 */

class WalletService {
  /**
   * Generate a new wallet with mnemonic phrase
   * @returns {Object} - { mnemonic, ethWallet, btcWallet }
   */
  generateNewWallet() {
    try {
      // Generate 12-word mnemonic phrase
      const mnemonic = bip39.generateMnemonic();
      
      // Create Ethereum wallet from mnemonic
      const ethWallet = ethers.Wallet.fromPhrase(mnemonic);
      
      // Create Bitcoin wallet from mnemonic
      const seed = bip39.mnemonicToSeedSync(mnemonic);
      const btcNode = bip32.fromSeed(seed);
      const btcPath = "m/44'/0'/0'/0/0"; // BIP44 path for Bitcoin
      const btcChild = btcNode.derivePath(btcPath);
      
      const btcAddress = bitcoin.payments.p2pkh({
        pubkey: Buffer.from(btcChild.publicKey),
        network: bitcoin.networks.bitcoin,
      }).address;

      return {
        success: true,
        mnemonic,
        ethereum: {
          address: ethWallet.address,
          privateKey: ethWallet.privateKey,
          publicKey: ethWallet.publicKey,
        },
        bitcoin: {
          address: btcAddress,
          privateKey: btcChild.privateKey.toString('hex'),
          publicKey: btcChild.publicKey.toString('hex'),
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
   * @returns {Object} - Wallet details
   */
  importFromMnemonic(mnemonic) {
    try {
      // Validate mnemonic
      if (!bip39.validateMnemonic(mnemonic)) {
        throw new Error('Invalid mnemonic phrase');
      }

      // Create Ethereum wallet
      const ethWallet = ethers.Wallet.fromPhrase(mnemonic);
      
      // Create Bitcoin wallet
      const seed = bip39.mnemonicToSeedSync(mnemonic);
      const btcNode = bip32.fromSeed(seed);
      const btcPath = "m/44'/0'/0'/0/0";
      const btcChild = btcNode.derivePath(btcPath);
      
      const btcAddress = bitcoin.payments.p2pkh({
        pubkey: Buffer.from(btcChild.publicKey),
        network: bitcoin.networks.bitcoin,
      }).address;

      return {
        success: true,
        ethereum: {
          address: ethWallet.address,
          privateKey: ethWallet.privateKey,
          publicKey: ethWallet.publicKey,
        },
        bitcoin: {
          address: btcAddress,
          privateKey: btcChild.privateKey.toString('hex'),
          publicKey: btcChild.publicKey.toString('hex'),
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
   * Encrypt sensitive data (private key, mnemonic)
   * @param {string} data - Data to encrypt
   * @param {string} password - Encryption password
   * @returns {string} - Encrypted data
   */
  encryptData(data, password) {
    try {
      const encrypted = CryptoJS.AES.encrypt(data, password).toString();
      return encrypted;
    } catch (error) {
      console.error('Error encrypting data:', error);
      throw error;
    }
  }

  /**
   * Decrypt sensitive data
   * @param {string} encryptedData - Encrypted data
   * @param {string} password - Decryption password
   * @returns {string} - Decrypted data
   */
  decryptData(encryptedData, password) {
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedData, password);
      const decrypted = bytes.toString(CryptoJS.enc.Utf8);
      
      if (!decrypted) {
        throw new Error('Invalid password or corrupted data');
      }
      
      return decrypted;
    } catch (error) {
      console.error('Error decrypting data:', error);
      throw error;
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
