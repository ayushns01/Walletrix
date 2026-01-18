'use client'

import { createContext, useContext, useState, useEffect } from 'react';
import { useUser, useAuth } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';
import { walletAPI, blockchainAPI, tokenAPI, priceAPI } from '@/lib/api';
import toast from 'react-hot-toast';

const WalletContext = createContext();

export function WalletProvider({ children }) {

  const { user: clerkUser, isLoaded: isUserLoaded, isSignedIn } = useUser();
  const { getToken } = useAuth();

  const pathname = usePathname();

  const [user, setUser] = useState(null);
  const [authToken, setAuthToken] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const [wallet, setWallet] = useState(null);
  const [isLocked, setIsLocked] = useState(true);
  const [balances, setBalances] = useState({});
  const [tokens, setTokens] = useState([]);
  const [prices, setPrices] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState('ethereum-mainnet');

  const [dataLoading, setDataLoading] = useState({
    balances: false,
    tokens: false,
    prices: false
  });
  const [lastDataFetch, setLastDataFetch] = useState(null);
  const [refreshInProgress, setRefreshInProgress] = useState(false);

  const [userWallets, setUserWallets] = useState([]);
  const [activeWalletId, setActiveWalletId] = useState(null);
  const [walletChangeTimestamp, setWalletChangeTimestamp] = useState(null);

  const [priceCache, setPriceCache] = useState({ data: {}, lastFetch: null });
  const PRICE_CACHE_DURATION = 60000;

  const [autoLockEnabled, setAutoLockEnabled] = useState(true);
  const [autoLockTimeout, setAutoLockTimeout] = useState(30000);
  const [lastActivityTime, setLastActivityTime] = useState(Date.now());
  const [autoLockTimer, setAutoLockTimer] = useState(null);

  const [showWalkthroughOnUnlock, setShowWalkthroughOnUnlock] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem('walletrix_show_walkthrough');
      return saved !== 'false';
    }
    return true;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('walletrix_show_walkthrough', showWalkthroughOnUnlock.toString());
    }
  }, [showWalkthroughOnUnlock]);

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

    const intervalId = setInterval(checkInactivity, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [autoLockEnabled, isLocked, wallet, lastActivityTime, autoLockTimeout]);

  useEffect(() => {
    if (!autoLockEnabled || isLocked) {
      return;
    }

    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];

    const handleActivity = () => {
      setLastActivityTime(Date.now());
    };

    activityEvents.forEach(event => {
      window.addEventListener(event, handleActivity);
    });

    return () => {

      activityEvents.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [autoLockEnabled, isLocked]);

  useEffect(() => {
    if (!isLocked) {
      setLastActivityTime(Date.now());
    }
  }, [isLocked]);

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

            await loadUserWallets(token);
          }
        } catch (error) {
          console.error('Error loading Clerk user wallets:', error);
        }
      } else if (!isSignedIn && isUserLoaded) {

        clearAuthState();

        loadLegacyWallet();
      }
    };

    loadClerkUserWallets();
  }, [isSignedIn, clerkUser, isUserLoaded]);

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

  useEffect(() => {
    let timeoutId;
    const refetchData = async () => {

      if (wallet && !isLocked && !refreshInProgress) {
        setRefreshInProgress(true);

        setTokens([]);
        setBalances({
          ethereum: '0', bitcoin: '0', solana: '0', polygon: '0',
          arbitrum: '0', optimism: '0', bsc: '0', avalanche: '0', base: '0'
        });

        await refreshAllData();
        setRefreshInProgress(false);
      }
    };

    if (selectedNetwork && wallet) {
      timeoutId = setTimeout(refetchData, 300);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [selectedNetwork]);

  useEffect(() => {
    const refreshOnChange = async () => {
      if (wallet && !isLocked && !refreshInProgress) {

        if (walletChangeTimestamp || pathname) {

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

  const authenticatedFetch = async (url, options = {}) => {

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

  const loadUserWallets = async (token) => {
    try {

      const authToken = token || await getToken();

      if (!authToken) {
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

      }
    } catch (error) {
      console.error('Error loading user wallets:', error);
    }
  };

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

  const loadWalletData = async (walletData) => {
    try {
      setWallet({
        ethereum: { address: walletData.addresses.ethereum },
        bitcoin: { address: walletData.addresses.bitcoin },
        solana: { address: walletData.addresses.solana },
        encrypted: walletData.encryptedData
      });
      setIsLocked(false);

      await refreshAllData();
    } catch (error) {
      console.error('Error loading wallet data:', error);
    }
  };

  const login = (userData, token) => {
    setUser(userData);
    setAuthToken(token);
    setIsAuthenticated(true);

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

  const createDatabaseWallet = async (name, encryptedData, addresses, description) => {
    try {

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

  const switchWallet = async (walletId) => {
    const walletData = userWallets.find(w => w.id === walletId);
    if (walletData) {

      setBalances({});
      setTokens([]);
      setPrices({});

      setActiveWalletId(walletId);
      setWallet({
        ethereum: { address: walletData.addresses.ethereum },
        bitcoin: { address: walletData.addresses.bitcoin },
        solana: { address: walletData.addresses.solana },
        encrypted: walletData.encryptedData
      });
      setIsLocked(false);

      setWalletChangeTimestamp(Date.now());
    }
  };

  const getNetworkInfo = () => {
    const parts = selectedNetwork.split('-');

    if (parts.length >= 2) {
      const chain = parts[0];
      const network = parts.slice(1).join('-');
      return { chain, network };
    }

    return { chain: 'ethereum', network: 'mainnet' };
  };

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

          if (createdWallet && createdWallet.id) {
            await switchWallet(createdWallet.id);
          }
        } else {

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

          if (createdWallet && createdWallet.id) {
            await switchWallet(createdWallet.id);
          }
        } else {

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
        setLastActivityTime(Date.now());
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

    localStorage.removeItem('walletrix_wallet');

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

        toast.success('Wallet deleted successfully');
        return { success: true };
      } else {

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

      if (tokens.length === 0) {
        setTokens([]);
      }
    } finally {
      setDataLoading(prev => ({ ...prev, tokens: false }));
    }
  };

  const fetchPrices = async () => {
    if (dataLoading.prices) {
      return;
    }

    const now = Date.now();
    if (priceCache.lastFetch && (now - priceCache.lastFetch < PRICE_CACHE_DURATION)) {

      if (Object.keys(priceCache.data).length > 0) {
        setPrices(priceCache.data);
        return;
      }
    }

    setDataLoading(prev => ({ ...prev, prices: true }));

    try {

      const { chain } = getNetworkInfo();
      let coinIds;

      if (chain === 'bitcoin') {

        coinIds = ['bitcoin'];
      } else if (chain === 'solana') {

        coinIds = ['solana'];
      } else if (chain === 'ethereum') {

        coinIds = ['ethereum', 'tether', 'usd-coin', 'dai', 'chainlink'];
      } else {

        coinIds = ['ethereum'];
      }

      let response;

      try {

        response = await priceAPI.getMultiplePrices(coinIds, 'usd');
      } catch (error) {
        console.warn('getMultiplePrices failed, falling back to getPopularPrices:', error.message);

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

        setPriceCache({ data: priceMap, lastFetch: Date.now() });
      } else if (Object.keys(prices).length === 0) {

        setPrices({});
      }
    } catch (error) {
      console.error('Error fetching prices:', error);

      if (Object.keys(prices).length === 0) {
        setPrices({});
      }
    } finally {
      setDataLoading(prev => ({ ...prev, prices: false }));
    }
  };

  const refreshAllData = async () => {
    if (!wallet || isLocked || refreshInProgress) {
      return;
    }

    const refreshId = Date.now();
    setLastDataFetch(refreshId);
    setRefreshInProgress(true);

    try {

      await fetchBalances();

      if (lastDataFetch !== null && refreshId < lastDataFetch) {
        return;
      }

      await fetchTokenBalances();

      if (lastDataFetch !== null && refreshId < lastDataFetch) {
        return;
      }

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

  const refreshData = async () => {
    await refreshAllData();
    if (!refreshInProgress) {
      toast.success('Data refreshed');
    }
  };

  const value = {

    user,
    authToken,
    isAuthenticated,
    login,
    logout,

    userWallets,
    activeWalletId,
    setActiveWalletId,
    switchWallet,
    createDatabaseWallet,
    importLocalStorageWallet,
    deleteDatabaseWallet,

    wallet,
    isLocked,
    balances,
    tokens,
    prices,
    loading,
    selectedNetwork: selectedNetwork || 'ethereum-mainnet',
    setSelectedNetwork,

    dataLoading,
    refreshInProgress,
    refreshAllData,

    generateWallet,
    importWallet,
    unlockWallet,
    lockWallet,
    deleteWallet,
    refreshData,
    fetchBalances,
    fetchTokenBalances,
    fetchPrices,

    autoLockEnabled,
    setAutoLockEnabled,
    autoLockTimeout,
    setAutoLockTimeout,
    lastActivityTime,

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
