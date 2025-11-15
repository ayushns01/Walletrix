import express from 'express';
import transactionController from '../controllers/transactionController.js';

const router = express.Router();

/**
 * Transaction Routes
 * Handles transaction creation and broadcasting
 */

// Send Ethereum transaction
router.post('/ethereum/send', transactionController.sendEthereumTransaction);

// Send ERC-20 token transaction
router.post('/token/send', transactionController.sendTokenTransaction);

// Send Bitcoin transaction
router.post('/bitcoin/send', transactionController.sendBitcoinTransaction);

// Create Ethereum transaction (without sending)
router.post('/ethereum/create', transactionController.createEthereumTransaction);

// Create token transaction (without sending)
router.post('/token/create', transactionController.createTokenTransaction);

// Create Bitcoin transaction (without sending)
router.post('/bitcoin/create', transactionController.createBitcoinTransaction);

// Get transaction status
router.get('/:transactionId/status', transactionController.getTransactionStatus);

// Get all pending transactions
router.get('/pending', transactionController.getPendingTransactions);

// Get monitoring status
router.get('/monitoring/status', transactionController.getMonitoringStatus);

// Manually trigger monitoring for a transaction
router.post('/:transactionId/monitor', transactionController.startTransactionMonitoring);

// Stop monitoring a transaction
router.post('/:transactionId/stop-monitoring', transactionController.stopTransactionMonitoring);

// Enhanced transaction history endpoints
// Get wallet transactions with advanced filtering, search, pagination and sorting
router.get('/wallet/:walletId', transactionController.getWalletTransactions);

// Get transaction analytics and statistics
router.get('/wallet/:walletId/analytics', transactionController.getTransactionAnalytics);

// Export transactions in various formats
router.get('/wallet/:walletId/export', transactionController.exportTransactions);

export default router;
