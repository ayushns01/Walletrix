import express from 'express';
import walletController from '../controllers/walletController.js';

const router = express.Router();

/**
 * Wallet Routes
 */

// Generate new wallet
router.post('/generate', walletController.generateWallet);

// Import wallet from mnemonic
router.post('/import/mnemonic', walletController.importFromMnemonic);

// Import wallet from private key
router.post('/import/private-key', walletController.importFromPrivateKey);

// Derive multiple accounts
router.post('/derive-accounts', walletController.deriveAccounts);

// Validate address
router.get('/validate/:network/:address', walletController.validateAddress);

// Encrypt data
router.post('/encrypt', walletController.encryptData);

// Decrypt data
router.post('/decrypt', walletController.decryptData);

export default router;
