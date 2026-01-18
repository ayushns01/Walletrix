import express from 'express';
import blockchainController from '../controllers/blockchainController.js';

const router = express.Router();

router.get('/ethereum/balance/:address', blockchainController.getEthereumBalance);

router.get('/bitcoin/balance/:address', blockchainController.getBitcoinBalance);

router.get('/solana/balance/:address', blockchainController.getSolanaBalance);

router.get('/ethereum/gas-price', blockchainController.getGasPrice);

router.get('/bitcoin/fee-estimate', blockchainController.getBitcoinFeeEstimate);

export default router;
