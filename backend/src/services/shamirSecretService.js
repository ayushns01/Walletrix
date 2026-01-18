import { split, combine } from 'shamirs-secret-sharing';
import crypto from 'crypto';

class ShamirSecretService {

    splitSecret(secret, totalShares = 5, threshold = 3) {

        if (!secret || typeof secret !== 'string') {
            throw new Error('Secret must be a non-empty string');
        }

        if (threshold > totalShares) {
            throw new Error('Threshold cannot exceed total shares');
        }

        if (threshold < 2) {
            throw new Error('Threshold must be at least 2');
        }

        if (totalShares > 255) {
            throw new Error('Total shares cannot exceed 255');
        }

        if (totalShares < 2) {
            throw new Error('Total shares must be at least 2');
        }

        try {
            const secretBuffer = Buffer.from(secret, 'utf8');
            const shares = split(secretBuffer, { shares: totalShares, threshold });

            return shares.map((share, index) => ({
                index: index + 1,
                share: share.toString('base64'),
                totalShares,
                threshold,
            }));
        } catch (error) {
            console.error('Shamir split error:', error.message);
            throw new Error('Failed to split secret: ' + error.message);
        }
    }

    recoverSecret(shares) {
        if (!shares || !Array.isArray(shares)) {
            throw new Error('Shares must be an array');
        }

        if (shares.length < 2) {
            throw new Error('At least 2 shares required for recovery');
        }

        try {

            const shareBuffers = shares.map(shareData => {
                const shareString = typeof shareData === 'string'
                    ? shareData
                    : shareData.share;
                return Buffer.from(shareString, 'base64');
            });

            const recoveredBuffer = combine(shareBuffers);
            return recoveredBuffer.toString('utf8');
        } catch (error) {
            console.error('Shamir recovery error:', error.message);
            throw new Error('Failed to recover secret. Ensure you have enough valid shares.');
        }
    }

    async createSocialRecovery(mnemonic, guardians, customThreshold = null) {
        if (!mnemonic || typeof mnemonic !== 'string') {
            throw new Error('Mnemonic must be a non-empty string');
        }

        if (!guardians || !Array.isArray(guardians) || guardians.length < 2) {
            throw new Error('At least 2 guardians required');
        }

        const totalShares = guardians.length;
        const threshold = customThreshold || Math.ceil(totalShares * 0.6);

        if (threshold > totalShares) {
            throw new Error('Threshold cannot exceed number of guardians');
        }

        const shares = this.splitSecret(mnemonic, totalShares, threshold);

        return {
            threshold,
            totalShares,
            guardianShares: guardians.map((guardian, index) => ({
                guardianId: guardian.id || `guardian_${index + 1}`,
                guardianEmail: guardian.email,
                guardianName: guardian.name || `Guardian ${index + 1}`,
                share: shares[index].share,
                shareIndex: index + 1,
                createdAt: new Date().toISOString(),
            })),
            metadata: {
                createdAt: new Date().toISOString(),
                algorithm: 'Shamir Secret Sharing',
                version: '1.0',
            },
        };
    }

    validateShare(share) {
        try {
            const shareString = typeof share === 'string' ? share : share.share;
            const buffer = Buffer.from(shareString, 'base64');
            return buffer.length > 0;
        } catch (error) {
            return false;
        }
    }

    assessSecurity(threshold, totalShares) {
        const ratio = threshold / totalShares;

        let level = 'low';
        let description = '';

        if (ratio >= 0.7) {
            level = 'high';
            description = 'High security: Requires 70%+ of shares';
        } else if (ratio >= 0.5) {
            level = 'medium';
            description = 'Medium security: Requires 50-70% of shares';
        } else {
            level = 'low';
            description = 'Low security: Requires less than 50% of shares';
        }

        return {
            level,
            description,
            threshold,
            totalShares,
            ratio: (ratio * 100).toFixed(1) + '%',
            recommendation: ratio < 0.5
                ? 'Consider increasing threshold for better security'
                : 'Security level is appropriate',
        };
    }

    generateRecoveryInstructions(recoverySetup) {
        const { threshold, totalShares, guardianShares } = recoverySetup;

        return `
WALLET RECOVERY INSTRUCTIONS
============================

This wallet uses Shamir's Secret Sharing for social recovery.

Setup Details:
- Total Guardians: ${totalShares}
- Required for Recovery: ${threshold} guardians
- Created: ${recoverySetup.metadata.createdAt}

How to Recover:
1. Contact at least ${threshold} guardians
2. Collect their recovery shares
3. Use the wallet recovery tool
4. Enter the ${threshold} shares when prompted
5. Your wallet will be restored

Guardian List:
${guardianShares.map((g, i) => `${i + 1}. ${g.guardianName} (${g.guardianEmail})`).join('\n')}

IMPORTANT:
- Keep your share safe and private
- Never share your recovery share via email or messaging
- Each guardian should store their share securely
- The wallet owner should keep a list of guardians
    `.trim();
    }
}

export default new ShamirSecretService();
