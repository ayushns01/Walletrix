import express from 'express';
import databaseWalletService from '../services/databaseWalletService.js';
import { authenticateClerk, optionalAuthClerk, verifyWalletAccess } from '../middleware/clerkAuth.js';
import logger from '../services/loggerService.js';

const router = express.Router();

router.get('/', authenticateClerk, async (req, res) => {
  try {
    const userId = req.userId;
    const result = await databaseWalletService.getUserWallets(userId);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json({
      success: true,
      wallets: result.wallets
    });
  } catch (error) {
    logger.error('Get wallets error', { error: error.message, userId: req.userId });
    res.status(500).json({
      success: false,
      error: 'Failed to get wallets'
    });
  }
});

router.post('/', authenticateClerk, async (req, res) => {
  try {
    const { name, encryptedData, addresses, description } = req.body;
    const userId = req.userId;

    if (!name || !encryptedData || !addresses) {
      return res.status(400).json({
        success: false,
        error: 'Name, encrypted data, and addresses are required'
      });
    }

    const result = await databaseWalletService.createWallet(
      userId,
      name,
      encryptedData,
      addresses,
      description
    );

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(201).json({
      success: true,
      message: 'Wallet created successfully',
      wallet: result.wallet
    });
  } catch (error) {
    logger.error('Create wallet error', { error: error.message, userId: req.userId });
    res.status(500).json({
      success: false,
      error: 'Failed to create wallet'
    });
  }
});

router.get('/:walletId', authenticateClerk, verifyWalletAccess, async (req, res) => {
  try {
    const { walletId } = req.params;
    const userId = req.userId;

    const result = await databaseWalletService.getWallet(walletId, userId);

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.json({
      success: true,
      wallet: result.wallet
    });
  } catch (error) {
    logger.error('Get wallet error', { error: error.message, walletId: req.params.walletId });
    res.status(500).json({
      success: false,
      error: 'Failed to get wallet'
    });
  }
});

router.put('/:walletId', authenticateClerk, verifyWalletAccess, async (req, res) => {
  try {
    const { walletId } = req.params;
    const userId = req.userId;
    const updates = req.body;

    delete updates.id;
    delete updates.userId;
    delete updates.encryptedData;
    delete updates.createdAt;

    const result = await databaseWalletService.updateWallet(walletId, userId, updates);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json({
      success: true,
      message: 'Wallet updated successfully',
      wallet: result.wallet
    });
  } catch (error) {
    logger.error('Update wallet error', { error: error.message, walletId: req.params.walletId });
    res.status(500).json({
      success: false,
      error: 'Failed to update wallet'
    });
  }
});

router.delete('/:walletId', authenticateClerk, verifyWalletAccess, async (req, res) => {
  try {
    const { walletId } = req.params;
    const userId = req.userId;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent');

    const result = await databaseWalletService.deleteWallet(walletId, userId, ipAddress, userAgent);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json({
      success: true,
      message: 'Wallet deleted successfully'
    });
  } catch (error) {
    logger.error('Delete wallet error', { error: error.message, walletId: req.params.walletId });
    res.status(500).json({
      success: false,
      error: 'Failed to delete wallet'
    });
  }
});

export default router;
