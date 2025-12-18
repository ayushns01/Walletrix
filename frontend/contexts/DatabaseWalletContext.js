'use client'

import { createContext, useContext, useState, useEffect } from 'react';
import { useUser, useAuth } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';
import { walletAPI, blockchainAPI, tokenAPI, priceAPI } from '@/lib/api';
import toast from 'react-hot-toast';

const WalletContext = createContext();

export function WalletProvider({ children }) {
  // Clerk authentication
  const { user: clerkUser, isLoaded: isUserLoaded, isSignedIn } = useUser();
  const { getToken } = useAuth();
  
  // Next.js navigation hook for page change detection
  const pathname = usePathname();

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
  const [loading, setLoading] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState('ethereum-mainnet');
  
  // Data loading states to prevent race conditions
  const [dataLoading, setDataLoading] = useState({
    balances: false,
    tokens: false,
    prices: false
  });
  const [lastDataFetch, setLastDataFetch] = useState(null);
  const [refreshInProgress, setRefreshInProgress] = useState(false);

  // Database-specific state
  const [userWallets, setUserWallets] = useState([]);
  const [activeWalletId, setActiveWalletId] = useState(null);
  const [walletChangeTimestamp, setWalletChangeTimestamp] = useState(null);
  
  // Price caching to prevent rate limit errors (429)
  const [priceCache, setPriceCache] = useState({ data: {}, lastFetch: null });
  const PRICE_CACHE_DURATION = 60000; // 60 seconds

  // Auto-lock feature
  const [autoLockEnabled, setAutoLockEnabled] = useState(true);
  const [autoLockTimeout, setAutoLockTimeout] = useState(30000); // 30 seconds default
  const [lastActivityTime, setLastActivityTime] = useState(Date.now());
  const [autoLockTimer, setAutoLockTimer] = useState(null);

  // Walkthrough feature
  const [showWalkthroughOnUnlock, setShowWalkthroughOnUnlock] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem('walletrix_show_walkthrough');
      return saved !== 'false'; // Default to true (show walkthrough)
    }
    return true;
  });

  // Save walkthrough preference
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('walletrix_show_walkthrough', showWalkthroughOnUnlock.toString());
    }
  }, [showWalkthroughOnUnlock]);

  // Auto-lock effect - locks wallet after inactivity
  useEffect(() => {
    if (!autoLockEnabled || isLocked || !wallet) {
      return;
    }

    const checkInactivity = () => {
      const now = Date.now();
      const timeSinceLastActivity = now - lastActivityTime;

      if (timeSinceLastActivity >= autoLockTimeout) {
        setIsLocked(true);
        toast.info('Wallet locked due to inactivity');
      }
    };

    // Check every second
    const intervalId = setInterval(checkInactivity, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [autoLockEnabled, isLocked, wallet, lastActivityTime, autoLockTimeout]);

  // Track user activity
  useEffect(() => {
    if (!autoLockEnabled || isLocked) {
      return;
    }

    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];

    const handleActivity = () => {
      setLastActivityTime(Date.now());
    };

    // Add event listeners for all activity types
    activityEvents.forEach(event => {
      window.addEventListener(event, handleActivity);
    });

    return () => {
      // Cleanup event listeners
      activityEvents.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [autoLockEnabled, isLocked]);

  // Reset activity timer when wallet is unlocked
  useEffect(() => {
    if (!isLocked) {
      setLastActivityTime(Date.now());
    }
  }, [isLocked]);

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

  // Automatically refetch data when network changes (with debouncing)
  useEffect(() => {
    let timeoutId;
    const refetchData = async () => {
      // Auto-refresh for both authenticated and non-authenticated users
      if (wallet && !isLocked && !refreshInProgress) {
        setRefreshInProgress(true);
        
        // Clear existing data to prevent stale display
        setTokens([]);
        setBalances({
          ethereum: '0', bitcoin: '0', solana: '0', polygon: '0',
          arbitrum: '0', optimism: '0', bsc: '0', avalanche: '0', base: '0'
        });
        
        // Fetch fresh data
        await refreshAllData();
        setRefreshInProgress(false);
      }
    };

    // Debounce network changes to prevent excessive API calls
    if (selectedNetwork && wallet) {
      timeoutId = setTimeout(refetchData, 300);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [selectedNetwork]);

  // Automatically refresh data when wallet changes or navigating to a new page
  useEffect(() => {
    const refreshOnChange = async () => {
      if (wallet && !isLocked && !refreshInProgress) {
        // Refresh on wallet change or page navigation
        if (walletChangeTimestamp || pathname) {
          // Prevent duplicate refreshes within 1 second
          const now = Date.now();
          if (lastDataFetch && (now - lastDataFetch < 1000)) {
            return;
          }
          
          setRefreshInProgress(true);
          await refreshAllData();
          setRefreshInProgress(false);
        }
      }
    };

    refreshOnChange();
  }, [pathname, walletChangeTimestamp]);

  // Load legacy localStorage wallet (backward compatibility)
  const loadLegacyWallet = () => {
    if (typeof window !== 'undefined') {
      const savedWallet = window.localStorage.getItem('walletrix_wallet');
      if (savedWallet) {
        try {
          const parsed = JSON.parse(savedWallet);
          setWallet(parsed);
          setIsLocked(true);
        } catch (error) {
          console.error('Error loading legacy wallet:', error);
        }
      }
    }
  };

  // Clear authentication state
  const clearAuthState = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('walletrix_auth_token');
      window.localStorage.removeItem('walletrix_user');
    }
    setAuthToken(null);
    setUser(null);
    setIsAuthenticated(false);
    setUserWallets([]);
    setActiveWalletId(null);
    setWallet(null);
    setIsLocked(true);
    setBalances({});
    setTokens([]);
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

  // Fresh balance validation for transactions
  const getFreshBalance = async (network = null) => {
    if (!wallet) {
      throw new Error('No wallet connected');
    }
    
    const targetNetwork = network || selectedNetwork;
    const { chain, network: networkName } = getNetworkInfo();
    
    try {
      if (['ethereum', 'polygon', 'arbitrum', 'optimism', 'bsc', 'avalanche', 'base'].includes(chain)) {
        const address = wallet.ethereum?.address;
        if (!address) {
          throw new Error('No Ethereum address found');
        }
        
        const balanceResponse = await blockchainAPI.getEthereumBalance(address, targetNetwork);
        if (balanceResponse.success) {
          const balance = balanceResponse.balance?.eth || balanceResponse.data?.balance || '0';
          return parseFloat(balance);
        }
      } else if (chain === 'bitcoin') {
        const address = wallet.bitcoin?.address;
        if (!address) {
          throw new Error('No Bitcoin address found');
        }
        
        const balanceResponse = await blockchainAPI.getBitcoinBalance(address, networkName);
        if (balanceResponse.success) {
          const balance = balanceResponse.balance?.btc || balanceResponse.data?.balance || '0';
          return parseFloat(balance);
        }
      }
      
      throw new Error('Unable to fetch balance for this network');
    } catch (error) {
      console.error('Error getting fresh balance:', error);
      throw error;
    }
  };

  // Load specific wallet data
  const loadWalletData = async (walletData) => {
    try {
      setWallet({
        ethereum: { address: walletData.addresses.ethereum },
        bitcoin: { address: walletData.addresses.bitcoin },
        solana: { address: walletData.addresses.solana },
        encrypted: walletData.encryptedData
      });
      setIsLocked(false);
      
      // Load wallet data using the centralized refresh function
      await refreshAllData();
    } catch (error) {
      console.error('Error loading wallet data:', error);
    }
  };







  // Authentication functions
  const login = (userData, token) => {
    console.log('Login called with token:', token ? 'present' : 'missing');
    setUser(userData);
    setAuthToken(token);
    setIsAuthenticated(true);
    
    // Store in localStorage as well
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('walletrix_auth_token', token);
      window.localStorage.setItem('walletrix_user', JSON.stringify(userData));
    }
    
    loadUserWallets(token);
  };

  const logout = () => {
    clearAuthState();
    setWallet(null);
    setIsLocked(true);
    setBalances({});
    setTokens([]);
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
        // Return the wallet with its ID so we can switch to it
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
      // Clear existing data immediately for clean state
      setBalances({});
      setTokens([]);
      setPrices({});
      
      // Update wallet
      setActiveWalletId(walletId);
      setWallet({
        ethereum: { address: walletData.addresses.ethereum },
        bitcoin: { address: walletData.addresses.bitcoin },
        solana: { address: walletData.addresses.solana },
        encrypted: walletData.encryptedData
      });
      setIsLocked(false);
      
      // Trigger refresh via timestamp change
      setWalletChangeTimestamp(Date.now());
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
          solana: { address: response.data.solana.address },
          encrypted: encryptedResponse.encrypted,
        };
        
        if (isAuthenticated) {
          // Save to database
          const createdWallet = await createDatabaseWallet(
            walletName,
            encryptedResponse.encrypted,
            {
              ethereum: response.data.ethereum.address,
              bitcoin: response.data.bitcoin.address,
              solana: response.data.solana.address
            },
            'Generated wallet'
          );
          
          // Automatically switch to the newly created wallet
          if (createdWallet && createdWallet.id) {
            await switchWallet(createdWallet.id);
          }
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
          solana: { address: response.data.solana.address },
          encrypted: encryptedResponse.encrypted,
        };
        
        if (isAuthenticated) {
          // Save to database
          const createdWallet = await createDatabaseWallet(
            walletName,
            encryptedResponse.encrypted,
            {
              ethereum: response.data.ethereum.address,
              bitcoin: response.data.bitcoin.address,
              solana: response.data.solana.address
            },
            'Imported from recovery phrase'
          );
          
          // Automatically switch to the newly imported wallet
          if (createdWallet && createdWallet.id) {
            await switchWallet(createdWallet.id);
          }
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
      
      if (!password || password.trim() === '') {
        toast.error('⚠️ Please enter your password');
        return false;
      }
      
      if (!wallet || !wallet.encrypted) {
        toast.error('❌ No wallet found. Please create or import a wallet first.');
        throw new Error('No wallet found');
      }
      
      const decryptedResponse = await walletAPI.decryptData(wallet.encrypted, password);
      
      if (decryptedResponse.success) {
        setIsLocked(false);
        setLastActivityTime(Date.now()); // Reset activity timer on unlock
        toast.success('✅ Wallet unlocked successfully! Welcome back.');
        return true;
      } else {
        toast.error('❌ Incorrect password. Please try again.');
        return false;
      }
    } catch (error) {
      console.error('Error unlocking wallet:', error);
      if (error.message.includes('decrypt')) {
        toast.error('❌ Incorrect password or corrupted wallet data');
      } else if (error.message.includes('No wallet')) {
        // Already handled above
      } else {
        toast.error('❌ Failed to unlock wallet: ' + error.message);
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  const lockWallet = () => {
    setIsLocked(true);
    toast.success('🔒 Wallet locked securely');
  };

  const deleteWallet = () => {
    // Clear localStorage wallet
    localStorage.removeItem('walletrix_wallet');
    
    // Reset wallet state
    setWallet(null);
    setIsLocked(true);
    setBalances({});
    setTokens([]);
    
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

      const data = await response.json();

      if (data.success) {
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
        if (data.error && data.error.includes('not found')) {
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
        
        toast.error(data.error || 'Failed to delete wallet');
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error('Error deleting wallet:', error);
      toast.error('Failed to delete wallet');
      return { success: false, error: error.message };
    }
  };

  // Fetch balances with improved error handling and loading states
  const fetchBalances = async () => {
    if (!wallet || dataLoading.balances) {
      return;
    }
    
    setDataLoading(prev => ({ ...prev, balances: true }));
    
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
      } else if (chain === 'solana') {
        const address = wallet.solana?.address;
        if (address) {
          const solBalance = await blockchainAPI.getSolanaBalance(address, network);
          
          if (solBalance.success) {
            const balance = solBalance.balance || '0';
            newBalances.solana = balance;
          }
        }
      }
      
      setBalances(newBalances);
    } catch (error) {
      console.error('Error fetching balances:', error);
      // Don't reset balances to zero on error - keep existing values
      // Only reset if this is the first load
      if (Object.values(balances).every(b => b === '0')) {
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
    } finally {
      setDataLoading(prev => ({ ...prev, balances: false }));
    }
  };

  // Fetch token balances with improved loading states
  const fetchTokenBalances = async () => {
    if (!wallet || dataLoading.tokens) {
      return;
    }
    
    setDataLoading(prev => ({ ...prev, tokens: true }));
    
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
      // Keep existing tokens on error instead of clearing them
      if (tokens.length === 0) {
        setTokens([]);
      }
    } finally {
      setDataLoading(prev => ({ ...prev, tokens: false }));
    }
  };

  // Fetch prices with improved loading states - only for selected network
  const fetchPrices = async () => {
    if (dataLoading.prices) {
      return;
    }
    
    // Check cache first - only fetch if cache is stale (older than 60 seconds)
    const now = Date.now();
    if (priceCache.lastFetch && (now - priceCache.lastFetch < PRICE_CACHE_DURATION)) {
      // Use cached prices if available and fresh
      if (Object.keys(priceCache.data).length > 0) {
        setPrices(priceCache.data);
        return;
      }
    }
    
    setDataLoading(prev => ({ ...prev, prices: true }));
    
    try {
      // Determine which coins to fetch based on selected network
      const { chain } = getNetworkInfo();
      let coinIds;
      
      if (chain === 'bitcoin') {
        // Bitcoin network: only need BTC price
        coinIds = ['bitcoin'];
      } else if (chain === 'solana') {
        // Solana network: only need SOL price
        coinIds = ['solana'];
      } else if (chain === 'ethereum') {
        // Ethereum network: need ETH + popular token prices
        coinIds = ['ethereum', 'tether', 'usd-coin', 'dai', 'chainlink'];
      } else {
        // Other EVM chains (Polygon, Arbitrum, etc): only need ETH price
        coinIds = ['ethereum'];
      }
      
      let response;
      
      try {
        // Try network-specific price fetching first
        response = await priceAPI.getMultiplePrices(coinIds, 'usd');
      } catch (error) {
        console.warn('getMultiplePrices failed, falling back to getPopularPrices:', error.message);
        // Fallback to fetching all popular prices if specific request fails
        response = await priceAPI.getPopularPrices('usd');
      }
      
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
        // Cache the prices with current timestamp
        setPriceCache({ data: priceMap, lastFetch: Date.now() });
      } else if (Object.keys(prices).length === 0) {
        // Only clear prices if we don't have any existing data
        setPrices({});
      }
    } catch (error) {
      console.error('Error fetching prices:', error);
      // Keep existing prices on error
      if (Object.keys(prices).length === 0) {
        setPrices({});
      }
    } finally {
      setDataLoading(prev => ({ ...prev, prices: false }));
    }
  };

  // Centralized data refresh function with race condition prevention
  const refreshAllData = async () => {
    if (!wallet || isLocked || refreshInProgress) {
      return;
    }

    const refreshId = Date.now();
    setLastDataFetch(refreshId);
    setRefreshInProgress(true);

    try {
      // Fetch data sequentially to avoid race conditions
      await fetchBalances();
      
      // Check if this is still the latest refresh request
      if (lastDataFetch !== null && refreshId < lastDataFetch) {
        return;
      }
      
      await fetchTokenBalances();
      
      if (lastDataFetch !== null && refreshId < lastDataFetch) {
        return;
      }
      
      // Prices are fetched with built-in caching (60s), so this is efficient
      // Cache will prevent unnecessary API calls when switching wallets/networks
      await fetchPrices();
      
      if (lastDataFetch !== null && refreshId < lastDataFetch) {
        return;
      }
    } catch (error) {
      console.error('Error during data refresh:', error);
    } finally {
      setRefreshInProgress(false);
    }
  };
  
  // Public refresh function with success message
  const refreshData = async () => {
    await refreshAllData();
    if (!refreshInProgress) {
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
    loading,
    selectedNetwork: selectedNetwork || 'ethereum-mainnet',
    setSelectedNetwork,
    
    // New data loading states
    dataLoading,
    refreshInProgress,
    refreshAllData,
    
    // Fresh balance validation\n    getFreshBalance,\n    \n    // Wallet operations
    generateWallet,
    importWallet,
    unlockWallet,
    lockWallet,
    deleteWallet,
    refreshData,
    fetchBalances,
    fetchTokenBalances,
    fetchPrices,

    // Auto-lock settings
    autoLockEnabled,
    setAutoLockEnabled,
    autoLockTimeout,
    setAutoLockTimeout,
    lastActivityTime,

    // Walkthrough settings
    showWalkthroughOnUnlock,
    setShowWalkthroughOnUnlock,
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