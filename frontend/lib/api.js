import axios from 'axios';
import { buildSepoliaAutoSwapExecutionPlan, calculateEstimatedGasCostWei } from './sepoliaAutoSwapExecution.mjs';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

const SEPOLIA_ROUTER_ABI = [
  'function swapAndSend(address token, address recipient, uint256 amountBaseUnits) payable',
];

function getEthereumRpcUrl(network = 'mainnet') {
  return network === 'mainnet'
    ? 'https://eth.llamarpc.com'
    : 'https://ethereum-sepolia-rpc.publicnode.com';
}

export const walletAPI = {
  generateWallet: async () => {
    const response = await api.post('/api/v1/wallet/generate');
    return response.data;
  },

  importFromMnemonic: async (mnemonic) => {
    const response = await api.post('/api/v1/wallet/import/mnemonic', { mnemonic });
    return response.data;
  },

  importFromPrivateKey: async (privateKey) => {
    const response = await api.post('/api/v1/wallet/import/private-key', { privateKey });
    return response.data;
  },

  deriveAccounts: async (mnemonic, count = 5) => {
    const response = await api.post('/api/v1/wallet/derive-accounts', { mnemonic, count });
    return response.data;
  },

  validateAddress: async (network, address) => {
    const response = await api.get(`/api/v1/wallet/validate/${network}/${address}`);
    return response.data;
  },

  encryptData: async (data, password) => {
    const response = await api.post('/api/v1/wallet/encrypt', { data, password });
    return response.data;
  },

  decryptData: async (encryptedData, password) => {
    // validateStatus prevents axios from throwing on 401 (wrong password)
    const response = await api.post('/api/v1/wallet/decrypt', { encryptedData, password }, {
      validateStatus: (status) => status < 500,
    });
    return response.data;
  },
};

export const blockchainAPI = {
  getEthereumBalance: async (address, network = 'mainnet') => {
    const response = await api.get(`/api/v1/blockchain/ethereum/balance/${address}?network=${network}`);
    return response.data;
  },

  getBitcoinBalance: async (address, network = 'mainnet') => {
    const response = await api.get(`/api/v1/blockchain/bitcoin/balance/${address}?network=${network}`);
    return response.data;
  },

  getSolanaBalance: async (address, network = 'mainnet-beta') => {
    const response = await api.get(`/api/v1/blockchain/solana/balance/${address}?network=${network}`);
    return response.data;
  },

  getGasPrice: async (network = 'mainnet') => {
    const response = await api.get(`/api/v1/blockchain/ethereum/gas-price?network=${network}`);
    return response.data;
  },

  getBitcoinFeeEstimate: async (network = 'mainnet') => {
    const response = await api.get(`/api/v1/blockchain/bitcoin/fee-estimate?network=${network}`);
    return response.data;
  },
};

export const tokenAPI = {
  getTokenInfo: async (tokenAddress) => {
    const response = await api.get(`/api/v1/tokens/info/${tokenAddress}`);
    return response.data;
  },

  getTokenBalance: async (tokenAddress, address) => {
    const response = await api.get(`/api/v1/tokens/balance/${tokenAddress}/${address}`);
    return response.data;
  },

  getMultipleBalances: async (address, tokenAddresses) => {
    const response = await api.post('/api/v1/tokens/balances/multiple', { walletAddress: address, tokenAddresses });
    return response.data;
  },

  getPopularTokenBalances: async (address, network = 'mainnet') => {
    const response = await api.get(`/api/v1/tokens/balances/popular/${address}?network=${network}`);
    return response.data;
  },

  getPopularTokens: async () => {
    const response = await api.get('/api/v1/tokens/popular');
    return response.data;
  },
};

export const priceAPI = {
  getPrice: async (coinId, currency = 'usd') => {
    const response = await api.get(`/api/v1/prices/${coinId}?currency=${currency}`);
    return response.data;
  },

  getMultiplePrices: async (coinIds, currency = 'usd') => {
    const response = await api.post('/api/v1/prices/multiple', { coinIds, currency });
    return response.data;
  },

  getPopularPrices: async (currency = 'usd') => {
    const response = await api.get(`/api/v1/prices/list/popular?currency=${currency}`);
    return response.data;
  },

  getCoinData: async (coinId) => {
    const response = await api.get(`/api/v1/prices/coin/${coinId}`);
    return response.data;
  },

  getPriceChart: async (coinId, currency = 'usd', days = 7) => {
    const response = await api.get(`/api/v1/prices/chart/${coinId}?currency=${currency}&days=${days}`);
    return response.data;
  },

  searchCoins: async (query) => {
    const response = await api.get(`/api/v1/prices/search/query?q=${query}`);
    return response.data;
  },

  getTrendingCoins: async () => {
    const response = await api.get('/api/v1/prices/list/trending');
    return response.data;
  },

  getTopCoins: async (currency = 'usd', limit = 10) => {
    const response = await api.get(`/api/v1/prices/list/top?currency=${currency}&limit=${limit}`);
    return response.data;
  },
};

export const addressBookAPI = {
  getAddressBook: async (walletId) => {
    const response = await api.get(`/api/v1/address-book/${walletId}`);
    return response.data;
  },

  checkAddress: async (walletId, address) => {
    const response = await api.get(`/api/v1/address-book/check/${walletId}/${address}`);
    return response.data;
  },

  addAddress: async (walletId, address, label, trusted = true) => {
    const response = await api.post('/api/v1/address-book', {
      walletId,
      address,
      label,
      trusted,
    });
    return response.data;
  },

  updateAddress: async (id, label, trusted) => {
    const response = await api.put(`/api/v1/address-book/${id}`, {
      label,
      trusted,
    });
    return response.data;
  },

  deleteAddress: async (id) => {
    const response = await api.delete(`/api/v1/address-book/${id}`);
    return response.data;
  },

  reportScam: async (address, severity, description) => {
    const response = await api.post('/api/v1/address-book/report-scam', {
      address,
      severity,
      description,
    });
    return response.data;
  },

  getScamAddresses: async () => {
    const response = await api.get('/api/v1/address-book/scam-list/all');
    return response.data;
  },
};

export const databaseWalletAPI = {
  deleteDatabaseWallet: async (walletId, token) => {
    const response = await api.delete(`/api/v1/database-wallets/${walletId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },
};

export const transactionAPI = {
  sendEthereumTransaction: async (privateKey, to, amount, options = {}) => {

    const { ethers } = await import('ethers');

    try {
      const network = options.network || 'mainnet';
      const rpcUrl = getEthereumRpcUrl(network);

      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const wallet = new ethers.Wallet(privateKey, provider);

      const feeData = await provider.getFeeData();

      const tx = {
        to,
        value: ethers.parseEther(amount.toString()),
        maxFeePerGas: feeData.maxFeePerGas,
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
      };

      const transaction = await wallet.sendTransaction(tx);
      await transaction.wait();

      return {
        success: true,
        transactionHash: transaction.hash,
        data: {
          hash: transaction.hash,
          from: transaction.from,
          to: transaction.to,
          value: ethers.formatEther(transaction.value),
        },
      };
    } catch (error) {
      console.error('Ethereum transaction error:', error);
      return {
        success: false,
        error: error.message || 'Transaction failed',
      };
    }
  },

  sendTokenTransaction: async (privateKey, tokenAddress, to, amount, options = {}) => {
    const { ethers } = await import('ethers');

    try {
      const network = options.network || 'mainnet';
      const decimals = options.decimals || 18;
      const rpcUrl = getEthereumRpcUrl(network);

      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const wallet = new ethers.Wallet(privateKey, provider);

      const abi = ['function transfer(address to, uint256 amount) returns (bool)'];
      const contract = new ethers.Contract(tokenAddress, abi, wallet);

      const amountWei = ethers.parseUnits(amount.toString(), decimals);
      const transaction = await contract.transfer(to, amountWei);
      await transaction.wait();

      return {
        success: true,
        transactionHash: transaction.hash,
        data: {
          hash: transaction.hash,
          from: transaction.from,
          to,
          tokenAddress,
          amount,
        },
      };
    } catch (error) {
      console.error('Token transaction error:', error);
      return {
        success: false,
        error: error.message || 'Token transaction failed',
      };
    }
  },

  quoteSepoliaAutoSwapTransaction: async (fromAddress, to, amount, options = {}) => {
    const { ethers } = await import('ethers');

    try {
      const executionPlan = buildSepoliaAutoSwapExecutionPlan({
        manifest: options.manifest,
        token: options.token,
        amount,
        recipientAddress: to,
      });

      const provider = new ethers.JsonRpcProvider(getEthereumRpcUrl('sepolia'));
      const feeData = await provider.getFeeData();
      const gasPriceWei = feeData.maxFeePerGas ?? feeData.gasPrice;

      if (!gasPriceWei) {
        return {
          success: false,
          error: 'Unable to estimate transaction cost right now.',
        };
      }

      const routerInterface = new ethers.Interface(SEPOLIA_ROUTER_ABI);
      const data = routerInterface.encodeFunctionData('swapAndSend', [
        executionPlan.tokenAddress,
        executionPlan.recipientAddress,
        executionPlan.amountBaseUnits,
      ]);

      const gasLimit = await provider.estimateGas({
        from: fromAddress,
        to: executionPlan.routerAddress,
        data,
        value: executionPlan.requiredWei,
      });

      return {
        success: true,
        executionPlan,
        gasLimit: gasLimit.toString(),
        gasPriceWei: gasPriceWei.toString(),
        estimatedGasWei: calculateEstimatedGasCostWei({
          gasLimit: gasLimit.toString(),
          gasPriceWei: gasPriceWei.toString(),
        }).toString(),
      };
    } catch (error) {
      console.error('Sepolia auto-swap quote error:', error);
      return {
        success: false,
        error: error.message || 'Unable to estimate transaction cost right now.',
      };
    }
  },

  sendSepoliaAutoSwapTransaction: async (privateKey, to, amount, options = {}) => {
    const { ethers } = await import('ethers');

    try {
      const executionPlan = buildSepoliaAutoSwapExecutionPlan({
        manifest: options.manifest,
        token: options.token,
        amount,
        recipientAddress: to,
      });

      const provider = new ethers.JsonRpcProvider(getEthereumRpcUrl('sepolia'));
      const wallet = new ethers.Wallet(privateKey, provider);
      const contract = new ethers.Contract(executionPlan.routerAddress, SEPOLIA_ROUTER_ABI, wallet);

      const transaction = await contract.swapAndSend(
        executionPlan.tokenAddress,
        executionPlan.recipientAddress,
        executionPlan.amountBaseUnits,
        {
          value: executionPlan.requiredWei,
        }
      );

      const receipt = await transaction.wait();
      const postTransactionBalanceWei = await provider.getBalance(wallet.address);

      return {
        success: true,
        transactionHash: transaction.hash,
        data: {
          hash: transaction.hash,
          from: wallet.address,
          to,
          tokenAddress: executionPlan.tokenAddress,
          amount,
          routerAddress: executionPlan.routerAddress,
          requiredWei: executionPlan.requiredWei,
          gasUsed: receipt?.gasUsed?.toString?.() || null,
          effectiveGasPriceWei: receipt?.gasPrice?.toString?.() || receipt?.effectiveGasPrice?.toString?.() || null,
          postTransactionBalanceEth: ethers.formatEther(postTransactionBalanceWei),
        },
      };
    } catch (error) {
      console.error('Sepolia auto-swap send error:', error);
      return {
        success: false,
        error: error.message || 'Sepolia auto-swap transaction failed',
      };
    }
  },

  sendBitcoinTransaction: async (privateKey, to, amount, fee = null, walletId = null) => {

    return {
      success: false,
      error: 'Bitcoin transactions not yet implemented in frontend. Please use backend API.',
    };
  },

  sendSolanaTransaction: async (privateKey, to, amount, options = {}) => {
    try {
      const { Connection, Keypair, PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL, sendAndConfirmTransaction } = await import('@solana/web3.js');

      const network = options.network || 'mainnet-beta';
      let rpcUrl;

      if (network === 'mainnet-beta' || network === 'mainnet') {
        rpcUrl = 'https://api.mainnet-beta.solana.com';
      } else if (network === 'devnet') {
        rpcUrl = 'https://api.devnet.solana.com';
      } else if (network === 'testnet') {
        rpcUrl = 'https://api.testnet.solana.com';
      } else {
        rpcUrl = 'https://api.mainnet-beta.solana.com';
      }

      const connection = new Connection(rpcUrl, 'confirmed');

      const privateKeyBytes = new Uint8Array(Buffer.from(privateKey, 'hex'));
      const fromKeypair = privateKeyBytes.length === 32
        ? Keypair.fromSeed(privateKeyBytes)
        : Keypair.fromSecretKey(privateKeyBytes);

      const toPublicKey = new PublicKey(to);
      const lamports = Math.floor(parseFloat(amount) * LAMPORTS_PER_SOL);

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: fromKeypair.publicKey,
          toPubkey: toPublicKey,
          lamports,
        })
      );

      const signature = await sendAndConfirmTransaction(
        connection,
        transaction,
        [fromKeypair]
      );

      return {
        success: true,
        transactionHash: signature,
        data: {
          hash: signature,
          from: fromKeypair.publicKey.toString(),
          to,
          amount,
        },
      };
    } catch (error) {
      console.error('Solana transaction error:', error);
      return {
        success: false,
        error: error.message || 'Solana transaction failed',
      };
    }
  },
};

export const telegramAPI = {
  getStatus: async (token) => {
    const response = await api.get('/api/v1/telegram/status', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  getBotBalance: async (token) => {
    const response = await api.get('/api/v1/telegram/bot-balance', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  generateLinkCode: async (token) => {
    const response = await api.post('/api/v1/telegram/link/generate', {}, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  unlinkTelegram: async (token) => {
    const response = await api.post('/api/v1/telegram/unlink', {}, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  getRecipients: async (token) => {
    const response = await api.get('/api/v1/telegram/recipients', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  saveRecipient: async (token, payload) => {
    const response = await api.post('/api/v1/telegram/recipients', payload, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  updateRecipient: async (token, recipientId, payload) => {
    const response = await api.patch(`/api/v1/telegram/recipients/${recipientId}`, payload, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  deleteRecipient: async (token, recipientId) => {
    const response = await api.delete(`/api/v1/telegram/recipients/${recipientId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },
};

export const stealthAPI = {
  listIssues: async (token, params = {}) => {
    const query = new URLSearchParams();
    if (params.status) {
      query.set('status', params.status);
    }

    const response = await api.get(`/api/v1/stealth/issues${query.toString() ? `?${query.toString()}` : ''}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  refreshIssue: async (token, issueId) => {
    const response = await api.post(`/api/v1/stealth/issues/${issueId}/refresh`, {}, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  getClaimPreview: async (token, issueId) => {
    const response = await api.get(`/api/v1/stealth/issues/${issueId}/claim-preview`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  claimIssue: async (token, issueId) => {
    const response = await api.post(`/api/v1/stealth/issues/${issueId}/claim`, {}, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },
};

export default api;
