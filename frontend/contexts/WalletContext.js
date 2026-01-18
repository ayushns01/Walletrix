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

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedWallet = window.localStorage.getItem('walletrix_wallet');
      if (savedWallet) {
        try {
          const parsed = JSON.parse(savedWallet);
          setWallet(parsed);
          setIsLocked(true);
        } catch (error) {
          console.error('Error loading wallet:', error);
        }
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedNetwork = window.localStorage.getItem('walletrix_network');
      if (savedNetwork) {
        setSelectedNetwork(savedNetwork);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && selectedNetwork) {
      window.localStorage.setItem('walletrix_network', selectedNetwork);
    }
  }, [selectedNetwork]);

  useEffect(() => {
    if (wallet && !isLocked) {
      fetchBalances();
      fetchTokenBalances();
      fetchPrices();
      fetchTransactions();
    }
  }, [wallet, isLocked, selectedNetwork]);

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

        if (typeof window !== 'undefined') {
          window.localStorage.setItem('walletrix_wallet', JSON.stringify(walletData));
        }
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

        if (typeof window !== 'undefined') {
          window.localStorage.setItem('walletrix_wallet', JSON.stringify(walletData));
        }
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

  const lockWallet = () => {
    setIsLocked(true);
    toast.success('Wallet locked');
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

          newBalances.solana = '0';
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

  const fetchTransactions = async () => {
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
          } else {
            setTransactions([]);
          }
        }
      } else if (chain === 'bitcoin') {
        const btcTxs = await blockchainAPI.getBitcoinTransactions(wallet.bitcoin.address, network);

        if (btcTxs.success && btcTxs.transactions) {
          const allTxs = btcTxs.transactions.map(tx => ({
            ...tx,
            network: selectedNetwork
          }));
          setTransactions(allTxs);
        } else {
          setTransactions([]);
        }
      } else {
        setTransactions([]);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);

      setTransactions([]);
    }
  };

  const deleteWallet = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('walletrix_wallet');
    }
    setWallet(null);
    setIsLocked(true);
    setBalances({});
    setTokens([]);
    setTransactions([]);
    toast.success('Wallet deleted');
  };

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
