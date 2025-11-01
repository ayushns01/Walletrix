'use client'

import { createContext, useContext, useState, useEffect } from 'react';
import { walletAPI, blockchainAPI, tokenAPI, priceAPI } from '@/lib/api';
import toast from 'react-hot-toast';

const WalletContext = createContext();

export function WalletProvider({ children }) {
  const [wallet, setWallet] = useState(null);
  const [isLocked, setIsLocked] = useState(true);
  const [balances, setBalances] = useState({});
  const [tokens, setTokens] = useState([]);
  const [prices, setPrices] = useState({});
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState('ethereum-mainnet');

  // Load wallet from localStorage
  useEffect(() => {
    const savedWallet = localStorage.getItem('walletrix_wallet');
    if (savedWallet) {
      try {
        const parsed = JSON.parse(savedWallet);
        setWallet(parsed);
        setIsLocked(true); // Wallet is locked by default
      } catch (error) {
        console.error('Error loading wallet:', error);
      }
    }
  }, []);

  // Load selected network from localStorage
  useEffect(() => {
    const savedNetwork = localStorage.getItem('walletrix_network');
    if (savedNetwork) {
      setSelectedNetwork(savedNetwork);
    }
  }, []);

  // Save selected network to localStorage
  useEffect(() => {
    if (selectedNetwork) {
      localStorage.setItem('walletrix_network', selectedNetwork);
    }
  }, [selectedNetwork]);

  // Fetch balances when wallet is unlocked or network changes
  useEffect(() => {
    if (wallet && !isLocked) {
      fetchBalances();
      fetchTokenBalances();
      fetchPrices();
      fetchTransactions();
    }
  }, [wallet, isLocked, selectedNetwork]);

  // Generate new wallet
  const generateWallet = async (password) => {
    try {
      setLoading(true);
      const response = await walletAPI.generateWallet();
      
      if (response.success) {
        // Encrypt and save wallet
        const encryptedResponse = await walletAPI.encryptData(
          JSON.stringify(response.data),
          password
        );
        
        const walletData = {
          ethereum: { address: response.data.ethereum.address },
          bitcoin: { address: response.data.bitcoin.address },
          encrypted: encryptedResponse.encrypted,
        };
        
        localStorage.setItem('walletrix_wallet', JSON.stringify(walletData));
        setWallet(walletData);
        setIsLocked(false);
        
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

  // Import wallet from mnemonic
  const importWallet = async (mnemonic, password) => {
    try {
      setLoading(true);
      const response = await walletAPI.importFromMnemonic(mnemonic);
      
      if (response.success) {
        // Encrypt and save wallet
        const encryptedResponse = await walletAPI.encryptData(
          JSON.stringify(response.data),
          password
        );
        
        const walletData = {
          ethereum: { address: response.data.ethereum.address },
          bitcoin: { address: response.data.bitcoin.address },
          encrypted: encryptedResponse.encrypted,
        };
        
        localStorage.setItem('walletrix_wallet', JSON.stringify(walletData));
        setWallet(walletData);
        setIsLocked(false);
        
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

  // Unlock wallet
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

  // Lock wallet
  const lockWallet = () => {
    setIsLocked(true);
    toast.success('Wallet locked');
  };

  // Get network info from selected network
  const getNetworkInfo = () => {
    const [chain, network] = selectedNetwork.split('-');
    return { chain, network };
  };

  // Fetch balances
  const fetchBalances = async () => {
    if (!wallet) return;
    
    try {
      const { chain, network } = getNetworkInfo();
      
      console.log('Fetching balances for:', { chain, network, address: wallet[chain]?.address });
      
      if (chain === 'ethereum') {
        const ethBalance = await blockchainAPI.getEthereumBalance(wallet.ethereum.address, network);
        console.log('ETH Balance API response:', ethBalance);
        
        if (ethBalance.success) {
          const balance = ethBalance.balance?.eth || ethBalance.data?.balance || '0';
          console.log('Setting ETH balance to:', balance);
          setBalances({
            ethereum: balance,
            bitcoin: '0',
          });
        } else {
          console.log('ETH balance fetch failed, setting to 0');
          setBalances({ ethereum: '0', bitcoin: '0' });
        }
      } else if (chain === 'bitcoin') {
        const btcBalance = await blockchainAPI.getBitcoinBalance(wallet.bitcoin.address, network);
        console.log('BTC Balance API response:', btcBalance);
        
        if (btcBalance.success) {
          const balance = btcBalance.balance?.btc || btcBalance.data?.balance || '0';
          console.log('Setting BTC balance to:', balance);
          setBalances({
            ethereum: '0',
            bitcoin: balance,
          });
        } else {
          console.log('BTC balance fetch failed, setting to 0');
          setBalances({ ethereum: '0', bitcoin: '0' });
        }
      }
    } catch (error) {
      console.error('Error fetching balances:', error);
      // Set to zero on error, don't crash
      setBalances({ ethereum: '0', bitcoin: '0' });
    }
  };

  // Fetch token balances
  const fetchTokenBalances = async () => {
    if (!wallet) return;
    
    try {
      const { chain, network } = getNetworkInfo();
      
      // Only fetch tokens for Ethereum networks
      if (chain === 'ethereum') {
        const response = await tokenAPI.getPopularTokenBalances(wallet.ethereum.address, network);
        
        if (response && response.success && response.tokens) {
          setTokens(response.tokens);
        } else {
          // Silently handle errors or missing data
          setTokens([]);
        }
      } else {
        setTokens([]);
      }
    } catch (error) {
      console.error('Error fetching token balances:', error);
      // Don't show error to user, just set empty tokens
      setTokens([]);
    }
  };

  // Fetch prices
  const fetchPrices = async () => {
    try {
      const response = await priceAPI.getPopularPrices('usd');
      
      console.log('Price API response:', response);
      
      if (response.success && response.prices) {
        const priceMap = {};
        response.prices.forEach(coin => {
          // Map the coin data to the expected format
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
        console.log('Mapped prices:', priceMap);
        setPrices(priceMap);
      } else {
        console.log('Price fetch failed or no data');
        setPrices({});
      }
    } catch (error) {
      console.error('Error fetching prices:', error);
      setPrices({});
    }
  };

  // Fetch transactions
  const fetchTransactions = async () => {
    if (!wallet) return;
    
    try {
      const { chain, network } = getNetworkInfo();
      
      console.log('Fetching transactions for:', { chain, network, address: wallet[chain]?.address });
      
      if (chain === 'ethereum') {
        const ethTxs = await blockchainAPI.getEthereumTransactions(wallet.ethereum.address, 1, 10, network);
        console.log('Ethereum transactions API response:', ethTxs);
        
        if (ethTxs.success) {
          const allTxs = (ethTxs.data?.transactions || []).map(tx => ({ 
            ...tx, 
            network: `${chain}-${network}` 
          }));
          console.log('Setting transactions:', allTxs);
          setTransactions(allTxs);
        } else {
          console.log('Transaction fetch failed, setting empty array');
          setTransactions([]);
        }
      } else if (chain === 'bitcoin') {
        const btcTxs = await blockchainAPI.getBitcoinTransactions(wallet.bitcoin.address, network);
        console.log('Bitcoin transactions API response:', btcTxs);
        
        if (btcTxs.success) {
          const allTxs = (btcTxs.data?.transactions || []).map(tx => ({ 
            ...tx, 
            network: `${chain}-${network}` 
          }));
          setTransactions(allTxs);
        } else {
          setTransactions([]);
        }
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
      // Don't show error to user, just set empty transactions
      setTransactions([]);
    }
  };

  // Delete wallet
  const deleteWallet = () => {
    localStorage.removeItem('walletrix_wallet');
    setWallet(null);
    setIsLocked(true);
    setBalances({});
    setTokens([]);
    setTransactions([]);
    toast.success('Wallet deleted');
  };

  // Refresh all data
  const refreshData = async () => {
    if (!isLocked && wallet) {
      await Promise.all([
        fetchBalances(),
        fetchTokenBalances(),
        fetchPrices(),
        fetchTransactions(),
      ]);
      toast.success('Data refreshed');
    }
  };

  const value = {
    wallet,
    isLocked,
    balances,
    tokens,
    prices,
    transactions,
    loading,
    selectedNetwork,
    setSelectedNetwork,
    generateWallet,
    importWallet,
    unlockWallet,
    lockWallet,
    deleteWallet,
    refreshData,
    fetchBalances,
    fetchTokenBalances,
    fetchPrices,
    fetchTransactions,
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
