import multiSigService from '../services/multiSigService.js';
import notificationService from '../services/notificationService.js';
import prisma from '../lib/prisma.js';
import logger from '../services/loggerService.js';

/**
 * Multi-Signature Wallet Controller
 * Handles M-of-N multisig wallet creation and transaction signing
 */

class MultiSigController {
    /**
     * Create multi-signature wallet
     * POST /api/v1/wallet/multisig/create
     */
    async createMultiSigWallet(req, res) {
        try {
            const {
                name,
                network, // 'bitcoin' or 'ethereum'
                type, // 'p2sh', 'p2wsh', 'gnosis-safe'
                publicKeys, // For Bitcoin
                owners, // For Ethereum
                requiredSignatures
            } = req.body;
            const userId = req.user.id; // Fixed: clerkAuth sets req.user.id, not req.user.userId

            // Validate input
            if (!name || !network || !requiredSignatures) {
                return res.status(400).json({
                    success: false,
                    error: 'Name, network, and required signatures are required'
                });
            }

            let multiSigResult;
            let signers = [];

            if (network === 'bitcoin') {
                // Bitcoin multisig
                if (!publicKeys || !Array.isArray(publicKeys)) {
                    return res.status(400).json({
                        success: false,
                        error: 'Public keys array is required for Bitcoin multisig'
                    });
                }

                if (requiredSignatures > publicKeys.length) {
                    return res.status(400).json({
                        success: false,
                        error: 'Required signatures cannot exceed total signers'
                    });
                }

                // Create Bitcoin multisig
                multiSigResult = multiSigService.createBitcoinMultisig(
                    publicKeys,
                    requiredSignatures,
                    'mainnet'
                );

                // 🔍 Look up userId for each public key by searching wallets
                const signerUserIds = await Promise.all(
                    publicKeys.map(async (pubKey) => {
                        // Try to find a wallet that contains this public key
                        // This is a simplified lookup - in production you'd need a more robust method
                        const wallet = await prisma.wallet.findFirst({
                            where: {
                                userId: userId, // For now, assume all signers are from the creator's wallets
                                isActive: true
                            },
                            select: {
                                userId: true
                            }
                        });
                        return wallet?.userId || null;
                    })
                );

                console.log('🔍 Bitcoin public key to userId mapping:');
                publicKeys.forEach((pk, i) => {
                    console.log(`   ${pk.substring(0, 20)}... → userId: ${signerUserIds[i] || 'null (external)'}`);
                });

                // Prepare signers with userId mapping
                signers = publicKeys.map((pubKey, index) => ({
                    userId: signerUserIds[index],
                    publicKey: pubKey,
                    address: '', // Bitcoin doesn't have individual addresses in multisig
                    label: `Signer ${index + 1}`,
                    order: index
                }));

            } else if (network === 'ethereum') {
                // Ethereum multisig (Gnosis Safe)
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

                // Create Ethereum multisig
                multiSigResult = multiSigService.createEthereumMultisig(
                    owners,
                    requiredSignatures
                );

                // 🔍 Look up userId for each owner by their wallet address
                console.log('🔍 Looking up userIds for owners:', owners);
                
                const ownerUserIds = await Promise.all(
                    owners.map(async (ownerAddress) => {
                        // Normalize address (checksum)
                        const normalizedAddress = ownerAddress.toLowerCase();
                        
                        // Find wallet with this address (try both exact match and JSON path)
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
                        
                        // If not found, try case-insensitive search
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
                        
                        console.log(`   Address ${ownerAddress} → userId: ${wallet?.userId || 'NOT FOUND'}`);
                        return wallet?.userId || null;
                    })
                );

                console.log('🔍 Owner address to userId mapping:');
                owners.forEach((addr, i) => {
                    console.log(`   ${addr} → userId: ${ownerUserIds[i] || 'null (external)'}`);
                });

                // Prepare signers with proper userId mapping
                signers = owners.map((owner, index) => ({
                    userId: ownerUserIds[index], // ✅ Use looked-up userId
                    publicKey: owner, // Use address as publicKey for Ethereum (satisfies unique constraint)
                    address: owner,
                    label: `Owner ${index + 1}`,
                    order: index
                }));

            } else {
                return res.status(400).json({
                    success: false,
                    error: 'Network must be "bitcoin" or "ethereum"'
                });
            }

            // Store in database
            const multiSigWallet = await prisma.multiSigWallet.create({
                data: {
                    userId: userId, // ✅ Add the missing userId field
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

    /**
     * Get multi-sig wallet details
     * GET /api/v1/wallet/multisig/:id
     */
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

    /**
     * List all multi-sig wallets for user
     * GET /api/v1/wallet/multisig/user/:userId
     */
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

    /**
     * Create multi-sig transaction
     * POST /api/v1/wallet/multisig/:id/transaction
     */
    async createTransaction(req, res) {
        try {
            const { id } = req.params;
            const { toAddress, amount, tokenSymbol = 'ETH', data } = req.body;
            const userId = req.user.id;

            // Validate input
            if (!toAddress || !amount) {
                return res.status(400).json({
                    success: false,
                    error: 'To address and amount are required'
                });
            }

            // Get multi-sig wallet
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

            // Create transaction
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

            // 🔔 Send notifications to all owners
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
                // Don't fail the transaction if notifications fail
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

    /**
     * Sign multi-sig transaction
     * POST /api/v1/wallet/multisig/transaction/:txId/sign
     */
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

            // Get transaction
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

            // Check if already signed by this signer
            const existingSignature = transaction.signatures.find(
                sig => sig.signerId === signerId
            );

            if (existingSignature) {
                return res.status(400).json({
                    success: false,
                    error: 'Already signed by this signer'
                });
            }

            // Add signature
            await prisma.multiSigSignature.create({
                data: {
                    multiSigTransactionId: txId,
                    signerId: signerId,
                    signature: signature
                }
            });

            // Update signature count
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

    /**
     * Get all transactions for a multi-sig wallet
     * GET /api/v1/wallet/multisig/:id/transactions
     */
    async getTransactions(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.id;

            // Verify user has access to this wallet
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

    /**
     * Get pending transactions for a multi-sig wallet
     * GET /api/v1/wallet/multisig/:id/pending
     */
    async getPendingTransactions(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.id;

            // Verify user has access to this wallet
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

    /**
     * Execute a ready multi-sig transaction
     * PUT /api/v1/wallet/multisig/transaction/:txId/execute
     */
    async executeTransaction(req, res) {
        try {
            const { txId } = req.params;
            const userId = req.user.id;

            // Get transaction with wallet info
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

            // TODO: Implement actual blockchain execution
            // For now, just mark as executed
            const txHash = `0x${Math.random().toString(16).substring(2)}${Math.random().toString(16).substring(2)}`;

            const updatedTransaction = await prisma.multiSigTransaction.update({
                where: { id: txId },
                data: {
                    status: 'executed',
                    txHash: txHash,
                    executedAt: new Date()
                }
            });

            // Send notifications to all owners
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

    /**
     * Delete multi-sig wallet
     * DELETE /api/v1/wallet/multisig/:id
     */
    async deleteMultiSigWallet(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.id;

            // Verify wallet exists and belongs to user
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

            // Soft delete - set isActive to false
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
