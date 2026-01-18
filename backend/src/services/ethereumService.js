import { ethers } from 'ethers';
import axios from 'axios';
import logger from './loggerService.js';

class EthereumService {
  constructor() {
    this.providers = {
      mainnet: null,
      sepolia: null,
      'polygon-mainnet': null,
      'polygon-mumbai': null,
    };

    this.networkConfigs = {
      mainnet: { rpc: process.env.ETHEREUM_MAINNET_RPC || 'https://ethereum.publicnode.com', chainId: 1 },
      sepolia: { rpc: process.env.ETHEREUM_SEPOLIA_RPC || 'https://ethereum-sepolia.publicnode.com', chainId: 11155111 },
      'polygon-mainnet': { rpc: process.env.POLYGON_MAINNET_RPC || 'https://polygon-rpc.com', chainId: 137 },
      'polygon-mumbai': { rpc: process.env.POLYGON_MUMBAI_RPC || 'https://rpc-mumbai.maticvigil.com', chainId: 80001 },
    };

    this._initialized = false;
  }

  initializeProviders() {
    if (this._initialized) return;

    try {
      Object.keys(this.networkConfigs).forEach(network => {
        const config = this.networkConfigs[network];
        this.providers[network] = new ethers.JsonRpcProvider(config.rpc);
      });

      logger.info('Multi-network providers initialized', { networks: Object.keys(this.networkConfigs) });
      this._initialized = true;
    } catch (error) {
      logger.error('Error initializing providers', { error: error.message });
    }
  }

  getProvider(network = 'mainnet') {
    this.initializeProviders();

    const networkMap = {
      'ethereum-mainnet': 'mainnet',
      'ethereum-sepolia': 'sepolia',
      'ethereum-goerli': 'goerli',
      'ethereum-holesky': 'holesky',
      'polygon-mainnet': 'polygon-mainnet',
      'polygon-mumbai': 'polygon-mumbai',
      'arbitrum-one': 'arbitrum-one',
      'arbitrum-goerli': 'arbitrum-goerli',
      'optimism-mainnet': 'optimism-mainnet',
      'optimism-goerli': 'optimism-goerli',
      'bsc-mainnet': 'bsc-mainnet',
      'bsc-testnet': 'bsc-testnet',
      'avalanche-mainnet': 'avalanche-mainnet',
      'avalanche-fuji': 'avalanche-fuji',
      'base-mainnet': 'base-mainnet',
      'base-goerli': 'base-goerli',
    };

    const mappedNetwork = networkMap[network] || network;
    const provider = this.providers[mappedNetwork];

    if (!provider) {
      logger.warn('Provider not found, falling back to mainnet', { network });
      return this.providers.mainnet;
    }

    return provider;
  }

  async getBalance(address, network = 'mainnet') {
    try {
      if (!ethers.isAddress(address)) {
        throw new Error('Invalid Ethereum address');
      }

      const provider = this.getProvider(network);
      const balanceWei = await provider.getBalance(address);
      const balanceEth = ethers.formatEther(balanceWei);

      return {
        success: true,
        address,
        network,
        balance: {
          wei: balanceWei.toString(),
          eth: balanceEth,
        },
      };
    } catch (error) {
      logger.error('Error getting ETH balance', { error: error.message, address, network });
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async getTransactionCount(address, network = 'mainnet') {
    try {
      const provider = this.getProvider(network);
      const count = await provider.getTransactionCount(address);

      return {
        success: true,
        address,
        transactionCount: count,
      };
    } catch (error) {
      logger.error('Error getting transaction count', { error: error.message });
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async getGasPrice(network = 'mainnet') {
    try {
      const provider = this.getProvider(network);
      const feeData = await provider.getFeeData();

      return {
        success: true,
        network,
        gasPrice: {
          standard: ethers.formatUnits(feeData.gasPrice || 0, 'gwei'),
          maxFee: ethers.formatUnits(feeData.maxFeePerGas || 0, 'gwei'),
          maxPriorityFee: ethers.formatUnits(feeData.maxPriorityFeePerGas || 0, 'gwei'),
        },
      };
    } catch (error) {
      logger.error('Error getting gas price', { error: error.message });
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async getTransaction(txHash, network = 'mainnet') {
    try {
      const provider = this.getProvider(network);
      const tx = await provider.getTransaction(txHash);

      if (!tx) {
        throw new Error('Transaction not found');
      }

      const receipt = await provider.getTransactionReceipt(txHash);

      return {
        success: true,
        transaction: {
          hash: tx.hash,
          from: tx.from,
          to: tx.to,
          value: ethers.formatEther(tx.value),
          gasLimit: tx.gasLimit.toString(),
          gasPrice: ethers.formatUnits(tx.gasPrice || 0, 'gwei'),
          nonce: tx.nonce,
          blockNumber: tx.blockNumber,
          status: receipt ? (receipt.status === 1 ? 'success' : 'failed') : 'pending',
          confirmations: receipt ? receipt.confirmations : 0,
        },
      };
    } catch (error) {
      logger.error('Error getting transaction', { error: error.message, txHash });
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async getTransactionHistory(address, network = 'mainnet') {
    try {
      if (!ethers.isAddress(address)) {
        throw new Error('Invalid Ethereum address');
      }

      const apiKey = process.env.ETHERSCAN_API_KEY;
      if (!apiKey) {
        logger.warn('Etherscan API key not configured');
        return {
          success: true,
          address,
          network,
          transactions: [],
          count: 0,
          message: 'Configure ETHERSCAN_API_KEY to view transaction history',
        };
      }

      const v2BaseUrl = 'https://api.etherscan.io/v2/api';
      const networkConfig = this.networkConfigs[network] || this.networkConfigs.mainnet;
      const chainId = networkConfig.chainId;

      const url = `${v2BaseUrl}?chainid=${chainId}&module=account&action=txlist&address=${address}&page=1&offset=50&sort=desc&apikey=${apiKey}`;

      const response = await axios.get(url);

      if (response.data.status !== '1' && response.data.status !== 1) {
        const errorMessage = response.data.message || 'Failed to fetch transactions';

        if (Array.isArray(response.data.result) && response.data.result.length > 0) {

        } else {
          return {
            success: true,
            address,
            network,
            transactions: [],
            count: 0,
            message: `Transaction history unavailable: ${errorMessage}`,
          };
        }
      }

      const rawTransactions = response.data.result || [];
      if (!Array.isArray(rawTransactions)) {
        return {
          success: true,
          address,
          network,
          transactions: [],
          count: 0,
          message: 'Unable to load transaction history at this time.',
        };
      }

      const transactions = rawTransactions.slice(0, 50).map(tx => ({
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        value: ethers.formatEther(tx.value),
        timestamp: new Date(parseInt(tx.timeStamp) * 1000).toISOString(),
        blockNumber: parseInt(tx.blockNumber),
        status: tx.isError === '0' ? 'success' : 'failed',
        gasUsed: tx.gasUsed,
        gasPrice: ethers.formatUnits(tx.gasPrice, 'gwei'),
      }));

      return {
        success: true,
        address,
        network,
        transactions,
        count: transactions.length,
      };
    } catch (error) {
      logger.error('Error getting transaction history', { error: error.message, address });
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async estimateGas(from, to, value, network = 'mainnet') {
    try {
      const provider = this.getProvider(network);

      const gasEstimate = await provider.estimateGas({
        from,
        to,
        value: ethers.parseEther(value.toString()),
      });

      const feeData = await provider.getFeeData();

      return {
        success: true,
        gasLimit: gasEstimate.toString(),
        gasPrice: ethers.formatUnits(feeData.gasPrice || 0, 'gwei'),
        estimatedCost: ethers.formatEther(gasEstimate * (feeData.gasPrice || 0n)),
      };
    } catch (error) {
      logger.error('Error estimating gas', { error: error.message });
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async getBlockNumber(network = 'mainnet') {
    try {
      const provider = this.getProvider(network);
      const blockNumber = await provider.getBlockNumber();

      return {
        success: true,
        network,
        blockNumber,
      };
    } catch (error) {
      logger.error('Error getting block number', { error: error.message });
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async sendTransaction(signedTx, network = 'mainnet') {
    try {
      const provider = this.getProvider(network);
      const tx = await provider.broadcastTransaction(signedTx);

      return {
        success: true,
        txHash: tx.hash,
        message: 'Transaction broadcast successfully',
      };
    } catch (error) {
      logger.error('Error sending transaction', { error: error.message });
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

export default new EthereumService();
