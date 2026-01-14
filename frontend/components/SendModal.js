'use client'

import { useState, useEffect } from 'react';
import { X, Send as SendIcon, AlertCircle, Shield, AlertTriangle, CheckCircle } from 'lucide-react';
import { useWallet } from '@/contexts/DatabaseWalletContext';
import { transactionAPI, blockchainAPI, walletAPI } from '@/lib/api';
import toast from 'react-hot-toast';

export default function SendModal({ isOpen, onClose, asset }) {
  const { wallet, refreshData, selectedNetwork, activeWalletId } = useWallet();
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [gasPrice, setGasPrice] = useState(null);
  const [step, setStep] = useState(1); // 1: form, 2: confirmation
  const [addressHistory, setAddressHistory] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // Smooth modal animation
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => setShowModal(true), 10);
    } else {
      setShowModal(false);
    }
  }, [isOpen]);

  // Fetch gas price for Ethereum
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
      setRecipient('');
      setAmount('');
      setPassword('');
      setAddressHistory(null);
    }
  }, [isOpen]);

  // Early return AFTER all hooks are declared
  if (!isOpen) return null;

  // Check if we have the wallet address for current asset
  const hasWalletAddress = asset?.symbol === 'BTC'
    ? !!wallet?.bitcoin?.address
    : asset?.symbol === 'SOL'
      ? !!wallet?.solana?.address
      : !!wallet?.ethereum?.address;

  // Check if address was used before (simple check - could be enhanced with actual history from database)
  const checkAddressHistory = async () => {
    // For now, just return a placeholder
    // In a real app, you'd query your transaction history database
    setAddressHistory({
      previouslySent: false, // Set to true if found in history
      lastSentAmount: null,
      lastSentDate: null
    });
  };

  // Continue to confirmation screen
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

    const fromAddress = asset.symbol === 'BTC'
      ? wallet?.bitcoin?.address
      : asset.symbol === 'SOL'
        ? wallet?.solana?.address
        : wallet?.ethereum?.address;

    if (!fromAddress) {
      toast.error('❌ Wallet address not available. Please try again.');
      return;
    }

    // Validate balance
    const amountFloat = parseFloat(amount);
    const currentBalance = parseFloat(asset?.balance || 0);

    if (isNaN(amountFloat) || amountFloat <= 0) {
      toast.error('⚠️ Please enter a valid amount greater than 0');
      return;
    }

    if (amountFloat > currentBalance) {
      toast.error(`❌ Insufficient balance! You have ${currentBalance.toFixed(6)} ${asset.symbol}, but tried to send ${amountFloat} ${asset.symbol}`);
      return;
    }

    // Check address history
    await checkAddressHistory();

    // Move to confirmation screen
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

      // Decrypt wallet to get private key
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

      const [chain, networkName] = selectedNetwork.split('-');

      if (asset.symbol === 'BTC') {
        result = await transactionAPI.sendBitcoinTransaction(
          walletData.bitcoin.privateKey,
          recipient,
          parseFloat(amount),
          null,
          activeWalletId
        );
      } else if (asset.symbol === 'SOL') {
        result = await transactionAPI.sendSolanaTransaction(
          walletData.solana.privateKey,
          recipient,
          amount,
          { network: networkName, walletId: activeWalletId, confirmed: true }
        );
      } else if (asset.symbol === 'ETH') {
        result = await transactionAPI.sendEthereumTransaction(
          walletData.ethereum.privateKey,
          recipient,
          amount,
          { network: networkName, walletId: activeWalletId, confirmed: true }
        );
      } else {
        result = await transactionAPI.sendTokenTransaction(
          walletData.ethereum.privateKey,
          asset.address,
          recipient,
          amount,
          { network: networkName, walletId: activeWalletId, decimals: asset.decimals, confirmed: true }
        );
      }

      if (result.success) {
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
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 transition-opacity duration-300" style={{ zIndex: 9999 }}>
      <div className={`bg-slate-900/95 backdrop-blur-xl rounded-3xl max-w-md w-full border border-blue-500/30 shadow-2xl shadow-blue-500/20 transform transition-all duration-300 overflow-hidden ${showModal ? 'scale-100 translate-y-0 opacity-100' : 'scale-95 translate-y-4 opacity-0'}`}>
        {/* Header with Gradient Background */}
        <div className="relative overflow-hidden">
          {/* Animated gradient background */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-cyan-500/20 to-blue-600/20" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-900/90" />

          <div className="relative flex items-center justify-between p-6">
            <div className="flex items-center gap-4">
              {step === 2 && (
                <button
                  onClick={() => setStep(1)}
                  className="p-2 hover:bg-white/10 rounded-xl transition-all duration-200 group"
                >
                  <svg className="w-5 h-5 text-blue-300 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}
              <div className="relative">
                {/* Asset icon with glow effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-2xl blur-xl opacity-50" />
                <div className="relative w-14 h-14 bg-gradient-to-br from-blue-500 via-blue-600 to-cyan-500 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg">
                  {asset?.icon || asset?.symbol?.[0]}
                </div>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">
                  {step === 1 ? `Send ${asset?.symbol}` : 'Confirm Transaction'}
                </h3>
                <p className="text-sm text-blue-300/80">{asset?.name}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2.5 bg-white/5 hover:bg-red-500/20 rounded-xl transition-all duration-200 group border border-white/10 hover:border-red-500/30"
            >
              <X className="w-5 h-5 text-slate-400 group-hover:text-red-400" />
            </button>
          </div>

          {/* Step Indicator */}
          <div className="relative px-6 pb-4">
            <div className="flex items-center gap-2">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${step === 1 ? 'bg-blue-500/30 text-blue-300 border border-blue-400/50' : 'bg-green-500/20 text-green-400 border border-green-400/50'}`}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${step === 1 ? 'bg-blue-500 text-white' : 'bg-green-500 text-white'}`}>
                  {step === 1 ? '1' : '✓'}
                </div>
                Details
              </div>
              <div className={`h-0.5 flex-1 rounded-full transition-all ${step === 2 ? 'bg-gradient-to-r from-green-500 to-blue-500' : 'bg-slate-700'}`} />
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${step === 2 ? 'bg-blue-500/30 text-blue-300 border border-blue-400/50' : 'bg-slate-800/50 text-slate-500 border border-slate-700/50'}`}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${step === 2 ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-400'}`}>
                  2
                </div>
                Confirm
              </div>
            </div>
          </div>
        </div>

        {/* Step 1: Form */}
        {step === 1 && (
          <div className="p-6 space-y-5">
            {/* Balance Display */}
            <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-2xl p-4 border border-blue-500/20">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Available Balance</span>
                <div className="text-right">
                  <p className="text-lg font-bold text-white">{asset?.balance || '0'} <span className="text-blue-400">{asset?.symbol}</span></p>
                  {asset?.priceData && (
                    <p className="text-xs text-slate-400">≈ ${(parseFloat(asset?.balance || 0) * asset.priceData.current_price).toFixed(2)}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Recipient Address */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
                <span className="w-6 h-6 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </span>
                Recipient Address
              </label>
              <div className="relative group">
                <input
                  type="text"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  className="w-full px-4 py-4 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:bg-slate-800 transition-all duration-200 font-mono text-sm"
                  placeholder={`Enter ${asset?.symbol} address`}
                />
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/20 to-cyan-500/20 opacity-0 group-focus-within:opacity-100 transition-opacity -z-10 blur-xl" />
              </div>
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
                  <span className="w-6 h-6 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </span>
                  Amount
                </label>
                <button
                  onClick={() => setAmount(asset?.balance || '0')}
                  className="text-xs px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 hover:text-blue-300 rounded-lg transition-all font-medium"
                >
                  MAX
                </button>
              </div>
              <div className="relative group">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-4 py-4 pr-20 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white text-lg font-semibold placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:bg-slate-800 transition-all duration-200"
                  placeholder="0.00"
                  step="any"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-400 font-medium">
                  {asset?.symbol}
                </span>
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-500/20 to-blue-500/20 opacity-0 group-focus-within:opacity-100 transition-opacity -z-10 blur-xl" />
              </div>
              {amount && asset?.priceData && (
                <p className="text-sm text-slate-400 pl-1">
                  ≈ <span className="text-green-400 font-medium">${(parseFloat(amount) * asset.priceData.current_price).toFixed(2)}</span> USD
                </p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
                <span className="w-6 h-6 bg-purple-500/20 rounded-lg flex items-center justify-center">
                  <Shield className="w-3.5 h-3.5 text-purple-400" />
                </span>
                Wallet Password
              </label>
              <div className="relative group">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-4 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50 focus:bg-slate-800 transition-all duration-200"
                  placeholder="Enter your password to authorize"
                />
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 opacity-0 group-focus-within:opacity-100 transition-opacity -z-10 blur-xl" />
              </div>
            </div>

            {/* Gas Info */}
            {gasPrice && asset?.symbol !== 'BTC' && (
              <div className="flex items-center justify-between px-4 py-3 bg-slate-800/30 rounded-xl border border-slate-700/30">
                <span className="text-sm text-slate-400">Estimated Network Fee</span>
                <span className="text-sm text-blue-400 font-medium">
                  ~{typeof gasPrice === 'object' ? gasPrice.standard || gasPrice.maxFee || '0' : gasPrice} Gwei
                </span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={onClose}
                className="flex-1 py-4 px-6 bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 hover:text-white font-semibold rounded-xl transition-all duration-200 border border-slate-700/50 hover:border-slate-600/50"
              >
                Cancel
              </button>
              <button
                onClick={handleContinue}
                disabled={!recipient || !amount || !password}
                className="flex-1 py-4 px-6 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-400 hover:to-cyan-400 disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 disabled:shadow-none hover:scale-[1.02] active:scale-[0.98]"
              >
                Continue
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Confirmation Screen */}
        {step === 2 && (
          <div className="p-6 space-y-5">
            {/* Transaction Summary Card */}
            <div className="bg-gradient-to-br from-slate-800/80 to-slate-800/50 rounded-2xl p-5 border border-slate-700/50 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <SendIcon className="w-4 h-4 text-blue-400" />
                </div>
                <h4 className="font-semibold text-white">Transaction Summary</h4>
              </div>

              {/* From/To Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-xl">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                      </svg>
                    </div>
                    <span className="text-sm text-slate-400">From</span>
                  </div>
                  <span className="text-white font-mono text-xs bg-slate-800 px-3 py-1.5 rounded-lg">
                    {asset?.symbol === 'BTC'
                      ? `${wallet?.bitcoin?.address?.substring(0, 6)}...${wallet?.bitcoin?.address?.substring(wallet?.bitcoin?.address.length - 4)}`
                      : `${wallet?.ethereum?.address?.substring(0, 6)}...${wallet?.ethereum?.address?.substring(wallet?.ethereum?.address.length - 4)}`
                    }
                  </span>
                </div>

                <div className="flex justify-center">
                  <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-xl">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                      </svg>
                    </div>
                    <span className="text-sm text-slate-400">To</span>
                  </div>
                  <span className="text-white font-mono text-xs bg-slate-800 px-3 py-1.5 rounded-lg">
                    {`${recipient.substring(0, 6)}...${recipient.substring(recipient.length - 4)}`}
                  </span>
                </div>
              </div>

              {/* Amount Section */}
              <div className="border-t border-slate-700/50 pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Amount</span>
                  <div className="text-right">
                    <p className="text-xl font-bold text-white">{amount} <span className="text-blue-400">{asset?.symbol}</span></p>
                    {asset?.priceData && (
                      <p className="text-sm text-green-400">
                        ≈ ${(parseFloat(amount) * asset.priceData.current_price).toFixed(2)} USD
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Network Fee */}
              {gasPrice && asset?.symbol !== 'BTC' && (
                <div className="flex items-center justify-between pt-2 border-t border-slate-700/50">
                  <span className="text-sm text-slate-400">Network Fee</span>
                  <span className="text-sm text-blue-400 font-medium">
                    ~{typeof gasPrice === 'object' ? gasPrice.standard || gasPrice.maxFee || '0' : gasPrice} Gwei
                  </span>
                </div>
              )}
            </div>

            {/* Address History Check */}
            {addressHistory && (
              <div className={`rounded-2xl p-4 border ${addressHistory.previouslySent ? 'bg-green-500/10 border-green-500/30' : 'bg-amber-500/10 border-amber-500/30'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${addressHistory.previouslySent ? 'bg-green-500/20' : 'bg-amber-500/20'}`}>
                    {addressHistory.previouslySent ? (
                      <CheckCircle className="w-5 h-5 text-green-400" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-amber-400" />
                    )}
                  </div>
                  <div>
                    <h4 className={`font-semibold ${addressHistory.previouslySent ? 'text-green-400' : 'text-amber-400'}`}>
                      {addressHistory.previouslySent ? 'Known Address' : 'New Address'}
                    </h4>
                    <p className="text-sm text-slate-400">
                      {addressHistory.previouslySent
                        ? `Previously sent ${addressHistory.lastSentAmount} on ${addressHistory.lastSentDate}`
                        : 'First time sending to this address'
                      }
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Warning */}
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex gap-3">
              <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-300">Double-check before sending!</p>
                <p className="text-xs text-amber-200/70 mt-0.5">Transactions cannot be reversed once confirmed on the blockchain.</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-4 px-6 bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 hover:text-white font-semibold rounded-xl transition-all duration-200 border border-slate-700/50 hover:border-slate-600/50 flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>
              <button
                onClick={handleSend}
                disabled={loading}
                className="flex-1 py-4 px-6 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-green-500/25 hover:shadow-green-500/40 disabled:shadow-none hover:scale-[1.02] active:scale-[0.98]"
              >
                <SendIcon className="w-4 h-4" />
                {loading ? 'Sending...' : 'Confirm & Send'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
