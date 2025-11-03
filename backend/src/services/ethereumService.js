import { ethers } from 'ethers';
import axios from 'axios';

/**
 * Blockchain Service for Ethereum
 * Handles Ethereum blockchain interactions
 */

class EthereumService {
  constructor() {
    // Initialize providers as null - they'll be created lazily
    this.providers = {
      // Ethereum networks
      mainnet: null,
      sepolia: null,
      goerli: null,
      holesky: null,
      
      // Polygon networks
      'polygon-mainnet': null,
      'polygon-mumbai': null,
      
      // Arbitrum networks
      'arbitrum-one': null,
      'arbitrum-goerli': null,
      
      // Optimism networks
      'optimism-mainnet': null,
      'optimism-goerli': null,
      
      // BSC networks
      'bsc-mainnet': null,
      'bsc-testnet': null,
      
      // Avalanche networks
      'avalanche-mainnet': null,
      'avalanche-fuji': null,
      
      // Base networks
      'base-mainnet': null,
      'base-goerli': null,
    };
    
    // Network configurations
    this.networkConfigs = {
      // Ethereum networks
      mainnet: { rpc: process.env.ETHEREUM_MAINNET_RPC || 'https://ethereum.publicnode.com', chainId: 1 },
      sepolia: { rpc: process.env.ETHEREUM_SEPOLIA_RPC || 'https://ethereum-sepolia.publicnode.com', chainId: 11155111 },
      goerli: { rpc: process.env.ETHEREUM_GOERLI_RPC || 'https://ethereum-goerli.publicnode.com', chainId: 5 },
      holesky: { rpc: process.env.ETHEREUM_HOLESKY_RPC || 'https://ethereum-holesky.publicnode.com', chainId: 17000 },
      
      // Polygon networks
      'polygon-mainnet': { rpc: process.env.POLYGON_MAINNET_RPC || 'https://polygon-rpc.com', chainId: 137 },
      'polygon-mumbai': { rpc: process.env.POLYGON_MUMBAI_RPC || 'https://rpc-mumbai.maticvigil.com', chainId: 80001 },
      
      // Arbitrum networks
      'arbitrum-one': { rpc: process.env.ARBITRUM_ONE_RPC || 'https://arb1.arbitrum.io/rpc', chainId: 42161 },
      'arbitrum-goerli': { rpc: process.env.ARBITRUM_GOERLI_RPC || 'https://goerli-rollup.arbitrum.io/rpc', chainId: 421613 },
      
      // Optimism networks
      'optimism-mainnet': { rpc: process.env.OPTIMISM_MAINNET_RPC || 'https://mainnet.optimism.io', chainId: 10 },
      'optimism-goerli': { rpc: process.env.OPTIMISM_GOERLI_RPC || 'https://goerli.optimism.io', chainId: 420 },
      
      // BSC networks
      'bsc-mainnet': { rpc: process.env.BSC_MAINNET_RPC || 'https://bsc-dataseed.binance.org', chainId: 56 },
      'bsc-testnet': { rpc: process.env.BSC_TESTNET_RPC || 'https://data-seed-prebsc-1-s1.binance.org:8545', chainId: 97 },
      
      // Avalanche networks
      'avalanche-mainnet': { rpc: process.env.AVALANCHE_MAINNET_RPC || 'https://api.avax.network/ext/bc/C/rpc', chainId: 43114 },
      'avalanche-fuji': { rpc: process.env.AVALANCHE_FUJI_RPC || 'https://api.avax-test.network/ext/bc/C/rpc', chainId: 43113 },
      
      // Base networks
      'base-mainnet': { rpc: process.env.BASE_MAINNET_RPC || 'https://mainnet.base.org', chainId: 8453 },
      'base-goerli': { rpc: process.env.BASE_GOERLI_RPC || 'https://goerli.base.org', chainId: 84531 },
    };
    
    this._initialized = false;
  }

  /**
   * Initialize RPC providers (called lazily)
   */
  initializeProviders() {
    if (this._initialized) return;
    
    try {
      // Initialize all providers
      Object.keys(this.networkConfigs).forEach(network => {
        const config = this.networkConfigs[network];
        this.providers[network] = new ethers.JsonRpcProvider(config.rpc);
      });

      console.log('✅ Multi-network providers initialized');
      console.log('🔗 Supported networks:', Object.keys(this.networkConfigs).join(', '));
      
      this._initialized = true;
    } catch (error) {
      console.error('Error initializing providers:', error);
    }
  }

  /**
   * Get provider for specific network
   */
  getProvider(network = 'mainnet') {
    this.initializeProviders();
    
    // Handle network mapping for different naming conventions
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
      console.warn(`Provider not found for network: ${network}, falling back to mainnet`);
      return this.providers.mainnet;
    }
    
    return provider;
  }

  /**
   * Get ETH balance for an address
   * @param {string} address - Ethereum address
   * @param {string} network - Network name (mainnet, sepolia, goerli)
   * @returns {Object} - Balance information
   */
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
      console.error('Error getting ETH balance:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get transaction count (nonce) for an address
   */
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
      console.error('Error getting transaction count:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get current gas price
   */
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
      console.error('Error getting gas price:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get transaction by hash
   */
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
      console.error('Error getting transaction:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get transaction history for an address using Etherscan API
   */
  async getTransactionHistory(address, network = 'mainnet') {
    try {
      if (!ethers.isAddress(address)) {
        throw new Error('Invalid Ethereum address');
      }

      const apiKey = process.env.ETHERSCAN_API_KEY;
      if (!apiKey) {
        console.warn('⚠️  Etherscan API key not configured. Transaction history unavailable.');
        return {
          success: true,
          address,
          network,
          transactions: [],
          count: 0,
          message: 'Configure ETHERSCAN_API_KEY to view transaction history',
        };
      }

      // Use unified Etherscan V2 API endpoint with chainid parameter
      // This replaces the old per-explorer URLs (polygonscan, bscscan, etc.)
      const v2BaseUrl = 'https://api.etherscan.io/v2/api';
      const networkConfig = this.networkConfigs[network] || this.networkConfigs.mainnet;
      const chainId = networkConfig.chainId;
      
      const url = `${v2BaseUrl}?chainid=${chainId}&module=account&action=txlist&address=${address}&page=1&offset=50&sort=desc&apikey=${apiKey}`;

      const response = await axios.get(url);
      
      console.log('Etherscan V2 API response:', {
        status: response.data.status,
        message: response.data.message,
        resultType: typeof response.data.result,
        isArray: Array.isArray(response.data.result),
        network,
        chainId
      });
      
      // Handle both successful responses and graceful error cases
      if (response.data.status !== '1' && response.data.status !== 1) {
        const errorMessage = response.data.message || 'Failed to fetch transactions';
        console.warn('Etherscan V2 API non-success status:', errorMessage);
        
        // If we still got transaction data despite status, process it
        if (Array.isArray(response.data.result) && response.data.result.length > 0) {
          console.log('Processing transactions despite non-success status');
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
        console.warn('Unexpected V2 response format, result is not array:', typeof rawTransactions);
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
      console.error('Error getting transaction history:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Estimate gas for a transaction
   */
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
      console.error('Error estimating gas:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get current block number
   */
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
      console.error('Error getting block number:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send raw signed transaction
   */
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
      console.error('Error sending transaction:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

export default new EthereumService();
