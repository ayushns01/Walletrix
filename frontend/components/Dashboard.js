'use client'

import { useWallet } from '@/contexts/DatabaseWalletContext';
import { Bot, Copy, RefreshCw, ShieldCheck, Sparkles, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '@clerk/nextjs';
import { stealthAPI, telegramAPI } from '@/lib/api';
import { getBuiltInSepoliaAutoSwapManifest } from '@/lib/sepoliaAutoSwapManifest.mjs';
import { isSepoliaAutoSwapNetwork } from '@/lib/sepoliaAutoSwap.mjs';
import { buildDashboardRows } from '@/lib/sepoliaAutoSwapViewModels.mjs';
import { buildMainnetHoldingsRows } from '@/lib/mainnetHoldings.mjs';

export default function Dashboard({ onFundBot, onSend, onReceive }) {
  const {
    wallet,
    balances,
    tokens,
    prices,
    refreshData,
    selectedNetwork,
    dataLoading,
    refreshInProgress
  } = useWallet();
  const [refreshing, setRefreshing] = useState(false);
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const [botWallet, setBotWallet] = useState(null); // { address, ethBalance }
  const [telegramLinked, setTelegramLinked] = useState(false);
  const [stealthIssues, setStealthIssues] = useState([]);
  const { getToken } = useAuth();
  const sepoliaManifest = useMemo(() => getBuiltInSepoliaAutoSwapManifest(), []);

  const loadWalletIntelligence = useCallback(async (options = {}) => {
    const { quiet = false } = options;

    try {
      const token = await getToken();
      if (!token) {
        setTelegramLinked(false);
        setBotWallet(null);
        setStealthIssues([]);
        return;
      }

      const [statusResult, stealthResult] = await Promise.allSettled([
        telegramAPI.getStatus(token),
        stealthAPI.listIssues(token),
      ]);

      if (statusResult.status === 'fulfilled') {
        const status = statusResult.value;
        const linked = Boolean(status?.linked);
        setTelegramLinked(linked);

        if (linked && status?.botWallet?.address) {
          try {
            const balData = await telegramAPI.getBotBalance(token);
            setBotWallet(balData?.success ? { address: balData.address, ethBalance: balData.ethBalance } : null);
          } catch {
            setBotWallet(null);
          }
        } else {
          setBotWallet(null);
        }
      } else if (!quiet) {
        setTelegramLinked(false);
        setBotWallet(null);
      }

      if (stealthResult.status === 'fulfilled') {
        setStealthIssues(Array.isArray(stealthResult.value?.issues) ? stealthResult.value.issues : []);
      } else if (!quiet) {
        setStealthIssues([]);
      }
    } catch {
      if (!quiet) {
        setTelegramLinked(false);
        setBotWallet(null);
        setStealthIssues([]);
      }
    }
  }, [getToken]);

  useEffect(() => {
    loadWalletIntelligence({ quiet: true });
  }, [loadWalletIntelligence]);

  const handleRefresh = async () => {
    if (refreshInProgress) {
      toast('Refresh already in progress');
      return;
    }

    setRefreshing(true);
    setPortfolioLoading(true);

    try {
      await refreshData();
      await loadWalletIntelligence({ quiet: true });
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

  const [chain, network] = (selectedNetwork || 'ethereum-mainnet').split('-');
  const isEthereum = chain === 'ethereum';
  const isBitcoin = chain === 'bitcoin';
  const isSolana = chain === 'solana';
  const isSepolia = isSepoliaAutoSwapNetwork(selectedNetwork);

  const chainMeta = {
    ethereum: { label: 'Ethereum', symbol: 'ETH', icon: 'Ξ', accent: 'from-blue-500/20 via-cyan-500/10 to-slate-950', chip: 'bg-blue-500/15 text-blue-200 border-blue-400/20' },
    bitcoin: { label: 'Bitcoin', symbol: 'BTC', icon: '₿', accent: 'from-orange-500/20 via-amber-500/10 to-slate-950', chip: 'bg-orange-500/15 text-orange-200 border-orange-400/20' },
    solana: { label: 'Solana', symbol: 'SOL', icon: '◎', accent: 'from-fuchsia-500/20 via-violet-500/10 to-slate-950', chip: 'bg-fuchsia-500/15 text-fuchsia-200 border-fuchsia-400/20' },
    default: { label: 'Network', symbol: '', icon: '◌', accent: 'from-slate-700/30 via-slate-700/10 to-slate-950', chip: 'bg-white/5 text-slate-200 border-white/10' },
  };

  const currentChainMeta = chainMeta[chain] || chainMeta.default;

  const formatCurrency = (value, minimumFractionDigits = 2, maximumFractionDigits = 2) =>
    value.toLocaleString('en-US', { minimumFractionDigits, maximumFractionDigits });

  const formatCompactNumber = (value, maximumFractionDigits = 6) =>
    value.toLocaleString('en-US', { maximumFractionDigits });

  const truncateAddress = (address) => {
    if (!address) return 'Unavailable';
    if (address.length <= 14) return address;
    return `${address.slice(0, 6)}…${address.slice(-6)}`;
  };

  const copyToClipboard = async (text, successMessage) => {
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      toast.success(successMessage);
    } catch {
      toast.error('Copy failed');
    }
  };

  const mainnetHoldingsRows = useMemo(() => (
    isEthereum && !isSepolia
      ? buildMainnetHoldingsRows({ balances, prices, tokens })
      : []
  ), [balances, prices, tokens, isEthereum, isSepolia]);

  const calculateTotalValue = useMemo(() => {
    if (!selectedNetwork || portfolioLoading || (dataLoading && (dataLoading.balances || dataLoading.prices))) {
      return { value: 0, isLoading: true };
    }

    let total = 0;

    if (isBitcoin && balances.bitcoin && prices.bitcoin) {
      total += parseFloat(balances.bitcoin) * prices.bitcoin.current_price;
    } else if (isEthereum && balances.ethereum && prices.ethereum) {
      total += parseFloat(balances.ethereum) * prices.ethereum.current_price;
    } else if (['polygon', 'arbitrum', 'optimism', 'bsc', 'avalanche', 'base'].includes(chain)) {
      const chainBalance = balances[chain];
      if (chainBalance && prices.ethereum) {
        total += parseFloat(chainBalance) * prices.ethereum.current_price;
      }
    } else if (isSolana && balances.solana && prices.solana) {
      total += parseFloat(balances.solana) * prices.solana.current_price;
    }

    if (isEthereum && !isSepolia) {
      mainnetHoldingsRows
        .filter((token) => token.isOwned && token.symbol !== 'ETH')
        .forEach((token) => {
          total += parseFloat(token.balance || '0') * parseFloat(token.priceData?.current_price || 0);
        });
    }

    return { value: total, isLoading: false };
  }, [balances, prices, selectedNetwork, portfolioLoading, dataLoading, chain, isBitcoin, isEthereum, isSolana, isSepolia, mainnetHoldingsRows]);

  const { value: totalValue, isLoading: portfolioValueLoading } = calculateTotalValue;

  const currentPriceChange = useMemo(() => {
    if (isBitcoin) return prices.bitcoin?.price_change_percentage_24h ?? null;
    if (isEthereum) return prices.ethereum?.price_change_percentage_24h ?? null;
    if (isSolana) return prices.solana?.price_change_percentage_24h ?? null;
    return null;
  }, [isBitcoin, isEthereum, isSolana, prices]);

  const currentAddress = wallet?.[chain]?.address || wallet?.ethereum?.address || wallet?.bitcoin?.address || wallet?.solana?.address;
  const stealthSummary = useMemo(() => {
    const summary = stealthIssues.reduce((accumulator, issue) => {
      const next = { ...accumulator };
      if (issue.status === 'FUNDED') next.funded += 1;
      if (issue.status === 'ACTIVE') next.active += 1;
      if (issue.status === 'CLAIMED') next.claimed += 1;
      return next;
    }, { funded: 0, active: 0, claimed: 0 });

    return {
      ...summary,
      total: stealthIssues.length,
      latestFunded: stealthIssues.find((issue) => issue.status === 'FUNDED') || null,
      latestActive: stealthIssues.find((issue) => issue.status === 'ACTIVE') || null,
    };
  }, [stealthIssues]);

  const allAssets = useMemo(() => [
    ...(isBitcoin ? [{
      name: 'Bitcoin',
      symbol: 'BTC',
      balance: balances.bitcoin || '0',
      priceData: prices.bitcoin,
      icon: '₿',
    }] : []),
    ...(isEthereum && !isSepolia ? mainnetHoldingsRows : isEthereum ? [{
      name: 'Ethereum',
      symbol: 'ETH',
      balance: balances.ethereum || '0',
      priceData: prices.ethereum,
      icon: 'Ξ',
      isOwned: true,
    }] : []),
    ...(isSolana ? [{
      name: 'Solana',
      symbol: 'SOL',
      balance: balances.solana || '0',
      priceData: prices.solana,
      icon: '◎',
    }] : []),
  ], [isBitcoin, isEthereum, isSolana, isSepolia, balances, prices, mainnetHoldingsRows]);

  const sepoliaSupportedTokens = useMemo(() => (
    isSepolia ? buildDashboardRows({ network: selectedNetwork, manifest: sepoliaManifest }) : []
  ), [isSepolia, selectedNetwork, sepoliaManifest]);
  const holdingsRows = isSepolia ? sepoliaSupportedTokens : allAssets;
  const holdingsCountLabel = isSepolia ? 'supported token' : 'asset';

  const currentBalance =
    (isBitcoin && balances.bitcoin) ||
    (isEthereum && balances.ethereum) ||
    (isSolana && balances.solana) ||
    '0';

  const primaryPrice =
    (isBitcoin && prices.bitcoin?.current_price) ||
    (isEthereum && prices.ethereum?.current_price) ||
    (isSolana && prices.solana?.current_price) ||
    0;

  const portfolioChangeTone = (currentPriceChange ?? 0) >= 0;
  const formattedChange = currentPriceChange === null ? 'N/A' : `${portfolioChangeTone ? '+' : ''}${currentPriceChange.toFixed(2)}%`;

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.75fr)_minmax(320px,0.92fr)]">
      <div className="space-y-5">
        <section
          data-tour="portfolio"
          className={`relative overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br ${currentChainMeta.accent} p-6 shadow-[0_20px_60px_rgba(0,0,0,0.25)] transition-opacity duration-300`}
          style={{ opacity: portfolioValueLoading ? 0.78 : 1 }}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(96,165,250,0.10),transparent_26%)]" />
          <div className="relative flex flex-col gap-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-400">
                    Portfolio
                  </p>
                  <div className="mt-2 flex items-end gap-3">
                    <h2 className="text-4xl font-semibold tracking-tight text-white md:text-5xl">
                      {portfolioValueLoading ? (
                        <span className="inline-flex items-center gap-2 text-2xl text-slate-400 md:text-3xl">
                          <RefreshCw className="h-5 w-5 animate-spin" />
                          Syncing
                        </span>
                      ) : (
                        `$${formatCurrency(totalValue)}`
                      )}
                    </h2>
                    <span className="pb-2 text-sm text-slate-400">
                      total value
                    </span>
                  </div>
                </div>
              </div>

              <button
                data-tour="refresh-button"
                onClick={handleRefresh}
                disabled={refreshing}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-4 py-2 text-sm font-medium text-slate-100 transition hover:bg-white/12 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-slate-950/25 px-4 py-3 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">24h move</p>
                <div className={`mt-2 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium ${portfolioChangeTone ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'}`}>
                  {portfolioChangeTone ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  {formattedChange}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-950/25 px-4 py-3 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Primary balance</p>
                <p className="mt-2 text-sm font-medium text-slate-100">
                  {formatCompactNumber(parseFloat(currentBalance || '0'))} {currentChainMeta.symbol || chain.toUpperCase()}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {primaryPrice ? `$${formatCurrency(primaryPrice, 2, 2)} spot` : 'Spot price unavailable'}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-950/25 px-4 py-3 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Telegram workspace</p>
                <div className="mt-2 flex items-center gap-2 text-sm font-medium text-slate-100">
                  <Bot className={`h-4 w-4 ${telegramLinked ? 'text-sky-300' : 'text-slate-500'}`} />
                  {telegramLinked ? 'Linked and ready' : 'Available to link'}
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  {telegramLinked ? 'Bot wallet and stealth flows are active.' : 'Link Telegram to unlock assistant workflows.'}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-950/25 px-4 py-3 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Stealth receives</p>
                <div className="mt-2 flex items-center gap-2 text-sm font-medium text-slate-100">
                  <Sparkles className={`h-4 w-4 ${stealthSummary.funded > 0 ? 'text-fuchsia-300' : 'text-slate-500'}`} />
                  {stealthSummary.funded > 0 ? `${stealthSummary.funded} ready to claim` : `${stealthSummary.active} active watch${stealthSummary.active === 1 ? '' : 'es'}`}
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  {stealthSummary.latestFunded
                    ? `${stealthSummary.latestFunded.lastObservedBalanceEth || '0'} ETH detected for ${stealthSummary.latestFunded.walletLabel}.`
                    : stealthSummary.total > 0
                      ? `${stealthSummary.claimed} claimed, ${stealthSummary.active} awaiting deposits.`
                      : 'No private receive routes issued yet.'}
                </p>
              </div>
            </div>

            {(onSend || onReceive) && (
              <div className="flex flex-wrap gap-3">
                {onSend && (
                  <button
                    onClick={onSend}
                    className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm font-medium text-slate-100 transition hover:bg-white/12"
                  >
                    Send
                  </button>
                )}
                {onReceive && (
                  <button
                    onClick={onReceive}
                    className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm font-medium text-slate-100 transition hover:bg-white/12"
                  >
                    Receive
                  </button>
                )}
              </div>
            )}
          </div>
        </section>

        <section className="rounded-[28px] border border-white/10 bg-slate-950/55 p-5 shadow-[0_16px_48px_rgba(0,0,0,0.22)] backdrop-blur-xl">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.22em] text-slate-500">
                {isSepolia ? 'Supported tokens' : 'Holdings'}
              </p>
              <p className="mt-1 text-sm text-slate-400">
                {isSepolia
                  ? 'Shared Sepolia demo assets with fixed pricing and availability context.'
                  : (isEthereum
                    ? 'Owned assets first, followed by live market tokens you can track on mainnet.'
                    : 'Dense, current-position view for the active network.')}
              </p>
            </div>
            <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
              {holdingsRows.length} {holdingsCountLabel}{holdingsRows.length === 1 ? '' : 's'}
            </div>
          </div>

          <div className="space-y-3">
            {holdingsRows.length === 0 && (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-4 py-10 text-center text-slate-500">
                <Wallet className="mx-auto mb-3 h-5 w-5 text-slate-600" />
                <p>{isSepolia ? 'No supported Sepolia tokens are available' : 'No assets found for this network'}</p>
              </div>
            )}

            {isSepolia ? (
              sepoliaSupportedTokens.map((token, index) => {
                let iconGradient = 'from-slate-600 to-slate-700';
                if (token.symbol === 'WUSD' || token.symbol === 'WDAI') iconGradient = 'from-emerald-500 to-teal-500';
                else if (token.symbol === 'WLINK') iconGradient = 'from-cyan-500 to-blue-500';
                else if (token.symbol === 'WWBTC') iconGradient = 'from-orange-500 to-amber-500';
                else if (token.symbol === 'WGLD') iconGradient = 'from-amber-400 to-yellow-500';

                return (
                  <div
                    key={`${token.symbol}-${index}`}
                    className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition hover:border-white/20 hover:bg-white/[0.06]"
                  >
                    <div className="flex items-start gap-4">
                      <div className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${iconGradient} text-sm font-semibold text-white shadow-lg shadow-black/20`}>
                        {token.symbol?.[0] || '•'}
                      </div>

                      <div className="min-w-0 flex-1 space-y-3">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-white">
                              {token.name}
                            </p>
                            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                              {token.symbol}
                            </p>
                          </div>

                          <div className="text-right">
                            <p className="text-sm font-medium text-white">
                              ${token.displayPriceUsd} <span className="text-slate-400">demo price</span>
                            </p>
                            <p className="mt-1 inline-flex rounded-full border border-sky-400/20 bg-sky-500/10 px-2.5 py-1 text-[11px] font-medium text-sky-200">
                              {token.availabilityLabel}
                            </p>
                          </div>
                        </div>

                        <p className="text-sm leading-6 text-slate-300">
                          {token.shortDescription}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              allAssets.map((asset, index) => {
                const balance = parseFloat(asset.balance || '0');
                const value = balance * (asset.priceData?.current_price || 0);
                const hasBalance = asset.isOwned ? balance > 0 || asset.symbol === 'ETH' : false;
                const allocation = totalValue > 0 ? (value / totalValue) * 100 : 0;

                let iconGradient = 'from-slate-600 to-slate-700';
                if (asset.symbol === 'BTC') iconGradient = 'from-orange-500 to-amber-500';
                else if (asset.symbol === 'SOL') iconGradient = 'from-fuchsia-500 to-violet-500';
                else if (asset.symbol === 'ETH') iconGradient = 'from-blue-500 to-cyan-500';
                else if (asset.symbol === 'USDT' || asset.symbol === 'USDC') iconGradient = 'from-emerald-500 to-teal-500';

                return (
                  <div
                    key={`${asset.symbol}-${index}`}
                    className={`rounded-2xl border p-4 transition ${
                      hasBalance
                        ? 'border-white/10 bg-white/[0.04] hover:border-white/20 hover:bg-white/[0.06]'
                        : 'border-white/5 bg-white/[0.025] opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${iconGradient} text-sm font-semibold text-white shadow-lg shadow-black/20`}>
                        {asset.icon}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-white">
                              {asset.name}
                            </p>
                            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                              {asset.symbol}
                            </p>
                          </div>

                          <div className="text-right">
                            {asset.isOwned ? (
                              <>
                                <p className="text-sm font-medium text-white">
                                  {formatCompactNumber(balance)} <span className="text-slate-400">{asset.symbol}</span>
                                </p>
                                <p className="text-sm text-slate-400">
                                  {balance > 0
                                    ? `$${formatCurrency(value)}`
                                    : (asset.priceData?.current_price ? `1 ${asset.symbol} = $${formatCurrency(asset.priceData.current_price)}` : 'Live price unavailable')}
                                </p>
                              </>
                            ) : (
                              <>
                                <p className="text-sm font-medium text-white">
                                  0 <span className="text-slate-400">{asset.symbol}</span>
                                </p>
                                <p className="text-sm text-slate-400">
                                  {asset.priceData?.current_price
                                    ? `1 ${asset.symbol} = $${formatCurrency(asset.priceData.current_price)}`
                                    : 'Live price unavailable'}
                                </p>
                              </>
                            )}
                          </div>
                        </div>

                        {asset.isOwned ? (
                          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/5">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-sky-400 via-cyan-400 to-emerald-400 transition-all"
                              style={{ width: `${Math.min(allocation, 100)}%` }}
                            />
                          </div>
                        ) : (
                          <div className="mt-3 flex items-center justify-between gap-3 text-xs text-slate-500">
                            <span>Available on Ethereum mainnet</span>
                            <span>Zero balance</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>

      <div className="space-y-5">
        <section
          data-tour="wallet-address"
          className="rounded-[28px] border border-white/10 bg-slate-950/60 p-5 shadow-[0_16px_48px_rgba(0,0,0,0.22)] backdrop-blur-xl"
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-200">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Wallet intelligence</h3>
                <p className="text-xs text-slate-400">Compact identity and network context</p>
              </div>
            </div>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
              {chain.toUpperCase()}
            </span>
          </div>

          <div className="space-y-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Active address</p>
              <div className="mt-2 flex items-center justify-between gap-3">
                <p className="min-w-0 flex-1 font-mono text-sm text-slate-100">
                  {truncateAddress(currentAddress)}
                </p>
                <button
                  onClick={() => copyToClipboard(currentAddress, 'Address copied')}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-white/10"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copy
                </button>
              </div>
              <p className="mt-2 text-xs text-slate-400">
                {currentAddress ? 'Used for deposits and network-specific transfers.' : 'No wallet address is available for this network.'}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Selected network</p>
                <p className="mt-2 text-sm font-medium text-white">
                  {selectedNetwork || 'Unavailable'}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {currentChainMeta.label} / {network || 'mainnet'}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Portfolio density</p>
                <p className="mt-2 text-sm font-medium text-white">
                  {allAssets.length} tracked asset{allAssets.length === 1 ? '' : 's'}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {isBitcoin || isSolana ? 'Single-asset view on this chain.' : 'Base asset plus token positions.'}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-white/10 bg-slate-950/60 p-5 shadow-[0_16px_48px_rgba(0,0,0,0.22)] backdrop-blur-xl">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className={`flex h-9 w-9 items-center justify-center rounded-2xl border ${telegramLinked ? 'border-sky-400/20 bg-sky-500/10 text-sky-300' : 'border-white/10 bg-white/5 text-slate-300'}`}>
                <Bot className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Telegram workspace</h3>
                <p className="text-xs text-slate-400">
                  {telegramLinked ? 'Linked bot wallet, notifications, and conversational actions' : 'Link your bot to unlock messaging and claim workflows'}
                </p>
              </div>
            </div>
            <span className={`rounded-full border px-3 py-1 text-xs ${telegramLinked ? 'border-sky-400/20 bg-sky-500/10 text-sky-300' : 'border-white/10 bg-white/5 text-slate-300'}`}>
              {telegramLinked ? 'Connected' : 'Not linked'}
            </span>
          </div>

          {botWallet ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">ETH balance</p>
                  <p className="mt-2 text-2xl font-semibold tracking-tight text-white">
                    {formatCompactNumber(parseFloat(botWallet.ethBalance || '0'), 6)}
                    <span className="ml-2 text-sm font-medium text-slate-400">ETH</span>
                  </p>
                </div>
                <button
                  onClick={() => onFundBot?.(botWallet.address)}
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-sky-500 to-blue-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:from-sky-400 hover:to-blue-400"
                >
                  Fund bot
                </button>
              </div>

              <div className="mt-4 rounded-2xl border border-white/10 bg-black/15 p-3">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Bot address</p>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <p className="min-w-0 flex-1 font-mono text-sm text-slate-100">
                    {truncateAddress(botWallet.address)}
                  </p>
                  <button
                    onClick={() => copyToClipboard(botWallet.address, 'Bot address copied')}
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-white/10"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copy
                  </button>
                </div>
              </div>

              <p className="mt-3 text-xs text-slate-400">
                Uses Sepolia ETH from your active wallet.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-4 text-sm text-slate-300">
              {telegramLinked
                ? 'Bot wallet details will appear here after the next successful balance sync.'
                : 'Use the Telegram shortcut in the left rail to connect the assistant and enable bot wallet controls.'}
            </div>
          )}
        </section>

        <section className="rounded-[28px] border border-white/10 bg-slate-950/60 p-5 shadow-[0_16px_48px_rgba(0,0,0,0.22)] backdrop-blur-xl">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-fuchsia-400/20 bg-fuchsia-500/10 text-fuchsia-300">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Stealth flow</h3>
                <p className="text-xs text-slate-400">Private receives, funding detection, and claim readiness</p>
              </div>
            </div>
            <span className="rounded-full border border-fuchsia-400/20 bg-fuchsia-500/10 px-3 py-1 text-xs text-fuchsia-300">
              {stealthSummary.total} tracked
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Claim ready</p>
              <p className="mt-2 text-xl font-semibold text-white">{stealthSummary.funded}</p>
              <p className="mt-1 text-xs text-slate-400">Issues waiting for sweep confirmation</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Watching</p>
              <p className="mt-2 text-xl font-semibold text-white">{stealthSummary.active}</p>
              <p className="mt-1 text-xs text-slate-400">Issued receive routes still awaiting funds</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Claimed</p>
              <p className="mt-2 text-xl font-semibold text-white">{stealthSummary.claimed}</p>
              <p className="mt-1 text-xs text-slate-400">Completed sweeps into destination wallets</p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-black/15 p-4">
            {stealthSummary.latestFunded ? (
              <>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Latest claim-ready issue</p>
                <div className="mt-3 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-white">{stealthSummary.latestFunded.walletLabel}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {stealthSummary.latestFunded.networkLabel} · destination {truncateAddress(stealthSummary.latestFunded.destinationAddress)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-white">{stealthSummary.latestFunded.lastObservedBalanceEth || '0'} ETH</p>
                    <p className="mt-1 text-xs text-fuchsia-200">Ready to claim</p>
                  </div>
                </div>
              </>
            ) : stealthSummary.latestActive ? (
              <>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Latest watched route</p>
                <p className="mt-3 text-sm font-medium text-white">{stealthSummary.latestActive.walletLabel}</p>
                <p className="mt-1 text-xs text-slate-400">
                  Monitoring {truncateAddress(stealthSummary.latestActive.stealthAddress)} for new deposits.
                </p>
              </>
            ) : (
              <>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Stealth status</p>
                <p className="mt-3 text-sm font-medium text-white">No stealth receives issued yet</p>
                <p className="mt-1 text-xs text-slate-400">
                  Generate a stealth address from Telegram to start private receiving flows.
                </p>
              </>
            )}
          </div>
        </section>

        <section className="rounded-[28px] border border-white/10 bg-slate-950/60 p-5 shadow-[0_16px_48px_rgba(0,0,0,0.22)] backdrop-blur-xl">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.22em] text-slate-500">
                Market pulse
              </p>
              <p className="mt-1 text-sm text-slate-400">
                Lightweight view of the current pricing context.
              </p>
            </div>
          </div>

          <div className="grid gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Reference price</p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    {primaryPrice ? `$${formatCurrency(primaryPrice)}` : 'Loading'}
                  </p>
                </div>
                <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium ${portfolioChangeTone ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'}`}>
                  {portfolioChangeTone ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  {formattedChange}
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Wallet mode</p>
                <p className="mt-2 text-sm font-medium text-white">
                  {wallet ? 'Connected' : 'No wallet'}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {wallet ? 'Live balances are being tracked.' : 'Unlock or import a wallet to begin.'}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Refresh state</p>
                <p className="mt-2 text-sm font-medium text-white">
                  {refreshing ? 'Updating' : 'Idle'}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {refreshInProgress ? 'A refresh is already running.' : 'Manual refresh stays available from the hero.'}
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
