import { ethers } from 'ethers';
import prisma from '../lib/prisma.js';
import logger from './loggerService.js';

/**
 * PaymasterService
 * Handles gas sponsorship for ERC-4337 UserOperations.
 * The backend acts as a sponsoring Paymaster — it signs the
 * `paymasterAndData` field so the user doesn't pay gas.
 */
class PaymasterService {
    /**
     * Evaluate whether a UserOperation should be sponsored.
     * Applies rate-limiting and budget checks per user.
     * @param {string} smartAccountId - The Smart Account requesting sponsorship.
     * @param {object} userOp - The UserOperation to sponsor.
     * @returns {object} { success, data: { paymasterAndData } } or { success, error }
     */
    async sponsorUserOp(smartAccountId, userOp) {
        try {
            // Check sponsorship budget for this account
            const budget = await this._checkBudget(smartAccountId);
            if (!budget.eligible) {
                return {
                    success: false,
                    error: `Gas sponsorship limit reached. ${budget.reason}`,
                };
            }

            // Get the paymaster signer from backend's private key
            const paymasterKey = process.env.PAYMASTER_PRIVATE_KEY;
            if (!paymasterKey) {
                logger.warn('PAYMASTER_PRIVATE_KEY not configured, skipping sponsorship');
                return { success: false, error: 'Paymaster not configured' };
            }

            const paymasterSigner = new ethers.Wallet(paymasterKey);
            const paymasterAddress = paymasterSigner.address;

            // Create the paymaster data hash for signing
            // Format: paymasterAddress + validUntil(6 bytes) + validAfter(6 bytes) + signature
            const validUntil = Math.floor(Date.now() / 1000) + 3600; // 1 hour validity
            const validAfter = 0;

            const hash = ethers.keccak256(
                ethers.AbiCoder.defaultAbiCoder().encode(
                    ['address', 'uint256', 'uint48', 'uint48', 'bytes32'],
                    [
                        userOp.sender,
                        userOp.nonce,
                        validUntil,
                        validAfter,
                        ethers.keccak256(userOp.callData),
                    ]
                )
            );

            const signature = await paymasterSigner.signMessage(ethers.getBytes(hash));

            // Construct paymasterAndData
            const paymasterAndData = ethers.concat([
                paymasterAddress,
                ethers.AbiCoder.defaultAbiCoder().encode(
                    ['uint48', 'uint48'],
                    [validUntil, validAfter]
                ),
                signature,
            ]);

            logger.info('UserOp sponsored', {
                smartAccountId,
                sender: userOp.sender,
                paymaster: paymasterAddress,
            });

            return {
                success: true,
                data: {
                    paymasterAndData: ethers.hexlify(paymasterAndData),
                    gasSponsored: true,
                    paymaster: paymasterAddress,
                    validUntil,
                },
            };
        } catch (error) {
            logger.error('Failed to sponsor UserOp', { error: error.message });
            return { success: false, error: error.message };
        }
    }

    /**
     * Check if a Smart Account's gas sponsorship budget allows sponsorship.
     * Limits: max 50 sponsored ops per day per account.
     */
    async _checkBudget(smartAccountId) {
        const dailyLimit = parseInt(process.env.PAYMASTER_DAILY_LIMIT) || 50;

        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        const recentOps = await prisma.userOperation.count({
            where: {
                smartAccountId,
                gasSponsored: true,
                createdAt: { gte: oneDayAgo },
            },
        });

        if (recentOps >= dailyLimit) {
            return {
                eligible: false,
                reason: `Daily limit of ${dailyLimit} sponsored operations reached. Resets in 24h.`,
            };
        }

        return { eligible: true, remaining: dailyLimit - recentOps };
    }
}

export default new PaymasterService();
