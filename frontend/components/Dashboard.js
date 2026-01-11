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
    <div className="space-y-5">
      {/* Total Balance Card */}
      <div data-tour="portfolio" className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 relative overflow-hidden border border-slate-700/50 transition-opacity duration-300" style={{ opacity: portfolioValueLoading ? 0.7 : 1 }}>
        {/* Background decorations */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/10 rounded-full -mr-20 -mt-20 blur-2xl" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-cyan-500/10 rounded-full -ml-16 -mb-16 blur-2xl" />

        <div className="relative">
          <div className="flex items-center justify-between mb-4">
            <p className="text-slate-400 text-sm font-medium">Total Balance</p>
            <button
              data-tour="refresh-button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 hover:bg-slate-700/50 rounded-lg transition-all border border-slate-600/50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''} text-slate-400`} />
            </button>
          </div>

          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4" style={{ minHeight: '48px' }}>
            {portfolioValueLoading ? (
              <div className="flex items-center gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
                <span className="text-2xl text-slate-400">Loading...</span>
              </div>
            ) : (
              `$${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            )}
          </h2>

          <div className="flex items-center gap-2">
            {(() => {
              let priceChange = 0;
              if (isBitcoin && prices.bitcoin?.price_change_percentage_24h) {
                priceChange = prices.bitcoin.price_change_percentage_24h;
              } else if (isEthereum && prices.ethereum?.price_change_percentage_24h) {
                priceChange = prices.ethereum.price_change_percentage_24h;
              } else if (isSolana && prices.solana?.price_change_percentage_24h) {
                priceChange = prices.solana.price_change_percentage_24h;
              }

              const isPositive = priceChange >= 0;

              return (
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${isPositive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                  {isPositive ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                  <span className="text-sm font-medium">
                    {isPositive ? '+' : ''}{priceChange.toFixed(2)}%
                  </span>
                </div>
              );
            })()}
            <span className="text-xs text-slate-500">24h</span>
          </div>
        </div>
      </div>

      {/* Wallet Address Card */}
      <div data-tour="wallet-address" className="bg-slate-800/60 backdrop-blur-xl rounded-2xl p-5 border border-slate-700/50">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Wallet Address</h3>

        <div className="space-y-3">
          {isEthereum && (
            <div className="bg-slate-700/40 rounded-xl p-4 border border-slate-600/30">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                    <span className="text-white text-xs font-bold">Ξ</span>
                  </div>
                  <span className="text-sm text-slate-300 font-medium">Ethereum</span>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(wallet?.ethereum?.address);
                    toast.success('Address copied!');
                  }}
                  className="text-xs text-blue-400 hover:text-blue-300 font-medium px-2.5 py-1 bg-blue-500/20 rounded-lg hover:bg-blue-500/30 transition-all"
                >
                  Copy
                </button>
              </div>
              <p className="text-slate-200 font-mono text-xs break-all">
                {wallet?.ethereum?.address}
              </p>
            </div>
          )}

          {isBitcoin && (
            <div className="bg-slate-700/40 rounded-xl p-4 border border-slate-600/30">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                    <span className="text-white text-xs font-bold">₿</span>
                  </div>
                  <span className="text-sm text-slate-300 font-medium">Bitcoin</span>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(wallet?.bitcoin?.address);
                    toast.success('Address copied!');
                  }}
                  className="text-xs text-orange-400 hover:text-orange-300 font-medium px-2.5 py-1 bg-orange-500/20 rounded-lg hover:bg-orange-500/30 transition-all"
                >
                  Copy
                </button>
              </div>
              <p className="text-slate-200 font-mono text-xs break-all">
                {wallet?.bitcoin?.address}
              </p>
            </div>
          )}

          {isSolana && (
            <div className="bg-slate-700/40 rounded-xl p-4 border border-slate-600/30">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <span className="text-white text-xs font-bold">◎</span>
                  </div>
                  <span className="text-sm text-slate-300 font-medium">Solana</span>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(wallet?.solana?.address);
                    toast.success('Address copied!');
                  }}
                  className="text-xs text-purple-400 hover:text-purple-300 font-medium px-2.5 py-1 bg-purple-500/20 rounded-lg hover:bg-purple-500/30 transition-all"
                >
                  Copy
                </button>
              </div>
              <p className="text-slate-200 font-mono text-xs break-all">
                {wallet?.solana?.address}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Assets List */}
      <div className="bg-slate-800/60 backdrop-blur-xl rounded-2xl p-5 border border-slate-700/50">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Assets</h3>

        <div className="space-y-2">
          {allAssets.length === 0 && (
            <div className="text-center py-10 text-slate-500">
              <p>No assets found</p>
            </div>
          )}

          {allAssets.map((asset, index) => {
            const value = parseFloat(asset.balance) * (asset.priceData?.current_price || 0);
            const hasBalance = parseFloat(asset.balance) > 0;

            // Determine icon color based on asset
            let iconGradient = 'from-blue-500 to-blue-600';
            if (asset.symbol === 'BTC') iconGradient = 'from-orange-500 to-orange-600';
            else if (asset.symbol === 'SOL') iconGradient = 'from-purple-500 to-pink-500';
            else if (asset.symbol === 'USDT' || asset.symbol === 'USDC') iconGradient = 'from-green-500 to-emerald-600';

            return (
              <div
                key={index}
                className={`flex items-center justify-between p-4 rounded-xl transition-all ${hasBalance
                  ? 'bg-slate-700/40 hover:bg-slate-700/60 cursor-pointer border border-slate-600/30 hover:border-slate-500/50'
                  : 'bg-slate-800/30 opacity-50 border border-slate-700/20'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 bg-gradient-to-br ${iconGradient} rounded-full flex items-center justify-center text-white font-bold text-sm`}>
                    {asset.icon}
                  </div>
                  <div>
                    <p className="text-white font-medium">{asset.name}</p>
                    <p className="text-slate-400 text-xs">{asset.symbol}</p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-white font-medium">
                    {parseFloat(asset.balance).toLocaleString('en-US', { maximumFractionDigits: 6 })} <span className="text-slate-400 text-sm">{asset.symbol}</span>
                  </p>
                  <p className="text-slate-400 text-sm">
                    ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
