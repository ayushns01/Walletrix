import express from 'express';
import walletController from '../controllers/walletController.js';
import { validationRules, handleValidationErrors } from '../middleware/validation.js';

const router = express.Router();

router.post('/generate', validationRules.generateWallet, handleValidationErrors, walletController.generateWallet);

router.post('/import/mnemonic', validationRules.importMnemonic, handleValidationErrors, walletController.importFromMnemonic);

router.post('/import/private-key', validationRules.importPrivateKey, handleValidationErrors, walletController.importFromPrivateKey);

router.post('/derive-accounts', validationRules.importMnemonic, handleValidationErrors, walletController.deriveAccounts);

router.get('/validate/:network/:address', validationRules.validateAddress, handleValidationErrors, walletController.validateAddress);

router.post('/validate-password', walletController.validatePasswordStrength);

router.post('/encrypt', validationRules.encryptData, handleValidationErrors, walletController.encryptData);

router.post('/decrypt', validationRules.decryptData, handleValidationErrors, walletController.decryptData);

router.post('/migrate/add-solana', validationRules.importMnemonic, handleValidationErrors, walletController.addSolanaToWallet);

export default router;
