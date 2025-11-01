import express from 'express';
import tokenController from '../controllers/tokenController.js';

const router = express.Router();

/**
 * Token Routes
 * Handles ERC-20 token operations
 */

// Get token information
router.get('/info/:tokenAddress', tokenController.getTokenInfo);

// Get token balance for an address
router.get('/balance/:tokenAddress/:address', tokenController.getTokenBalance);

// Get multiple token balances
router.post('/balances/multiple', tokenController.getMultipleBalances);

// Get popular token balances
router.get('/balances/popular/:address', tokenController.getPopularTokenBalances);

// Get list of popular tokens
router.get('/popular', tokenController.getPopularTokens);

export default router;
