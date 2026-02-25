import databaseWalletService from '../services/databaseWalletService.js';
import logger from '../services/loggerService.js';

/**
 * DatabaseWalletController
 * HTTP handlers for wallet CRUD and transaction history.
 * All endpoints require authentication (req.userId set by auth middleware).
 */
class DatabaseWalletController {
    async createWallet(req, res) {
        try {
            const { label, type, network, address } = req.body;

            if (!address) {
                return res.status(400).json({
                    success: false,
                    error: 'Wallet address is required',
                });
            }

            const result = await databaseWalletService.createWallet(req.userId, {
                label, type, network, address,
            });

            if (!result.success) {
                return res.status(400).json(result);
            }

            res.status(201).json(result);
        } catch (error) {
            logger.error('Create wallet failed', { error: error.message });
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    }

    async getWallets(req, res) {
        try {
            const result = await databaseWalletService.getWallets(req.userId);

            if (!result.success) {
                return res.status(400).json(result);
            }

            res.status(200).json(result);
        } catch (error) {
            logger.error('Get wallets failed', { error: error.message });
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    }

    async getWalletById(req, res) {
        try {
            const { walletId } = req.params;
            const result = await databaseWalletService.getWalletById(req.userId, walletId);

            if (!result.success) {
                return res.status(404).json(result);
            }

            res.status(200).json(result);
        } catch (error) {
            logger.error('Get wallet by ID failed', { error: error.message });
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    }

    async updateWallet(req, res) {
        try {
            const { walletId } = req.params;
            const { label } = req.body;

            const result = await databaseWalletService.updateWallet(req.userId, walletId, { label });

            if (!result.success) {
                return res.status(400).json(result);
            }

            res.status(200).json(result);
        } catch (error) {
            logger.error('Update wallet failed', { error: error.message });
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    }

    async deleteWallet(req, res) {
        try {
            const { walletId } = req.params;
            const result = await databaseWalletService.deleteWallet(req.userId, walletId);

            if (!result.success) {
                return res.status(400).json(result);
            }

            res.status(200).json({ success: true, message: 'Wallet deleted' });
        } catch (error) {
            logger.error('Delete wallet failed', { error: error.message });
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    }

    async recordTransaction(req, res) {
        try {
            const { walletId } = req.params;
            const { txHash, network, fromAddress, toAddress, value, category, metadata } = req.body;

            if (!txHash || !fromAddress || !toAddress || !value) {
                return res.status(400).json({
                    success: false,
                    error: 'txHash, fromAddress, toAddress, and value are required',
                });
            }

            const result = await databaseWalletService.recordTransaction(walletId, {
                txHash, network, fromAddress, toAddress, value, category, metadata,
            });

            if (!result.success) {
                return res.status(400).json(result);
            }

            res.status(201).json(result);
        } catch (error) {
            logger.error('Record transaction failed', { error: error.message });
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    }

    async getTransactions(req, res) {
        try {
            const { walletId } = req.params;
            const { page, limit } = req.query;

            const result = await databaseWalletService.getTransactions(walletId, {
                page: parseInt(page) || 1,
                limit: parseInt(limit) || 20,
            });

            if (!result.success) {
                return res.status(400).json(result);
            }

            res.status(200).json(result);
        } catch (error) {
            logger.error('Get transactions failed', { error: error.message });
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    }
}

export default new DatabaseWalletController();
