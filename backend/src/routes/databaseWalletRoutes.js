import express from 'express';
import databaseWalletService from '../services/databaseWalletService.js';
import databaseTransactionService from '../services/databaseTransactionService.js';
import { authenticateClerk, optionalAuthClerk, verifyWalletAccess } from '../middleware/clerkAuth.js';

const router = express.Router();

/**
 * Get user's wallets
 */
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
    console.error('Get wallets error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get wallets'
    });
  }
});

/**
 * Create new wallet
 */
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
    console.error('Create wallet error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create wallet'
    });
  }
});

/**
 * Get specific wallet
 */
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
    console.error('Get wallet error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get wallet'
    });
  }
});

/**
 * Update wallet
 */
router.put('/:walletId', authenticateClerk, verifyWalletAccess, async (req, res) => {
  try {
    const { walletId } = req.params;
    const userId = req.userId;
    const updates = req.body;

    // Don't allow updating sensitive fields
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
    console.error('Update wallet error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update wallet'
    });
  }
});

/**
 * Delete wallet
 */
router.delete('/:walletId', authenticateClerk, verifyWalletAccess, async (req, res) => {
  try {
    const { walletId } = req.params;
    const userId = req.userId;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent');

    console.log('Delete wallet request:', { walletId, userId, ipAddress });

    const result = await databaseWalletService.deleteWallet(walletId, userId, ipAddress, userAgent);

    console.log('Delete wallet result:', result);

    if (!result.success) {
      console.error('Delete wallet failed:', result.error);
      return res.status(400).json(result);
    }

    res.json({
      success: true,
      message: 'Wallet deleted successfully'
    });
  } catch (error) {
    console.error('Delete wallet error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete wallet'
    });
  }
});

/**
 * Get wallet transactions from database
 */
router.get('/:walletId/transactions', authenticateClerk, verifyWalletAccess, async (req, res) => {
  try {
    const { walletId } = req.params;
    const { network, limit = 50, offset = 0, status } = req.query;

    const result = await databaseTransactionService.getWalletTransactions(walletId, {
      network,
      limit: parseInt(limit),
      offset: parseInt(offset),
      status
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json({
      success: true,
      transactions: result.transactions,
      total: result.total,
      hasMore: result.hasMore
    });
  } catch (error) {
    console.error('Get wallet transactions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get transactions'
    });
  }
});

/**
 * Cache transactions for wallet
 */
router.post('/:walletId/cache-transactions', authenticateClerk, verifyWalletAccess, async (req, res) => {
  try {
    const { walletId } = req.params;
    const { transactions } = req.body;

    if (!Array.isArray(transactions)) {
      return res.status(400).json({
        success: false,
        error: 'Transactions must be an array'
      });
    }

    const result = await databaseTransactionService.bulkCacheTransactions(walletId, transactions);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json({
      success: true,
      message: 'Transactions cached successfully',
      stats: {
        total: result.total,
        cached: result.cached,
        skipped: result.skipped
      }
    });
  } catch (error) {
    console.error('Cache transactions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cache transactions'
    });
  }
});

export default router;