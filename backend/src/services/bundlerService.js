import prisma from '../lib/prisma.js';
import logger from './loggerService.js';

/**
 * BundlerService
 * Forwards signed UserOperations to an external ERC-4337 bundler RPC.
 * Supports Pimlico, Alchemy, Stackup, or any ERC-4337 compliant bundler.
 */

const BUNDLER_METHODS = {
    SEND: 'eth_sendUserOperation',
    ESTIMATE: 'eth_estimateUserOperationGas',
    RECEIPT: 'eth_getUserOperationReceipt',
    GET_BY_HASH: 'eth_getUserOperationByHash',
};

class BundlerService {
    /**
     * Send a signed UserOperation to the bundler.
     * @param {object} signedUserOp - The fully signed UserOperation.
     * @param {string} smartAccountId - DB id for tracking.
     * @param {number} chainId - Target chain.
     * @returns {object} { success, data: { userOpHash } }
     */
    async sendUserOp(signedUserOp, smartAccountId, chainId) {
        try {
            const bundlerUrl = this._getBundlerUrl(chainId);
            const entryPointAddress = this._getEntryPointAddress();

            const response = await fetch(bundlerUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    id: 1,
                    method: BUNDLER_METHODS.SEND,
                    params: [signedUserOp, entryPointAddress],
                }),
            });

            const result = await response.json();

            if (result.error) {
                logger.error('Bundler returned error', { error: result.error });

                // Record the failed op
                await prisma.userOperation.create({
                    data: {
                        smartAccountId,
                        userOpHash: `failed_${Date.now()}`,
                        status: 'FAILED',
                        gasSponsored: !!signedUserOp.paymasterAndData && signedUserOp.paymasterAndData !== '0x',
                        bundlerResponse: result.error,
                    },
                });

                return { success: false, error: result.error.message || 'Bundler error' };
            }

            const userOpHash = result.result;

            // Record the pending op
            await prisma.userOperation.create({
                data: {
                    smartAccountId,
                    userOpHash,
                    status: 'BUNDLED',
                    gasSponsored: !!signedUserOp.paymasterAndData && signedUserOp.paymasterAndData !== '0x',
                    paymasterUsed: signedUserOp.paymasterAndData?.slice(0, 42) || null,
                    bundlerResponse: result,
                },
            });

            logger.info('UserOp submitted to bundler', {
                userOpHash,
                smartAccountId,
                chainId,
            });

            return { success: true, data: { userOpHash } };
        } catch (error) {
            logger.error('Failed to send UserOp to bundler', { error: error.message });
            return { success: false, error: error.message };
        }
    }

    /**
     * Get the receipt for a UserOperation by hash.
     */
    async getUserOpReceipt(userOpHash, chainId) {
        try {
            const bundlerUrl = this._getBundlerUrl(chainId);

            const response = await fetch(bundlerUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    id: 1,
                    method: BUNDLER_METHODS.RECEIPT,
                    params: [userOpHash],
                }),
            });

            const result = await response.json();

            if (result.result) {
                // Update the DB record
                await prisma.userOperation.updateMany({
                    where: { userOpHash },
                    data: {
                        status: result.result.success ? 'CONFIRMED' : 'FAILED',
                        executedAt: new Date(),
                        bundlerResponse: result.result,
                    },
                });
            }

            return { success: true, data: result.result };
        } catch (error) {
            logger.error('Failed to get UserOp receipt', { error: error.message });
            return { success: false, error: error.message };
        }
    }

    /**
     * Estimate gas for a UserOperation.
     */
    async estimateGas(userOp, chainId) {
        try {
            const bundlerUrl = this._getBundlerUrl(chainId);
            const entryPointAddress = this._getEntryPointAddress();

            const response = await fetch(bundlerUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    id: 1,
                    method: BUNDLER_METHODS.ESTIMATE,
                    params: [userOp, entryPointAddress],
                }),
            });

            const result = await response.json();

            if (result.error) {
                return { success: false, error: result.error.message };
            }

            return { success: true, data: result.result };
        } catch (error) {
            logger.error('Failed to estimate gas', { error: error.message });
            return { success: false, error: error.message };
        }
    }

    // ─── Private Helpers ───────────────────────────────

    _getBundlerUrl(chainId) {
        const bundlerUrls = {
            1: process.env.BUNDLER_RPC_MAINNET,
            11155111: process.env.BUNDLER_RPC_SEPOLIA,
            137: process.env.BUNDLER_RPC_POLYGON,
            42161: process.env.BUNDLER_RPC_ARBITRUM,
        };

        const url = bundlerUrls[chainId] || process.env.BUNDLER_RPC_DEFAULT;
        if (!url) throw new Error(`No bundler RPC configured for chainId ${chainId}`);
        return url;
    }

    _getEntryPointAddress() {
        // ERC-4337 v0.7 canonical EntryPoint
        return process.env.ENTRYPOINT_ADDRESS || '0x0000000071727De22E5E9d8BAf0edAc6f37da032';
    }
}

export default new BundlerService();
