'use client'

import { useWallet } from '@/contexts/WalletContext';
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

export default function Dashboard() {
  const { wallet, balances, tokens, prices, transactions, refreshData, loading, selectedNetwork } = useWallet();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshData();
    setTimeout(() => setRefreshing(false), 1000);
  };

  // Calculate total portfolio value
  const calculateTotalValue = () => {
    let total = 0;

    console.log('Portfolio Debug:', {
      balances,
      prices,
      tokens,
      selectedNetwork
    });

    // Add Ethereum value
    if (balances.ethereum && prices.ethereum) {
      const ethValue = parseFloat(balances.ethereum) * prices.ethereum.current_price;
      console.log('ETH contribution:', {
        balance: balances.ethereum,
        price: prices.ethereum.current_price,
        value: ethValue
      });
      total += ethValue;
    }

    // Add Bitcoin value
    if (balances.bitcoin && prices.bitcoin) {
      const btcValue = parseFloat(balances.bitcoin) * prices.bitcoin.current_price;
      console.log('BTC contribution:', {
        balance: balances.bitcoin,
        price: prices.bitcoin.current_price,
        value: btcValue
      });
      total += btcValue;
    }

    // Add token values
    tokens.forEach(token => {
      if (token.balance && token.priceUsd) {
        const tokenValue = parseFloat(token.balance) * parseFloat(token.priceUsd);
        console.log('Token contribution:', {
          symbol: token.symbol,
          balance: token.balance,
          price: token.priceUsd,
          value: tokenValue
        });
        total += tokenValue;
      }
    });

    console.log('Total portfolio value:', total);
    return total;
  };

  const totalValue = calculateTotalValue();

  // Get network info
  const [chain] = selectedNetwork.split('-');
  const isEthereum = chain === 'ethereum';
  const isBitcoin = chain === 'bitcoin';

  // Get all assets including native coins and tokens based on selected network
  const allAssets = [
    ...(isBitcoin ? [{
      name: 'Bitcoin',
      symbol: 'BTC',
      balance: balances.bitcoin || '0',
      priceData: prices.bitcoin,
      icon: '₿',
    }] : []),
    ...(isEthereum ? [{
      name: 'Ethereum',
      symbol: 'ETH',
      balance: balances.ethereum || '0',
      priceData: prices.ethereum,
      icon: 'Ξ',
    }] : []),
    ...(isEthereum ? tokens.filter(t => parseFloat(t.balance) > 0).map(token => ({
      name: token.name,
      symbol: token.symbol,
      balance: token.balance,
      priceData: { current_price: parseFloat(token.priceUsd || 0) },
      icon: token.symbol[0],
    })) : []),
  ];

  console.log('Dashboard debug:', {
    selectedNetwork,
    isEthereum,
    isBitcoin,
    balances,
    prices,
    tokens: tokens.length,
    allAssets: allAssets.length,
    totalValue
  });

  return (
    <div className="space-y-6">
      {/* Total Balance Card */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-6 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full -ml-24 -mb-24"></div>
        
        <div className="relative">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1">
              <p className="text-sm opacity-90">Total Portfolio Value</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
          
          <h2 className="text-4xl font-bold mb-4">
            ${totalValue.toFixed(2)}
          </h2>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 px-3 py-1 bg-white/20 rounded-full">
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm font-medium">0.00%</span>
            </div>
            <span className="text-sm opacity-80">24h</span>
          </div>
        </div>
      </div>

      {/* Addresses Card */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/20">
        <h3 className="text-lg font-bold text-white mb-4">Your Address</h3>
        
        <div className="space-y-3">
          {isEthereum && (
            <div className="bg-gray-700/50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Ethereum Address</span>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(wallet?.ethereum?.address);
                    toast.success('Address copied!');
                  }}
                  className="text-xs text-purple-400 hover:text-purple-300"
                >
                  Copy
                </button>
              </div>
              <p className="text-white font-mono text-sm break-all">
                {wallet?.ethereum?.address}
              </p>
            </div>
          )}

          {isBitcoin && (
            <div className="bg-gray-700/50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Bitcoin Address</span>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(wallet?.bitcoin?.address);
                    toast.success('Address copied!');
                  }}
                  className="text-xs text-purple-400 hover:text-purple-300"
                >
                  Copy
                </button>
              </div>
              <p className="text-white font-mono text-sm break-all">
                {wallet?.bitcoin?.address}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Assets List */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/20">
        <h3 className="text-lg font-bold text-white mb-4">Your Assets</h3>
        
        <div className="space-y-3">
          {allAssets.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              <p>No assets found</p>
            </div>
          )}

          {allAssets.map((asset, index) => {
            const value = parseFloat(asset.balance) * (asset.priceData?.current_price || 0);
            const hasBalance = parseFloat(asset.balance) > 0;

            return (
              <div
                key={index}
                className={`flex items-center justify-between p-4 rounded-lg transition-colors ${
                  hasBalance 
                    ? 'bg-gray-700/50 hover:bg-gray-700 cursor-pointer' 
                    : 'bg-gray-700/30 opacity-60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                    {asset.icon}
                  </div>
                  <div>
                    <p className="text-white font-semibold">{asset.name}</p>
                    <p className="text-gray-400 text-sm">{asset.symbol}</p>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="text-white font-semibold">
                    {asset.balance} {asset.symbol}
                  </p>
                  <p className="text-gray-400 text-sm">
                    ${value.toFixed(2)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/20">
        <h3 className="text-lg font-bold text-white mb-4">Recent Transactions</h3>
        
        {console.log('Dashboard transactions debug:', {
          transactions,
          transactionsLength: transactions.length,
          transactionsType: typeof transactions,
          isArray: Array.isArray(transactions),
          selectedNetwork,
          walletAddress: wallet?.ethereum?.address
        })}
        
        {transactions.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <p>No transactions yet</p>
            <p className="text-sm mt-2">Your transaction history will appear here</p>
            {console.log('Showing no transactions message')}
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.slice(0, 5).map((tx, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg hover:bg-gray-700 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-600/20 rounded-full flex items-center justify-center">
                    {tx.from?.toLowerCase() === wallet.ethereum.address.toLowerCase() ? (
                      <ArrowUpRight className="w-5 h-5 text-red-400" />
                    ) : (
                      <ArrowDownRight className="w-5 h-5 text-green-400" />
                    )}
                  </div>
                  <div>
                    <p className="text-white font-medium">
                      {tx.from?.toLowerCase() === wallet.ethereum.address.toLowerCase() ? 'Sent' : 'Received'}
                    </p>
                    <p className="text-gray-400 text-sm">
                      {tx.network === 'ethereum' ? 'Ethereum' : 'Bitcoin'}
                    </p>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="text-white font-semibold">
                    {tx.value || '0'}
                  </p>
                  <p className="text-gray-400 text-sm">
                    {tx.timestamp ? (
                      new Date(tx.timestamp.includes('T') ? tx.timestamp : parseInt(tx.timestamp) * 1000).toLocaleDateString()
                    ) : 'Unknown date'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
