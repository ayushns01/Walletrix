'use client'

import { useWallet } from '@/contexts/WalletContext';
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import TransactionDetailsModal from './TransactionDetailsModal';
import AllTransactionsModal from './AllTransactionsModal';

export default function Dashboard() {
  const { wallet, balances, tokens, prices, transactions, refreshData, loading, selectedNetwork } = useWallet();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showTransactionDetails, setShowTransactionDetails] = useState(false);
  const [showAllTransactions, setShowAllTransactions] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshData();
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleTransactionClick = (transaction) => {
    setSelectedTransaction(transaction);
    setShowTransactionDetails(true);
    setShowAllTransactions(false); // Close all transactions modal
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
      <div className="bg-gradient-to-br from-black via-blue-900 to-blue-950 rounded-3xl p-8 text-white relative overflow-hidden border border-blue-500/30 shadow-2xl shadow-blue-500/30">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-400/10 rounded-full -mr-32 -mt-32 blur-xl"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-600/10 rounded-full -ml-24 -mb-24 blur-lg"></div>
        
        <div className="relative">
          <div className="flex items-center justify-between mb-6">
            <div className="flex-1">
              <p className="text-lg text-blue-200/80 font-medium">Total Portfolio Value</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-3 hover:bg-blue-500/20 rounded-xl transition-all duration-300 border border-blue-500/30 hover:border-blue-400/50"
              >
                <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''} text-blue-300`} />
              </button>
            </div>
          </div>
          
          <h2 className="text-5xl font-bold mb-6 gradient-text">
            ${totalValue.toFixed(2)}
          </h2>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500/20 to-blue-600/20 rounded-full border border-blue-400/30">
              <TrendingUp className="w-5 h-5 text-blue-300" />
              <span className="text-sm font-semibold text-blue-100">0.00%</span>
            </div>
            <span className="text-sm text-blue-200/80">24h</span>
          </div>
        </div>
      </div>

      {/* Addresses Card */}
      <div className="glass-effect rounded-2xl p-6 border border-blue-500/30 shadow-xl shadow-blue-500/20">
        <h3 className="text-xl font-bold text-blue-100 mb-6">Your Address</h3>
        
        <div className="space-y-4">
          {isEthereum && (
            <div className="bg-gradient-to-r from-blue-900/30 to-black/50 rounded-xl p-5 border border-blue-500/20">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-blue-300 font-medium">Ethereum Address</span>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(wallet?.ethereum?.address);
                    toast.success('Address copied!');
                  }}
                  className="text-xs text-blue-400 hover:text-blue-300 font-semibold px-3 py-1 bg-blue-500/20 rounded-lg hover:bg-blue-500/30 transition-all"
                >
                  Copy
                </button>
              </div>
              <p className="text-blue-50 font-mono text-sm break-all">
                {wallet?.ethereum?.address}
              </p>
            </div>
          )}

          {isBitcoin && (
            <div className="bg-gradient-to-r from-blue-900/30 to-black/50 rounded-xl p-5 border border-blue-500/20">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-blue-300 font-medium">Bitcoin Address</span>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(wallet?.bitcoin?.address);
                    toast.success('Address copied!');
                  }}
                  className="text-xs text-blue-400 hover:text-blue-300 font-semibold px-3 py-1 bg-blue-500/20 rounded-lg hover:bg-blue-500/30 transition-all"
                >
                  Copy
                </button>
              </div>
              <p className="text-blue-50 font-mono text-sm break-all">
                {wallet?.bitcoin?.address}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Assets List */}
      <div className="glass-effect rounded-2xl p-6 border border-blue-500/30 shadow-xl shadow-blue-500/20">
        <h3 className="text-xl font-bold text-blue-100 mb-6">Your Assets</h3>
        
        <div className="space-y-4">
          {allAssets.length === 0 && (
            <div className="text-center py-12 text-blue-300/70">
              <p className="text-lg">No assets found</p>
            </div>
          )}

          {allAssets.map((asset, index) => {
            const value = parseFloat(asset.balance) * (asset.priceData?.current_price || 0);
            const hasBalance = parseFloat(asset.balance) > 0;

            return (
              <div
                key={index}
                className={`flex items-center justify-between p-5 rounded-xl transition-all duration-300 ${
                  hasBalance 
                    ? 'bg-gradient-to-r from-blue-900/40 to-black/50 hover:from-blue-800/50 hover:to-blue-900/40 cursor-pointer border border-blue-500/20 hover:border-blue-400/40 card-hover' 
                    : 'bg-gradient-to-r from-gray-800/30 to-gray-900/30 opacity-60 border border-gray-600/20'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-700 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-blue-500/30">
                    {asset.icon}
                  </div>
                  <div>
                    <p className="text-blue-50 font-semibold text-lg">{asset.name}</p>
                    <p className="text-blue-300/70 text-sm font-medium">{asset.symbol}</p>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="text-blue-50 font-bold text-lg">
                    {asset.balance} {asset.symbol}
                  </p>
                  <p className="text-blue-300/70 text-sm font-medium">
                    ${value.toFixed(2)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="glass-effect rounded-2xl p-6 border border-blue-500/30 shadow-xl shadow-blue-500/20">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-blue-100">Recent Transactions</h3>
          <div className="flex items-center gap-2 text-blue-300/70 text-sm">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
            Live
          </div>
        </div>
        
        {console.log('Dashboard transactions debug:', {
          transactions,
          transactionsLength: transactions.length,
          transactionsType: typeof transactions,
          isArray: Array.isArray(transactions),
          selectedNetwork,
          walletAddress: wallet?.ethereum?.address
        })}
        
        {transactions.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500/20 to-blue-600/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-500/20">
              <ArrowUpRight className="w-8 h-8 text-blue-400/60" />
            </div>
            <p className="text-lg text-blue-100/80 font-medium mb-2">No transactions yet</p>
            <p className="text-sm text-blue-300/60">Your transaction history will appear here once you start using your wallet</p>
            {console.log('Showing no transactions message')}
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.slice(0, 5).map((tx, index) => {
              // Determine network name based on selected network and transaction data
              const getNetworkName = () => {
                if (tx.network) {
                  // If transaction has network field, use it
                  if (tx.network === 'ethereum') return 'Ethereum';
                  if (tx.network === 'bitcoin') return 'Bitcoin';
                  return tx.network.charAt(0).toUpperCase() + tx.network.slice(1);
                }
                
                // Otherwise, determine from selected network
                const [chain, network] = selectedNetwork.split('-');
                if (chain === 'ethereum') {
                  if (network === 'mainnet') return 'Ethereum';
                  if (network === 'sepolia') return 'Sepolia';
                  if (network === 'goerli') return 'Goerli';
                  if (network === 'holesky') return 'Holesky';
                  return 'Ethereum';
                }
                if (chain === 'polygon') {
                  if (network === 'mainnet') return 'Polygon';
                  if (network === 'mumbai') return 'Mumbai';
                  return 'Polygon';
                }
                if (chain === 'arbitrum') {
                  if (network === 'mainnet') return 'Arbitrum';
                  if (network === 'goerli') return 'Arbitrum Goerli';
                  return 'Arbitrum';
                }
                if (chain === 'optimism') {
                  if (network === 'mainnet') return 'Optimism';
                  if (network === 'goerli') return 'Optimism Goerli';
                  return 'Optimism';
                }
                if (chain === 'base') {
                  if (network === 'mainnet') return 'Base';
                  if (network === 'goerli') return 'Base Goerli';
                  return 'Base';
                }
                if (chain === 'bsc') {
                  if (network === 'mainnet') return 'BSC';
                  if (network === 'testnet') return 'BSC Testnet';
                  return 'BSC';
                }
                if (chain === 'avalanche') {
                  if (network === 'mainnet') return 'Avalanche';
                  if (network === 'fuji') return 'Fuji';
                  return 'Avalanche';
                }
                if (chain === 'bitcoin') {
                  if (network === 'mainnet') return 'Bitcoin';
                  if (network === 'testnet') return 'Bitcoin Testnet';
                  return 'Bitcoin';
                }
                
                return 'Unknown Network';
              };

              const networkName = getNetworkName();
              const isOutgoing = tx.from?.toLowerCase() === wallet?.ethereum?.address?.toLowerCase() || 
                                tx.from?.toLowerCase() === wallet?.bitcoin?.address?.toLowerCase();

              // Format transaction hash for display
              const formatHash = (hash) => {
                if (!hash) return 'N/A';
                return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
              };

              // Format amount for better display
              const formatAmount = (value) => {
                if (!value) return '0';
                const num = parseFloat(value);
                if (num > 1000) return num.toFixed(2);
                if (num > 1) return num.toFixed(4);
                return num.toFixed(6);
              };

              return (
                <div
                  key={index}
                  onClick={() => handleTransactionClick(tx)}
                  className="group relative overflow-hidden bg-gradient-to-r from-black/60 via-blue-950/40 to-black/60 rounded-2xl border border-blue-500/20 hover:border-blue-400/40 transition-all duration-500 hover:shadow-lg hover:shadow-blue-500/25 hover:-translate-y-1 cursor-pointer"
                >
                  {/* Animated background effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600/0 via-blue-500/10 to-blue-600/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  
                  {/* Status indicator line */}
                  <div className={`absolute left-0 top-0 w-1 h-full ${isOutgoing ? 'bg-gradient-to-b from-red-400 to-red-600' : 'bg-gradient-to-b from-green-400 to-green-600'}`}></div>
                  
                  <div className="relative p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {/* Enhanced icon with glow effect */}
                        <div className={`relative w-14 h-14 rounded-2xl flex items-center justify-center border ${
                          isOutgoing 
                            ? 'bg-gradient-to-br from-red-500/20 to-red-600/10 border-red-500/30 shadow-lg shadow-red-500/20' 
                            : 'bg-gradient-to-br from-green-500/20 to-green-600/10 border-green-500/30 shadow-lg shadow-green-500/20'
                        }`}>
                          {isOutgoing ? (
                            <ArrowUpRight className="w-7 h-7 text-red-300" />
                          ) : (
                            <ArrowDownRight className="w-7 h-7 text-green-300" />
                          )}
                          {/* Glow effect */}
                          <div className={`absolute inset-0 rounded-2xl ${
                            isOutgoing ? 'bg-red-500/20' : 'bg-green-500/20'
                          } blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>
                        </div>
                        
                        <div className="space-y-1">
                          <div className="flex items-center gap-3">
                            <p className="text-blue-50 font-bold text-lg">
                              {isOutgoing ? 'Sent' : 'Received'}
                            </p>
                            <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${
                              isOutgoing 
                                ? 'bg-red-500/20 text-red-300 border border-red-500/30' 
                                : 'bg-green-500/20 text-green-300 border border-green-500/30'
                            }`}>
                              {isOutgoing ? 'OUT' : 'IN'}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-blue-300/80 font-medium">{networkName}</span>
                            <span className="text-blue-400/60">•</span>
                            <span className="text-blue-400/80 font-mono">{formatHash(tx.hash)}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right space-y-1">
                        <p className={`font-bold text-xl ${
                          isOutgoing ? 'text-red-300' : 'text-green-300'
                        }`}>
                          {isOutgoing ? '-' : '+'}{formatAmount(tx.value)}
                        </p>
                        <div className="text-blue-300/70 text-sm space-y-1">
                          <p className="font-medium">
                            {tx.timestamp ? (
                              new Date(tx.timestamp.includes('T') ? tx.timestamp : parseInt(tx.timestamp) * 1000).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })
                            ) : 'Unknown date'}
                          </p>
                          <p className="text-xs text-blue-400/60">
                            {tx.timestamp ? (
                              new Date(tx.timestamp.includes('T') ? tx.timestamp : parseInt(tx.timestamp) * 1000).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                            ) : ''}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Progress bar animation */}
                    <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-500/20">
                      <div className="h-full bg-gradient-to-r from-blue-400 to-blue-600 w-0 group-hover:w-full transition-all duration-700 ease-out"></div>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {/* View All Transactions Button */}
            {transactions.length > 0 && (
              <div className="pt-4">
                <button 
                  onClick={() => setShowAllTransactions(true)}
                  className="w-full py-4 px-6 bg-gradient-to-r from-blue-600/20 to-blue-800/20 hover:from-blue-500/30 hover:to-blue-700/30 border border-blue-500/30 hover:border-blue-400/50 rounded-2xl text-blue-100 font-semibold transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/20"
                >
                  View All Transactions ({transactions.length})
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Transaction Details Modal */}
      <TransactionDetailsModal
        isOpen={showTransactionDetails}
        onClose={() => {
          setShowTransactionDetails(false);
          setSelectedTransaction(null);
        }}
        transaction={selectedTransaction}
        wallet={wallet}
        selectedNetwork={selectedNetwork}
      />

      {/* All Transactions Modal */}
      <AllTransactionsModal
        isOpen={showAllTransactions}
        onClose={() => setShowAllTransactions(false)}
        transactions={transactions}
        wallet={wallet}
        selectedNetwork={selectedNetwork}
        onTransactionClick={handleTransactionClick}
      />
    </div>
  );
}
