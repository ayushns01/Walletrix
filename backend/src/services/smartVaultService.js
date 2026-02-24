import { ethers } from 'ethers';
import prisma from '../lib/prisma.js';
import logger from './loggerService.js';

/**
 * SmartVaultService
 * Handles ERC-4337 Smart Account lifecycle:
 * - Vault address prediction (CREATE2)
 * - Deployment via Factory contract
 * - UserOperation construction
 * - Guardian management (off-chain DB records)
 */

// ABI fragments for WalletrixVaultFactory
const FACTORY_ABI = [
    'function createAccount(address owner, uint256 salt) external returns (address)',
    'function getAddress(address owner, uint256 salt) external view returns (address)',
    'function VAULT_IMPLEMENTATION() external view returns (address)',
];

// ABI fragments for WalletrixVault
const VAULT_ABI = [
    'function owner() external view returns (address)',
    'function entryPoint() external view returns (address)',
    'function getGuardianCount() external view returns (uint256)',
    'function getGuardians() external view returns (address[])',
    'function recoveryThreshold() external view returns (uint256)',
    'function recoveryPending() external view returns (bool)',
    'function getNonce() external view returns (uint256)',
];

class SmartVaultService {
    /**
     * Predict the deterministic vault address for an owner + salt.
     * Does NOT deploy — just computes the CREATE2 address.
     */
    async predictVaultAddress(ownerAddress, salt, chainId) {
        try {
            const provider = this._getProvider(chainId);
            const factoryAddress = this._getFactoryAddress(chainId);
            const factory = new ethers.Contract(factoryAddress, FACTORY_ABI, provider);

            const predictedAddress = await factory.getAddress(ownerAddress, salt);
            return { success: true, address: predictedAddress };
        } catch (error) {
            logger.error('Failed to predict vault address', { error: error.message });
            return { success: false, error: error.message };
        }
    }

    /**
     * Deploy a new WalletrixVault for a wallet.
     * Creates the SmartAccount record in the database.
     */
    async deployVault(walletId, ownerAddress, salt, chainId) {
        try {
            // Check if a smart account already exists for this wallet
            const existing = await prisma.smartAccount.findUnique({
                where: { walletId },
            });
            if (existing) {
                return { success: false, error: 'Smart Vault already exists for this wallet' };
            }

            // Predict the vault address
            const prediction = await this.predictVaultAddress(ownerAddress, salt, chainId);
            if (!prediction.success) return prediction;

            // Create DB record (vault not yet deployed on-chain, user will trigger that)
            const smartAccount = await prisma.smartAccount.create({
                data: {
                    walletId,
                    vaultAddress: prediction.address,
                    chainId,
                    factorySalt: salt.toString(),
                    isDeployed: false,
                },
            });

            logger.info('Smart Vault registered', {
                walletId,
                vaultAddress: prediction.address,
                chainId,
            });

            return {
                success: true,
                data: {
                    id: smartAccount.id,
                    vaultAddress: smartAccount.vaultAddress,
                    chainId: smartAccount.chainId,
                    isDeployed: smartAccount.isDeployed,
                },
            };
        } catch (error) {
            logger.error('Failed to deploy vault', { error: error.message, walletId });
            return { success: false, error: error.message };
        }
    }

    /**
     * Mark a vault as deployed after on-chain confirmation.
     */
    async confirmDeployment(smartAccountId, deployTxHash) {
        try {
            const updated = await prisma.smartAccount.update({
                where: { id: smartAccountId },
                data: { isDeployed: true, deployTxHash },
            });

            logger.info('Vault deployment confirmed', {
                smartAccountId,
                deployTxHash,
            });

            return { success: true, data: updated };
        } catch (error) {
            logger.error('Failed to confirm deployment', { error: error.message });
            return { success: false, error: error.message };
        }
    }

    /**
     * Get the Smart Vault info for a wallet.
     */
    async getVaultByWalletId(walletId) {
        try {
            const smartAccount = await prisma.smartAccount.findUnique({
                where: { walletId },
                include: {
                    guardians: { where: { isActive: true } },
                    userOps: { orderBy: { createdAt: 'desc' }, take: 10 },
                },
            });

            if (!smartAccount) {
                return { success: false, error: 'No Smart Vault found for this wallet' };
            }

            return { success: true, data: smartAccount };
        } catch (error) {
            logger.error('Failed to get vault', { error: error.message });
            return { success: false, error: error.message };
        }
    }

    /**
     * Build a UserOperation struct for the vault.
     */
    async buildUserOperation(smartAccountId, callData) {
        try {
            const smartAccount = await prisma.smartAccount.findUnique({
                where: { id: smartAccountId },
                include: { wallet: true },
            });

            if (!smartAccount) {
                return { success: false, error: 'Smart Account not found' };
            }

            const provider = this._getProvider(smartAccount.chainId);
            const vault = new ethers.Contract(smartAccount.vaultAddress, VAULT_ABI, provider);

            const nonce = await vault.getNonce();

            // Construct the UserOperation (ERC-4337 v0.7 packed format)
            const userOp = {
                sender: smartAccount.vaultAddress,
                nonce: nonce.toString(),
                initCode: smartAccount.isDeployed ? '0x' : this._buildInitCode(smartAccount),
                callData,
                accountGasLimits: ethers.zeroPadValue(ethers.toBeHex(500000), 32),
                preVerificationGas: 50000,
                gasFees: ethers.zeroPadValue(ethers.toBeHex(1000000000), 32), // 1 gwei
                paymasterAndData: '0x',
                signature: '0x',
            };

            return { success: true, data: userOp };
        } catch (error) {
            logger.error('Failed to build UserOp', { error: error.message });
            return { success: false, error: error.message };
        }
    }

    /**
     * Add a guardian to a Smart Account (off-chain record).
     */
    async addGuardian(smartAccountId, guardianAddress, label) {
        try {
            const guardian = await prisma.guardian.create({
                data: {
                    smartAccountId,
                    guardianAddress,
                    label,
                },
            });

            logger.info('Guardian added', { smartAccountId, guardianAddress });
            return { success: true, data: guardian };
        } catch (error) {
            if (error.code === 'P2002') {
                return { success: false, error: 'Guardian already exists for this vault' };
            }
            logger.error('Failed to add guardian', { error: error.message });
            return { success: false, error: error.message };
        }
    }

    /**
     * Remove a guardian from a Smart Account (soft-delete).
     */
    async removeGuardian(smartAccountId, guardianAddress) {
        try {
            await prisma.guardian.updateMany({
                where: { smartAccountId, guardianAddress },
                data: { isActive: false },
            });

            logger.info('Guardian removed', { smartAccountId, guardianAddress });
            return { success: true };
        } catch (error) {
            logger.error('Failed to remove guardian', { error: error.message });
            return { success: false, error: error.message };
        }
    }

    // ─── Private Helpers ───────────────────────────────

    _getProvider(chainId) {
        const rpcUrls = {
            1: process.env.ETHEREUM_MAINNET_RPC,
            11155111: process.env.ETHEREUM_SEPOLIA_RPC,
            137: process.env.POLYGON_MAINNET_RPC,
            42161: process.env.ARBITRUM_ONE_RPC,
            10: process.env.OPTIMISM_MAINNET_RPC,
            8453: process.env.BASE_MAINNET_RPC,
        };

        const rpcUrl = rpcUrls[chainId];
        if (!rpcUrl) throw new Error(`No RPC configured for chainId ${chainId}`);
        return new ethers.JsonRpcProvider(rpcUrl);
    }

    _getFactoryAddress(chainId) {
        // Factory deployed at same address on all chains (CREATE2 determinism)
        return process.env.VAULT_FACTORY_ADDRESS || '0x0000000000000000000000000000000000000000';
    }

    _buildInitCode(smartAccount) {
        const factoryAddress = this._getFactoryAddress(smartAccount.chainId);
        const initCallData = new ethers.Interface(FACTORY_ABI).encodeFunctionData(
            'createAccount',
            [smartAccount.wallet.address, smartAccount.factorySalt]
        );
        return ethers.concat([factoryAddress, initCallData]);
    }
}

export default new SmartVaultService();
