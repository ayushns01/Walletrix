import { ethers } from 'ethers';
import axios from 'axios';

/**
 * Blockchain Service for Ethereum
 * Handles Ethereum blockchain interactions
 */

class EthereumService {
  constructor() {
    // Initialize providers
    this.providers = {
      mainnet: null,
      sepolia: null,
      goerli: null,
    };
    
    this.initializeProviders();
  }

  /**
   * Initialize RPC providers
   */
  initializeProviders() {
    try {
      // Mainnet provider (using public RPC or Infura/Alchemy if configured)
      const mainnetRpc = process.env.ETHEREUM_MAINNET_RPC || 'https://eth.public-rpc.com';
      this.providers.mainnet = new ethers.JsonRpcProvider(mainnetRpc);

      // Testnet providers
      if (process.env.ETHEREUM_SEPOLIA_RPC) {
        this.providers.sepolia = new ethers.JsonRpcProvider(process.env.ETHEREUM_SEPOLIA_RPC);
      }
      
      if (process.env.ETHEREUM_GOERLI_RPC) {
        this.providers.goerli = new ethers.JsonRpcProvider(process.env.ETHEREUM_GOERLI_RPC);
      }

      console.log('✅ Ethereum providers initialized');
    } catch (error) {
      console.error('Error initializing Ethereum providers:', error);
    }
  }

  /**
   * Get provider for specific network
   */
  getProvider(network = 'mainnet') {
    return this.providers[network] || this.providers.mainnet;
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
        return {
          success: false,
          error: 'Etherscan API key not configured',
        };
      }

      const baseUrls = {
        mainnet: 'https://api.etherscan.io',
        sepolia: 'https://api-sepolia.etherscan.io',
        goerli: 'https://api-goerli.etherscan.io',
      };

      const baseUrl = baseUrls[network] || baseUrls.mainnet;
      const url = `${baseUrl}/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=desc&apikey=${apiKey}`;

      const response = await axios.get(url);
      
      if (response.data.status !== '1') {
        throw new Error(response.data.message || 'Failed to fetch transactions');
      }

      const transactions = response.data.result.slice(0, 50).map(tx => ({
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
