import prisma from '../lib/prisma.js';
import logger from './loggerService.js';

class NotificationService {

    async createNotification({ userId, walletId, type, title, message, data, actionUrl }) {
        try {
            const notification = await prisma.notification.create({
                data: {
                    userId,
                    walletId,
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
                walletId,
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

    async notifyMultiSigTransaction({ multiSigWalletId, transactionId, creatorId, amount, toAddress, tokenSymbol }) {
        try {

            const wallet = await prisma.multiSigWallet.findUnique({
                where: { id: multiSigWalletId },
                include: {
                    signers: true
                }
            });

            if (!wallet) {
                throw new Error('Multi-sig wallet not found');
            }

            const notifications = [];

            for (const signer of wallet.signers) {

                if (!signer.userId) {

                    continue;
                }

                const signerWallet = await prisma.wallet.findFirst({
                    where: {
                        userId: signer.userId,
                        addresses: {
                            path: ['ethereum'],
                            equals: signer.address
                        },
                        isActive: true
                    },
                    select: {
                        id: true,
                        name: true
                    }
                });

                if (!signerWallet) {

                    continue;
                }

                const notification = await this.createNotification({
                    userId: signer.userId,
                    walletId: signerWallet.id,
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

    async getUserNotifications(userId, { walletId, limit = 50, unreadOnly = false } = {}) {
        try {
            const where = { userId };
            if (unreadOnly) {
                where.isRead = false;
            }

            if (walletId) {
                where.walletId = walletId;
            }

            const notifications = await prisma.notification.findMany({
                where,
                orderBy: {
                    createdAt: 'desc'
                },
                take: limit
            });

            const enrichedNotifications = await Promise.all(notifications.map(async (notification) => {
                if (notification.type === 'multisig_transaction' && notification.data?.transactionId) {

                    const signature = await prisma.multiSigSignature.findFirst({
                        where: {
                            multiSigTransactionId: notification.data.transactionId,
                            signerId: notification.data.signerId
                        }
                    });

                    return {
                        ...notification,
                        data: {
                            ...notification.data,
                            hasSigned: !!signature
                        }
                    };
                }

                return notification;
            }));

            return enrichedNotifications;
        } catch (error) {
            logger.error('Error fetching notifications', {
                error: error.message,
                stack: error.stack,
                userId,
                walletId
            });
            throw error;
        }
    }

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

    async getUnreadCount(userId, walletId = null) {
        try {
            const where = {
                userId: userId,
                isRead: false
            };

            if (walletId) {
                where.walletId = walletId;
            }

            const count = await prisma.notification.count({
                where
            });

            return count;
        } catch (error) {
            logger.error('Error getting unread count', {
                error: error.message,
                stack: error.stack,
                userId,
                walletId
            });
            throw error;
        }
    }
}

export default new NotificationService();
