import express from 'express';
import blockchainController from '../controllers/blockchainController.js';

const router = express.Router();

/**
 * Blockchain Routes
 * Handles blockchain queries for Ethereum and Bitcoin networks
 */

// Ethereum balance
router.get('/ethereum/balance/:address', blockchainController.getEthereumBalance);

// Bitcoin balance
router.get('/bitcoin/balance/:address', blockchainController.getBitcoinBalance);

// Ethereum gas price
router.get('/ethereum/gas-price', blockchainController.getGasPrice);

// Bitcoin fee estimate
router.get('/bitcoin/fee-estimate', blockchainController.getBitcoinFeeEstimate);

export default router;
