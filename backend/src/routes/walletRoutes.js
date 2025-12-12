import express from 'express';
import walletController from '../controllers/walletController.js';
import { validationRules, handleValidationErrors } from '../middleware/validation.js';

const router = express.Router();

// Generate new wallet
router.post('/generate', validationRules.generateWallet, handleValidationErrors, walletController.generateWallet);

// Import wallet from mnemonic
router.post('/import/mnemonic', validationRules.importMnemonic, handleValidationErrors, walletController.importFromMnemonic);

// Import wallet from private key
router.post('/import/private-key', validationRules.importPrivateKey, handleValidationErrors, walletController.importFromPrivateKey);

// Derive multiple accounts
router.post('/derive-accounts', validationRules.importMnemonic, handleValidationErrors, walletController.deriveAccounts);

// Validate address
router.get('/validate/:network/:address', validationRules.validateAddress, handleValidationErrors, walletController.validateAddress);

// Validate password strength
router.post('/validate-password', walletController.validatePasswordStrength);

// Encrypt data
router.post('/encrypt', validationRules.encryptData, handleValidationErrors, walletController.encryptData);

// Decrypt data
router.post('/decrypt', validationRules.decryptData, handleValidationErrors, walletController.decryptData);

// Migration: Add Solana to existing wallet
router.post('/migrate/add-solana', validationRules.importMnemonic, handleValidationErrors, walletController.addSolanaToWallet);

export default router;
