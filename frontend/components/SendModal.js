'use client'

import { useState, useEffect } from 'react';
import { X, Send as SendIcon, AlertCircle } from 'lucide-react';
import { useWallet } from '@/contexts/WalletContext';
import { transactionAPI, blockchainAPI, walletAPI } from '@/lib/api';
import toast from 'react-hot-toast';

export default function SendModal({ isOpen, onClose, asset }) {
  const { wallet, refreshData } = useWallet();
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [gasPrice, setGasPrice] = useState(null);

  if (!isOpen) return null;

  const handleSend = async () => {
    if (!recipient || !amount || !password) {
      toast.error('Please fill all fields');
      return;
    }

    try {
      setLoading(true);

      // Validate recipient address
      const network = asset.symbol === 'BTC' ? 'bitcoin' : 'ethereum';
      const validation = await walletAPI.validateAddress(network, recipient);
      
      if (!validation.isValid) {
        toast.error('Invalid recipient address');
        return;
      }

      // Decrypt wallet to get private key
      const decrypted = await walletAPI.decryptData(wallet.encrypted, password);
      if (!decrypted.success) {
        toast.error('Invalid password');
        return;
      }

      const walletData = JSON.parse(decrypted.data);
      let result;

      // Send transaction based on asset type
      if (asset.symbol === 'BTC') {
        result = await transactionAPI.sendBitcoinTransaction(
          walletData.bitcoin.privateKey,
          recipient,
          parseFloat(amount)
        );
      } else if (asset.symbol === 'ETH') {
        result = await transactionAPI.sendEthereumTransaction(
          walletData.ethereum.privateKey,
          recipient,
          amount
        );
      } else {
        // ERC-20 Token
        result = await transactionAPI.sendTokenTransaction(
          walletData.ethereum.privateKey,
          asset.address,
          recipient,
          amount
        );
      }

      if (result.success) {
        toast.success('Transaction sent successfully!');
        await refreshData();
        onClose();
      } else {
        toast.error(result.error || 'Transaction failed');
      }
    } catch (error) {
      console.error('Send error:', error);
      toast.error(error.response?.data?.error || 'Failed to send transaction');
    } finally {
      setLoading(false);
    }
  };

  // Fetch gas price for Ethereum
  const fetchGas = async () => {
    if (asset && asset.symbol !== 'BTC') {
      try {
        const gas = await blockchainAPI.getGasPrice();
        if (gas.success) {
          setGasPrice(gas.data.gasPrice);
        }
      } catch (error) {
        console.error('Failed to fetch gas price');
      }
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchGas();
    }
  }, [isOpen]);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-2xl max-w-md w-full border border-purple-500/20">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold">
              {asset?.icon || asset?.symbol?.[0]}
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Send {asset?.symbol}</h3>
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

        {/* Form */}
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
                Max: {parseFloat(asset?.balance || 0).toFixed(6)}
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

          {gasPrice && asset?.symbol !== 'BTC' && (
            <div className="bg-gray-700/50 rounded-lg p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Network Fee</span>
                <span className="text-white">~{gasPrice} Gwei</span>
              </div>
            </div>
          )}

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

          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 flex gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-yellow-300">
              <p className="font-medium mb-1">Double-check before sending!</p>
              <p>Transactions cannot be reversed once confirmed.</p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 px-6 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={loading || !recipient || !amount || !password}
              className="flex-1 py-3 px-6 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <SendIcon className="w-4 h-4" />
              {loading ? 'Sending...' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
