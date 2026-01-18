import express from 'express';
import tokenController from '../controllers/tokenController.js';

const router = express.Router();

router.get('/info/:tokenAddress', tokenController.getTokenInfo);

router.get('/balance/:tokenAddress/:address', tokenController.getTokenBalance);

router.post('/balances/multiple', tokenController.getMultipleBalances);

router.get('/balances/popular/:address', tokenController.getPopularTokenBalances);

router.get('/popular', tokenController.getPopularTokens);

export default router;
