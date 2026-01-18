import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import axios from 'axios';

class SolanaService {
  constructor() {

    this.connections = {
      'mainnet-beta': null,
      'devnet': null,
      'testnet': null,
    };

    this.networkConfigs = {
      'mainnet-beta': {
        rpc: process.env.SOLANA_MAINNET_RPC || 'https://api.mainnet-beta.solana.com',
        cluster: 'mainnet-beta'
      },
      'devnet': {
        rpc: process.env.SOLANA_DEVNET_RPC || 'https://api.devnet.solana.com',
        cluster: 'devnet'
      },
      'testnet': {
        rpc: process.env.SOLANA_TESTNET_RPC || 'https://api.testnet.solana.com',
        cluster: 'testnet'
      },
    };

    this._initialized = false;
  }

  initializeConnections() {
    if (this._initialized) return;

    try {

      Object.keys(this.networkConfigs).forEach(network => {
        const config = this.networkConfigs[network];
        this.connections[network] = new Connection(config.rpc, 'confirmed');
      });

      console.log('✅ Solana connections initialized');
      console.log('🔗 Supported Solana networks:', Object.keys(this.networkConfigs).join(', '));

      this._initialized = true;
    } catch (error) {
      console.error('Error initializing Solana connections:', error);
    }
  }

  getConnection(network = 'mainnet-beta') {
    this.initializeConnections();

    const networkMap = {
      'solana-mainnet': 'mainnet-beta',
      'solana-devnet': 'devnet',
      'solana-testnet': 'testnet',
    };

    const mappedNetwork = networkMap[network] || network;
    const connection = this.connections[mappedNetwork];

    if (!connection) {
      console.warn(`Connection not found for network: ${network}, falling back to mainnet-beta`);
      return this.connections['mainnet-beta'];
    }

    return connection;
  }

  async getBalance(address, network = 'mainnet-beta') {
    try {
      const connection = this.getConnection(network);
      const publicKey = new PublicKey(address);

      const balanceLamports = await connection.getBalance(publicKey);

      const balanceSOL = balanceLamports / LAMPORTS_PER_SOL;

      return {
        success: true,
        address,
        network,
        balance: balanceSOL.toString(),
        balanceLamports: balanceLamports.toString(),
        currency: 'SOL',
      };
    } catch (error) {
      console.error('Error getting Solana balance:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async getTransactionHistory(address, network = 'mainnet-beta', limit = 10) {
    try {
      const connection = this.getConnection(network);
      const publicKey = new PublicKey(address);

      const signatures = await connection.getSignaturesForAddress(publicKey, { limit });

      const transactions = [];
      for (const signatureInfo of signatures) {
        try {
          const transaction = await connection.getTransaction(signatureInfo.signature, {
            maxSupportedTransactionVersion: 0
          });

          if (transaction) {
            transactions.push({
              signature: signatureInfo.signature,
              slot: signatureInfo.slot,
              blockTime: signatureInfo.blockTime,
              confirmationStatus: signatureInfo.confirmationStatus,
              fee: transaction.meta?.fee || 0,
              status: transaction.meta?.err ? 'failed' : 'success',
            });
          }
        } catch (txError) {
          console.warn('Error fetching transaction details:', txError.message);
        }
      }

      return {
        success: true,
        address,
        network,
        transactions,
        count: transactions.length,
      };
    } catch (error) {
      console.error('Error getting Solana transaction history:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async getSlot(network = 'mainnet-beta') {
    try {
      const connection = this.getConnection(network);
      const slot = await connection.getSlot();

      return {
        success: true,
        network,
        slot: slot.toString(),
      };
    } catch (error) {
      console.error('Error getting Solana slot:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async getRecentPerformanceSamples(network = 'mainnet-beta') {
    try {
      const connection = this.getConnection(network);
      const samples = await connection.getRecentPerformanceSamples(1);

      return {
        success: true,
        network,
        samples: samples.map(sample => ({
          slot: sample.slot,
          numTransactions: sample.numTransactions,
          numSlots: sample.numSlots,
          samplePeriodSecs: sample.samplePeriodSecs,
        })),
      };
    } catch (error) {
      console.error('Error getting Solana performance samples:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  validateAddress(address) {
    try {
      new PublicKey(address);
      return {
        success: true,
        address,
        isValid: true,
      };
    } catch (error) {
      return {
        success: true,
        address,
        isValid: false,
        error: 'Invalid Solana address format',
      };
    }
  }

  async getTransaction(signature, network = 'mainnet-beta') {
    try {
      const connection = this.getConnection(network);
      const transaction = await connection.getTransaction(signature, {
        maxSupportedTransactionVersion: 0
      });

      if (!transaction) {
        throw new Error('Transaction not found');
      }

      return {
        success: true,
        transaction: {
          signature,
          slot: transaction.slot,
          blockTime: transaction.blockTime,
          fee: transaction.meta?.fee || 0,
          status: transaction.meta?.err ? 'failed' : 'success',
          computeUnitsConsumed: transaction.meta?.computeUnitsConsumed || 0,
        },
      };
    } catch (error) {
      console.error('Error getting Solana transaction:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

export default new SolanaService();
