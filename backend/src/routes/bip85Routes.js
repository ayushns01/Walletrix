import express from 'express';
import bip85Controller from '../controllers/bip85Controller.js';
import { authenticateClerk } from '../middleware/clerkAuth.js';

const router = express.Router();

router.post('/derive', authenticateClerk, bip85Controller.deriveChildWallet);

router.get('/children/:walletId', authenticateClerk, bip85Controller.getChildWallets);

router.delete('/child/:childId', authenticateClerk, bip85Controller.deleteChildWallet);

router.post('/child/:childId/mnemonic', authenticateClerk, bip85Controller.getChildMnemonic);

export default router;
