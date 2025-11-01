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

  // Fetch balances when wallet is unlocked
  useEffect(() => {
    if (wallet && !isLocked) {
      fetchBalances();
      fetchTokenBalances();
      fetchPrices();
      fetchTransactions();
    }
  }, [wallet, isLocked]);

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

  // Fetch balances
  const fetchBalances = async () => {
    if (!wallet) return;
    
    try {
      const [ethBalance, btcBalance] = await Promise.all([
        blockchainAPI.getEthereumBalance(wallet.ethereum.address),
        blockchainAPI.getBitcoinBalance(wallet.bitcoin.address),
      ]);
      
      setBalances({
        ethereum: ethBalance.data?.balance || '0',
        bitcoin: btcBalance.data?.balance || '0',
      });
    } catch (error) {
      console.error('Error fetching balances:', error);
    }
  };

  // Fetch token balances
  const fetchTokenBalances = async () => {
    if (!wallet) return;
    
    try {
      const response = await tokenAPI.getPopularTokenBalances(wallet.ethereum.address);
      
      if (response.success) {
        setTokens(response.data.balances || []);
      }
    } catch (error) {
      console.error('Error fetching token balances:', error);
    }
  };

  // Fetch prices
  const fetchPrices = async () => {
    try {
      const response = await priceAPI.getPopularPrices('usd');
      
      if (response.success) {
        const priceMap = {};
        response.data.prices.forEach(coin => {
          priceMap[coin.id] = coin;
        });
        setPrices(priceMap);
      }
    } catch (error) {
      console.error('Error fetching prices:', error);
    }
  };

  // Fetch transactions
  const fetchTransactions = async () => {
    if (!wallet) return;
    
    try {
      const [ethTxs, btcTxs] = await Promise.all([
        blockchainAPI.getEthereumTransactions(wallet.ethereum.address, 1, 10),
        blockchainAPI.getBitcoinTransactions(wallet.bitcoin.address),
      ]);
      
      const allTxs = [
        ...(ethTxs.data?.transactions || []).map(tx => ({ ...tx, network: 'ethereum' })),
        ...(btcTxs.data?.transactions || []).map(tx => ({ ...tx, network: 'bitcoin' })),
      ];
      
      setTransactions(allTxs);
    } catch (error) {
      console.error('Error fetching transactions:', error);
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
