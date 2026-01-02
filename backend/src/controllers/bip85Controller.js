import bip85Service from '../services/bip85Service.js';
import walletService from '../services/walletService.js';
import prisma from '../lib/prisma.js';
import logger from '../services/loggerService.js';

/**
 * BIP-85 Controller
 * Handles deterministic entropy derivation for child wallets
 */

class BIP85Controller {
    /**
     * Derive child wallet from master using BIP-85
     * POST /api/v1/wallet/bip85/derive
     */
    async deriveChildWallet(req, res) {
        try {
            const { walletId, password, index = 0, wordCount = 12, label } = req.body;
            const userId = req.user.userId;

            // Validate input
            if (!walletId || !password) {
                return res.status(400).json({
                    success: false,
                    error: 'Wallet ID and password are required'
                });
            }

            if (![12, 18, 24].includes(wordCount)) {
                return res.status(400).json({
                    success: false,
                    error: 'Word count must be 12, 18, or 24'
                });
            }

            // Get parent wallet
            const parentWallet = await prisma.wallet.findFirst({
                where: {
                    id: walletId,
                    userId: userId,
                    isActive: true
                }
            });

            if (!parentWallet) {
                return res.status(404).json({
                    success: false,
                    error: 'Wallet not found'
                });
            }

            // Check if child with this index already exists
            const existingChild = await prisma.bIP85ChildWallet.findUnique({
                where: {
                    parentWalletId_childIndex: {
                        parentWalletId: walletId,
                        childIndex: index
                    }
                }
            });

            if (existingChild) {
                return res.status(400).json({
                    success: false,
                    error: `Child wallet with index ${index} already exists`
                });
            }

            // Decrypt parent mnemonic
            const decryptResult = await walletService.decryptWallet(
                parentWallet.encryptedMnemonic,
                password
            );

            if (!decryptResult.success) {
                return res.status(401).json({
                    success: false,
                    error: 'Invalid password'
                });
            }

            const masterMnemonic = decryptResult.mnemonic;

            // Derive child mnemonic using BIP-85
            const childMnemonic = bip85Service.deriveChildMnemonic(
                masterMnemonic,
                index,
                wordCount
            );

            // Generate addresses for child wallet
            const ethereumWallet = walletService.generateEthereumWallet(childMnemonic);
            const bitcoinWallet = walletService.generateBitcoinWallet(childMnemonic);

            const addresses = {
                ethereum: ethereumWallet.address,
                bitcoin: bitcoinWallet.address
            };

            // Encrypt child mnemonic
            const encryptedChild = await walletService.encryptWallet(childMnemonic, password);

            // Store in database
            const childWallet = await prisma.bIP85ChildWallet.create({
                data: {
                    parentWalletId: walletId,
                    childIndex: index,
                    wordCount: wordCount,
                    derivationPath: `m/83696968'/39'/0'/0'/0'/${(wordCount - 12) / 6}'/${index}'`,
                    encryptedMnemonic: encryptedChild.encryptedData,
                    addresses: addresses,
                    label: label || `Child Wallet ${index}`,
                    isActive: true
                }
            });

            logger.info('BIP-85 child wallet derived', {
                userId,
                parentWalletId: walletId,
                childIndex: index,
                childWalletId: childWallet.id
            });

            res.status(201).json({
                success: true,
                childWallet: {
                    id: childWallet.id,
                    index: childWallet.childIndex,
                    label: childWallet.label,
                    addresses: childWallet.addresses,
                    derivationPath: childWallet.derivationPath,
                    wordCount: childWallet.wordCount,
                    createdAt: childWallet.createdAt
                }
            });
        } catch (error) {
            logger.error('Error deriving BIP-85 child wallet', {
                error: error.message,
                userId: req.user?.userId
            });

            res.status(500).json({
                success: false,
                error: 'Failed to derive child wallet'
            });
        }
    }

    /**
     * Get all child wallets for a parent
     * GET /api/v1/wallet/bip85/children/:walletId
     */
    async getChildWallets(req, res) {
        try {
            const { walletId } = req.params;
            const userId = req.user.userId;

            // Verify parent wallet ownership
            const parentWallet = await prisma.wallet.findFirst({
                where: {
                    id: walletId,
                    userId: userId,
                    isActive: true
                }
            });

            if (!parentWallet) {
                return res.status(404).json({
                    success: false,
                    error: 'Wallet not found'
                });
            }

            // Get all child wallets
            const children = await prisma.bIP85ChildWallet.findMany({
                where: {
                    parentWalletId: walletId,
                    isActive: true
                },
                orderBy: {
                    childIndex: 'asc'
                }
            });

            res.status(200).json({
                success: true,
                parentWalletId: walletId,
                totalChildren: children.length,
                children: children.map(child => ({
                    id: child.id,
                    index: child.childIndex,
                    label: child.label,
                    addresses: child.addresses,
                    derivationPath: child.derivationPath,
                    wordCount: child.wordCount,
                    createdAt: child.createdAt
                }))
            });
        } catch (error) {
            logger.error('Error fetching BIP-85 child wallets', {
                error: error.message,
                userId: req.user?.userId
            });

            res.status(500).json({
                success: false,
                error: 'Failed to fetch child wallets'
            });
        }
    }

    /**
     * Delete/deactivate child wallet
     * DELETE /api/v1/wallet/bip85/child/:childId
     */
    async deleteChildWallet(req, res) {
        try {
            const { childId } = req.params;
            const userId = req.user.userId;

            // Get child wallet and verify ownership through parent
            const childWallet = await prisma.bIP85ChildWallet.findUnique({
                where: { id: childId },
                include: {
                    parentWallet: true
                }
            });

            if (!childWallet) {
                return res.status(404).json({
                    success: false,
                    error: 'Child wallet not found'
                });
            }

            if (childWallet.parentWallet.userId !== userId) {
                return res.status(403).json({
                    success: false,
                    error: 'Unauthorized'
                });
            }

            // Soft delete (deactivate)
            await prisma.bIP85ChildWallet.update({
                where: { id: childId },
                data: { isActive: false }
            });

            logger.info('BIP-85 child wallet deleted', {
                userId,
                childWalletId: childId
            });

            res.status(200).json({
                success: true,
                message: 'Child wallet deleted successfully'
            });
        } catch (error) {
            logger.error('Error deleting BIP-85 child wallet', {
                error: error.message,
                userId: req.user?.userId
            });

            res.status(500).json({
                success: false,
                error: 'Failed to delete child wallet'
            });
        }
    }

    /**
     * Get child wallet mnemonic (requires password)
     * POST /api/v1/wallet/bip85/child/:childId/mnemonic
     */
    async getChildMnemonic(req, res) {
        try {
            const { childId } = req.params;
            const { password } = req.body;
            const userId = req.user.userId;

            if (!password) {
                return res.status(400).json({
                    success: false,
                    error: 'Password is required'
                });
            }

            // Get child wallet and verify ownership
            const childWallet = await prisma.bIP85ChildWallet.findUnique({
                where: { id: childId },
                include: {
                    parentWallet: true
                }
            });

            if (!childWallet) {
                return res.status(404).json({
                    success: false,
                    error: 'Child wallet not found'
                });
            }

            if (childWallet.parentWallet.userId !== userId) {
                return res.status(403).json({
                    success: false,
                    error: 'Unauthorized'
                });
            }

            // Decrypt child mnemonic
            const decryptResult = await walletService.decryptWallet(
                childWallet.encryptedMnemonic,
                password
            );

            if (!decryptResult.success) {
                return res.status(401).json({
                    success: false,
                    error: 'Invalid password'
                });
            }

            res.status(200).json({
                success: true,
                mnemonic: decryptResult.mnemonic,
                addresses: childWallet.addresses
            });
        } catch (error) {
            logger.error('Error retrieving BIP-85 child mnemonic', {
                error: error.message,
                userId: req.user?.userId
            });

            res.status(500).json({
                success: false,
                error: 'Failed to retrieve mnemonic'
            });
        }
    }
}

export default new BIP85Controller();
