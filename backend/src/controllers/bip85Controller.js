import bip85Service from '../services/bip85Service.js';
import walletService from '../services/walletService.js';
import prisma from '../lib/prisma.js';
import logger from '../services/loggerService.js';

class BIP85Controller {

    async deriveChildWallet(req, res) {
        try {
            const { walletId, password, index = 0, wordCount = 12, label } = req.body;
            const userId = req.user.userId;

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

            const childMnemonic = bip85Service.deriveChildMnemonic(
                masterMnemonic,
                index,
                wordCount
            );

            const ethereumWallet = walletService.generateEthereumWallet(childMnemonic);
            const bitcoinWallet = walletService.generateBitcoinWallet(childMnemonic);

            const addresses = {
                ethereum: ethereumWallet.address,
                bitcoin: bitcoinWallet.address
            };

            const encryptedChild = await walletService.encryptWallet(childMnemonic, password);

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

    async getChildWallets(req, res) {
        try {
            const { walletId } = req.params;
            const userId = req.user.userId;

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

    async deleteChildWallet(req, res) {
        try {
            const { childId } = req.params;
            const userId = req.user.userId;

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
