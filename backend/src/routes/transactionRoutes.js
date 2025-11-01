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

export default router;
