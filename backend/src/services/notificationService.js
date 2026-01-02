import prisma from '../lib/prisma.js';
import logger from './loggerService.js';

/**
 * Notification Service
 * Handles creating and managing notifications for users
 */

class NotificationService {
    /**
     * Create a notification for a user
     */
    async createNotification({ userId, type, title, message, data, actionUrl }) {
        try {
            const notification = await prisma.notification.create({
                data: {
                    userId,
                    type,
                    title,
                    message,
                    data: data || {},
                    actionUrl,
                    isRead: false
                }
            });

            logger.info('Notification created', {
                notificationId: notification.id,
                userId,
                type
            });

            return notification;
        } catch (error) {
            logger.error('Error creating notification', {
                error: error.message,
                userId,
                type
            });
            throw error;
        }
    }

    /**
     * Notify multi-sig wallet owners about a new transaction
     */
    async notifyMultiSigTransaction({ multiSigWalletId, transactionId, creatorId, amount, toAddress, tokenSymbol }) {
        try {
            console.log('🔔 notifyMultiSigTransaction called with:', {
                multiSigWalletId,
                transactionId,
                creatorId,
                amount,
                toAddress,
                tokenSymbol
            });
            
            // Get all signers except the creator
            const wallet = await prisma.multiSigWallet.findUnique({
                where: { id: multiSigWalletId },
                include: {
                    signers: true
                }
            });

            if (!wallet) {
                throw new Error('Multi-sig wallet not found');
            }

            console.log('🔔 Processing multi-sig transaction notifications:');
            console.log('   Wallet:', wallet.name);
            console.log('   Total signers:', wallet.signers.length);
            console.log('   Creator ID:', creatorId);

            const notifications = [];

            // Create notification for each signer
            for (const signer of wallet.signers) {
                console.log('   Checking signer:', {
                    signerId: signer.id,
                    userId: signer.userId,
                    address: signer.address,
                    label: signer.label
                });

                // Skip if signer has no userId (external signer)
                if (!signer.userId) {
                    console.log('   ⚠️  Skipping - no userId (external signer)');
                    continue;
                }

                console.log('   ✅ Creating notification for userId:', signer.userId);

                const notification = await this.createNotification({
                    userId: signer.userId,
                    type: 'multisig_transaction',
                    title: `New Multi-Sig Transaction`,
                    message: `${wallet.name} requires signature from ${signer.label || signer.address.substring(0, 10)} to send ${amount} ${tokenSymbol} to ${toAddress.substring(0, 10)}...`,
                    data: {
                        multiSigWalletId,
                        transactionId,
                        amount,
                        toAddress,
                        tokenSymbol,
                        walletName: wallet.name,
                        signerId: signer.id,
                        signerAddress: signer.address
                    },
                    actionUrl: `/multisig/${multiSigWalletId}/transaction/${transactionId}`
                });

                notifications.push(notification);
            }

            logger.info('Multi-sig transaction notifications sent', {
                multiSigWalletId,
                transactionId,
                notificationCount: notifications.length
            });

            console.log(`🔔 Created ${notifications.length} notifications`);

            return notifications;
        } catch (error) {
            logger.error('Error notifying multi-sig transaction', {
                error: error.message,
                stack: error.stack,
                multiSigWalletId,
                transactionId
            });
            throw error;
        }
    }

    /**
     * Notify when a transaction is signed
     */
    async notifyMultiSigSigned({ multiSigWalletId, transactionId, signerId, currentSignatures, requiredSignatures }) {
        try {
            const wallet = await prisma.multiSigWallet.findUnique({
                where: { id: multiSigWalletId },
                include: {
                    signers: true,
                    transactions: {
                        where: { id: transactionId }
                    }
                }
            });

            if (!wallet || !wallet.transactions[0]) {
                throw new Error('Transaction not found');
            }

            const transaction = wallet.transactions[0];
            const notifications = [];

            // Notify all signers about the new signature
            for (const signer of wallet.signers) {
                if (!signer.userId) continue;

                const notification = await this.createNotification({
                    userId: signer.userId,
                    type: 'multisig_signed',
                    title: `Multi-Sig Transaction Signed`,
                    message: `${wallet.name} transaction has ${currentSignatures}/${requiredSignatures} signatures`,
                    data: {
                        multiSigWalletId,
                        transactionId,
                        currentSignatures,
                        requiredSignatures,
                        walletName: wallet.name
                    },
                    actionUrl: `/multisig/${multiSigWalletId}/transaction/${transactionId}`
                });

                notifications.push(notification);
            }

            return notifications;
        } catch (error) {
            logger.error('Error notifying multi-sig signed', {
                error: error.message,
                multiSigWalletId,
                transactionId
            });
            throw error;
        }
    }

    /**
     * Notify when a transaction is executed
     */
    async notifyMultiSigExecuted({ multiSigWalletId, transactionId, txHash }) {
        try {
            const wallet = await prisma.multiSigWallet.findUnique({
                where: { id: multiSigWalletId },
                include: {
                    signers: true,
                    transactions: {
                        where: { id: transactionId }
                    }
                }
            });

            if (!wallet || !wallet.transactions[0]) {
                throw new Error('Transaction not found');
            }

            const transaction = wallet.transactions[0];
            const notifications = [];

            // Notify all signers about execution
            for (const signer of wallet.signers) {
                if (!signer.userId) continue;

                const notification = await this.createNotification({
                    userId: signer.userId,
                    type: 'multisig_executed',
                    title: `Multi-Sig Transaction Executed`,
                    message: `${wallet.name} sent ${transaction.amount} ${transaction.tokenSymbol}`,
                    data: {
                        multiSigWalletId,
                        transactionId,
                        txHash,
                        amount: transaction.amount.toString(),
                        tokenSymbol: transaction.tokenSymbol,
                        walletName: wallet.name
                    },
                    actionUrl: `/multisig/${multiSigWalletId}/transaction/${transactionId}`
                });

                notifications.push(notification);
            }

            return notifications;
        } catch (error) {
            logger.error('Error notifying multi-sig executed', {
                error: error.message,
                multiSigWalletId,
                transactionId
            });
            throw error;
        }
    }

    /**
     * Get user's notifications
     */
    async getUserNotifications(userId, { limit = 50, unreadOnly = false } = {}) {
        try {
            const where = { userId };
            if (unreadOnly) {
                where.isRead = false;
            }

            const notifications = await prisma.notification.findMany({
                where,
                orderBy: {
                    createdAt: 'desc'
                },
                take: limit
            });

            return notifications;
        } catch (error) {
            logger.error('Error fetching notifications', {
                error: error.message,
                stack: error.stack,
                userId
            });
            throw error;
        }
    }

    /**
     * Mark notification as read
     */
    async markAsRead(notificationId, userId) {
        try {
            const notification = await prisma.notification.updateMany({
                where: {
                    id: notificationId,
                    userId: userId
                },
                data: {
                    isRead: true
                }
            });

            return notification;
        } catch (error) {
            logger.error('Error marking notification as read', {
                error: error.message,
                notificationId
            });
            throw error;
        }
    }

    /**
     * Mark all notifications as read
     */
    async markAllAsRead(userId) {
        try {
            const result = await prisma.notification.updateMany({
                where: {
                    userId: userId,
                    isRead: false
                },
                data: {
                    isRead: true
                }
            });

            return result;
        } catch (error) {
            logger.error('Error marking all notifications as read', {
                error: error.message,
                userId
            });
            throw error;
        }
    }

    /**
     * Get unread notification count
     */
    async getUnreadCount(userId) {
        try {
            const count = await prisma.notification.count({
                where: {
                    userId: userId,
                    isRead: false
                }
            });

            return count;
        } catch (error) {
            logger.error('Error getting unread count', {
                error: error.message,
                stack: error.stack,
                userId
            });
            throw error;
        }
    }
}

export default new NotificationService();
