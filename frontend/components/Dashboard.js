'use client'

import { useWallet } from '@/contexts/DatabaseWalletContext';
import { TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import toast from 'react-hot-toast';

export default function Dashboard() {
  const {
    wallet, balances, tokens, prices, refreshData, loading, selectedNetwork,
    dataLoading, refreshInProgress
  } = useWallet();
  const [refreshing, setRefreshing] = useState(false);
  const [portfolioLoading, setPortfolioLoading] = useState(false);

  const handleRefresh = async () => {
    if (refreshInProgress) {
      toast.info('Refresh already in progress');
      return;
    }

    setRefreshing(true);
    setPortfolioLoading(true);

    try {
      await refreshData();
    } catch (error) {
      console.error('Refresh failed:', error);
      toast.error('Failed to refresh data');
    } finally {
      setTimeout(() => {
        setRefreshing(false);
        setPortfolioLoading(false);
      }, 500);
    }
  };

  // Calculate total portfolio value with memoization
  const calculateTotalValue = useMemo(() => {
    // Don't calculate if critical data is still loading or no network selected
    if (!selectedNetwork || portfolioLoading || (dataLoading && (dataLoading.balances || dataLoading.prices))) {
      return { value: 0, isLoading: true };
    }

    let total = 0;
    const [chain] = selectedNetwork.split('-');

    // Add native coin value based on selected chain
    if (chain === 'bitcoin' && balances.bitcoin && prices.bitcoin) {
      const btcValue = parseFloat(balances.bitcoin) * prices.bitcoin.current_price;
      total += btcValue;
    } else if (chain === 'ethereum' && balances.ethereum && prices.ethereum) {
      const ethValue = parseFloat(balances.ethereum) * prices.ethereum.current_price;
      total += ethValue;
    } else if (['polygon', 'arbitrum', 'optimism', 'bsc', 'avalanche', 'base'].includes(chain)) {
      // For other EVM chains, balance is stored under chain name but price is under ethereum
      const chainBalance = balances[chain];
      if (chainBalance && prices.ethereum) {
        const chainValue = parseFloat(chainBalance) * prices.ethereum.current_price;
        total += chainValue;
      }
    } else if (chain === 'solana' && balances.solana && prices.solana) {
      const solValue = parseFloat(balances.solana) * prices.solana.current_price;
      total += solValue;
    }

    // Add token values (only for Ethereum-based chains)
    if (['ethereum', 'polygon', 'arbitrum', 'optimism', 'bsc', 'avalanche', 'base'].includes(chain)) {
      tokens.forEach(token => {
        if (token.balance && token.priceUsd) {
          const tokenValue = parseFloat(token.balance) * parseFloat(token.priceUsd);
          total += tokenValue;
        }
      });
    }

    return { value: total, isLoading: false };
  }, [balances, prices, tokens, selectedNetwork, portfolioLoading, dataLoading]);

  const { value: totalValue, isLoading: portfolioValueLoading } = calculateTotalValue;

  // Get network info
  const [chain] = (selectedNetwork || 'ethereum-mainnet').split('-');
  const isEthereum = chain === 'ethereum';
  const isBitcoin = chain === 'bitcoin';
  const isSolana = chain === 'solana';

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
    ...(isSolana ? [{
      name: 'Solana',
      symbol: 'SOL',
      balance: balances.solana || '0',
      priceData: prices.solana,
      icon: '◎',
    }] : []),
    ...(isEthereum ? tokens.filter(t => parseFloat(t.balance) > 0).map(token => ({
      name: token.name,
      symbol: token.symbol,
      balance: token.balance,
      priceData: { current_price: parseFloat(token.priceUsd || 0) },
      icon: token.symbol[0],
    })) : []),
  ];


  return (
    <div className="space-y-6" style={{ minHeight: '600px' }}>
      {/* Total Balance Card */}
      <div data-tour="portfolio" className="bg-gradient-to-br from-black via-blue-900 to-blue-950 rounded-3xl p-8 text-white relative overflow-hidden border border-blue-500/30 shadow-2xl shadow-blue-500/30 transition-opacity duration-300" style={{ opacity: portfolioValueLoading ? 0.7 : 1 }}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-400/10 rounded-full -mr-32 -mt-32 blur-xl"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-600/10 rounded-full -ml-24 -mb-24 blur-lg"></div>

        <div className="relative">
          <div className="flex items-center justify-between mb-6">
            <div className="flex-1">
              <p className="text-lg text-blue-200/80 font-medium">Your Balance</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                data-tour="refresh-button"
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-3 hover:bg-blue-500/20 rounded-xl transition-all duration-300 border border-blue-500/30 hover:border-blue-400/50"
              >
                <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''} text-blue-300`} />
              </button>
            </div>
          </div>

          <h2 className="text-5xl font-bold mb-6 gradient-text" style={{ minHeight: '60px' }}>
            {portfolioValueLoading ? (
              <div className="flex items-center gap-2">
                <RefreshCw className="w-8 h-8 animate-spin text-blue-300" />
                <span className="text-3xl">Loading...</span>
              </div>
            ) : (
              `$${totalValue.toFixed(2)}`
            )}
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
      <div data-tour="wallet-address" className="glass-effect rounded-2xl p-6 border border-blue-500/30 shadow-xl shadow-blue-500/20">
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

          {isSolana && (
            <div className="bg-gradient-to-r from-purple-900/30 to-black/50 rounded-xl p-5 border border-purple-500/20">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-purple-300 font-medium">Solana Address</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(wallet?.solana?.address);
                    toast.success('Address copied!');
                  }}
                  className="text-xs text-purple-400 hover:text-purple-300 font-semibold px-3 py-1 bg-purple-500/20 rounded-lg hover:bg-purple-500/30 transition-all"
                >
                  Copy
                </button>
              </div>
              <p className="text-purple-50 font-mono text-sm break-all">
                {wallet?.solana?.address}
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
                className={`flex items-center justify-between p-5 rounded-xl transition-all duration-300 ${hasBalance
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
    </div>
  );
}
