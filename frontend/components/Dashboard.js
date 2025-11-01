'use client'

import { useWallet } from '@/contexts/WalletContext';
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function Dashboard() {
  const { wallet, balances, tokens, prices, transactions, refreshData, loading } = useWallet();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshData();
    setTimeout(() => setRefreshing(false), 1000);
  };

  // Calculate total portfolio value
  const calculateTotalValue = () => {
    let total = 0;

    // Add Ethereum value
    if (balances.ethereum && prices.ethereum) {
      total += parseFloat(balances.ethereum) * prices.ethereum.current_price;
    }

    // Add Bitcoin value
    if (balances.bitcoin && prices.bitcoin) {
      total += parseFloat(balances.bitcoin) * prices.bitcoin.current_price;
    }

    // Add token values
    tokens.forEach(token => {
      if (token.balance && token.priceUsd) {
        total += parseFloat(token.balance) * parseFloat(token.priceUsd);
      }
    });

    return total;
  };

  const totalValue = calculateTotalValue();

  // Get all assets including native coins and tokens
  const allAssets = [
    {
      name: 'Bitcoin',
      symbol: 'BTC',
      balance: balances.bitcoin || '0',
      priceData: prices.bitcoin,
      icon: '₿',
    },
    {
      name: 'Ethereum',
      symbol: 'ETH',
      balance: balances.ethereum || '0',
      priceData: prices.ethereum,
      icon: 'Ξ',
    },
    ...tokens.filter(t => parseFloat(t.balance) > 0).map(token => ({
      name: token.name,
      symbol: token.symbol,
      balance: token.balance,
      priceData: { current_price: parseFloat(token.priceUsd || 0) },
      icon: token.symbol[0],
    })),
  ];

  return (
    <div className="space-y-6">
      {/* Total Balance Card */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-6 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full -ml-24 -mb-24"></div>
        
        <div className="relative">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm opacity-90">Total Portfolio Value</p>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
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
        <h3 className="text-lg font-bold text-white mb-4">Your Addresses</h3>
        
        <div className="space-y-3">
          <div className="bg-gray-700/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Ethereum (ETH)</span>
              <button className="text-xs text-purple-400 hover:text-purple-300">
                Copy
              </button>
            </div>
            <p className="text-white font-mono text-sm break-all">
              {wallet?.ethereum?.address}
            </p>
          </div>

          <div className="bg-gray-700/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Bitcoin (BTC)</span>
              <button className="text-xs text-purple-400 hover:text-purple-300">
                Copy
              </button>
            </div>
            <p className="text-white font-mono text-sm break-all">
              {wallet?.bitcoin?.address}
            </p>
          </div>
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
                    {parseFloat(asset.balance).toFixed(6)} {asset.symbol}
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
        
        {transactions.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <p>No transactions yet</p>
            <p className="text-sm mt-2">Your transaction history will appear here</p>
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
                    {parseFloat(tx.value || 0).toFixed(6)}
                  </p>
                  <p className="text-gray-400 text-sm">
                    {new Date(tx.timestamp * 1000).toLocaleDateString()}
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
