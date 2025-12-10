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
  const [validation, setValidation] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [validating, setValidating] = useState(false);

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
    }
  }, [isOpen]);

  // Early return AFTER all hooks are declared
  if (!isOpen) return null;

  // Validate transaction before sending
  const handleValidate = async () => {
    if (!recipient || !amount) {
      toast.error('Please fill recipient and amount fields');
      return;
    }

    try {
      setValidating(true);
      
      const network = asset.symbol === 'BTC' ? 'bitcoin' : 'ethereum';
      const fromAddress = asset.symbol === 'BTC' ? wallet?.bitcoin?.address : wallet?.ethereum?.address;
      
      const result = await transactionAPI.validateTransaction(
        network,
        fromAddress,
        recipient,
        amount,
        activeWalletId
      );

      setValidation(result);

      // Check if transaction requires confirmation
      if (result.requiresConfirmation || result.riskLevel === 'high' || result.riskLevel === 'critical') {
        setShowConfirmation(true);
      } else if (result.valid) {
        toast.success('Transaction validated successfully');
      }
    } catch (error) {
      console.error('Validation error:', error);
      toast.error('Failed to validate transaction');
    } finally {
      setValidating(false);
    }
  };

  // Get risk level color and icon
  const getRiskDisplay = (riskLevel) => {
    switch (riskLevel) {
      case 'low':
        return { color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20', icon: CheckCircle };
      case 'medium':
        return { color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', icon: AlertCircle };
      case 'high':
        return { color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20', icon: AlertTriangle };
      case 'critical':
        return { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', icon: AlertTriangle };
      default:
        return { color: 'text-gray-400', bg: 'bg-gray-500/10', border: 'border-gray-500/20', icon: Shield };
    }
  };

  const handleSend = async () => {
    if (!recipient || !amount || !password) {
      toast.error('Please fill all fields');
      return;
    }

    // If validation shows high/critical risk and not confirmed, show confirmation UI
    if (validation && (validation.riskLevel === 'high' || validation.riskLevel === 'critical') && !showConfirmation) {
      setShowConfirmation(true);
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

      // Handle requiresConfirmation response
      if (result.requiresConfirmation) {
        setValidation(result.validation);
        setShowConfirmation(true);
        toast.error('Transaction requires confirmation due to security concerns');
        return;
      }

      if (result.success) {
        const txHash = result.transactionHash || result.txHash || result.hash || result.data?.hash;
        console.log('Transaction hash:', txHash);
        
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

          {gasPrice && asset?.symbol !== 'BTC' && (
            <div className="bg-gray-700/50 rounded-lg p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Network Fee</span>
                <span className="text-white">
                  ~{typeof gasPrice === 'object' ? gasPrice.standard || gasPrice.maxFee || '0' : gasPrice} Gwei
                </span>
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

          {/* Validation Results */}
          {validation && (
            <div className={`rounded-lg p-4 border ${getRiskDisplay(validation.riskLevel).bg} ${getRiskDisplay(validation.riskLevel).border}`}>
              <div className="flex items-center gap-2 mb-3">
                {(() => {
                  const Icon = getRiskDisplay(validation.riskLevel).icon;
                  return <Icon className={`w-5 h-5 ${getRiskDisplay(validation.riskLevel).color}`} />;
                })()}
                <h4 className={`font-semibold ${getRiskDisplay(validation.riskLevel).color}`}>
                  {validation.riskLevel.charAt(0).toUpperCase() + validation.riskLevel.slice(1)} Risk Transaction
                </h4>
              </div>

              {/* Errors */}
              {validation.errors && validation.errors.length > 0 && (
                <div className="mb-3">
                  <p className="text-sm font-medium text-red-400 mb-1">Errors:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {validation.errors.map((error, idx) => (
                      <li key={idx} className="text-xs text-red-300">{error}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Warnings */}
              {validation.warnings && validation.warnings.length > 0 && (
                <div className="mb-3">
                  <p className="text-sm font-medium text-yellow-400 mb-1">Warnings:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {validation.warnings.map((warning, idx) => (
                      <li key={idx} className="text-xs text-yellow-300">{warning}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Validation Checks */}
              {validation.checks && (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-300 mb-1">Security Checks:</p>
                  {validation.checks.addressValid !== undefined && (
                    <div className="flex items-center gap-2 text-xs">
                      {validation.checks.addressValid ? 
                        <CheckCircle className="w-3 h-3 text-green-400" /> : 
                        <X className="w-3 h-3 text-red-400" />
                      }
                      <span className="text-gray-300">Address Format</span>
                    </div>
                  )}
                  {validation.checks.balanceSufficient !== undefined && (
                    <div className="flex items-center gap-2 text-xs">
                      {validation.checks.balanceSufficient ? 
                        <CheckCircle className="w-3 h-3 text-green-400" /> : 
                        <X className="w-3 h-3 text-red-400" />
                      }
                      <span className="text-gray-300">Sufficient Balance</span>
                    </div>
                  )}
                  {validation.checks.amountReasonable !== undefined && (
                    <div className="flex items-center gap-2 text-xs">
                      {validation.checks.amountReasonable ? 
                        <CheckCircle className="w-3 h-3 text-green-400" /> : 
                        <AlertTriangle className="w-3 h-3 text-yellow-400" />
                      }
                      <span className="text-gray-300">Amount Reasonable</span>
                    </div>
                  )}
                  {validation.checks.recipientSafe !== undefined && (
                    <div className="flex items-center gap-2 text-xs">
                      {validation.checks.recipientSafe ? 
                        <CheckCircle className="w-3 h-3 text-green-400" /> : 
                        <AlertTriangle className="w-3 h-3 text-red-400" />
                      }
                      <span className="text-gray-300">Recipient Safe</span>
                    </div>
                  )}
                </div>
              )}

              {/* Gas Estimate */}
              {validation.gasEstimate && (
                <div className="mt-3 pt-3 border-t border-gray-600">
                  <p className="text-xs text-gray-300">
                    Estimated Gas: <span className="text-white font-medium">{validation.gasEstimate.gasLimit || 'N/A'}</span> units
                  </p>
                  <p className="text-xs text-gray-300">
                    Gas Price: <span className="text-white font-medium">{validation.gasEstimate.gasPrice || 'N/A'}</span> Gwei
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Confirmation Warning for High/Critical Risk */}
          {showConfirmation && validation && (validation.riskLevel === 'high' || validation.riskLevel === 'critical') && (
            <div className="bg-red-500/10 border-2 border-red-500/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-6 h-6 text-red-400" />
                <h4 className="font-bold text-red-400">Confirm High-Risk Transaction</h4>
              </div>
              <p className="text-sm text-red-300 mb-3">
                This transaction has been flagged as {validation.riskLevel} risk. Please review all warnings carefully before proceeding.
              </p>
              <p className="text-xs text-gray-300">
                By clicking "Send Anyway", you acknowledge the risks and confirm you want to proceed with this transaction.
              </p>
            </div>
          )}

          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 flex gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-yellow-300">
              <p className="font-medium mb-1">Double-check before sending!</p>
              <p>Transactions cannot be reversed once confirmed.</p>
            </div>
          </div>

          <div className="flex gap-3">
            {!validation && (
              <button
                onClick={handleValidate}
                disabled={validating || !recipient || !amount}
                className="flex-1 py-3 px-6 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Shield className="w-4 h-4" />
                {validating ? 'Validating...' : 'Validate'}
              </button>
            )}
            <button
              onClick={onClose}
              className="flex-1 py-3 px-6 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={loading || !recipient || !amount || !password || (validation && !validation.valid)}
              className={`flex-1 py-3 px-6 ${showConfirmation && (validation?.riskLevel === 'high' || validation?.riskLevel === 'critical') ? 'bg-red-600 hover:bg-red-700' : 'bg-purple-600 hover:bg-purple-700'} disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2`}
            >
              <SendIcon className="w-4 h-4" />
              {loading ? 'Sending...' : showConfirmation && (validation?.riskLevel === 'high' || validation?.riskLevel === 'critical') ? 'Send Anyway' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
