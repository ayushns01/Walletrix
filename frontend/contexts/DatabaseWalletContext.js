'use client'

import { createContext, useContext, useState, useEffect } from 'react';
import { walletAPI, blockchainAPI, tokenAPI, priceAPI } from '@/lib/api';
import toast from 'react-hot-toast';

const WalletContext = createContext();

export function WalletProvider({ children }) {
  // Authentication state
  const [user, setUser] = useState(null);
  const [authToken, setAuthToken] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Wallet state
  const [wallet, setWallet] = useState(null);
  const [isLocked, setIsLocked] = useState(true);
  const [balances, setBalances] = useState({});
  const [tokens, setTokens] = useState([]);
  const [prices, setPrices] = useState({});
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState('ethereum-mainnet');

  // Database-specific state
  const [userWallets, setUserWallets] = useState([]);
  const [activeWalletId, setActiveWalletId] = useState(null);

  // Load authentication state from localStorage
  useEffect(() => {
    const token = localStorage.getItem('walletrix_auth_token');
    const userData = localStorage.getItem('walletrix_user');
    
    if (token && userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setAuthToken(token);
        setUser(parsedUser);
        setIsAuthenticated(true);
        
        // Load user's wallets
        loadUserWallets(token);
      } catch (error) {
        console.error('Error loading auth state:', error);
        clearAuthState();
      }
    } else {
      // Load legacy localStorage wallet if no auth
      loadLegacyWallet();
    }
  }, []);

  // Load legacy localStorage wallet (backward compatibility)
  const loadLegacyWallet = () => {
    const savedWallet = localStorage.getItem('walletrix_wallet');
    if (savedWallet) {
      try {
        const parsed = JSON.parse(savedWallet);
        setWallet(parsed);
        setIsLocked(true);
      } catch (error) {
        console.error('Error loading legacy wallet:', error);
      }
    }
  };

  // Clear authentication state
  const clearAuthState = () => {
    localStorage.removeItem('walletrix_auth_token');
    localStorage.removeItem('walletrix_user');
    setAuthToken(null);
    setUser(null);
    setIsAuthenticated(false);
    setUserWallets([]);
    setActiveWalletId(null);
  };

  // API call helper with authentication
  const authenticatedFetch = async (url, options = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`;
    }

    const response = await fetch(url, {
      ...options,
      headers
    });

    if (response.status === 401) {
      // Token expired or invalid
      clearAuthState();
      toast.error('Session expired. Please login again.');
      throw new Error('Authentication failed');
    }

    return response;
  };

  // Load user's wallets from database
  const loadUserWallets = async (token = authToken) => {
    if (!token) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/wallets`,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      const data = await response.json();
      
      if (data.success) {
        setUserWallets(data.wallets);
        
        // Set first wallet as active if none selected
        if (data.wallets.length > 0 && !activeWalletId) {
          setActiveWalletId(data.wallets[0].id);
          loadWalletData(data.wallets[0]);
        }
      }
    } catch (error) {
      console.error('Error loading user wallets:', error);
    }
  };

  // Load specific wallet data
  const loadWalletData = async (walletData) => {
    try {
      setWallet({
        ethereum: { address: walletData.addresses.ethereum },
        bitcoin: { address: walletData.addresses.bitcoin },
        encrypted: walletData.encryptedData
      });
      setIsLocked(false);
      
      // Load wallet transactions and balances
      await Promise.all([
        fetchBalances(),
        fetchTokenBalances(),
        fetchPrices(),
        fetchDatabaseTransactions(walletData.id)
      ]);
    } catch (error) {
      console.error('Error loading wallet data:', error);
    }
  };

  // Fetch transactions from database
  const fetchDatabaseTransactions = async (walletId) => {
    if (!authToken || !walletId) return;

    try {
      const { chain, network } = getNetworkInfo();
      const response = await authenticatedFetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/wallets/${walletId}/transactions?network=${network}&limit=50`
      );
      
      const data = await response.json();
      
      if (data.success) {
        setTransactions(data.transactions);
      } else {
        // Fallback to blockchain API if database is empty
        await fetchBlockchainTransactions();
      }
    } catch (error) {
      console.error('Error fetching database transactions:', error);
      // Fallback to blockchain API
      await fetchBlockchainTransactions();
    }
  };

  // Fetch transactions from blockchain (fallback)
  const fetchBlockchainTransactions = async () => {
    if (!wallet) return;
    
    try {
      const { chain, network } = getNetworkInfo();
      
      if (chain === 'ethereum' || ['polygon', 'arbitrum', 'optimism', 'bsc', 'avalanche', 'base'].includes(chain)) {
        let networkParam;
        
        if (chain === 'ethereum') {
          networkParam = network;
        } else {
          networkParam = selectedNetwork;
        }
        
        const address = wallet.ethereum?.address;
        
        if (address) {
          const ethTxs = await blockchainAPI.getEthereumTransactions(address, 1, 10, networkParam);
          
          if (ethTxs.success && ethTxs.transactions) {
            const allTxs = ethTxs.transactions.map(tx => ({ 
              ...tx, 
              network: selectedNetwork 
            }));
            setTransactions(allTxs);
            
            // Cache transactions in database if authenticated
            if (authToken && activeWalletId) {
              await cacheTransactionsInDatabase(allTxs);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error fetching blockchain transactions:', error);
      setTransactions([]);
    }
  };

  // Cache transactions in database
  const cacheTransactionsInDatabase = async (transactions) => {
    if (!authToken || !activeWalletId) return;

    try {
      const formattedTxs = transactions.map(tx => ({
        txHash: tx.hash,
        network: tx.network,
        fromAddress: tx.from,
        toAddress: tx.to,
        amount: tx.value,
        tokenSymbol: 'ETH',
        status: tx.status,
        blockNumber: tx.blockNumber,
        gasUsed: tx.gasUsed,
        gasPrice: tx.gasPrice,
        timestamp: tx.timestamp,
        isIncoming: tx.to?.toLowerCase() === wallet.ethereum?.address?.toLowerCase(),
        category: 'transfer'
      }));

      await authenticatedFetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/wallets/${activeWalletId}/cache-transactions`,
        {
          method: 'POST',
          body: JSON.stringify({ transactions: formattedTxs })
        }
      );
    } catch (error) {
      console.error('Error caching transactions:', error);
    }
  };

  // Authentication functions
  const login = (userData, token) => {
    console.log('Login called with token:', token ? 'present' : 'missing');
    setUser(userData);
    setAuthToken(token);
    setIsAuthenticated(true);
    
    // Store in localStorage as well
    localStorage.setItem('walletrix_auth_token', token);
    localStorage.setItem('walletrix_user', JSON.stringify(userData));
    
    loadUserWallets(token);
  };

  const logout = () => {
    clearAuthState();
    setWallet(null);
    setIsLocked(true);
    setBalances({});
    setTokens([]);
    setTransactions([]);
    toast.success('Logged out successfully');
  };

  // Create new wallet in database
  const createDatabaseWallet = async (name, encryptedData, addresses, description) => {
    console.log('createDatabaseWallet called, authToken:', authToken ? 'present' : 'missing');
    console.log('isAuthenticated:', isAuthenticated);
    
    if (!authToken) {
      const storedToken = localStorage.getItem('walletrix_auth_token');
      console.log('No authToken in state, checking localStorage:', storedToken ? 'present' : 'missing');
      if (!storedToken) {
        throw new Error('Authentication required');
      }
      // Use stored token if state hasn't updated yet
      setAuthToken(storedToken);
    }

    try {
      const tokenToUse = authToken || localStorage.getItem('walletrix_auth_token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/wallets`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${tokenToUse}`
          },
          body: JSON.stringify({
            name,
            encryptedData,
            addresses,
            description
          })
        }
      );

      const data = await response.json();
      
      if (data.success) {
        await loadUserWallets();
        return data.wallet;
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error creating database wallet:', error);
      throw error;
    }
  };

  // Import localStorage wallet to database
  const importLocalStorageWallet = async () => {
    if (!authToken || !wallet) return;

    try {
      const response = await authenticatedFetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/auth/import-wallet`,
        {
          method: 'POST',
          body: JSON.stringify({
            walletData: wallet,
            walletName: 'Imported from Browser'
          })
        }
      );

      const data = await response.json();
      
      if (data.success) {
        toast.success('Wallet imported to your account!');
        await loadUserWallets();
        return data.wallet;
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error importing wallet:', error);
      toast.error('Failed to import wallet');
      throw error;
    }
  };

  // Switch active wallet
  const switchWallet = async (walletId) => {
    const walletData = userWallets.find(w => w.id === walletId);
    if (walletData) {
      setActiveWalletId(walletId);
      await loadWalletData(walletData);
    }
  };

  // Get network info from selected network
  const getNetworkInfo = () => {
    const parts = selectedNetwork.split('-');
    
    if (parts.length >= 2) {
      const chain = parts[0];
      const network = parts.slice(1).join('-');
      return { chain, network };
    }
    
    return { chain: 'ethereum', network: 'mainnet' };
  };

  // Legacy functions (for backward compatibility)
  const generateWallet = async (password) => {
    try {
      setLoading(true);
      const response = await walletAPI.generateWallet();
      
      if (response.success) {
        const encryptedResponse = await walletAPI.encryptData(
          JSON.stringify(response.data),
          password
        );
        
        const walletData = {
          ethereum: { address: response.data.ethereum.address },
          bitcoin: { address: response.data.bitcoin.address },
          encrypted: encryptedResponse.encrypted,
        };
        
        if (isAuthenticated) {
          // Save to database
          await createDatabaseWallet(
            'My Wallet',
            encryptedResponse.encrypted,
            {
              ethereum: response.data.ethereum.address,
              bitcoin: response.data.bitcoin.address
            },
            'Generated wallet'
          );
        } else {
          // Save to localStorage (legacy)
          localStorage.setItem('walletrix_wallet', JSON.stringify(walletData));
          setWallet(walletData);
          setIsLocked(false);
        }
        
        toast.success('Wallet created successfully!');
        return response.data;
      }
    } catch (error) {
      console.error('Error generating wallet:', error);
      toast.error('Failed to generate wallet');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const importWallet = async (mnemonic, password) => {
    try {
      setLoading(true);
      const response = await walletAPI.importFromMnemonic(mnemonic);
      
      if (response.success) {
        const encryptedResponse = await walletAPI.encryptData(
          JSON.stringify(response.data),
          password
        );
        
        const walletData = {
          ethereum: { address: response.data.ethereum.address },
          bitcoin: { address: response.data.bitcoin.address },
          encrypted: encryptedResponse.encrypted,
        };
        
        if (isAuthenticated) {
          // Save to database
          await createDatabaseWallet(
            'Imported Wallet',
            encryptedResponse.encrypted,
            {
              ethereum: response.data.ethereum.address,
              bitcoin: response.data.bitcoin.address
            },
            'Imported from recovery phrase'
          );
        } else {
          // Save to localStorage (legacy)
          localStorage.setItem('walletrix_wallet', JSON.stringify(walletData));
          setWallet(walletData);
          setIsLocked(false);
        }
        
        toast.success('Wallet imported successfully!');
        return response.data;
      }
    } catch (error) {
      console.error('Error importing wallet:', error);
      toast.error('Failed to import wallet');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const unlockWallet = async (password) => {
    try {
      setLoading(true);
      
      if (!wallet || !wallet.encrypted) {
        throw new Error('No wallet found');
      }
      
      const decryptedResponse = await walletAPI.decryptData(wallet.encrypted, password);
      
      if (decryptedResponse.success) {
        setIsLocked(false);
        toast.success('Wallet unlocked!');
        return true;
      }
    } catch (error) {
      console.error('Error unlocking wallet:', error);
      toast.error('Invalid password');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const deleteWallet = () => {
    // Clear localStorage wallet
    localStorage.removeItem('walletrix_wallet');
    
    // Reset wallet state
    setWallet(null);
    setIsLocked(true);
    setBalances({});
    setTokens([]);
    setTransactions([]);
    
    toast.success('Wallet deleted successfully');
  };

  // Fetch balances (unchanged)
  const fetchBalances = async () => {
    if (!wallet) return;
    
    try {
      const { chain, network } = getNetworkInfo();
      
      const newBalances = {
        ethereum: '0',
        bitcoin: '0',
        solana: '0',
        polygon: '0',
        arbitrum: '0',
        optimism: '0',
        bsc: '0',
        avalanche: '0',
        base: '0',
      };
      
      if (['ethereum', 'polygon', 'arbitrum', 'optimism', 'bsc', 'avalanche', 'base'].includes(chain)) {
        const address = wallet.ethereum?.address;
        if (address) {
          const ethBalance = await blockchainAPI.getEthereumBalance(address, selectedNetwork);
          
          if (ethBalance.success) {
            const balance = ethBalance.balance?.eth || ethBalance.data?.balance || '0';
            newBalances[chain] = balance;
          }
        }
      } else if (chain === 'bitcoin') {
        const btcBalance = await blockchainAPI.getBitcoinBalance(wallet.bitcoin?.address, network);
        
        if (btcBalance.success) {
          const balance = btcBalance.balance?.btc || btcBalance.data?.balance || '0';
          newBalances.bitcoin = balance;
        }
      }
      
      setBalances(newBalances);
    } catch (error) {
      console.error('Error fetching balances:', error);
      setBalances({
        ethereum: '0',
        bitcoin: '0',
        solana: '0',
        polygon: '0',
        arbitrum: '0',
        optimism: '0',
        bsc: '0',
        avalanche: '0',
        base: '0',
      });
    }
  };

  // Fetch token balances (unchanged)
  const fetchTokenBalances = async () => {
    if (!wallet) return;
    
    try {
      const { chain, network } = getNetworkInfo();
      
      if (chain === 'ethereum') {
        const response = await tokenAPI.getPopularTokenBalances(wallet.ethereum.address, network);
        
        if (response && response.success && response.tokens) {
          setTokens(response.tokens);
        } else {
          setTokens([]);
        }
      } else {
        setTokens([]);
      }
    } catch (error) {
      console.error('Error fetching token balances:', error);
      setTokens([]);
    }
  };

  // Fetch prices (unchanged)
  const fetchPrices = async () => {
    try {
      const response = await priceAPI.getPopularPrices('usd');
      
      if (response.success && response.prices) {
        const priceMap = {};
        response.prices.forEach(coin => {
          if (coin.coin === 'ethereum') {
            priceMap.ethereum = {
              current_price: coin.price,
              market_cap: coin.marketCap,
              price_change_percentage_24h: coin.change24h
            };
          }
          if (coin.coin === 'bitcoin') {
            priceMap.bitcoin = {
              current_price: coin.price,
              market_cap: coin.marketCap,
              price_change_percentage_24h: coin.change24h
            };
          }
        });
        setPrices(priceMap);
      } else {
        setPrices({});
      }
    } catch (error) {
      console.error('Error fetching prices:', error);
      setPrices({});
    }
  };

  // Refresh all data
  const refreshData = async () => {
    if (!isLocked && wallet) {
      if (isAuthenticated && activeWalletId) {
        await fetchDatabaseTransactions(activeWalletId);
      } else {
        await fetchBlockchainTransactions();
      }
      
      await Promise.all([
        fetchBalances(),
        fetchTokenBalances(),
        fetchPrices(),
      ]);
      
      toast.success('Data refreshed');
    }
  };

  const value = {
    // Authentication
    user,
    authToken,
    isAuthenticated,
    login,
    logout,
    
    // Database wallets
    userWallets,
    activeWalletId,
    switchWallet,
    createDatabaseWallet,
    importLocalStorageWallet,
    
    // Legacy wallet state
    wallet,
    isLocked,
    balances,
    tokens,
    prices,
    transactions,
    loading,
    selectedNetwork,
    setSelectedNetwork,
    
    // Wallet operations
    generateWallet,
    importWallet,
    unlockWallet,
    deleteWallet,
    refreshData,
    fetchBalances,
    fetchTokenBalances,
    fetchPrices,
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within WalletProvider');
  }
  return context;
}