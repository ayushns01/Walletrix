'use client'

import { createContext, useContext, useState, useEffect } from 'react';
import { useUser, useAuth } from '@clerk/nextjs';
import { walletAPI, blockchainAPI, tokenAPI, priceAPI } from '@/lib/api';
import toast from 'react-hot-toast';

const WalletContext = createContext();

export function WalletProvider({ children }) {
  // Clerk authentication
  const { user: clerkUser, isLoaded: isUserLoaded, isSignedIn } = useUser();
  const { getToken } = useAuth();

  // Authentication state (legacy, keeping for backward compatibility)
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

  // Load user wallets when Clerk user signs in
  useEffect(() => {
    const loadClerkUserWallets = async () => {
      if (isSignedIn && clerkUser && isUserLoaded) {
        try {
          const token = await getToken();
          if (token) {
            setAuthToken(token);
            setIsAuthenticated(true);
            setUser({
              id: clerkUser.id,
              email: clerkUser.primaryEmailAddress?.emailAddress,
              name: clerkUser.fullName
            });
            
            // Load user's wallets from database
            await loadUserWallets(token);
          }
        } catch (error) {
          console.error('Error loading Clerk user wallets:', error);
        }
      } else if (!isSignedIn && isUserLoaded) {
        // User signed out, clear state
        clearAuthState();
        // Load legacy localStorage wallet if exists
        loadLegacyWallet();
      }
    };

    loadClerkUserWallets();
  }, [isSignedIn, clerkUser, isUserLoaded]);

  // Load wallet data when activeWalletId changes
  useEffect(() => {
    const loadActiveWallet = async () => {
      if (activeWalletId && userWallets.length > 0) {
        const selectedWallet = userWallets.find(w => w.id === activeWalletId);
        if (selectedWallet) {
          await loadWalletData(selectedWallet);
        }
      }
    };

    loadActiveWallet();
  }, [activeWalletId, userWallets]);

  // Refetch transactions when network changes
  useEffect(() => {
    const refetchTransactions = async () => {
      if (wallet && !isLocked && activeWalletId) {
        console.log('Network changed to:', selectedNetwork);
        await fetchBlockchainTransactions();
      }
    };

    refetchTransactions();
  }, [selectedNetwork]);

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
    setWallet(null);
    setIsLocked(true);
    setBalances({});
    setTokens([]);
    setTransactions([]);
  };

  // API call helper with authentication
  const authenticatedFetch = async (url, options = {}) => {
    // Get fresh Clerk token
    const token = await getToken();
    
    if (!token) {
      toast.error('Please sign in to continue');
      throw new Error('Authentication required');
    }

    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
      'Authorization': `Bearer ${token}`
    };

    const response = await fetch(url, {
      ...options,
      headers
    });

    if (response.status === 401) {
      toast.error('Session expired. Please sign in again.');
      throw new Error('Authentication failed');
    }

    return response;
  };

  // Load user's wallets from database
  const loadUserWallets = async (token) => {
    try {
      // Get fresh token if not provided
      const authToken = token || await getToken();
      
      if (!authToken) {
        console.log('No auth token available, skipping wallet load');
        return;
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/wallets`,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          }
        }
      );
      
      const data = await response.json();
      
      if (data.success) {
        setUserWallets(data.wallets);
        
        // Don't auto-load any wallet - let user choose
        // This ensures the wallet list is always shown after login
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
    if (!walletId) return;

    try {
      const { chain, network } = getNetworkInfo();
      console.log('Fetching database transactions:', { walletId, chain, network, selectedNetwork });
      
      const response = await authenticatedFetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/wallets/${walletId}/transactions?network=${network}&limit=50`
      );
      
      const data = await response.json();
      console.log('Database transactions response:', data);
      
      if (data.success && data.transactions && data.transactions.length > 0) {
        console.log('Setting transactions from database:', data.transactions.length);
        setTransactions(data.transactions);
      } else {
        // Fallback to blockchain API if database is empty
        console.log('No database transactions, falling back to blockchain API');
        await fetchBlockchainTransactions();
      }
    } catch (error) {
      console.error('Error fetching database transactions:', error);
      // Fallback to blockchain API
      console.log('Database fetch failed, falling back to blockchain API');
      await fetchBlockchainTransactions();
    }
  };

  // Fetch transactions from blockchain (fallback)
  const fetchBlockchainTransactions = async () => {
    if (!wallet) {
      console.log('No wallet loaded, cannot fetch blockchain transactions');
      return;
    }
    
    try {
      const { chain, network } = getNetworkInfo();
      console.log('Fetching blockchain transactions:', { chain, network, selectedNetwork, wallet });
      
      if (chain === 'ethereum' || ['polygon', 'arbitrum', 'optimism', 'bsc', 'avalanche', 'base'].includes(chain)) {
        // Ethereum and EVM-compatible chains
        let networkParam;
        
        if (chain === 'ethereum') {
          networkParam = network;
        } else {
          networkParam = selectedNetwork;
        }
        
        const address = wallet.ethereum?.address;
        console.log('Fetching ETH transactions for:', { address, networkParam });
        
        if (address) {
          const ethTxs = await blockchainAPI.getEthereumTransactions(address, 1, 50, networkParam);
          console.log('Blockchain API response:', ethTxs);
          
          if (ethTxs.success && ethTxs.transactions) {
            const allTxs = ethTxs.transactions.map(tx => ({ 
              ...tx, 
              network: selectedNetwork 
            }));
            console.log('Setting transactions from blockchain:', allTxs.length);
            setTransactions(allTxs);
            
            // Cache transactions in database if authenticated
            if (isAuthenticated && activeWalletId) {
              await cacheTransactionsInDatabase(allTxs);
            }
          } else {
            console.log('No transactions in blockchain response');
            setTransactions([]);
          }
        }
      } else if (chain === 'bitcoin') {
        // Bitcoin transactions
        const address = wallet.bitcoin?.address;
        console.log('Fetching Bitcoin transactions for:', { address, network });
        
        if (address) {
          const btcTxs = await blockchainAPI.getBitcoinTransactions(address, network);
          console.log('Bitcoin API response:', btcTxs);
          
          if (btcTxs.success && btcTxs.transactions) {
            const allTxs = btcTxs.transactions.map(tx => ({ 
              ...tx, 
              network: selectedNetwork 
            }));
            console.log('Setting Bitcoin transactions from blockchain:', allTxs.length);
            setTransactions(allTxs);
            
            // Cache transactions in database if authenticated
            if (isAuthenticated && activeWalletId) {
              await cacheTransactionsInDatabase(allTxs);
            }
          } else {
            console.log('No Bitcoin transactions in response');
            setTransactions([]);
          }
        }
      } else {
        console.log('Unsupported chain:', chain);
        setTransactions([]);
      }
    } catch (error) {
      console.error('Error fetching blockchain transactions:', error);
      setTransactions([]);
    }
  };

  // Cache transactions in database
  const cacheTransactionsInDatabase = async (transactions) => {
    if (!isAuthenticated || !activeWalletId) {
      console.log('Skipping cache - not authenticated or no active wallet');
      return;
    }

    try {
      const { chain } = getNetworkInfo();
      const isBitcoin = chain === 'bitcoin';
      const currentAddress = isBitcoin ? wallet.bitcoin?.address : wallet.ethereum?.address;
      
      const formattedTxs = transactions.map(tx => ({
        txHash: tx.hash || tx.txid,
        network: tx.network,
        fromAddress: tx.from || tx.inputs?.[0]?.address,
        toAddress: tx.to || tx.outputs?.[0]?.address,
        amount: tx.value || tx.amount,
        tokenSymbol: isBitcoin ? 'BTC' : 'ETH',
        status: tx.status || (tx.confirmations > 0 ? 'confirmed' : 'pending'),
        blockNumber: tx.blockNumber || tx.block_height,
        gasUsed: tx.gasUsed,
        gasPrice: tx.gasPrice,
        timestamp: tx.timestamp || tx.time,
        isIncoming: (tx.to || tx.outputs?.[0]?.address)?.toLowerCase() === currentAddress?.toLowerCase(),
        category: 'transfer'
      }));

      console.log('Caching transactions in database:', formattedTxs.length);
      await authenticatedFetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/wallets/${activeWalletId}/cache-transactions`,
        {
          method: 'POST',
          body: JSON.stringify({ transactions: formattedTxs })
        }
      );
      console.log('Transactions cached successfully');
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
    console.log('createDatabaseWallet called');
    
    try {
      // Get fresh Clerk token
      const token = await getToken();
      
      if (!token) {
        throw new Error('Authentication required - please sign in');
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/wallets`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
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
        await loadUserWallets(token);
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
  const generateWallet = async (password, walletName = 'My Wallet') => {
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
            walletName,
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

  const importWallet = async (mnemonic, password, walletName = 'Imported Wallet') => {
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
            walletName,
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

  const deleteDatabaseWallet = async (walletId) => {
    if (!isSignedIn) {
      toast.error('Please sign in to delete wallet');
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const token = await getToken();
      if (!token) {
        toast.error('Authentication failed');
        return { success: false, error: 'No token' };
      }

      const response = await authenticatedFetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/wallets/${walletId}`, {
        method: 'DELETE',
      });

      if (response.success) {
        // Remove from local state
        setUserWallets(prev => prev.filter(w => w.id !== walletId));
        
        // If deleted wallet was active, switch to first available wallet
        if (activeWalletId === walletId) {
          const remainingWallets = userWallets.filter(w => w.id !== walletId);
          if (remainingWallets.length > 0) {
            await switchWallet(remainingWallets[0].id);
          } else {
            // No wallets left, clear active wallet
            setActiveWalletId(null);
            localStorage.removeItem('walletrix_active_wallet_id');
            setWallet(null);
            setIsLocked(true);
          }
        }
        
        toast.success('Wallet deleted successfully');
        return { success: true };
      } else {
        // If wallet not found, remove it from local state anyway (sync issue)
        if (response.error && response.error.includes('not found')) {
          setUserWallets(prev => prev.filter(w => w.id !== walletId));
          if (activeWalletId === walletId) {
            const remainingWallets = userWallets.filter(w => w.id !== walletId);
            if (remainingWallets.length > 0) {
              await switchWallet(remainingWallets[0].id);
            } else {
              setActiveWalletId(null);
              localStorage.removeItem('walletrix_active_wallet_id');
              setWallet(null);
              setIsLocked(true);
            }
          }
          toast.success('Wallet removed from list');
          return { success: true };
        }
        
        toast.error(response.error || 'Failed to delete wallet');
        return { success: false, error: response.error };
      }
    } catch (error) {
      console.error('Error deleting wallet:', error);
      toast.error('Failed to delete wallet');
      return { success: false, error: error.message };
    }
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
          const ethBalance = await blockchainAPI.getEthereumBalance(address, network);
          
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
    setActiveWalletId,
    switchWallet,
    createDatabaseWallet,
    importLocalStorageWallet,
    deleteDatabaseWallet,
    
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