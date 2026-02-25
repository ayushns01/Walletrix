import prisma from '../lib/prisma.js';
import logger from './loggerService.js';

/**
 * DatabaseWalletService
 * CRUD operations for wallets stored in Prisma.
 * Bridges the crypto walletService (key derivation) with the database (persistent state).
 */
class DatabaseWalletService {
    /**
     * Create a wallet record in the database.
     */
    async createWallet(userId, { label, type, network, address }) {
        try {
            const wallet = await prisma.wallet.create({
                data: {
                    userId,
                    label: label || 'My Wallet',
                    type: type || 'HD',
                    network: network || 'ETHEREUM',
                    address,
                },
            });

            await this._logActivity(userId, 'WALLET_CREATED', {
                walletId: wallet.id, network, address: address.slice(0, 10) + '...',
            });

            logger.info('Wallet created', { userId, walletId: wallet.id, network });
            return { success: true, data: wallet };
        } catch (error) {
            if (error.code === 'P2002') {
                return { success: false, error: 'Wallet with this address already exists for this network' };
            }
            logger.error('Create wallet failed', { error: error.message });
            return { success: false, error: error.message };
        }
    }

    /**
     * Get all wallets for a user.
     */
    async getWallets(userId) {
        try {
            const wallets = await prisma.wallet.findMany({
                where: { userId, isActive: true },
                include: {
                    smartAccount: {
                        select: {
                            id: true, vaultAddress: true, chainId: true,
                            isDeployed: true, createdAt: true,
                            _count: { select: { guardians: true } },
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
            });

            return { success: true, data: wallets };
        } catch (error) {
            logger.error('Get wallets failed', { error: error.message });
            return { success: false, error: error.message };
        }
    }

    /**
     * Get a single wallet by ID (with ownership check).
     */
    async getWalletById(userId, walletId) {
        try {
            const wallet = await prisma.wallet.findFirst({
                where: { id: walletId, userId, isActive: true },
                include: {
                    smartAccount: {
                        include: {
                            guardians: { where: { isActive: true } },
                            userOps: { orderBy: { createdAt: 'desc' }, take: 10 },
                        },
                    },
                    transactions: { orderBy: { timestamp: 'desc' }, take: 20 },
                },
            });

            if (!wallet) return { success: false, error: 'Wallet not found' };
            return { success: true, data: wallet };
        } catch (error) {
            logger.error('Get wallet by ID failed', { error: error.message });
            return { success: false, error: error.message };
        }
    }

    /**
     * Update a wallet's label.
     */
    async updateWallet(userId, walletId, updates) {
        try {
            const wallet = await prisma.wallet.findFirst({
                where: { id: walletId, userId },
            });
            if (!wallet) return { success: false, error: 'Wallet not found' };

            const updated = await prisma.wallet.update({
                where: { id: walletId },
                data: { label: updates.label },
            });

            return { success: true, data: updated };
        } catch (error) {
            logger.error('Update wallet failed', { error: error.message });
            return { success: false, error: error.message };
        }
    }

    /**
     * Soft-delete a wallet.
     */
    async deleteWallet(userId, walletId) {
        try {
            const wallet = await prisma.wallet.findFirst({
                where: { id: walletId, userId },
            });
            if (!wallet) return { success: false, error: 'Wallet not found' };

            await prisma.wallet.update({
                where: { id: walletId },
                data: { isActive: false },
            });

            await this._logActivity(userId, 'WALLET_DELETED', { walletId });

            return { success: true };
        } catch (error) {
            logger.error('Delete wallet failed', { error: error.message });
            return { success: false, error: error.message };
        }
    }

    /**
     * Record a transaction.
     */
    async recordTransaction(walletId, { txHash, network, fromAddress, toAddress, value, category, metadata }) {
        try {
            const tx = await prisma.transaction.create({
                data: {
                    walletId,
                    txHash,
                    network: network || 'ETHEREUM',
                    fromAddress,
                    toAddress,
                    value: value.toString(),
                    category: category || 'TRANSFER',
                    metadata,
                },
            });
            return { success: true, data: tx };
        } catch (error) {
            logger.error('Record transaction failed', { error: error.message });
            return { success: false, error: error.message };
        }
    }

    /**
     * Get transactions for a wallet.
     */
    async getTransactions(walletId, { page = 1, limit = 20 } = {}) {
        try {
            const [transactions, total] = await Promise.all([
                prisma.transaction.findMany({
                    where: { walletId },
                    orderBy: { timestamp: 'desc' },
                    skip: (page - 1) * limit,
                    take: limit,
                }),
                prisma.transaction.count({ where: { walletId } }),
            ]);

            return {
                success: true,
                data: { transactions, total, page, limit, totalPages: Math.ceil(total / limit) },
            };
        } catch (error) {
            logger.error('Get transactions failed', { error: error.message });
            return { success: false, error: error.message };
        }
    }

    // ─── Private Helpers ───────────────────────────────

    async _logActivity(userId, action, details) {
        try {
            await prisma.activityLog.create({ data: { userId, action, details } });
        } catch (error) {
            logger.warn('Failed to log activity', { error: error.message });
        }
    }
}

export default new DatabaseWalletService();
