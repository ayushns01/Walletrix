import { ethers } from 'ethers';
import * as bitcoin from 'bitcoinjs-lib';
import ethereumService from './ethereumService.js';
import bitcoinService from './bitcoinService.js';
import prisma from '../lib/prisma.js';

/**
 * Transaction Security Service
 * Handles transaction validation, simulation, and risk assessment
 */

class TransactionSecurityService {
  /**
   * Validate and assess transaction before sending
   * @param {Object} params - Transaction parameters
   * @returns {Object} - Validation result with risk assessment
   */
  async validateTransaction(params) {
    const { from, to, amount, asset, network, userId } = params;
    
    const validations = {
      valid: true,
      errors: [],
      warnings: [],
      riskLevel: 'low', // low, medium, high, critical
      checks: {
        addressValid: false,
        balanceSufficient: false,
        amountReasonable: false,
        recipientVerified: false,
        gasEstimated: false,
      }
    };

    try {
      // 1. Address validation
      const addressValidation = await this.validateAddress(to, asset, network);
      validations.checks.addressValid = addressValidation.valid;
      
      if (!addressValidation.valid) {
        validations.valid = false;
        validations.errors.push(addressValidation.error);
        return validations;
      }

      // Check for known scam addresses
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

      // 2. Balance verification
      const balanceCheck = await this.verifyBalance(from, amount, asset, network);
      validations.checks.balanceSufficient = balanceCheck.sufficient;
      
      if (!balanceCheck.sufficient) {
        validations.valid = false;
        validations.errors.push(`Insufficient balance. Available: ${balanceCheck.available}, Required: ${balanceCheck.required}`);
        return validations;
      }

      if (balanceCheck.warningNeeded) {
        validations.warnings.push(balanceCheck.warning);
      }

      // 3. Amount validation
      const amountValidation = await this.validateAmount(amount, asset, userId);
      validations.checks.amountReasonable = amountValidation.reasonable;
      
      if (amountValidation.isUnusual) {
        validations.warnings.push(amountValidation.warning);
        if (amountValidation.severity === 'high') {
          validations.riskLevel = 'high';
        }
      }

      // 4. Recipient verification
      const recipientCheck = await this.checkRecipient(to, userId, network);
      validations.checks.recipientVerified = recipientCheck.known;
      
      if (!recipientCheck.known) {
        validations.warnings.push('⚠️ First time sending to this address');
        if (validations.riskLevel === 'low') {
          validations.riskLevel = 'medium';
        }
      }

      // Check for address poisoning
      if (recipientCheck.similarToRecent) {
        validations.riskLevel = 'high';
        validations.warnings.push('⚠️ WARNING: This address looks similar to one you recently used. Verify carefully!');
      }

      // 5. Gas/Fee estimation (Ethereum only)
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

          // Warn if gas price is unusually high
          if (gasEstimate.unusuallyHigh) {
            validations.warnings.push('⚠️ Gas fees are unusually high right now');
          }
        }
      }

      // 6. Transaction simulation (Ethereum)
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

      // Determine final risk level
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

  /**
   * Validate address format and check reputation
   */
  async validateAddress(address, asset, network) {
    try {
      let isValid = false;
      let isContract = false;

      if (asset === 'BTC') {
        // Bitcoin address validation
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
        // Ethereum address validation
        isValid = ethers.isAddress(address);
        
        if (isValid) {
          // Check if it's a contract
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

      // Check against known scam database
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

  /**
   * Verify sufficient balance including gas fees
   */
  async verifyBalance(from, amount, asset, network) {
    try {
      let available = 0;
      let required = parseFloat(amount);

      if (asset === 'BTC') {
        const btcBalance = await bitcoinService.getBalance(from, network);
        if (btcBalance.success) {
          available = parseFloat(btcBalance.data?.balance || btcBalance.balance?.btc || 0);
          // Add estimated BTC fee
          required += 0.0001; // Rough estimate
        }
      } else if (asset === 'ETH') {
        const provider = ethereumService.getProvider(network);
        const balance = await provider.getBalance(from);
        available = parseFloat(ethers.formatEther(balance));
        
        // Estimate gas cost
        const feeData = await provider.getFeeData();
        const gasCost = parseFloat(ethers.formatEther(
          (feeData.maxFeePerGas || feeData.gasPrice) * BigInt(21000)
        ));
        required += gasCost;
      } else {
        // ERC-20 token - check both token balance and ETH for gas
        // (Implementation would go here)
        return { sufficient: true }; // Simplified for now
      }

      const sufficient = available >= required;
      const warningThreshold = required * 1.1; // Warn if less than 10% buffer

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
        error: 'Failed to verify balance'
      };
    }
  }

  /**
   * Validate amount and check if it's unusual
   */
  async validateAmount(amount, asset, userId) {
    try {
      const numAmount = parseFloat(amount);

      // Basic validation
      if (numAmount <= 0) {
        return {
          reasonable: false,
          error: 'Amount must be greater than 0'
        };
      }

      // Check for dust amounts
      if (asset === 'BTC' && numAmount < 0.00001) {
        return {
          reasonable: true,
          isUnusual: true,
          warning: '⚠️ Amount is very small (dust)',
          severity: 'low'
        };
      }

      // Get user's transaction history
      const avgAmount = await this.getAverageTransactionAmount(userId, asset);
      
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

  /**
   * Check recipient address against user's history
   */
  async checkRecipient(address, userId, network) {
    try {
      // Check if address is in user's address book
      const addressBook = await prisma.addressBook.findFirst({
        where: {
          userId,
          address: address.toLowerCase(),
          isActive: true
        }
      });

      if (addressBook) {
        return {
          known: true,
          label: addressBook.label,
          trusted: addressBook.trusted || false
        };
      }

      // Check recent transactions for this address
      const recentTx = await prisma.transaction.findFirst({
        where: {
          wallet: {
            userId
          },
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

      // Check for similar addresses (address poisoning attack)
      const recentAddresses = await prisma.transaction.findMany({
        where: {
          wallet: {
            userId
          },
          timestamp: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
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

  /**
   * Check if two addresses are suspiciously similar (address poisoning)
   */
  isAddressSimilar(addr1, addr2) {
    if (!addr1 || !addr2 || addr1 === addr2) return false;
    
    const a1 = addr1.toLowerCase();
    const a2 = addr2.toLowerCase();

    // Check if first 6 and last 4 characters match
    const firstMatch = a1.substring(0, 6) === a2.substring(0, 6);
    const lastMatch = a1.substring(a1.length - 4) === a2.substring(a2.length - 4);

    return firstMatch && lastMatch;
  }

  /**
   * Estimate gas for transaction
   */
  async estimateGas(from, to, amount, asset, network) {
    try {
      const provider = ethereumService.getProvider(network);
      const feeData = await provider.getFeeData();

      let gasLimit = 21000; // Default for ETH transfer

      if (asset !== 'ETH') {
        // Estimate gas for token transfer
        // (Would need token contract interface)
        gasLimit = 65000; // Typical for ERC-20
      }

      const gasPriceGwei = parseFloat(ethers.formatUnits(feeData.maxFeePerGas || feeData.gasPrice, 'gwei'));
      const gasCostEth = parseFloat(ethers.formatEther(
        (feeData.maxFeePerGas || feeData.gasPrice) * BigInt(gasLimit)
      ));

      // Check if gas price is unusually high (>100 gwei)
      const unusuallyHigh = gasPriceGwei > 100;

      return {
        success: true,
        gasLimit,
        gasPrice: gasPriceGwei,
        totalCost: gasCostEth,
        totalCostUSD: null, // Would need price oracle
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

  /**
   * Simulate transaction to check if it will succeed
   */
  async simulateTransaction(from, to, amount, asset, network) {
    try {
      const provider = ethereumService.getProvider(network);

      // Simulate ETH transfer
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
      
      // Parse error to provide helpful message
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

  /**
   * Check address reputation against known scam database
   */
  async checkAddressReputation(address) {
    try {
      // Check against known scam addresses in database
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

      // Check suspicious addresses
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

      // No issues found
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

  /**
   * Get average transaction amount for user
   */
  async getAverageTransactionAmount(userId, asset) {
    try {
      const transactions = await prisma.transaction.findMany({
        where: {
          wallet: { userId },
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
