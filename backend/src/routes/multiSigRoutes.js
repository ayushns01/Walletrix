import express from 'express';
import multiSigController from '../controllers/multiSigController.js';
import balanceController from '../controllers/balanceController.js';
import { authenticateClerk } from '../middleware/clerkAuth.js';

const router = express.Router();

// Multi-sig wallet routes
router.post('/create', authenticateClerk, multiSigController.createMultiSigWallet);
router.get('/:id', authenticateClerk, multiSigController.getMultiSigWallet);
router.get('/user/:userId', authenticateClerk, multiSigController.getUserMultiSigWallets);

// Balance route
router.get('/:id/balance', authenticateClerk, balanceController.getBalance);

// Transaction routes
router.post('/:id/transaction', authenticateClerk, multiSigController.createTransaction);
router.post('/transaction/:txId/sign', authenticateClerk, multiSigController.signTransaction);

// New transaction management routes
router.get('/:id/transactions', authenticateClerk, multiSigController.getTransactions);
router.get('/:id/pending', authenticateClerk, multiSigController.getPendingTransactions);
router.put('/transaction/:txId/execute', authenticateClerk, multiSigController.executeTransaction);

export default router;
