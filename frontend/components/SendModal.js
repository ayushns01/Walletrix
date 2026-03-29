'use client'

import { useState, useEffect, useMemo } from 'react';
import { X, Send as SendIcon, AlertCircle, Shield, AlertTriangle, CheckCircle } from 'lucide-react';
import { useWallet } from '@/contexts/DatabaseWalletContext';
import { transactionAPI, blockchainAPI, walletAPI } from '@/lib/api';
import { resolveNetworkFee } from '@/lib/sendFee.mjs';
import { getBuiltInSepoliaAutoSwapManifest } from '@/lib/sepoliaAutoSwapManifest.mjs';
import { buildSepoliaAutoSwapPreflightModel, buildSendModalTokenPickerOptions, buildTransferReviewStepData } from '@/lib/sepoliaAutoSwapViewModels.mjs';
import { isSepoliaAutoSwapNetwork } from '@/lib/sepoliaAutoSwap.mjs';
import toast from 'react-hot-toast';

export default function SendModal({
  isOpen,
  onClose,
  asset,
  initialRecipient = '',
  presetLabel = '',
  presetDescription = '',
}) {
  const {
    wallet,
    refreshData,
    selectedNetwork,
    activeWalletId,
    balances,
    prices,
    applyBalanceForSelectedNetwork,
  } = useWallet();
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [gasPrice, setGasPrice] = useState(null);
  const [step, setStep] = useState(1);
  const [addressHistory, setAddressHistory] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [freshBalance, setFreshBalance] = useState(null);
  const [freshBalanceLoading, setFreshBalanceLoading] = useState(false);
  const [selectedSendAssetSymbol, setSelectedSendAssetSymbol] = useState(asset?.symbol || 'ETH');
  const [sepoliaQuote, setSepoliaQuote] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => setShowModal(true), 10);
    } else {
      setShowModal(false);
    }
  }, [isOpen]);

  const fetchGas = async () => {
    if (asset && asset.symbol !== 'BTC') {
      try {
        const [chain, network] = selectedNetwork.split('-');
        const gas = await blockchainAPI.getGasPrice(network);
        if (gas.success) {
          setGasPrice(gas.data?.gasPrice || gas.gasPrice);
        }
      } catch (error) {
        console.error('Failed to fetch gas price:', error);
      }
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchGas();
      setStep(1);
      setRecipient(initialRecipient || '');
      setAmount('');
      setPassword('');
      setAddressHistory(null);
      setFreshBalance(null);
      setSepoliaQuote(null);
      setSelectedSendAssetSymbol(asset?.symbol || 'ETH');
    }
  }, [asset?.symbol, initialRecipient, isOpen]);

  const isSepoliaSupportedNetwork = isSepoliaAutoSwapNetwork(selectedNetwork);
  const sepoliaManifest = useMemo(() => {
    if (!isSepoliaSupportedNetwork) return null;

    try {
      return getBuiltInSepoliaAutoSwapManifest();
    } catch (error) {
      console.error('Failed to load Sepolia auto-swap manifest:', error);
      return null;
    }
  }, [isSepoliaSupportedNetwork]);

  const sepoliaTokenOptions = useMemo(() => buildSendModalTokenPickerOptions({
    network: selectedNetwork,
    manifest: sepoliaManifest,
  }), [selectedNetwork, sepoliaManifest]);

  const selectedSepoliaTokenOption = useMemo(
    () => sepoliaTokenOptions.find((option) => option.symbol === selectedSendAssetSymbol) || null,
    [sepoliaTokenOptions, selectedSendAssetSymbol]
  );

  const isSepoliaAutoSwapSend = Boolean(
    isSepoliaSupportedNetwork &&
    selectedSendAssetSymbol !== 'ETH' &&
    selectedSepoliaTokenOption?.token
  );

  const activeAsset = useMemo(() => {
    if (isSepoliaAutoSwapSend && selectedSepoliaTokenOption?.token) {
      return {
        ...selectedSepoliaTokenOption.token,
        icon: selectedSepoliaTokenOption.token.symbol?.[0] || '•',
        priceData: { current_price: parseFloat(selectedSepoliaTokenOption.token.displayPriceUsd || '0') },
      };
    }

    return asset;
  }, [asset, isSepoliaAutoSwapSend, selectedSepoliaTokenOption]);

  const sourceAssetSymbol = isSepoliaAutoSwapSend ? 'ETH' : asset?.symbol;

  const liveBalance = useMemo(() => {
    if (!sourceAssetSymbol) return activeAsset?.balance || '0';

    if (sourceAssetSymbol === 'BTC') {
      return balances.bitcoin || activeAsset?.balance || '0';
    }

    if (sourceAssetSymbol === 'SOL') {
      return balances.solana || activeAsset?.balance || '0';
    }

    if (sourceAssetSymbol === 'ETH') {
      const [chain] = (selectedNetwork || 'ethereum-mainnet').split('-');
      if (chain === 'ethereum') {
        return balances.ethereum || activeAsset?.balance || '0';
      }

      if (['polygon', 'arbitrum', 'optimism', 'bsc', 'avalanche', 'base'].includes(chain)) {
        return balances[chain] || activeAsset?.balance || '0';
      }
    }

    return activeAsset?.balance || '0';
  }, [activeAsset, balances, selectedNetwork, sourceAssetSymbol]);

  const livePriceData = useMemo(() => {
    if (!activeAsset?.symbol) return activeAsset?.priceData || null;
    if (isSepoliaAutoSwapSend) {
      return activeAsset?.priceData || null;
    }
    if (activeAsset.symbol === 'BTC') return prices.bitcoin || activeAsset?.priceData || null;
    if (activeAsset.symbol === 'SOL') return prices.solana || activeAsset?.priceData || null;
    if (activeAsset.symbol === 'ETH') return prices.ethereum || activeAsset?.priceData || null;
    return activeAsset?.priceData || null;
  }, [activeAsset, isSepoliaAutoSwapSend, prices]);

  const formatAddress = (value) => {
    if (!value) return 'Unavailable';
    if (value.length <= 12) return value;
    return `${value.substring(0, 6)}...${value.substring(value.length - 4)}`;
  };

  const formatWeiToEth = (weiValue, maximumFractionDigits = 6) => {
    if (weiValue === null || weiValue === undefined) return '0';
    const numericValue = Number(weiValue) / 1e18;
    if (!Number.isFinite(numericValue)) return '0';
    return numericValue.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits,
    });
  };

  const networkFee = resolveNetworkFee(gasPrice);

  const amountUsd = livePriceData?.current_price
    ? (parseFloat(amount || '0') * livePriceData.current_price).toFixed(2)
    : null;

  const reviewFromAddress = sourceAssetSymbol === 'BTC'
    ? wallet?.bitcoin?.address
    : sourceAssetSymbol === 'SOL'
      ? wallet?.solana?.address
      : wallet?.ethereum?.address;

  useEffect(() => {
    let cancelled = false;

    const fetchFreshBalance = async () => {
      if (!isOpen || !sourceAssetSymbol) return;

      setFreshBalanceLoading(true);

      try {
        const [, networkName] = (selectedNetwork || 'ethereum-mainnet').split('-');

        if (sourceAssetSymbol === 'BTC' && wallet?.bitcoin?.address) {
          const response = await blockchainAPI.getBitcoinBalance(wallet.bitcoin.address, networkName);
          if (!cancelled && response?.success) {
            const balance = response.balance?.btc || response.data?.balance || '0';
            setFreshBalance(balance);
          }
          return;
        }

        if (sourceAssetSymbol === 'SOL' && wallet?.solana?.address) {
          const response = await blockchainAPI.getSolanaBalance(wallet.solana.address, networkName);
          if (!cancelled && response?.success) {
            setFreshBalance(response.balance || response.data?.balance || '0');
          }
          return;
        }

        if (wallet?.ethereum?.address) {
          const response = await blockchainAPI.getEthereumBalance(wallet.ethereum.address, networkName);
          if (!cancelled && response?.success) {
            const balance = response.balance?.eth || response.data?.balance || '0';
            setFreshBalance(balance);
          }
        }
      } catch (error) {
        if (!cancelled) {
          setFreshBalance(null);
        }
      } finally {
        if (!cancelled) {
          setFreshBalanceLoading(false);
        }
      }
    };

    fetchFreshBalance();

    return () => {
      cancelled = true;
    };
  }, [isOpen, selectedNetwork, sourceAssetSymbol, wallet?.bitcoin?.address, wallet?.ethereum?.address, wallet?.solana?.address]);

  const resolvedBalance = freshBalance ?? liveBalance;

  if (!isOpen) return null;

  const checkAddressHistory = async () => {

    setAddressHistory({
      previouslySent: false,
      lastSentAmount: null,
      lastSentDate: null
    });
  };

  const handleContinue = async () => {
    if (!recipient) {
      toast.error('⚠️ Please enter a recipient address');
      return;
    }

    if (!amount) {
      toast.error('⚠️ Please enter an amount to send');
      return;
    }

    if (!password) {
      toast.error('⚠️ Password is required to authorize this transaction');
      return;
    }

    const fromAddress = sourceAssetSymbol === 'BTC'
      ? wallet?.bitcoin?.address
      : sourceAssetSymbol === 'SOL'
        ? wallet?.solana?.address
        : wallet?.ethereum?.address;

    if (!fromAddress) {
      toast.error('❌ Wallet address not available. Please try again.');
      return;
    }

    const amountFloat = parseFloat(amount);
    const currentBalance = parseFloat(resolvedBalance || 0);

    if (isNaN(amountFloat) || amountFloat <= 0) {
      toast.error('⚠️ Please enter a valid amount greater than 0');
      return;
    }

    if (isSepoliaAutoSwapSend) {
      const quoteResult = await transactionAPI.quoteSepoliaAutoSwapTransaction(
        fromAddress,
        recipient,
        amount,
        {
          token: selectedSepoliaTokenOption.token,
          manifest: sepoliaManifest,
        }
      );

      if (!quoteResult.success) {
        toast.error(`❌ ${quoteResult.error || 'Unable to estimate transaction cost right now.'}`);
        return;
      }

      const { parseEther } = await import('ethers');
      const preflight = buildSepoliaAutoSwapPreflightModel({
        availableEthWei: parseEther(String(resolvedBalance || '0')).toString(),
        requiredTokenSourcingWei: quoteResult.executionPlan.requiredWei,
        estimatedGasWei: quoteResult.estimatedGasWei,
      });

      if (!preflight.canProceed) {
        if (preflight.reason === 'gas-estimation-unavailable') {
          toast.error('❌ Unable to estimate transaction cost right now.');
        } else {
          toast.error('❌ Not enough Sepolia ETH to source this token and cover gas.');
        }
        return;
      }

      setSepoliaQuote({
        ...quoteResult,
        preflight,
        review: buildTransferReviewStepData({
          network: selectedNetwork,
          recipientAddress: recipient,
          amountBaseUnits: quoteResult.executionPlan.amountBaseUnits,
          token: selectedSepoliaTokenOption.token,
          estimatedGasWei: quoteResult.estimatedGasWei,
        }),
      });
    } else if (amountFloat > currentBalance) {
      toast.error(`❌ Insufficient balance! You have ${currentBalance.toFixed(6)} ${activeAsset.symbol}, but tried to send ${amountFloat} ${activeAsset.symbol}`);
      return;
    }

    await checkAddressHistory();

    setStep(2);
  };

  const handleSend = async () => {
    if (!recipient || !amount || !password) {
      toast.error('⚠️ Please fill all required fields');
      return;
    }

    try {
      setLoading(true);
      toast.loading('🔐 Verifying password...');

      const decrypted = await walletAPI.decryptData(wallet.encryptedData || wallet.encrypted, password);

      if (!decrypted.success) {
        toast.dismiss();
        toast.error('❌ Incorrect password. Please try again.');
        return;
      }

      toast.dismiss();

      const walletDataString = decrypted.decrypted || decrypted.data;

      if (!walletDataString) {
        toast.error('No wallet data found');
        return;
      }

      const walletData = JSON.parse(walletDataString);
      let result;

      // Detect old wallet format (created before private keys were stored)
      const isOldFormat = !walletData.ethereum?.privateKey && !walletData.bitcoin?.privateKey && !walletData.solana?.privateKey;
      if (isOldFormat) {
        toast.error('⚠️ Your wallet was created with an older format. Please re-import your wallet using your recovery phrase to enable sending.', { duration: 7000 });
        return;
      }

      const [, networkName] = selectedNetwork.split('-');

      if (isSepoliaAutoSwapSend) {
        if (!walletData.ethereum?.privateKey) {
          toast.error('❌ Ethereum key not found in wallet data.');
          return;
        }
        result = await transactionAPI.sendSepoliaAutoSwapTransaction(
          walletData.ethereum.privateKey,
          recipient,
          amount,
          {
            token: selectedSepoliaTokenOption.token,
            manifest: sepoliaManifest,
            walletId: activeWalletId,
            confirmed: true,
          }
        );
      } else if (activeAsset.symbol === 'BTC') {
        if (!walletData.bitcoin?.privateKey) {
          toast.error('❌ Bitcoin key not found in wallet data.');
          return;
        }
        result = await transactionAPI.sendBitcoinTransaction(
          walletData.bitcoin.privateKey,
          recipient,
          parseFloat(amount),
          null,
          activeWalletId
        );
      } else if (activeAsset.symbol === 'SOL') {
        if (!walletData.solana?.privateKey) {
          toast.error('❌ Solana key not found in wallet data.');
          return;
        }
        result = await transactionAPI.sendSolanaTransaction(
          walletData.solana.privateKey,
          recipient,
          amount,
          { network: networkName, walletId: activeWalletId, confirmed: true }
        );
      } else if (activeAsset.symbol === 'ETH') {
        if (!walletData.ethereum?.privateKey) {
          toast.error('❌ Ethereum key not found in wallet data.');
          return;
        }
        result = await transactionAPI.sendEthereumTransaction(
          walletData.ethereum.privateKey,
          recipient,
          amount,
          { network: networkName, walletId: activeWalletId, confirmed: true }
        );
      } else {
        if (!walletData.ethereum?.privateKey) {
          toast.error('❌ Ethereum key not found in wallet data.');
          return;
        }
        result = await transactionAPI.sendTokenTransaction(
          walletData.ethereum.privateKey,
          activeAsset.address,
          recipient,
          amount,
          { network: networkName, walletId: activeWalletId, decimals: activeAsset.decimals, confirmed: true }
        );
      }

      if (result.success) {
        if (isSepoliaAutoSwapSend && result.data?.postTransactionBalanceEth) {
          applyBalanceForSelectedNetwork(result.data.postTransactionBalanceEth);
        }

        const txHash = result.transactionHash || result.txHash || result.hash || result.data?.hash;

        if (txHash) {
          const [chain, networkName] = selectedNetwork.split('-');
          let explorerUrl = '';

          if (chain === 'ethereum') {
            if (networkName === 'mainnet') {
              explorerUrl = `https://etherscan.io/tx/${txHash}`;
            } else if (networkName === 'sepolia') {
              explorerUrl = `https://sepolia.etherscan.io/tx/${txHash}`;
            }
          }

          toast.success(
            <div>
              <p>Transaction sent successfully!</p>
              <p className="text-xs mt-1">Hash: {txHash.substring(0, 10)}...</p>
              {explorerUrl && (
                <a
                  href={explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-300 underline text-xs"
                >
                  View on Explorer
                </a>
              )}
            </div>,
            { duration: 5000 }
          );
        } else {
          toast.success('Transaction sent successfully!');
        }

        await refreshData();
        onClose();
      } else {
        console.error('Transaction failed:', result);
        toast.error('❌ Transaction failed: ' + (result.error || 'Unknown error. Please try again.'));
      }
    } catch (error) {
      console.error('Send error:', error);
      toast.dismiss();
      if (error.message?.includes('insufficient funds')) {
        toast.error('❌ Insufficient balance to cover transaction and gas fees');
      } else if (error.message?.includes('network')) {
        toast.error('❌ Network error. Please check your connection and try again.');
      } else if (error.message?.includes('gas')) {
        toast.error('❌ Gas estimation failed. Network may be congested.');
      } else {
        toast.error('❌ Failed to send transaction: ' + (error.response?.data?.error || error.message || 'Unknown error'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 px-4 py-4 backdrop-blur-xl"
      style={{ zIndex: 9999 }}
    >
      <div
        className={`relative flex max-h-[calc(100vh-2rem)] w-full max-w-xl flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[#101114]/95 shadow-[0_32px_90px_rgba(0,0,0,0.55)] transition-all duration-300 ${
          showModal ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-4 scale-95 opacity-0'
        }`}
      >
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-white/5 blur-3xl" />
          <div className="absolute -left-24 bottom-[-5rem] h-64 w-64 rounded-full bg-slate-700/20 blur-3xl" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
        </div>

        <div className="relative border-b border-white/5 bg-gradient-to-b from-white/[0.04] to-transparent px-5 pb-4 pt-5 sm:px-6 sm:pb-5 sm:pt-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-4">
              {step === 2 && (
                <button
                  onClick={() => setStep(1)}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-slate-300 transition-colors hover:border-white/15 hover:bg-white/[0.06] hover:text-white"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}
              <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#2a2d33] via-[#191b20] to-[#0d0e12] text-xl font-semibold text-white shadow-[0_12px_40px_rgba(0,0,0,0.35)]">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.12),transparent_60%)]" />
                <span className="relative">{activeAsset?.icon || activeAsset?.symbol?.[0]}</span>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="truncate text-lg font-semibold tracking-tight text-white sm:text-xl">
                    {step === 1 ? `Send ${activeAsset?.symbol}` : 'Review transfer'}
                  </h3>
                  <span className="hidden rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400 sm:inline-flex">
                    Premium
                  </span>
                </div>
                <p className="mt-1 truncate text-sm text-slate-400">{activeAsset?.name}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-slate-400 transition-colors hover:border-white/15 hover:bg-white/[0.06] hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-5 flex items-center gap-3">
            <div className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${
              step === 1 ? 'border-white/10 bg-white/[0.05] text-white' : 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300'
            }`}>
              <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold ${
                step === 1 ? 'bg-white/10 text-white' : 'bg-emerald-500 text-white'
              }`}>
                {step === 1 ? '1' : '✓'}
              </span>
              Details
            </div>
            <div className={`h-px flex-1 ${step === 2 ? 'bg-gradient-to-r from-white/10 via-white/35 to-emerald-400/40' : 'bg-white/10'}`} />
            <div className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${
              step === 2 ? 'border-white/10 bg-white/[0.05] text-white' : 'border-white/5 bg-white/[0.02] text-slate-500'
            }`}>
              <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold ${
                step === 2 ? 'bg-white/10 text-white' : 'bg-white/[0.04] text-slate-500'
              }`}>
                2
              </span>
              Review
            </div>
          </div>
        </div>

        <div className="relative flex-1 overflow-y-auto">
          {step === 1 && (
            <div className="space-y-5 px-5 py-5 sm:px-6">
              <div className="rounded-3xl border border-white/[0.08] bg-white/[0.03] p-4 sm:p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-slate-400">
                      {isSepoliaAutoSwapSend ? 'Available Sepolia ETH' : 'Available balance'}
                    </p>
                    <p className="mt-2 text-2xl font-semibold tracking-tight text-white">
                      {resolvedBalance || '0'} <span className="text-slate-400">{sourceAssetSymbol}</span>
                    </p>
                    {isSepoliaAutoSwapSend && (
                      <p className="mt-2 text-sm text-slate-400">
                        This token send will be sourced from your Sepolia ETH right before delivery.
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    {livePriceData ? (
                      <p className="text-sm text-slate-300">
                        ≈ ${(parseFloat(resolvedBalance || 0) * (isSepoliaAutoSwapSend ? (prices.ethereum?.current_price || 0) : livePriceData.current_price)).toFixed(2)}
                      </p>
                    ) : (
                      <p className="text-sm text-slate-500">No live pricing</p>
                    )}
                    {freshBalanceLoading && (
                      <p className="mt-1 text-xs text-slate-400">Syncing live balance...</p>
                    )}
                  </div>
                </div>
              </div>

              {isSepoliaSupportedNetwork && (
                <div className="rounded-3xl border border-white/[0.08] bg-[#0c0d11] p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-4">
                    <label className="text-sm font-medium text-slate-200">
                      What would you like to send?
                    </label>
                    <span className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
                      Walletrix got you
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedSendAssetSymbol('ETH')}
                      className={`rounded-full border px-3 py-2 text-sm font-medium transition ${
                        selectedSendAssetSymbol === 'ETH'
                          ? 'border-sky-400/30 bg-sky-500/15 text-sky-100'
                          : 'border-white/[0.08] bg-white/[0.03] text-slate-300 hover:border-white/15 hover:bg-white/[0.06]'
                      }`}
                    >
                      ETH
                    </button>
                    {sepoliaTokenOptions.map((option) => (
                      <button
                        key={option.symbol}
                        type="button"
                        onClick={() => setSelectedSendAssetSymbol(option.symbol)}
                        className={`rounded-full border px-3 py-2 text-sm font-medium transition ${
                          selectedSendAssetSymbol === option.symbol
                            ? 'border-sky-400/30 bg-sky-500/15 text-sky-100'
                            : 'border-white/[0.08] bg-white/[0.03] text-slate-300 hover:border-white/15 hover:bg-white/[0.06]'
                        }`}
                      >
                        {option.symbol}
                      </button>
                    ))}
                  </div>

                  {isSepoliaAutoSwapSend && selectedSepoliaTokenOption && (
                    <div className="mt-4 rounded-2xl border border-sky-400/20 bg-sky-500/10 p-4">
                      <p className="text-sm font-medium text-sky-100">
                        You do not need to worry about swaps. Walletrix got you.
                      </p>
                      <p className="mt-2 text-sm leading-6 text-sky-100/80">
                        We&apos;ll source {selectedSepoliaTokenOption.symbol} from your Sepolia ETH right before sending.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-sky-100/75">
                        <span className="rounded-full border border-sky-300/20 bg-black/20 px-2.5 py-1">
                          ${selectedSepoliaTokenOption.displayPriceUsd} per token
                        </span>
                        <span className="rounded-full border border-sky-300/20 bg-black/20 px-2.5 py-1">
                          {selectedSepoliaTokenOption.availabilityLabel}
                        </span>
                      </div>
                      <p className="mt-3 text-sm text-slate-300">
                        {selectedSepoliaTokenOption.shortDescription}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {(presetLabel || presetDescription) && (
                <div className="rounded-3xl border border-white/[0.08] bg-white/[0.025] p-4">
                  {presetLabel ? <p className="text-sm font-medium text-white">{presetLabel}</p> : null}
                  {presetDescription ? <p className="mt-1 text-sm leading-6 text-slate-400">{presetDescription}</p> : null}
                </div>
              )}

              <div className="rounded-3xl border border-white/[0.08] bg-[#0c0d11] p-4 sm:p-5">
                <div className="flex items-center justify-between gap-4">
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-200">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-slate-300">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </span>
                    Recipient Address
                  </label>
                  <span className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Required</span>
                </div>
                <div className="mt-3 relative">
                  <input
                    type="text"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    className="w-full rounded-2xl border border-white/[0.08] bg-[#111218] px-4 py-4 font-mono text-sm text-white placeholder:text-slate-500 outline-none transition-colors focus:border-white/15 focus:bg-[#14161c]"
                    placeholder={`Enter ${activeAsset?.symbol} address`}
                  />
                </div>
              </div>

              <div className="rounded-3xl border border-white/[0.08] bg-[#0c0d11] p-4 sm:p-5">
                <div className="flex items-center justify-between gap-4">
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-200">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-slate-300">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </span>
                    Amount
                  </label>
                  {!isSepoliaAutoSwapSend && (
                    <button
                      onClick={() => setAmount(resolvedBalance || '0')}
                      className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs font-medium tracking-wide text-slate-300 transition-colors hover:border-white/15 hover:bg-white/[0.08] hover:text-white"
                    >
                      MAX
                    </button>
                  )}
                </div>
                <div className="mt-3 relative">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full rounded-2xl border border-white/[0.08] bg-[#111218] px-4 py-4 pr-20 text-lg font-semibold text-white placeholder:text-slate-500 outline-none transition-colors focus:border-white/15 focus:bg-[#14161c]"
                    placeholder="0.00"
                    step="any"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400">
                    {activeAsset?.symbol}
                  </span>
                </div>
                {amount && livePriceData && (
                  <p className="mt-2 text-sm text-slate-400">
                    ≈ <span className="font-medium text-white">${amountUsd}</span> USD
                  </p>
                )}
                {isSepoliaAutoSwapSend && (
                  <p className="mt-2 text-sm text-slate-500">
                    You are entering the amount of {activeAsset?.symbol} to deliver. Walletrix will calculate the ETH required for you.
                  </p>
                )}
              </div>

              <div className="rounded-3xl border border-white/[0.08] bg-[#0c0d11] p-4 sm:p-5">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-200">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-slate-300">
                    <Shield className="h-4 w-4" />
                  </span>
                  Wallet Password
                </label>
                <div className="mt-3 relative">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-2xl border border-white/[0.08] bg-[#111218] px-4 py-4 text-white placeholder:text-slate-500 outline-none transition-colors focus:border-white/15 focus:bg-[#14161c]"
                    placeholder="Enter your password to authorize"
                  />
                </div>
              </div>

              {gasPrice && sourceAssetSymbol !== 'BTC' && (
                <div className="flex items-center justify-between rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3">
                  <span className="text-sm text-slate-400">Estimated network fee</span>
                  <span className="text-sm font-medium text-white">~{networkFee} Gwei</span>
                </div>
              )}

              <div className="flex flex-col gap-3 pt-1 sm:flex-row">
                <button
                  onClick={onClose}
                  className="flex-1 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-6 py-4 font-medium text-slate-300 transition-colors hover:border-white/15 hover:bg-white/[0.06] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleContinue}
                  disabled={!recipient || !amount || !password}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white px-6 py-4 font-semibold text-black transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:border-white/5 disabled:bg-white/[0.08] disabled:text-slate-500"
                >
                  Continue
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5 px-5 py-5 sm:px-6">
              <div className="rounded-3xl border border-white/[0.08] bg-[#0c0d11] p-4 sm:p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.04] text-slate-200">
                    <SendIcon className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-base font-semibold tracking-tight text-white">Transfer review</h4>
                    <p className="text-sm text-slate-400">Confirm the destination, amount, and network details.</p>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">From</p>
                    <p className="mt-3 font-mono text-sm text-white">{formatAddress(reviewFromAddress)}</p>
                  </div>
                  <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">To</p>
                    <p className="mt-3 font-mono text-sm text-white">{formatAddress(recipient)}</p>
                  </div>
                </div>

                <div className="mt-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Amount</p>
                      <p className="mt-2 text-2xl font-semibold tracking-tight text-white">
                        {amount} <span className="text-slate-400">{activeAsset?.symbol}</span>
                      </p>
                    </div>
                    {livePriceData && (
                      <div className="text-right">
                        <p className="text-sm text-slate-400">Estimated value</p>
                        <p className="mt-1 text-sm font-medium text-white">
                          ≈ {amountUsd ? `$${amountUsd}` : '$0.00'} USD
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {isSepoliaAutoSwapSend && sepoliaQuote?.review && (
                  <>
                    <div className="mt-3 rounded-2xl border border-sky-400/20 bg-sky-500/10 p-4">
                      <p className="text-sm font-medium text-sky-100">
                        {sepoliaQuote.review.supportiveCopy}
                      </p>
                      <p className="mt-2 text-sm text-slate-300">
                        We&apos;ll source {activeAsset?.symbol} from ETH on Sepolia at a fixed demo rate before delivering it to the recipient.
                      </p>
                    </div>

                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
                        <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Demo price</p>
                        <p className="mt-2 text-sm font-medium text-white">${sepoliaQuote.review.demoTokenPriceUsd} per token</p>
                      </div>
                      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
                        <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Conversion rate</p>
                        <p className="mt-2 text-sm font-medium text-white">{sepoliaQuote.review.conversionRateEthPerToken} ETH</p>
                      </div>
                      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
                        <p className="text-xs uppercase tracking-[0.16em] text-slate-500">ETH for token sourcing</p>
                        <p className="mt-2 text-sm font-medium text-white">{formatWeiToEth(sepoliaQuote.review.requiredTokenSourcingWei)} ETH</p>
                      </div>
                      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
                        <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Estimated gas</p>
                        <p className="mt-2 text-sm font-medium text-white">{formatWeiToEth(sepoliaQuote.review.estimatedGasWei)} ETH</p>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3">
                      <span className="text-sm text-slate-400">Total ETH outflow</span>
                      <span className="text-sm font-medium text-white">{formatWeiToEth(sepoliaQuote.review.totalEthOutflowWei)} ETH</span>
                    </div>
                  </>
                )}

                {gasPrice && sourceAssetSymbol !== 'BTC' && !isSepoliaAutoSwapSend && (
                  <div className="mt-3 flex items-center justify-between rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3">
                    <span className="text-sm text-slate-400">Network fee</span>
                    <span className="text-sm font-medium text-white">~{networkFee} Gwei</span>
                  </div>
                )}
              </div>

              {addressHistory && (
                <div
                  className={`rounded-3xl border p-4 ${
                    addressHistory.previouslySent
                      ? 'border-emerald-500/25 bg-emerald-500/10'
                      : 'border-amber-500/25 bg-amber-500/10'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                        addressHistory.previouslySent ? 'bg-emerald-500/15' : 'bg-amber-500/15'
                      }`}
                    >
                      {addressHistory.previouslySent ? (
                        <CheckCircle className="h-5 w-5 text-emerald-300" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-amber-300" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className={`text-sm font-semibold ${addressHistory.previouslySent ? 'text-emerald-300' : 'text-amber-300'}`}>
                        {addressHistory.previouslySent ? 'Known address' : 'New address'}
                      </h4>
                      <p className="mt-1 text-sm leading-6 text-slate-400">
                        {addressHistory.previouslySent
                          ? `Previously sent ${addressHistory.lastSentAmount} on ${addressHistory.lastSentDate}`
                          : 'First time sending to this address'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="rounded-3xl border border-amber-500/20 bg-amber-500/10 p-4">
                <div className="flex gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-500/15">
                    <AlertCircle className="h-5 w-5 text-amber-300" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-amber-200">Double-check before sending</p>
                    <p className="mt-1 text-sm leading-6 text-amber-100/70">Transactions cannot be reversed once confirmed on the blockchain.</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-1 sm:flex-row">
                <button
                  onClick={() => setStep(1)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-6 py-4 font-medium text-slate-300 transition-colors hover:border-white/15 hover:bg-white/[0.06] hover:text-white"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back
                </button>
                <button
                  onClick={handleSend}
                  disabled={loading}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white px-6 py-4 font-semibold text-black transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:border-white/5 disabled:bg-white/[0.08] disabled:text-slate-500"
                >
                  <SendIcon className="h-4 w-4" />
                  {loading ? 'Sending...' : 'Confirm and send'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
