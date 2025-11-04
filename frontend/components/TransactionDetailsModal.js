'use client'

import { useState } from 'react';
import { X, ExternalLink, Copy, ArrowUpRight, ArrowDownRight, Clock, Hash, User, DollarSign, Network, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';

export default function TransactionDetailsModal({ isOpen, onClose, transaction, wallet, selectedNetwork }) {
  const [copied, setCopied] = useState(null);

  if (!isOpen || !transaction) return null;

  // Determine network name and explorer URL
  const getNetworkInfo = () => {
    if (transaction.network) {
      if (transaction.network === 'ethereum') return { name: 'Ethereum', explorer: 'https://etherscan.io' };
      if (transaction.network === 'bitcoin') return { name: 'Bitcoin', explorer: 'https://blockchain.info' };
    }
    
    const [chain, network] = selectedNetwork.split('-');
    switch (chain) {
      case 'ethereum':
        if (network === 'mainnet') return { name: 'Ethereum', explorer: 'https://etherscan.io' };
        if (network === 'sepolia') return { name: 'Sepolia', explorer: 'https://sepolia.etherscan.io' };
        if (network === 'goerli') return { name: 'Goerli', explorer: 'https://goerli.etherscan.io' };
        if (network === 'holesky') return { name: 'Holesky', explorer: 'https://holesky.etherscan.io' };
        return { name: 'Ethereum', explorer: 'https://etherscan.io' };
      case 'polygon':
        if (network === 'mainnet') return { name: 'Polygon', explorer: 'https://polygonscan.com' };
        if (network === 'mumbai') return { name: 'Mumbai', explorer: 'https://mumbai.polygonscan.com' };
        return { name: 'Polygon', explorer: 'https://polygonscan.com' };
      case 'arbitrum':
        if (network === 'mainnet') return { name: 'Arbitrum', explorer: 'https://arbiscan.io' };
        if (network === 'goerli') return { name: 'Arbitrum Goerli', explorer: 'https://goerli.arbiscan.io' };
        return { name: 'Arbitrum', explorer: 'https://arbiscan.io' };
      case 'optimism':
        if (network === 'mainnet') return { name: 'Optimism', explorer: 'https://optimistic.etherscan.io' };
        if (network === 'goerli') return { name: 'Optimism Goerli', explorer: 'https://goerli-optimism.etherscan.io' };
        return { name: 'Optimism', explorer: 'https://optimistic.etherscan.io' };
      case 'base':
        if (network === 'mainnet') return { name: 'Base', explorer: 'https://basescan.org' };
        if (network === 'goerli') return { name: 'Base Goerli', explorer: 'https://goerli.basescan.org' };
        return { name: 'Base', explorer: 'https://basescan.org' };
      case 'bsc':
        if (network === 'mainnet') return { name: 'BSC', explorer: 'https://bscscan.com' };
        if (network === 'testnet') return { name: 'BSC Testnet', explorer: 'https://testnet.bscscan.com' };
        return { name: 'BSC', explorer: 'https://bscscan.com' };
      case 'avalanche':
        if (network === 'mainnet') return { name: 'Avalanche', explorer: 'https://snowtrace.io' };
        if (network === 'fuji') return { name: 'Fuji', explorer: 'https://testnet.snowtrace.io' };
        return { name: 'Avalanche', explorer: 'https://snowtrace.io' };
      case 'bitcoin':
        if (network === 'mainnet') return { name: 'Bitcoin', explorer: 'https://blockchain.info' };
        if (network === 'testnet') return { name: 'Bitcoin Testnet', explorer: 'https://blockstream.info/testnet' };
        return { name: 'Bitcoin', explorer: 'https://blockchain.info' };
      default:
        return { name: 'Unknown', explorer: '' };
    }
  };

  const networkInfo = getNetworkInfo();
  const isOutgoing = transaction.from?.toLowerCase() === wallet?.ethereum?.address?.toLowerCase() || 
                    transaction.from?.toLowerCase() === wallet?.bitcoin?.address?.toLowerCase();

  // Debug transaction status information
  console.log('Transaction status debug:', {
    status: transaction.status,
    confirmations: transaction.confirmations,
    blockNumber: transaction.blockNumber,
    blockHash: transaction.blockHash,
    receipt: transaction.receipt,
    allStatusFields: {
      status: transaction.status,
      confirmations: transaction.confirmations,
      blockNumber: transaction.blockNumber,
      blockHash: transaction.blockHash,
      receipt: transaction.receipt
    }
  });

  const handleCopy = (text, label) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    toast.success(`${label} copied!`);
    setTimeout(() => setCopied(null), 2000);
  };

  const formatAddress = (address) => {
    if (!address) return 'N/A';
    return `${address.slice(0, 8)}...${address.slice(-8)}`;
  };

  const formatFullDate = (timestamp) => {
    if (!timestamp) return 'Unknown';
    const date = new Date(timestamp.includes('T') ? timestamp : parseInt(timestamp) * 1000);
    return date.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    });
  };

  const getStatusColor = () => {
    // Handle different status formats
    if (transaction.status === 'confirmed' || 
        transaction.status === '1' || 
        transaction.status === 1 ||
        transaction.status === 'success' ||
        transaction.confirmations > 0 ||
        (transaction.blockNumber && parseInt(transaction.blockNumber) > 0)) return 'text-green-400';
    
    // Everything else is considered failed
    return 'text-red-400';
  };

  const getStatusText = () => {
    // Handle different status formats
    if (transaction.status === 'confirmed' || 
        transaction.status === '1' || 
        transaction.status === 1 ||
        transaction.status === 'success' ||
        transaction.confirmations > 0 ||
        (transaction.blockNumber && parseInt(transaction.blockNumber) > 0)) return 'Confirmed';
    
    // Everything else is considered failed
    return 'Failed';
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="glass-effect rounded-3xl border border-blue-500/30 shadow-2xl shadow-blue-500/30 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-blue-500/20">
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border ${
              isOutgoing 
                ? 'bg-gradient-to-br from-red-500/20 to-red-600/10 border-red-500/30' 
                : 'bg-gradient-to-br from-green-500/20 to-green-600/10 border-green-500/30'
            }`}>
              {isOutgoing ? (
                <ArrowUpRight className="w-8 h-8 text-red-300" />
              ) : (
                <ArrowDownRight className="w-8 h-8 text-green-300" />
              )}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-blue-100">
                {isOutgoing ? 'Sent Transaction' : 'Received Transaction'}
              </h2>
              <p className="text-blue-300/70">{networkInfo.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-blue-500/20 rounded-xl transition-colors"
          >
            <X className="w-6 h-6 text-blue-300" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Amount Section */}
          <div className="text-center py-6 bg-gradient-to-r from-blue-900/30 to-black/50 rounded-2xl border border-blue-500/20">
            <p className="text-blue-300/70 text-sm font-medium mb-2">Amount</p>
            <p className={`text-4xl font-bold ${isOutgoing ? 'text-red-300' : 'text-green-300'}`}>
              {isOutgoing ? '-' : '+'}{transaction.value || '0'}
            </p>
            <p className="text-blue-300/70 text-sm mt-2">
              {transaction.symbol || (networkInfo.name === 'Bitcoin' ? 'BTC' : 'ETH')}
            </p>
          </div>

          {/* Status */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gradient-to-r from-blue-900/30 to-black/50 rounded-xl p-4 border border-blue-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-blue-400" />
                <p className="text-blue-300/70 text-sm font-medium">Status</p>
              </div>
              <p className={`font-bold text-lg ${getStatusColor()}`}>
                {getStatusText()}
              </p>
            </div>

            <div className="bg-gradient-to-r from-blue-900/30 to-black/50 rounded-xl p-4 border border-blue-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Network className="w-5 h-5 text-blue-400" />
                <p className="text-blue-300/70 text-sm font-medium">Network</p>
              </div>
              <p className="font-bold text-lg text-blue-100">
                {networkInfo.name}
              </p>
            </div>
          </div>

          {/* Transaction Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-blue-100">Transaction Details</h3>
            
            {/* Transaction Hash */}
            {transaction.hash && (
              <div className="bg-gradient-to-r from-blue-900/30 to-black/50 rounded-xl p-4 border border-blue-500/20">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Hash className="w-5 h-5 text-blue-400" />
                    <p className="text-blue-300/70 text-sm font-medium">Transaction Hash</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopy(transaction.hash, 'Transaction Hash')}
                      className="p-1 hover:bg-blue-500/20 rounded-lg transition-colors"
                    >
                      <Copy className="w-4 h-4 text-blue-400" />
                    </button>
                    {networkInfo.explorer && (
                      <button
                        onClick={() => window.open(`${networkInfo.explorer}/tx/${transaction.hash}`, '_blank')}
                        className="p-1 hover:bg-blue-500/20 rounded-lg transition-colors"
                      >
                        <ExternalLink className="w-4 h-4 text-blue-400" />
                      </button>
                    )}
                  </div>
                </div>
                <p className="font-mono text-blue-100 text-sm break-all">
                  {transaction.hash}
                </p>
              </div>
            )}

            {/* From Address */}
            {transaction.from && (
              <div className="bg-gradient-to-r from-blue-900/30 to-black/50 rounded-xl p-4 border border-blue-500/20">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <User className="w-5 h-5 text-blue-400" />
                    <p className="text-blue-300/70 text-sm font-medium">From</p>
                  </div>
                  <button
                    onClick={() => handleCopy(transaction.from, 'From Address')}
                    className="p-1 hover:bg-blue-500/20 rounded-lg transition-colors"
                  >
                    <Copy className="w-4 h-4 text-blue-400" />
                  </button>
                </div>
                <p className="font-mono text-blue-100 text-sm break-all">
                  {transaction.from}
                </p>
                {transaction.from?.toLowerCase() === wallet?.ethereum?.address?.toLowerCase() && (
                  <p className="text-xs text-blue-400 mt-1">Your address</p>
                )}
              </div>
            )}

            {/* To Address */}
            {transaction.to && (
              <div className="bg-gradient-to-r from-blue-900/30 to-black/50 rounded-xl p-4 border border-blue-500/20">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <User className="w-5 h-5 text-blue-400" />
                    <p className="text-blue-300/70 text-sm font-medium">To</p>
                  </div>
                  <button
                    onClick={() => handleCopy(transaction.to, 'To Address')}
                    className="p-1 hover:bg-blue-500/20 rounded-lg transition-colors"
                  >
                    <Copy className="w-4 h-4 text-blue-400" />
                  </button>
                </div>
                <p className="font-mono text-blue-100 text-sm break-all">
                  {transaction.to}
                </p>
                {transaction.to?.toLowerCase() === wallet?.ethereum?.address?.toLowerCase() && (
                  <p className="text-xs text-blue-400 mt-1">Your address</p>
                )}
              </div>
            )}

            {/* Gas Fee */}
            {console.log('Transaction fee debug:', {
              gasUsed: transaction.gasUsed,
              gasPrice: transaction.gasPrice,
              gas: transaction.gas,
              fee: transaction.fee,
              transactionFee: transaction.transactionFee,
              value: transaction.value,
              allFields: Object.keys(transaction)
            })}
            {(transaction.gasUsed || transaction.gas || transaction.gasLimit) && 
             (transaction.gasPrice || transaction.effectiveGasPrice || transaction.maxFeePerGas) || 
             transaction.fee || 
             transaction.transactionFee || 
             transaction.gasFee ? (
              <div className="bg-gradient-to-r from-blue-900/30 to-black/50 rounded-xl p-4 border border-blue-500/20">
                <div className="flex items-center gap-2 mb-3">
                  <DollarSign className="w-5 h-5 text-blue-400" />
                  <p className="text-blue-300/70 text-sm font-medium">Transaction Fee</p>
                </div>
                
                {/* Ethereum-style gas fee calculation */}
                {(transaction.gasUsed || transaction.gas || transaction.gasLimit) && 
                 (transaction.gasPrice || transaction.effectiveGasPrice || transaction.maxFeePerGas) && (
                  <div className="space-y-3">
                    <div>
                      {(() => {
                        const gasUsed = transaction.gasUsed || transaction.gas || transaction.gasLimit || '0';
                        const gasPrice = transaction.gasPrice || transaction.effectiveGasPrice || transaction.maxFeePerGas || '0';
                        const feeInEth = (parseFloat(gasUsed) * parseFloat(gasPrice) / 1e18);
                        
                        return (
                          <>
                            <p className="font-bold text-lg text-blue-100">
                              {feeInEth.toFixed(8)} ETH
                            </p>
                            <p className="text-xs text-blue-300/70">
                              ≈ ${(feeInEth * 2500).toFixed(2)} USD
                            </p>
                          </>
                        );
                      })()}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-blue-500/20">
                      <div>
                        <p className="text-xs text-blue-300/70 mb-1">Gas Used</p>
                        <p className="font-semibold text-blue-100">
                          {parseInt(transaction.gasUsed || transaction.gas || transaction.gasLimit || '0').toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-blue-300/70 mb-1">Gas Price</p>
                        <p className="font-semibold text-blue-100">
                          {(parseFloat(transaction.gasPrice || transaction.effectiveGasPrice || transaction.maxFeePerGas || '0') / 1e9).toFixed(2)} Gwei
                        </p>
                      </div>
                    </div>
                    
                    {(transaction.maxFeePerGas || transaction.maxPriorityFeePerGas) && (
                      <div className="grid grid-cols-2 gap-4 mt-2">
                        {transaction.maxFeePerGas && (
                          <div>
                            <p className="text-xs text-blue-300/70 mb-1">Max Fee Per Gas</p>
                            <p className="font-semibold text-blue-100">
                              {(parseFloat(transaction.maxFeePerGas) / 1e9).toFixed(2)} Gwei
                            </p>
                          </div>
                        )}
                        {transaction.maxPriorityFeePerGas && (
                          <div>
                            <p className="text-xs text-blue-300/70 mb-1">Max Priority Fee</p>
                            <p className="font-semibold text-blue-100">
                              {(parseFloat(transaction.maxPriorityFeePerGas) / 1e9).toFixed(2)} Gwei
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className="mt-3 pt-3 border-t border-blue-500/20">
                      <p className="text-xs text-blue-300/70 mb-1">Fee Calculation</p>
                      <p className="font-mono text-xs text-blue-200/80">
                        {parseInt(transaction.gasUsed || transaction.gas || transaction.gasLimit || '0').toLocaleString()} × {(parseFloat(transaction.gasPrice || transaction.effectiveGasPrice || transaction.maxFeePerGas || '0') / 1e9).toFixed(2)} Gwei = {(parseFloat(transaction.gasUsed || transaction.gas || transaction.gasLimit || '0') * parseFloat(transaction.gasPrice || transaction.effectiveGasPrice || transaction.maxFeePerGas || '0') / 1e18).toFixed(8)} ETH
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Direct fee amount (for when gas details aren't available) */}
                {(transaction.fee || transaction.transactionFee || transaction.gasFee) && 
                 !(transaction.gasUsed || transaction.gas || transaction.gasLimit) && (
                  <div className="space-y-3">
                    <div>
                      <p className="font-bold text-lg text-blue-100">
                        {transaction.fee || transaction.transactionFee || transaction.gasFee}
                      </p>
                      <p className="text-xs text-blue-300/70">
                        Transaction fee
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Bitcoin-style fee */}
                {transaction.fee && !transaction.gasUsed && networkInfo.name.includes('Bitcoin') && (
                  <div className="space-y-3">
                    <div>
                      <p className="font-bold text-lg text-blue-100">
                        {parseFloat(transaction.fee).toFixed(8)} BTC
                      </p>
                      <p className="text-xs text-blue-300/70">
                        ≈ ${(parseFloat(transaction.fee) * 45000).toFixed(2)} USD
                      </p>
                    </div>
                    
                    {transaction.size && (
                      <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-blue-500/20">
                        <div>
                          <p className="text-xs text-blue-300/70 mb-1">Transaction Size</p>
                          <p className="font-semibold text-blue-100">
                            {transaction.size} bytes
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-blue-300/70 mb-1">Fee Rate</p>
                          <p className="font-semibold text-blue-100">
                            {(parseFloat(transaction.fee) * 1e8 / transaction.size).toFixed(2)} sat/byte
                          </p>
                        </div>
                      </div>
                    )}
                    
                    <div className="mt-3 pt-3 border-t border-blue-500/20">
                      <p className="text-xs text-blue-300/70 mb-1">Fee Details</p>
                      <p className="font-mono text-xs text-blue-200/80">
                        {(parseFloat(transaction.fee) * 1e8).toFixed(0)} satoshis
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-gradient-to-r from-blue-900/30 to-black/50 rounded-xl p-4 border border-blue-500/20">
                <div className="flex items-center gap-2 mb-3">
                  <DollarSign className="w-5 h-5 text-blue-400" />
                  <p className="text-blue-300/70 text-sm font-medium">Transaction Fee</p>
                </div>
                <p className="text-blue-100">
                  Fee information not available
                </p>
                <p className="text-xs text-blue-300/70 mt-1">
                  Transaction fee data may not be included in this transaction record
                </p>
              </div>
            )}

            {/* Block Number */}
            {transaction.blockNumber && (
              <div className="bg-gradient-to-r from-blue-900/30 to-black/50 rounded-xl p-4 border border-blue-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <Hash className="w-5 h-5 text-blue-400" />
                  <p className="text-blue-300/70 text-sm font-medium">Block Number</p>
                </div>
                <p className="font-bold text-blue-100">
                  #{parseInt(transaction.blockNumber).toLocaleString()}
                </p>
              </div>
            )}

            {/* Timestamp */}
            {transaction.timestamp && (
              <div className="bg-gradient-to-r from-blue-900/30 to-black/50 rounded-xl p-4 border border-blue-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-5 h-5 text-blue-400" />
                  <p className="text-blue-300/70 text-sm font-medium">Timestamp</p>
                </div>
                <p className="font-bold text-blue-100 font-mono text-lg">
                  {transaction.timestamp}
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-4">
            {networkInfo.explorer && transaction.hash && (
              <button
                onClick={() => window.open(`${networkInfo.explorer}/tx/${transaction.hash}`, '_blank')}
                className="flex-1 py-3 px-6 bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-500 hover:to-blue-700 text-white font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-2"
              >
                <ExternalLink className="w-5 h-5" />
                View on Explorer
              </button>
            )}
            <button
              onClick={onClose}
              className="flex-1 py-3 px-6 bg-gradient-to-r from-gray-700 to-gray-900 hover:from-gray-600 hover:to-gray-800 text-blue-100 font-bold rounded-xl transition-all duration-300 border border-blue-500/30"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}