import express from 'express';
import bip85Controller from '../controllers/bip85Controller.js';
import { authenticateClerk } from '../middleware/clerkAuth.js';

const router = express.Router();

/**
 * BIP-85 Routes
 * All routes require authentication
 */

// Derive child wallet from master
router.post('/derive', authenticateClerk, bip85Controller.deriveChildWallet);

// Get all child wallets for a parent
router.get('/children/:walletId', authenticateClerk, bip85Controller.getChildWallets);

// Delete/deactivate child wallet
router.delete('/child/:childId', authenticateClerk, bip85Controller.deleteChildWallet);

// Get child wallet mnemonic (requires password)
router.post('/child/:childId/mnemonic', authenticateClerk, bip85Controller.getChildMnemonic);

export default router;
