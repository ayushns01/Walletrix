import express from 'express';
import smartVaultController from '../controllers/smartVaultController.js';

const router = express.Router();

// ── Vault Lifecycle ──
router.post('/deploy', smartVaultController.deploy);
router.post('/confirm-deploy', smartVaultController.confirmDeploy);
router.get('/:walletId', smartVaultController.getVault);
router.post('/predict-address', smartVaultController.predictAddress);

// ── UserOperation Flow ──
router.post('/build-userop', smartVaultController.buildUserOp);
router.post('/sponsor', smartVaultController.sponsor);
router.post('/send', smartVaultController.sendUserOp);
router.get('/receipt/:userOpHash', smartVaultController.getReceipt);

// ── Guardian Management ──
router.post('/guardians', smartVaultController.addGuardian);
router.delete('/guardians', smartVaultController.removeGuardian);

export default router;
