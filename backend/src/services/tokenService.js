import { ethers } from 'ethers';
import ethereumService from './ethereumService.js';

/**
 * Token Service for ERC-20 tokens
 * Handles ERC-20 token operations on Ethereum and compatible chains
 */

// Standard ERC-20 ABI (minimal)
const ERC20_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
];

class TokenService {
  constructor() {
    // Popular token addresses on Ethereum Mainnet
    this.popularTokens = {
      USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      DAI: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
      WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      LINK: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
      UNI: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
      WBTC: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
      MATIC: '0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0',
    };
  }

  /**
   * Get token contract instance
   */
  getTokenContract(tokenAddress, network = 'mainnet') {
    const provider = ethereumService.getProvider(network);
    return new ethers.Contract(tokenAddress, ERC20_ABI, provider);
  }

  /**
   * Get token metadata (name, symbol, decimals)
   */
  async getTokenInfo(tokenAddress, network = 'mainnet') {
    try {
      if (!ethers.isAddress(tokenAddress)) {
        throw new Error('Invalid token address');
      }

      const contract = this.getTokenContract(tokenAddress, network);

      const [name, symbol, decimals, totalSupply] = await Promise.all([
        contract.name(),
        contract.symbol(),
        contract.decimals(),
        contract.totalSupply(),
      ]);

      return {
        success: true,
        token: {
          address: tokenAddress,
          name,
          symbol,
          decimals: Number(decimals),
          totalSupply: ethers.formatUnits(totalSupply, decimals),
        },
      };
    } catch (error) {
      console.error('Error getting token info:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get token balance for an address
   */
  async getTokenBalance(tokenAddress, walletAddress, network = 'mainnet') {
    try {
      if (!ethers.isAddress(tokenAddress)) {
        throw new Error('Invalid token address');
      }
      
      if (!ethers.isAddress(walletAddress)) {
        throw new Error('Invalid wallet address');
      }

      const contract = this.getTokenContract(tokenAddress, network);
      const decimals = await contract.decimals();
      const balance = await contract.balanceOf(walletAddress);

      return {
        success: true,
        token: tokenAddress,
        wallet: walletAddress,
        balance: {
          raw: balance.toString(),
          formatted: ethers.formatUnits(balance, decimals),
          decimals: Number(decimals),
        },
      };
    } catch (error) {
      console.error('Error getting token balance:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get multiple token balances for an address
   */
  async getMultipleTokenBalances(walletAddress, tokenAddresses, network = 'mainnet') {
    try {
      if (!ethers.isAddress(walletAddress)) {
        throw new Error('Invalid wallet address');
      }

      const balances = await Promise.all(
        tokenAddresses.map(async (tokenAddress) => {
          try {
            const contract = this.getTokenContract(tokenAddress, network);
            const [name, symbol, decimals, balance] = await Promise.all([
              contract.name(),
              contract.symbol(),
              contract.decimals(),
              contract.balanceOf(walletAddress),
            ]);

            return {
              address: tokenAddress,
              name,
              symbol,
              decimals: Number(decimals),
              balance: ethers.formatUnits(balance, decimals),
              balanceRaw: balance.toString(),
            };
          } catch (error) {
            return {
              address: tokenAddress,
              error: error.message,
            };
          }
        })
      );

      return {
        success: true,
        wallet: walletAddress,
        tokens: balances,
      };
    } catch (error) {
      console.error('Error getting multiple token balances:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get popular token balances for an address
   */
  async getPopularTokenBalances(walletAddress, network = 'mainnet') {
    try {
      const tokenAddresses = Object.values(this.popularTokens);
      return await this.getMultipleTokenBalances(walletAddress, tokenAddresses, network);
    } catch (error) {
      console.error('Error getting popular token balances:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get token allowance (for spending tokens on behalf of owner)
   */
  async getTokenAllowance(tokenAddress, ownerAddress, spenderAddress, network = 'mainnet') {
    try {
      if (!ethers.isAddress(tokenAddress)) {
        throw new Error('Invalid token address');
      }

      const contract = this.getTokenContract(tokenAddress, network);
      const decimals = await contract.decimals();
      const allowance = await contract.allowance(ownerAddress, spenderAddress);

      return {
        success: true,
        token: tokenAddress,
        owner: ownerAddress,
        spender: spenderAddress,
        allowance: {
          raw: allowance.toString(),
          formatted: ethers.formatUnits(allowance, decimals),
          decimals: Number(decimals),
        },
      };
    } catch (error) {
      console.error('Error getting token allowance:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Encode transfer function data for a token transfer
   */
  encodeTransferData(toAddress, amount, decimals) {
    try {
      const iface = new ethers.Interface(ERC20_ABI);
      const amountInWei = ethers.parseUnits(amount.toString(), decimals);
      const data = iface.encodeFunctionData('transfer', [toAddress, amountInWei]);

      return {
        success: true,
        data,
        decodedAmount: amount,
        to: toAddress,
      };
    } catch (error) {
      console.error('Error encoding transfer data:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Encode approve function data
   */
  encodeApproveData(spenderAddress, amount, decimals) {
    try {
      const iface = new ethers.Interface(ERC20_ABI);
      const amountInWei = ethers.parseUnits(amount.toString(), decimals);
      const data = iface.encodeFunctionData('approve', [spenderAddress, amountInWei]);

      return {
        success: true,
        data,
        decodedAmount: amount,
        spender: spenderAddress,
      };
    } catch (error) {
      console.error('Error encoding approve data:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get list of popular tokens
   */
  getPopularTokens() {
    return {
      success: true,
      tokens: Object.entries(this.popularTokens).map(([symbol, address]) => ({
        symbol,
        address,
      })),
    };
  }
}

export default new TokenService();
