import smartVaultService from '../services/smartVaultService.js';
import paymasterService from '../services/paymasterService.js';
import bundlerService from '../services/bundlerService.js';
import logger from '../services/loggerService.js';

/**
 * SmartVaultController
 * HTTP request handlers for ERC-4337 Smart Vault operations.
 */
class SmartVaultController {
    /**
     * POST /api/v1/smart-vault/deploy
     * Register a new Smart Vault for a wallet.
     */
    async deploy(req, res) {
        try {
            const { walletId, ownerAddress, salt, chainId } = req.body;

            if (!walletId || !ownerAddress || salt === undefined || !chainId) {
                return res.status(400).json({
                    success: false,
                    error: 'walletId, ownerAddress, salt, and chainId are required',
                });
            }

            const result = await smartVaultService.deployVault(
                walletId,
                ownerAddress,
                salt,
                chainId
            );

            if (!result.success) {
                return res.status(400).json(result);
            }

            res.status(201).json(result);
        } catch (error) {
            logger.error('Deploy vault failed', { error: error.message });
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    }

    /**
     * POST /api/v1/smart-vault/confirm-deploy
     * Confirm on-chain deployment of a vault.
     */
    async confirmDeploy(req, res) {
        try {
            const { smartAccountId, deployTxHash } = req.body;

            if (!smartAccountId || !deployTxHash) {
                return res.status(400).json({
                    success: false,
                    error: 'smartAccountId and deployTxHash are required',
                });
            }

            const result = await smartVaultService.confirmDeployment(
                smartAccountId,
                deployTxHash
            );

            if (!result.success) {
                return res.status(400).json(result);
            }

            res.status(200).json(result);
        } catch (error) {
            logger.error('Confirm deploy failed', { error: error.message });
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    }

    /**
     * GET /api/v1/smart-vault/:walletId
     * Get Smart Vault info for a wallet.
     */
    async getVault(req, res) {
        try {
            const { walletId } = req.params;
            const result = await smartVaultService.getVaultByWalletId(walletId);

            if (!result.success) {
                return res.status(404).json(result);
            }

            res.status(200).json(result);
        } catch (error) {
            logger.error('Get vault failed', { error: error.message });
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    }

    /**
     * POST /api/v1/smart-vault/predict-address
     * Predict vault address before deployment.
     */
    async predictAddress(req, res) {
        try {
            const { ownerAddress, salt, chainId } = req.body;

            if (!ownerAddress || salt === undefined || !chainId) {
                return res.status(400).json({
                    success: false,
                    error: 'ownerAddress, salt, and chainId are required',
                });
            }

            const result = await smartVaultService.predictVaultAddress(
                ownerAddress,
                salt,
                chainId
            );

            if (!result.success) {
                return res.status(400).json(result);
            }

            res.status(200).json(result);
        } catch (error) {
            logger.error('Predict address failed', { error: error.message });
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    }

    /**
     * POST /api/v1/smart-vault/build-userop
     * Build a UserOperation for signing.
     */
    async buildUserOp(req, res) {
        try {
            const { smartAccountId, callData } = req.body;

            if (!smartAccountId || !callData) {
                return res.status(400).json({
                    success: false,
                    error: 'smartAccountId and callData are required',
                });
            }

            const result = await smartVaultService.buildUserOperation(
                smartAccountId,
                callData
            );

            if (!result.success) {
                return res.status(400).json(result);
            }

            res.status(200).json(result);
        } catch (error) {
            logger.error('Build UserOp failed', { error: error.message });
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    }

    /**
     * POST /api/v1/smart-vault/sponsor
     * Request gas sponsorship for a UserOperation.
     */
    async sponsor(req, res) {
        try {
            const { smartAccountId, userOp } = req.body;

            if (!smartAccountId || !userOp) {
                return res.status(400).json({
                    success: false,
                    error: 'smartAccountId and userOp are required',
                });
            }

            const result = await paymasterService.sponsorUserOp(smartAccountId, userOp);

            if (!result.success) {
                return res.status(403).json(result);
            }

            res.status(200).json(result);
        } catch (error) {
            logger.error('Sponsor UserOp failed', { error: error.message });
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    }

    /**
     * POST /api/v1/smart-vault/send
     * Submit a signed UserOperation to the bundler.
     */
    async sendUserOp(req, res) {
        try {
            const { signedUserOp, smartAccountId, chainId } = req.body;

            if (!signedUserOp || !smartAccountId || !chainId) {
                return res.status(400).json({
                    success: false,
                    error: 'signedUserOp, smartAccountId, and chainId are required',
                });
            }

            const result = await bundlerService.sendUserOp(
                signedUserOp,
                smartAccountId,
                chainId
            );

            if (!result.success) {
                return res.status(400).json(result);
            }

            res.status(200).json(result);
        } catch (error) {
            logger.error('Send UserOp failed', { error: error.message });
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    }

    /**
     * GET /api/v1/smart-vault/receipt/:userOpHash
     * Get the receipt for a UserOperation.
     */
    async getReceipt(req, res) {
        try {
            const { userOpHash } = req.params;
            const { chainId } = req.query;

            if (!chainId) {
                return res.status(400).json({
                    success: false,
                    error: 'chainId query parameter is required',
                });
            }

            const result = await bundlerService.getUserOpReceipt(
                userOpHash,
                parseInt(chainId)
            );

            if (!result.success) {
                return res.status(400).json(result);
            }

            res.status(200).json(result);
        } catch (error) {
            logger.error('Get receipt failed', { error: error.message });
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    }

    /**
     * POST /api/v1/smart-vault/guardians
     * Add a guardian to a Smart Account.
     */
    async addGuardian(req, res) {
        try {
            const { smartAccountId, guardianAddress, label } = req.body;

            if (!smartAccountId || !guardianAddress) {
                return res.status(400).json({
                    success: false,
                    error: 'smartAccountId and guardianAddress are required',
                });
            }

            const result = await smartVaultService.addGuardian(
                smartAccountId,
                guardianAddress,
                label
            );

            if (!result.success) {
                return res.status(400).json(result);
            }

            res.status(201).json(result);
        } catch (error) {
            logger.error('Add guardian failed', { error: error.message });
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    }

    /**
     * DELETE /api/v1/smart-vault/guardians
     * Remove a guardian from a Smart Account.
     */
    async removeGuardian(req, res) {
        try {
            const { smartAccountId, guardianAddress } = req.body;

            if (!smartAccountId || !guardianAddress) {
                return res.status(400).json({
                    success: false,
                    error: 'smartAccountId and guardianAddress are required',
                });
            }

            const result = await smartVaultService.removeGuardian(
                smartAccountId,
                guardianAddress
            );

            if (!result.success) {
                return res.status(400).json(result);
            }

            res.status(200).json(result);
        } catch (error) {
            logger.error('Remove guardian failed', { error: error.message });
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    }
}

export default new SmartVaultController();
