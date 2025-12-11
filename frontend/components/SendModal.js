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
    if (!recipient || !amount || !password) {
      toast.error('Please fill all fields');
      return;
    }

    const fromAddress = asset.symbol === 'BTC' ? wallet?.bitcoin?.address : wallet?.ethereum?.address;
    
    if (!fromAddress) {
      toast.error('Wallet address not available');
      return;
    }

    // Validate balance
    const amountFloat = parseFloat(amount);
    const currentBalance = parseFloat(asset?.balance || 0);
    
    if (isNaN(amountFloat) || amountFloat <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    
    if (amountFloat > currentBalance) {
      toast.error(`Insufficient balance. Available: ${currentBalance.toFixed(6)} ${asset.symbol}`);
      return;
    }

    // Check address history
    await checkAddressHistory();
    
    // Move to confirmation screen
    setStep(2);
  };

  const handleSend = async () => {
    if (!recipient || !amount || !password) {
      toast.error('Please fill all fields');
      return;
    }

    try {
      setLoading(true);

      // Decrypt wallet to get private key
      const decrypted = await walletAPI.decryptData(wallet.encryptedData || wallet.encrypted, password);
      
      if (!decrypted.success) {
        toast.error('Invalid password');
        return;
      }

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
        toast.error(result.error || 'Transaction failed');
      }
    } catch (error) {
      console.error('Send error:', error);
      toast.error(error.response?.data?.error || 'Failed to send transaction');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-2xl max-w-md w-full border border-purple-500/20">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            {step === 2 && (
              <button
                onClick={() => setStep(1)}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <AlertCircle className="w-5 h-5 text-gray-400 rotate-180" />
              </button>
            )}
            <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold">
              {asset?.icon || asset?.symbol?.[0]}
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                {step === 1 ? `Send ${asset?.symbol}` : 'Confirm Transaction'}
              </h3>
              <p className="text-sm text-gray-400">{asset?.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Step 1: Form */}
        {step === 1 && (
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Recipient Address
              </label>
              <input
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                placeholder={`Enter ${asset?.symbol} address`}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-300">
                  Amount
                </label>
                <button
                  onClick={() => setAmount(asset?.balance || '0')}
                  className="text-xs text-purple-400 hover:text-purple-300"
                >
                  Max: {asset?.balance || '0'}
                </button>
              </div>
              <div className="relative">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                  placeholder="0.00"
                  step="any"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                  {asset?.symbol}
                </span>
              </div>
              {amount && asset?.priceData && (
                <p className="text-sm text-gray-400 mt-1">
                  ≈ ${(parseFloat(amount) * asset.priceData.current_price).toFixed(2)}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Wallet Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                placeholder="Enter your password"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={onClose}
                className="flex-1 py-3 px-6 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleContinue}
                disabled={!recipient || !amount || !password}
                className="flex-1 py-3 px-6 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                Continue
                <AlertCircle className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Confirmation Screen */}
        {step === 2 && (
          <div className="p-6 space-y-4">
            {/* Transaction Summary */}
            <div className="bg-gray-700/50 rounded-lg p-4 space-y-3">
              <h4 className="font-semibold text-white mb-3">Transaction Details</h4>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">From</span>
                  <span className="text-white font-mono text-xs">
                    {asset?.symbol === 'BTC' 
                      ? `${wallet?.bitcoin?.address?.substring(0, 8)}...${wallet?.bitcoin?.address?.substring(wallet?.bitcoin?.address.length - 6)}`
                      : `${wallet?.ethereum?.address?.substring(0, 8)}...${wallet?.ethereum?.address?.substring(wallet?.ethereum?.address.length - 6)}`
                    }
                  </span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">To</span>
                  <span className="text-white font-mono text-xs">
                    {`${recipient.substring(0, 8)}...${recipient.substring(recipient.length - 6)}`}
                  </span>
                </div>

                <div className="border-t border-gray-600 pt-2 mt-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Amount</span>
                    <div className="text-right">
                      <p className="text-white font-semibold">{amount} {asset?.symbol}</p>
                      {asset?.priceData && (
                        <p className="text-xs text-gray-400">
                          ≈ ${(parseFloat(amount) * asset.priceData.current_price).toFixed(2)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {gasPrice && asset?.symbol !== 'BTC' && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Network Fee</span>
                    <span className="text-white">
                      ~{typeof gasPrice === 'object' ? gasPrice.standard || gasPrice.maxFee || '0' : gasPrice} Gwei
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Address History Check */}
            {addressHistory && (
              <div className={`rounded-lg p-4 border ${addressHistory.previouslySent ? 'bg-green-500/10 border-green-500/20' : 'bg-yellow-500/10 border-yellow-500/20'}`}>
                <div className="flex items-center gap-2 mb-2">
                  {addressHistory.previouslySent ? (
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-yellow-400" />
                  )}
                  <h4 className={`font-semibold ${addressHistory.previouslySent ? 'text-green-400' : 'text-yellow-400'}`}>
                    {addressHistory.previouslySent ? 'Known Address' : 'New Address'}
                  </h4>
                </div>
                <p className="text-sm text-gray-300">
                  {addressHistory.previouslySent 
                    ? `You've sent to this address before. Last transaction: ${addressHistory.lastSentAmount} on ${addressHistory.lastSentDate}`
                    : 'This is the first time you\'re sending to this address. Please double-check it\'s correct.'
                  }
                </p>
              </div>
            )}

            {/* Warning */}
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 flex gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-yellow-300">
                <p className="font-medium mb-1">Double-check before sending!</p>
                <p>Transactions cannot be reversed once confirmed.</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-3 px-6 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleSend}
                disabled={loading}
                className="flex-1 py-3 px-6 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <SendIcon className="w-4 h-4" />
                {loading ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
