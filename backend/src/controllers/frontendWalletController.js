import prisma from '../lib/prisma.js';
import logger from '../services/loggerService.js';

/**
 * FrontendWalletController
 * Compatibility controller that bridges the existing frontend's expected
 * API shape with the Prisma database.
 *
 * The frontend sends:
 *   POST /api/v1/wallets  { name, encryptedData, addresses: { ethereum, bitcoin, solana }, description }
 *   GET  /api/v1/wallets
 *   DELETE /api/v1/wallets/:walletId
 *
 * Each wallet is stored as multiple rows (one per network) in the Prisma Wallet model,
 * grouped by a shared `walletGroupId` tag stored in metadata.
 */
class FrontendWalletController {
    /**
     * Create a wallet group — one row per chain address.
     * Expects Clerk JWT `Authorization: Bearer <token>` header.
     */
    async createWallet(req, res) {
        try {
            const clerkUserId = req.clerkUserId;
            if (!clerkUserId) {
                return res.status(401).json({ success: false, error: 'Authentication required' });
            }

            const { name, encryptedData, addresses, description } = req.body;
            if (!addresses || !encryptedData) {
                return res.status(400).json({ success: false, error: 'addresses and encryptedData are required' });
            }

            // Ensure user exists in DB (upsert from Clerk ID)
            const user = await prisma.user.upsert({
                where: { email: clerkUserId },
                update: {}, // No-op if exists
                create: {
                    email: clerkUserId,
                    name: name || 'Clerk User',
                    passwordHash: 'clerk-managed', // Clerk handles auth
                },
            });

            const groupId = `grp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
            const walletsToCreate = [];

            // Stringify encryptedData if it's an object (frontend sends {ciphertext, salt, iv, authTag, ...})
            const encryptedString = typeof encryptedData === 'object' ? JSON.stringify(encryptedData) : encryptedData;

            if (addresses.ethereum) {
                walletsToCreate.push({
                    userId: user.id,
                    label: name || 'My Wallet',
                    type: 'HD',
                    network: 'ETHEREUM',
                    address: addresses.ethereum,
                    encryptedKey: encryptedString,
                    metadata: { groupId, description },
                });
            }
            if (addresses.bitcoin) {
                walletsToCreate.push({
                    userId: user.id,
                    label: name || 'My Wallet',
                    type: 'HD',
                    network: 'BITCOIN',
                    address: addresses.bitcoin,
                    metadata: { groupId, description },
                });
            }
            if (addresses.solana) {
                walletsToCreate.push({
                    userId: user.id,
                    label: name || 'My Wallet',
                    type: 'HD',
                    network: 'SOLANA',
                    address: addresses.solana,
                    metadata: { groupId, description },
                });
            }

            const created = [];
            for (const walletData of walletsToCreate) {
                try {
                    const w = await prisma.wallet.create({ data: walletData });
                    created.push(w);
                } catch (err) {
                    if (err.code === 'P2002') {
                        // Duplicate — skip silently
                        logger.warn('Duplicate wallet address skipped', { address: walletData.address, network: walletData.network });
                    } else {
                        throw err;
                    }
                }
            }

            // Log activity
            try {
                await prisma.activityLog.create({
                    data: { userId: user.id, action: 'WALLET_CREATED', details: { groupId, name } },
                });
            } catch (e) { /* non-critical */ }

            // Return in the format the frontend expects
            const walletResponse = {
                id: created[0]?.id || groupId,
                name: name || 'My Wallet',
                addresses,
                encryptedData,
                description,
                createdAt: created[0]?.createdAt,
            };

            res.status(201).json({ success: true, wallet: walletResponse });
        } catch (error) {
            logger.error('Frontend createWallet failed', { error: error.message });
            res.status(500).json({ success: false, error: 'Failed to create wallet' });
        }
    }

    /**
     * List all wallet groups for the authenticated user.
     */
    async getWallets(req, res) {
        try {
            const clerkUserId = req.clerkUserId;
            if (!clerkUserId) {
                return res.status(401).json({ success: false, error: 'Authentication required' });
            }

            const user = await prisma.user.findUnique({ where: { email: clerkUserId } });
            if (!user) {
                return res.status(200).json({ success: true, wallets: [] });
            }

            const wallets = await prisma.wallet.findMany({
                where: { userId: user.id, isActive: true },
                orderBy: { createdAt: 'desc' },
            });

            // Group wallets by groupId (from metadata) to reconstruct the multi-chain wallet object
            const groups = {};
            for (const w of wallets) {
                const groupId = w.metadata?.groupId || w.id;
                if (!groups[groupId]) {
                    // Parse encryptedKey from JSON string to object for the frontend
                    let parsedEncrypted = w.encryptedKey || null;
                    if (w.encryptedKey) {
                        try { parsedEncrypted = JSON.parse(w.encryptedKey); } catch { /* keep as string */ }
                    }
                    groups[groupId] = {
                        id: w.id,
                        name: w.label,
                        addresses: {},
                        encryptedData: parsedEncrypted,
                        description: w.metadata?.description || '',
                        createdAt: w.createdAt,
                    };
                }
                const networkKey = w.network.toLowerCase();
                groups[groupId].addresses[networkKey] = w.address;
                // Use the encrypted key from ethereum row (it has the full encrypted data)
                if (w.encryptedKey) {
                    // Parse back from JSON string to object for the frontend
                    try {
                        groups[groupId].encryptedData = JSON.parse(w.encryptedKey);
                    } catch {
                        groups[groupId].encryptedData = w.encryptedKey;
                    }
                }
            }

            const walletList = Object.values(groups);
            res.status(200).json({ success: true, wallets: walletList });
        } catch (error) {
            logger.error('Frontend getWallets failed', { error: error.message });
            res.status(500).json({ success: false, error: 'Failed to fetch wallets' });
        }
    }

    /**
     * Delete a wallet (soft-delete all wallets in the group).
     */
    async deleteWallet(req, res) {
        try {
            const clerkUserId = req.clerkUserId;
            const { walletId } = req.params;

            if (!clerkUserId) {
                return res.status(401).json({ success: false, error: 'Authentication required' });
            }

            const user = await prisma.user.findUnique({ where: { email: clerkUserId } });
            if (!user) {
                return res.status(404).json({ success: false, error: 'User not found' });
            }

            // Find the wallet to get its groupId
            const wallet = await prisma.wallet.findFirst({
                where: { id: walletId, userId: user.id },
            });

            if (!wallet) {
                return res.status(404).json({ success: false, error: 'Wallet not found' });
            }

            const groupId = wallet.metadata?.groupId;

            if (groupId) {
                // Soft-delete all wallets in the group
                const allInGroup = await prisma.wallet.findMany({
                    where: { userId: user.id, metadata: { path: ['groupId'], equals: groupId } },
                });
                for (const w of allInGroup) {
                    await prisma.wallet.update({ where: { id: w.id }, data: { isActive: false } });
                }
            } else {
                await prisma.wallet.update({ where: { id: walletId }, data: { isActive: false } });
            }

            res.status(200).json({ success: true, message: 'Wallet deleted' });
        } catch (error) {
            logger.error('Frontend deleteWallet failed', { error: error.message });
            res.status(500).json({ success: false, error: 'Failed to delete wallet' });
        }
    }
}

export default new FrontendWalletController();
