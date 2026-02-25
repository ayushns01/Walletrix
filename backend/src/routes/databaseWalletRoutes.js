import express from 'express';
import databaseWalletController from '../controllers/databaseWalletController.js';
import authController from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

// User profile
router.get('/profile', authController.getProfile);

// Wallet CRUD
router.post('/', databaseWalletController.createWallet);
router.get('/', databaseWalletController.getWallets);
router.get('/:walletId', databaseWalletController.getWalletById);
router.patch('/:walletId', databaseWalletController.updateWallet);
router.delete('/:walletId', databaseWalletController.deleteWallet);

// Transactions
router.post('/:walletId/transactions', databaseWalletController.recordTransaction);
router.get('/:walletId/transactions', databaseWalletController.getTransactions);

export default router;
