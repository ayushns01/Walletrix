import multiSigService from '../services/multiSigService.js';
import notificationService from '../services/notificationService.js';
import prisma from '../lib/prisma.js';
import logger from '../services/loggerService.js';

class MultiSigController {

    async createMultiSigWallet(req, res) {
        try {
            const {
                name,
                network,
                type,
                publicKeys,
                owners,
                requiredSignatures
            } = req.body;
            const userId = req.user.id;

            if (!name || !network || !requiredSignatures) {
                return res.status(400).json({
                    success: false,
                    error: 'Name, network, and required signatures are required'
                });
            }

            if (network !== 'ethereum') {
                return res.status(400).json({
                    success: false,
                    error: 'Only Ethereum network is supported for multi-sig wallets'
                });
            }

            if (!owners || !Array.isArray(owners)) {
                return res.status(400).json({
                    success: false,
                    error: 'Owners array is required for Ethereum multisig'
                });
            }

            if (requiredSignatures > owners.length) {
                return res.status(400).json({
                    success: false,
                    error: 'Required signatures cannot exceed total owners'
                });
            }

            const multiSigResult = multiSigService.createEthereumMultisig(
                owners,
                requiredSignatures
            );

            const ownerUserIds = await Promise.all(
                owners.map(async (ownerAddress) => {

                    const normalizedAddress = ownerAddress.toLowerCase();

                    let wallet = await prisma.wallet.findFirst({
                        where: {
                            addresses: {
                                path: ['ethereum'],
                                equals: ownerAddress
                            },
                            isActive: true
                        },
                        select: {
                            userId: true,
                            addresses: true
                        }
                    });

                    if (!wallet) {
                        const allWallets = await prisma.wallet.findMany({
                            where: { isActive: true },
                            select: {
                                userId: true,
                                addresses: true
                            }
                        });

                        wallet = allWallets.find(w => {
                            const ethAddress = w.addresses?.ethereum;
                            return ethAddress && ethAddress.toLowerCase() === normalizedAddress;
                        });
                    }

                    return wallet?.userId || null;
                })
            );

            const signers = owners.map((owner, index) => ({
                userId: ownerUserIds[index],
                publicKey: owner,
                address: owner,
                label: `Owner ${index + 1}`,
                order: index
            }));

            const multiSigWallet = await prisma.multiSigWallet.create({
                data: {
                    userId: userId,
                    name: name,
                    network: network,
                    walletType: type || (network === 'bitcoin' ? 'p2sh' : 'gnosis-safe'),
                    address: multiSigResult.address || 'pending-deployment',
                    requiredSignatures: requiredSignatures,
                    totalSigners: signers.length,
                    redeemScript: multiSigResult.redeemScript || null,
                    configuration: multiSigResult.configuration || null,
                    isActive: true,
                    signers: {
                        create: signers
                    }
                },
                include: {
                    signers: true
                }
            });

            logger.info('Multi-sig wallet created', {
                userId,
                multiSigWalletId: multiSigWallet.id,
                network,
                requiredSignatures,
                totalSigners: signers.length
            });

            res.status(201).json({
                success: true,
                multiSigWallet: {
                    id: multiSigWallet.id,
                    name: multiSigWallet.name,
                    network: multiSigWallet.network,
                    type: multiSigWallet.walletType,
                    address: multiSigWallet.address,
                    requiredSignatures: multiSigWallet.requiredSignatures,
                    totalSigners: multiSigWallet.totalSigners,
                    signers: multiSigWallet.signers.map(s => ({
                        id: s.id,
                        publicKey: s.publicKey,
                        address: s.address,
                        label: s.label,
                        order: s.order
                    })),
                    createdAt: multiSigWallet.createdAt
                }
            });
        } catch (error) {
            logger.error('Error creating multi-sig wallet', {
                error: error.message,
                userId: req.user?.id
            });

            res.status(500).json({
                success: false,
                error: 'Failed to create multi-sig wallet'
            });
        }
    }

    async getMultiSigWallet(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.id;

            const multiSigWallet = await prisma.multiSigWallet.findFirst({
                where: {
                    id: id,
                    userId: userId,
                    isActive: true
                },
                include: {
                    signers: {
                        orderBy: {
                            order: 'asc'
                        }
                    },
                    transactions: {
                        orderBy: {
                            createdAt: 'desc'
                        },
                        take: 10
                    }
                }
            });

            if (!multiSigWallet) {
                return res.status(404).json({
                    success: false,
                    error: 'Multi-sig wallet not found'
                });
            }

            res.status(200).json({
                success: true,
                multiSigWallet: {
                    id: multiSigWallet.id,
                    name: multiSigWallet.name,
                    network: multiSigWallet.network,
                    type: multiSigWallet.walletType,
                    address: multiSigWallet.address,
                    requiredSignatures: multiSigWallet.requiredSignatures,
                    totalSigners: multiSigWallet.totalSigners,
                    signers: multiSigWallet.signers,
                    recentTransactions: multiSigWallet.transactions,
                    createdAt: multiSigWallet.createdAt
                }
            });
        } catch (error) {
            logger.error('Error fetching multi-sig wallet', {
                error: error.message,
                userId: req.user?.id
            });

            res.status(500).json({
                success: false,
                error: 'Failed to fetch multi-sig wallet'
            });
        }
    }

    async getUserMultiSigWallets(req, res) {
        try {
            const userId = req.user.id;

            const multiSigWallets = await prisma.multiSigWallet.findMany({
                where: {
                    userId: userId,
                    isActive: true
                },
                include: {
                    signers: true,
                    _count: {
                        select: {
                            transactions: true
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                }
            });

            res.status(200).json({
                success: true,
                totalWallets: multiSigWallets.length,
                multiSigWallets: multiSigWallets.map(wallet => ({
                    id: wallet.id,
                    name: wallet.name,
                    network: wallet.network,
                    type: wallet.walletType,
                    address: wallet.address,
                    requiredSignatures: wallet.requiredSignatures,
                    totalSigners: wallet.totalSigners,
                    transactionCount: wallet._count.transactions,
                    createdAt: wallet.createdAt
                }))
            });
        } catch (error) {
            logger.error('Error fetching user multi-sig wallets', {
                error: error.message,
                userId: req.user?.id
            });

            res.status(500).json({
                success: false,
                error: 'Failed to fetch multi-sig wallets'
            });
        }
    }

    async createTransaction(req, res) {
        try {
            const { id } = req.params;
            const { toAddress, amount, tokenSymbol = 'ETH', data } = req.body;
            const userId = req.user.id;

            if (!toAddress || !amount) {
                return res.status(400).json({
                    success: false,
                    error: 'To address and amount are required'
                });
            }

            const multiSigWallet = await prisma.multiSigWallet.findFirst({
                where: {
                    id: id,
                    userId: userId,
                    isActive: true
                }
            });

            if (!multiSigWallet) {
                return res.status(404).json({
                    success: false,
                    error: 'Multi-sig wallet not found'
                });
            }

            const transaction = await prisma.multiSigTransaction.create({
                data: {
                    multiSigWalletId: id,
                    toAddress: toAddress,
                    amount: amount,
                    tokenSymbol: tokenSymbol,
                    data: data || null,
                    status: 'pending',
                    requiredSignatures: multiSigWallet.requiredSignatures,
                    currentSignatures: 0
                }
            });

            try {
                await notificationService.notifyMultiSigTransaction({
                    multiSigWalletId: id,
                    transactionId: transaction.id,
                    creatorId: userId,
                    amount: amount.toString(),
                    toAddress: toAddress,
                    tokenSymbol: tokenSymbol
                });
            } catch (notifError) {
                logger.error('Failed to send notifications', {
                    error: notifError.message,
                    transactionId: transaction.id
                });

            }

            logger.info('Multi-sig transaction created', {
                userId,
                multiSigWalletId: id,
                transactionId: transaction.id,
                toAddress,
                amount
            });

            res.status(201).json({
                success: true,
                transaction: {
                    id: transaction.id,
                    toAddress: transaction.toAddress,
                    amount: transaction.amount.toString(),
                    tokenSymbol: transaction.tokenSymbol,
                    status: transaction.status,
                    requiredSignatures: transaction.requiredSignatures,
                    currentSignatures: transaction.currentSignatures,
                    createdAt: transaction.createdAt
                }
            });
        } catch (error) {
            logger.error('Error creating multi-sig transaction', {
                error: error.message,
                userId: req.user?.id
            });

            res.status(500).json({
                success: false,
                error: 'Failed to create transaction'
            });
        }
    }

    async signTransaction(req, res) {
        try {
            const { txId } = req.params;
            const { signerId, signature } = req.body;
            const userId = req.user.id;

            if (!signerId || !signature) {
                return res.status(400).json({
                    success: false,
                    error: 'Signer ID and signature are required'
                });
            }

            const transaction = await prisma.multiSigTransaction.findUnique({
                where: { id: txId },
                include: {
                    multiSigWallet: true,
                    signatures: true
                }
            });

            if (!transaction) {
                return res.status(404).json({
                    success: false,
                    error: 'Transaction not found'
                });
            }

            if (transaction.multiSigWallet.userId !== userId) {
                return res.status(403).json({
                    success: false,
                    error: 'Unauthorized'
                });
            }

            if (transaction.status !== 'pending') {
                return res.status(400).json({
                    success: false,
                    error: 'Transaction is not pending'
                });
            }

            const existingSignature = transaction.signatures.find(
                sig => sig.signerId === signerId
            );

            if (existingSignature) {
                return res.status(400).json({
                    success: false,
                    error: 'Already signed by this signer'
                });
            }

            await prisma.multiSigSignature.create({
                data: {
                    multiSigTransactionId: txId,
                    signerId: signerId,
                    signature: signature
                }
            });

            const newSignatureCount = transaction.currentSignatures + 1;
            const updatedTransaction = await prisma.multiSigTransaction.update({
                where: { id: txId },
                data: {
                    currentSignatures: newSignatureCount,
                    status: newSignatureCount >= transaction.requiredSignatures ? 'ready' : 'pending'
                },
                include: {
                    signatures: true
                }
            });

            logger.info('Multi-sig transaction signed', {
                userId,
                transactionId: txId,
                signerId,
                currentSignatures: newSignatureCount,
                requiredSignatures: transaction.requiredSignatures
            });

            res.status(200).json({
                success: true,
                transaction: {
                    id: updatedTransaction.id,
                    status: updatedTransaction.status,
                    currentSignatures: updatedTransaction.currentSignatures,
                    requiredSignatures: updatedTransaction.requiredSignatures,
                    signatures: updatedTransaction.signatures.length
                }
            });
        } catch (error) {
            logger.error('Error signing multi-sig transaction', {
                error: error.message,
                userId: req.user?.id
            });

            res.status(500).json({
                success: false,
                error: 'Failed to sign transaction'
            });
        }
    }

    async getTransactions(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.id;

            const wallet = await prisma.multiSigWallet.findFirst({
                where: {
                    id: id,
                    userId: userId,
                    isActive: true
                }
            });

            if (!wallet) {
                return res.status(404).json({
                    success: false,
                    error: 'Multi-sig wallet not found'
                });
            }

            const transactions = await prisma.multiSigTransaction.findMany({
                where: {
                    multiSigWalletId: id
                },
                include: {
                    signatures: true
                },
                orderBy: {
                    createdAt: 'desc'
                }
            });

            res.status(200).json({
                success: true,
                transactions: transactions.map(tx => ({
                    id: tx.id,
                    toAddress: tx.toAddress,
                    amount: tx.amount.toString(),
                    tokenSymbol: tx.tokenSymbol,
                    data: tx.data,
                    status: tx.status,
                    requiredSignatures: tx.requiredSignatures,
                    currentSignatures: tx.currentSignatures,
                    signatures: tx.signatures,
                    txHash: tx.txHash,
                    createdAt: tx.createdAt,
                    executedAt: tx.executedAt
                }))
            });
        } catch (error) {
            logger.error('Error fetching multi-sig transactions', {
                error: error.message,
                userId: req.user?.id
            });

            res.status(500).json({
                success: false,
                error: 'Failed to fetch transactions'
            });
        }
    }

    async getPendingTransactions(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.id;

            const wallet = await prisma.multiSigWallet.findFirst({
                where: {
                    id: id,
                    userId: userId,
                    isActive: true
                }
            });

            if (!wallet) {
                return res.status(404).json({
                    success: false,
                    error: 'Multi-sig wallet not found'
                });
            }

            const transactions = await prisma.multiSigTransaction.findMany({
                where: {
                    multiSigWalletId: id,
                    status: {
                        in: ['pending', 'ready']
                    }
                },
                include: {
                    signatures: true
                },
                orderBy: {
                    createdAt: 'desc'
                }
            });

            res.status(200).json({
                success: true,
                transactions: transactions.map(tx => ({
                    id: tx.id,
                    toAddress: tx.toAddress,
                    amount: tx.amount.toString(),
                    tokenSymbol: tx.tokenSymbol,
                    data: tx.data,
                    status: tx.status,
                    requiredSignatures: tx.requiredSignatures,
                    currentSignatures: tx.currentSignatures,
                    signatures: tx.signatures,
                    createdAt: tx.createdAt
                }))
            });
        } catch (error) {
            logger.error('Error fetching pending transactions', {
                error: error.message,
                userId: req.user?.id
            });

            res.status(500).json({
                success: false,
                error: 'Failed to fetch pending transactions'
            });
        }
    }

    async executeTransaction(req, res) {
        try {
            const { txId } = req.params;
            const userId = req.user.id;

            const transaction = await prisma.multiSigTransaction.findUnique({
                where: { id: txId },
                include: {
                    multiSigWallet: true,
                    signatures: true
                }
            });

            if (!transaction) {
                return res.status(404).json({
                    success: false,
                    error: 'Transaction not found'
                });
            }

            if (transaction.multiSigWallet.userId !== userId) {
                return res.status(403).json({
                    success: false,
                    error: 'Unauthorized'
                });
            }

            if (transaction.status !== 'ready') {
                return res.status(400).json({
                    success: false,
                    error: 'Transaction is not ready for execution'
                });
            }

            const txHash = `0x${Math.random().toString(16).substring(2)}${Math.random().toString(16).substring(2)}`;

            const updatedTransaction = await prisma.multiSigTransaction.update({
                where: { id: txId },
                data: {
                    status: 'executed',
                    txHash: txHash,
                    executedAt: new Date()
                }
            });

            try {
                await notificationService.notifyMultiSigExecuted({
                    multiSigWalletId: transaction.multiSigWalletId,
                    transactionId: txId,
                    txHash: txHash
                });
            } catch (notifError) {
                logger.error('Failed to send execution notifications', {
                    error: notifError.message,
                    transactionId: txId
                });
            }

            logger.info('Multi-sig transaction executed', {
                userId,
                transactionId: txId,
                txHash
            });

            res.status(200).json({
                success: true,
                transaction: {
                    id: updatedTransaction.id,
                    status: updatedTransaction.status,
                    txHash: updatedTransaction.txHash,
                    executedAt: updatedTransaction.executedAt
                }
            });
        } catch (error) {
            logger.error('Error executing multi-sig transaction', {
                error: error.message,
                userId: req.user?.id
            });

            res.status(500).json({
                success: false,
                error: 'Failed to execute transaction'
            });
        }
    }

    async deleteMultiSigWallet(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.id;

            const wallet = await prisma.multiSigWallet.findFirst({
                where: {
                    id: id,
                    userId: userId,
                    isActive: true
                }
            });

            if (!wallet) {
                return res.status(404).json({
                    success: false,
                    error: 'Multi-sig wallet not found or you do not have permission'
                });
            }

            await prisma.multiSigWallet.update({
                where: { id: id },
                data: { isActive: false }
            });

            logger.info('Multi-sig wallet deleted', {
                userId,
                multiSigWalletId: id,
                walletName: wallet.name
            });

            res.status(200).json({
                success: true,
                message: 'Multi-sig wallet deleted successfully'
            });
        } catch (error) {
            logger.error('Error deleting multi-sig wallet', {
                error: error.message,
                userId: req.user?.id
            });

            res.status(500).json({
                success: false,
                error: 'Failed to delete wallet'
            });
        }
    }
}

export default new MultiSigController();
