import ethereumService from '../services/ethereumService.js';
import bitcoinService from '../services/bitcoinService.js';
import prisma from '../lib/prisma.js';

/**
 * Get balance for a multi-sig wallet address
 * Uses blockchain RPC providers for reliable balance fetching
 */
const getBalance = async (req, res) => {
    try {
        const { id } = req.params;
        const { network } = req.query; // ethereum, sepolia, or bitcoin

        // Get wallet from database using Prisma
        const multiSigWallet = await prisma.multiSigWallet.findUnique({
            where: { id },
        });

        if (!multiSigWallet) {
            return res.status(404).json({
                success: false,
                error: 'Multi-sig wallet not found'
            });
        }

        const address = multiSigWallet.address;
        const effectiveNetwork = (network || multiSigWallet.network).toLowerCase();



        let result;

        if (effectiveNetwork === 'ethereum' || effectiveNetwork === 'sepolia') {
            // Use ethereumService (same as regular wallets)
            result = await ethereumService.getBalance(address, effectiveNetwork === 'sepolia' ? 'sepolia' : 'mainnet');

            if (result.success) {

                return res.json({
                    success: true,
                    balance: parseFloat(result.balance.eth).toFixed(4),
                    network: effectiveNetwork,
                    address
                });
            } else {
                console.error('❌ Balance fetch failed:', result.error);
                return res.status(500).json({
                    success: false,
                    error: result.error
                });
            }
        } else if (effectiveNetwork === 'bitcoin') {
            // Use bitcoinService
            result = await bitcoinService.getBalance(address, 'mainnet');

            if (result.success) {

                return res.json({
                    success: true,
                    balance: result.balance.btc,
                    network: effectiveNetwork,
                    address
                });
            } else {
                console.error('❌ Balance fetch failed:', result.error);
                return res.status(500).json({
                    success: false,
                    error: result.error
                });
            }
        }

        res.status(400).json({
            success: false,
            error: 'Unsupported network'
        });
    } catch (error) {
        console.error('Balance fetch error:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch balance',
            details: error.message
        });
    }
};

export default { getBalance };

