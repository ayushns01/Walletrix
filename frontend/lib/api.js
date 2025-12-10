import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Wallet API
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
    const response = await api.post('/api/v1/wallet/decrypt', { encryptedData, password });
    return response.data;
  },
};

// Blockchain API
export const blockchainAPI = {
  getEthereumBalance: async (address, network = 'mainnet') => {
    const response = await api.get(`/api/v1/blockchain/ethereum/balance/${address}?network=${network}`);
    return response.data;
  },

  getBitcoinBalance: async (address, network = 'mainnet') => {
    const response = await api.get(`/api/v1/blockchain/bitcoin/balance/${address}?network=${network}`);
    return response.data;
  },

  getEthereumTransactions: async (address, page = 1, limit = 10, network = 'mainnet') => {
    const response = await api.get(`/api/v1/blockchain/ethereum/transactions/${address}?page=${page}&limit=${limit}&network=${network}`);
    return response.data;
  },

  getBitcoinTransactions: async (address, network = 'mainnet') => {
    const response = await api.get(`/api/v1/blockchain/bitcoin/transactions/${address}?network=${network}`);
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

  getTransaction: async (network, txHash) => {
    const response = await api.get(`/api/v1/blockchain/transaction/${network}/${txHash}`);
    return response.data;
  },
};

// Token API
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
    const response = await api.post('/api/v1/tokens/balances/multiple', { address, tokenAddresses });
    return response.data;
  },

  getPopularTokenBalances: async (address, network = 'mainnet') => {
    const response = await api.get(`/api/v1/tokens/balances/popular/${address}?network=${network}`);
    return response.data;
  },

  getPopularTokens: async () => {
    const response = await api.get('/tokens/popular');
    return response.data;
  },
};

// Price API
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
    const response = await api.get('/prices/list/trending');
    return response.data;
  },

  getTopCoins: async (currency = 'usd', limit = 10) => {
    const response = await api.get(`/api/v1/prices/list/top?currency=${currency}&limit=${limit}`);
    return response.data;
  },
};

// Transaction API
export const transactionAPI = {
  validateTransaction: async (network, from, to, amount, walletId) => {
    const response = await api.post('/api/v1/transactions/validate', {
      network,
      from,
      to,
      amount,
      walletId,
    });
    return response.data;
  },

  sendEthereumTransaction: async (privateKey, to, value, options = {}) => {
    const response = await api.post('/api/v1/transactions/ethereum/send', {
      privateKey,
      to,
      value,
      ...options,
    });
    return response.data;
  },

  sendTokenTransaction: async (privateKey, tokenAddress, to, amount, options = {}) => {
    const response = await api.post('/api/v1/transactions/token/send', {
      privateKey,
      tokenAddress,
      to,
      amount,
      ...options,
    });
    return response.data;
  },

  sendBitcoinTransaction: async (privateKey, to, amount, feeRate, walletId) => {
    const response = await api.post('/api/v1/transactions/bitcoin/send', {
      privateKey,
      to,
      amount,
      feeRate,
      walletId,
    });
    return response.data;
  },

  createEthereumTransaction: async (privateKey, to, value, options = {}) => {
    const response = await api.post('/api/v1/transactions/ethereum/create', {
      privateKey,
      to,
      value,
      ...options,
    });
    return response.data;
  },

  createTokenTransaction: async (privateKey, tokenAddress, to, amount, options = {}) => {
    const response = await api.post('/api/v1/transactions/token/create', {
      privateKey,
      tokenAddress,
      to,
      amount,
      ...options,
    });
    return response.data;
  },

  createBitcoinTransaction: async (privateKey, to, amount, feeRate) => {
    const response = await api.post('/api/v1/transactions/bitcoin/create', {
      privateKey,
      to,
      amount,
      feeRate,
    });
    return response.data;
  },
};

// Address Book API
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

// Database Wallet API
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

export default api;
