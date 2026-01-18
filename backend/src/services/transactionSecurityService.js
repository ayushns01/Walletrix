import { ethers } from 'ethers';
import * as bitcoin from 'bitcoinjs-lib';
import ethereumService from './ethereumService.js';
import bitcoinService from './bitcoinService.js';
import prisma from '../lib/prisma.js';

class TransactionSecurityService {

  async validateTransaction(params) {
    const { from, to, amount, asset, network, walletId } = params;

    const validations = {
      valid: true,
      errors: [],
      warnings: [],
      riskLevel: 'low',
      checks: {
        addressValid: false,
        balanceSufficient: false,
        amountReasonable: false,
        recipientVerified: false,
        gasEstimated: false,
      }
    };

    try {

      const addressValidation = await this.validateAddress(to, asset, network);
      validations.checks.addressValid = addressValidation.valid;

      if (!addressValidation.valid) {
        validations.valid = false;
        validations.errors.push(addressValidation.error);
        return validations;
      }

      if (addressValidation.isScam) {
        validations.valid = false;
        validations.riskLevel = 'critical';
        validations.errors.push('⛔ This address is flagged as a scam. Transaction blocked.');
        return validations;
      }

      if (addressValidation.isSuspicious) {
        validations.riskLevel = 'high';
        validations.warnings.push('⚠️ This address has been flagged as suspicious');
      }

      const balanceCheck = await this.verifyBalance(from, amount, asset, network);
      validations.checks.balanceSufficient = balanceCheck.sufficient;

      if (!balanceCheck.sufficient) {
        validations.valid = false;
        validations.errors.push(balanceCheck.error || `Insufficient balance. Available: ${balanceCheck.available}, Required: ${balanceCheck.required}`);
        return validations;
      }

      if (balanceCheck.warningNeeded || balanceCheck.warning) {
        validations.warnings.push(balanceCheck.warning);
      }

      const amountValidation = await this.validateAmount(amount, asset, walletId);
      validations.checks.amountReasonable = amountValidation.reasonable;

      if (amountValidation.isUnusual) {
        validations.warnings.push(amountValidation.warning);
        if (amountValidation.severity === 'high') {
          validations.riskLevel = 'high';
        }
      }

      const recipientCheck = await this.checkRecipient(to, walletId, network);
      validations.checks.recipientVerified = recipientCheck.known;

      if (!recipientCheck.known) {
        validations.warnings.push('⚠️ First time sending to this address');
        if (validations.riskLevel === 'low') {
          validations.riskLevel = 'medium';
        }
      }

      if (recipientCheck.similarToRecent) {
        validations.riskLevel = 'high';
        validations.warnings.push('⚠️ WARNING: This address looks similar to one you recently used. Verify carefully!');
      }

      if (asset !== 'BTC') {
        const gasEstimate = await this.estimateGas(from, to, amount, asset, network);
        validations.checks.gasEstimated = gasEstimate.success;

        if (gasEstimate.success) {
          validations.gasEstimate = {
            gasLimit: gasEstimate.gasLimit,
            gasPrice: gasEstimate.gasPrice,
            totalCost: gasEstimate.totalCost,
            totalCostUSD: gasEstimate.totalCostUSD,
          };

          if (gasEstimate.unusuallyHigh) {
            validations.warnings.push('⚠️ Gas fees are unusually high right now');
          }
        }
      }

      if (asset !== 'BTC') {
        const simulation = await this.simulateTransaction(from, to, amount, asset, network);

        if (!simulation.success) {
          validations.valid = false;
          validations.errors.push(`Transaction would fail: ${simulation.reason}`);
          return validations;
        }

        if (simulation.warnings && simulation.warnings.length > 0) {
          validations.warnings.push(...simulation.warnings);
        }
      }

      if (validations.warnings.length > 2) {
        validations.riskLevel = validations.riskLevel === 'low' ? 'medium' : 'high';
      }

      return validations;

    } catch (error) {
      console.error('Error in transaction validation:', error);
      return {
        valid: false,
        errors: ['Failed to validate transaction: ' + error.message],
        warnings: [],
        riskLevel: 'unknown',
        checks: validations.checks
      };
    }
  }

  async validateAddress(address, asset, network) {
    try {
      let isValid = false;
      let isContract = false;

      if (asset === 'BTC') {

        try {
          const btcNetwork = network === 'mainnet'
            ? bitcoin.networks.bitcoin
            : bitcoin.networks.testnet;
          bitcoin.address.toOutputScript(address, btcNetwork);
          isValid = true;
        } catch {
          isValid = false;
        }
      } else {

        isValid = ethers.isAddress(address);

        if (isValid) {

          try {
            const provider = ethereumService.getProvider(network);
            const code = await provider.getCode(address);
            isContract = code !== '0x';
          } catch (error) {
            console.error('Error checking if address is contract:', error);
          }
        }
      }

      if (!isValid) {
        return {
          valid: false,
          error: 'Invalid address format'
        };
      }

      const reputation = await this.checkAddressReputation(address);

      return {
        valid: true,
        isContract,
        isScam: reputation.isScam,
        isSuspicious: reputation.isSuspicious,
        reputation: reputation.score
      };

    } catch (error) {
      console.error('Error validating address:', error);
      return {
        valid: false,
        error: 'Address validation failed'
      };
    }
  }

  async verifyBalance(from, amount, asset, network) {
    try {
      let available = 0;
      let required = parseFloat(amount);

      if (asset === 'BTC') {
        const btcBalance = await bitcoinService.getBalance(from, network);
        if (btcBalance.success) {
          available = parseFloat(btcBalance.data?.balance || btcBalance.balance?.btc || 0);

          required += 0.0001;
        }
      } else if (asset === 'ETH') {
        const provider = ethereumService.getProvider(network);
        const balance = await provider.getBalance(from);
        available = parseFloat(ethers.formatEther(balance));

        const feeData = await provider.getFeeData();
        const gasCost = parseFloat(ethers.formatEther(
          (feeData.maxFeePerGas || feeData.gasPrice) * BigInt(21000)
        ));
        required += gasCost;
      } else {

        return {
          sufficient: true,
          warning: '⚠️ Token balance verification not yet implemented. Please verify manually.'
        };
      }

      const sufficient = available >= required;
      const warningThreshold = required * 1.1;

      return {
        sufficient,
        available,
        required,
        warningNeeded: available < warningThreshold && sufficient,
        warning: available < warningThreshold
          ? '⚠️ Balance is close to minimum required (including fees)'
          : null
      };

    } catch (error) {
      console.error('Error verifying balance:', error);
      return {
        sufficient: false,
        available: 0,
        required: parseFloat(amount),
        error: `Failed to verify balance: ${error.message}`
      };
    }
  }

  async validateAmount(amount, asset, walletId) {
    try {
      const numAmount = parseFloat(amount);

      if (numAmount <= 0) {
        return {
          reasonable: false,
          error: 'Amount must be greater than 0'
        };
      }

      if (asset === 'BTC' && numAmount < 0.00001) {
        return {
          reasonable: true,
          isUnusual: true,
          warning: '⚠️ Amount is very small (dust)',
          severity: 'low'
        };
      }

      const avgAmount = await this.getAverageTransactionAmount(walletId, asset);

      if (avgAmount && numAmount > avgAmount * 10) {
        return {
          reasonable: true,
          isUnusual: true,
          warning: '⚠️ Amount is significantly higher than your usual transactions',
          severity: 'high'
        };
      }

      if (avgAmount && numAmount > avgAmount * 3) {
        return {
          reasonable: true,
          isUnusual: true,
          warning: '⚠️ Amount is higher than your usual transactions',
          severity: 'medium'
        };
      }

      return {
        reasonable: true,
        isUnusual: false
      };

    } catch (error) {
      console.error('Error validating amount:', error);
      return {
        reasonable: true,
        isUnusual: false
      };
    }
  }

  async checkRecipient(address, walletId, network) {
    try {

      let userId = null;
      if (walletId) {
        const wallet = await prisma.wallet.findUnique({
          where: { id: walletId },
          select: { userId: true }
        });
        userId = wallet?.userId;
      }

      if (userId) {
        const inAddressBook = await prisma.addressBook.findFirst({
          where: {
            userId,
            address: address.toLowerCase(),
            isActive: true
          }
        });

        if (inAddressBook) {
          return {
            known: true,
            label: inAddressBook.label,
            trusted: inAddressBook.trusted || false
          };
        }
      }

      const recentTx = await prisma.transaction.findFirst({
        where: {
          walletId,
          OR: [
            { toAddress: address.toLowerCase() },
            { fromAddress: address.toLowerCase() }
          ]
        },
        orderBy: { timestamp: 'desc' }
      });

      if (recentTx) {
        return {
          known: true,
          label: null,
          previouslyUsed: true
        };
      }

      const recentAddresses = await prisma.transaction.findMany({
        where: {
          walletId,
          timestamp: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          }
        },
        select: { toAddress: true },
        take: 20
      });

      const similarToRecent = recentAddresses.some(tx =>
        tx.toAddress && this.isAddressSimilar(address, tx.toAddress)
      );

      return {
        known: false,
        similarToRecent
      };

    } catch (error) {
      console.error('Error checking recipient:', error);
      return {
        known: false,
        similarToRecent: false
      };
    }
  }

  isAddressSimilar(addr1, addr2) {
    if (!addr1 || !addr2 || addr1 === addr2) return false;

    const a1 = addr1.toLowerCase();
    const a2 = addr2.toLowerCase();

    const firstMatch = a1.substring(0, 6) === a2.substring(0, 6);
    const lastMatch = a1.substring(a1.length - 4) === a2.substring(a2.length - 4);

    return firstMatch && lastMatch;
  }

  async estimateGas(from, to, amount, asset, network) {
    try {
      const provider = ethereumService.getProvider(network);
      const feeData = await provider.getFeeData();

      let gasLimit = 21000;

      if (asset !== 'ETH') {

        gasLimit = 65000;
      }

      const gasPriceGwei = parseFloat(ethers.formatUnits(feeData.maxFeePerGas || feeData.gasPrice, 'gwei'));
      const gasCostEth = parseFloat(ethers.formatEther(
        (feeData.maxFeePerGas || feeData.gasPrice) * BigInt(gasLimit)
      ));

      const unusuallyHigh = gasPriceGwei > 100;

      return {
        success: true,
        gasLimit,
        gasPrice: gasPriceGwei,
        totalCost: gasCostEth,
        totalCostUSD: null,
        unusuallyHigh
      };

    } catch (error) {
      console.error('Error estimating gas:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async simulateTransaction(from, to, amount, asset, network) {
    try {
      const provider = ethereumService.getProvider(network);

      if (asset === 'ETH') {
        await provider.call({
          from,
          to,
          value: ethers.parseEther(amount.toString())
        });
      }

      return {
        success: true,
        warnings: []
      };

    } catch (error) {
      console.error('Transaction simulation failed:', error);

      let reason = 'Unknown error';
      if (error.message.includes('insufficient funds')) {
        reason = 'Insufficient funds';
      } else if (error.message.includes('gas required exceeds')) {
        reason = 'Gas limit too low';
      }

      return {
        success: false,
        reason,
        error: error.message
      };
    }
  }

  async checkAddressReputation(address) {
    try {

      const scamAddress = await prisma.scamAddress.findUnique({
        where: { address: address.toLowerCase() }
      });

      if (scamAddress) {
        return {
          isScam: true,
          isSuspicious: true,
          score: 0,
          reason: scamAddress.reason || 'Flagged as scam'
        };
      }

      const suspicious = await prisma.suspiciousAddress.findUnique({
        where: { address: address.toLowerCase() }
      });

      if (suspicious) {
        return {
          isScam: false,
          isSuspicious: true,
          score: 50,
          reason: suspicious.reason
        };
      }

      return {
        isScam: false,
        isSuspicious: false,
        score: 100
      };

    } catch (error) {
      console.error('Error checking address reputation:', error);
      return {
        isScam: false,
        isSuspicious: false,
        score: 100
      };
    }
  }

  async getAverageTransactionAmount(walletId, asset) {
    try {
      const transactions = await prisma.transaction.findMany({
        where: {
          walletId,
          type: 'sent',
          status: 'confirmed'
        },
        select: { amount: true },
        take: 20
      });

      if (transactions.length === 0) return null;

      const total = transactions.reduce((sum, tx) => sum + parseFloat(tx.amount || 0), 0);
      return total / transactions.length;

    } catch (error) {
      console.error('Error getting average amount:', error);
      return null;
    }
  }
}

export default new TransactionSecurityService();
