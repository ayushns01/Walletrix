import express from 'express';
import frontendWalletController from '../controllers/frontendWalletController.js';
import { requireClerkAuth } from '../middleware/clerkAuth.js';

const router = express.Router();

// All routes require Clerk authentication
router.use(requireClerkAuth);

// CRUD — matches what DatabaseWalletContext.js expects
router.get('/', frontendWalletController.getWallets);
router.post('/', frontendWalletController.createWallet);
router.delete('/:walletId', frontendWalletController.deleteWallet);

export default router;
