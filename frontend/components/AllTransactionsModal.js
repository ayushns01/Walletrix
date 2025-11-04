'use client'

import { useState } from 'react';
import { X, ArrowUpRight, ArrowDownRight, Search, Filter } from 'lucide-react';

export default function AllTransactionsModal({ isOpen, onClose, transactions, wallet, selectedNetwork, onTransactionClick }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // all, sent, received
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  if (!isOpen) return null;

  // Get network name
  const getNetworkName = (tx) => {
    if (tx.network) {
      if (tx.network === 'ethereum') return 'Ethereum';
      if (tx.network === 'bitcoin') return 'Bitcoin';
      return tx.network.charAt(0).toUpperCase() + tx.network.slice(1);
    }
    
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

  // Filter and search transactions
  const filteredTransactions = transactions.filter(tx => {
    const isOutgoing = tx.from?.toLowerCase() === wallet?.ethereum?.address?.toLowerCase() || 
                     tx.from?.toLowerCase() === wallet?.bitcoin?.address?.toLowerCase();
    
    // Filter by type
    if (filterType === 'sent' && !isOutgoing) return false;
    if (filterType === 'received' && isOutgoing) return false;
    
    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        tx.hash?.toLowerCase().includes(searchLower) ||
        tx.from?.toLowerCase().includes(searchLower) ||
        tx.to?.toLowerCase().includes(searchLower) ||
        tx.value?.toString().toLowerCase().includes(searchLower) ||
        getNetworkName(tx).toLowerCase().includes(searchLower)
      );
    }
    
    return true;
  });

  // Pagination
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTransactions = filteredTransactions.slice(startIndex, startIndex + itemsPerPage);

  const formatAmount = (value) => {
    if (!value) return '0';
    const num = parseFloat(value);
    if (num > 1000) return num.toFixed(2);
    if (num > 1) return num.toFixed(4);
    return num.toFixed(6);
  };

  const formatHash = (hash) => {
    if (!hash) return 'N/A';
    return `${hash.slice(0, 8)}...${hash.slice(-8)}`;
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown';
    const date = new Date(timestamp.includes('T') ? timestamp : parseInt(timestamp) * 1000);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
  <div className="glass-effect rounded-3xl border border-blue-500/30 shadow-2xl shadow-blue-500/30 max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-blue-500/20">
          <div>
            <h2 className="text-2xl font-bold text-blue-100">All Transactions</h2>
            <p className="text-blue-300/70">{filteredTransactions.length} transactions found</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-blue-500/20 rounded-xl transition-colors"
          >
            <X className="w-6 h-6 text-blue-300" />
          </button>
        </div>

        {/* Filters and Search */}
        <div className="p-6 border-b border-blue-500/20 bg-gradient-to-r from-blue-950/20 to-black/40">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-blue-400" />
              <input
                type="text"
                placeholder="Search transactions (hash, address, amount)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gradient-to-r from-black/60 to-blue-950/40 border border-blue-500/30 rounded-xl text-blue-100 placeholder-blue-300/50 focus:border-blue-400/50 focus:outline-none"
              />
            </div>
            
            {/* Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-blue-400" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="pl-10 pr-8 py-3 bg-gradient-to-r from-black/60 to-blue-950/40 border border-blue-500/30 rounded-xl text-blue-100 focus:border-blue-400/50 focus:outline-none appearance-none cursor-pointer"
              >
                <option value="all">All Transactions</option>
                <option value="sent">Sent Only</option>
                <option value="received">Received Only</option>
              </select>
            </div>
          </div>
        </div>

  {/* Transactions List */}
  <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
          {paginatedTransactions.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-lg text-blue-100/80">No transactions found</p>
              <p className="text-sm text-blue-300/60 mt-2">
                {searchTerm || filterType !== 'all' 
                  ? 'Try adjusting your search or filter criteria' 
                  : 'Your transaction history will appear here'
                }
              </p>
            </div>
          ) : (
            <div className="p-6 space-y-3">
              {paginatedTransactions.map((tx, index) => {
                const isOutgoing = tx.from?.toLowerCase() === wallet?.ethereum?.address?.toLowerCase() || 
                                 tx.from?.toLowerCase() === wallet?.bitcoin?.address?.toLowerCase();
                const networkName = getNetworkName(tx);

                return (
                  <div
                    key={index}
                    onClick={() => onTransactionClick(tx)}
                    className="group relative overflow-hidden bg-gradient-to-r from-black/60 via-blue-950/40 to-black/60 rounded-2xl border border-blue-500/20 hover:border-blue-400/40 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/25 hover:-translate-y-1 cursor-pointer"
                  >
                    {/* Status indicator line */}
                    <div className={`absolute left-0 top-0 w-1 h-full ${isOutgoing ? 'bg-gradient-to-b from-red-400 to-red-600' : 'bg-gradient-to-b from-green-400 to-green-600'}`}></div>
                    
                    <div className="relative p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          {/* Icon */}
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${
                            isOutgoing 
                              ? 'bg-gradient-to-br from-red-500/20 to-red-600/10 border-red-500/30' 
                              : 'bg-gradient-to-br from-green-500/20 to-green-600/10 border-green-500/30'
                          }`}>
                            {isOutgoing ? (
                              <ArrowUpRight className="w-6 h-6 text-red-300" />
                            ) : (
                              <ArrowDownRight className="w-6 h-6 text-green-300" />
                            )}
                          </div>
                          
                          {/* Transaction Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-1">
                              <p className="text-blue-50 font-semibold">
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
                            
                            <div className="flex items-center gap-2 text-sm text-blue-300/80">
                              <span>{networkName}</span>
                              <span className="text-blue-400/60">•</span>
                              <span className="font-mono">{formatHash(tx.hash)}</span>
                            </div>
                          </div>
                          
                          {/* Amount and Date */}
                          <div className="text-right">
                            <p className={`font-bold text-lg ${
                              isOutgoing ? 'text-red-300' : 'text-green-300'
                            }`}>
                              {isOutgoing ? '-' : '+'}{formatAmount(tx.value)}
                            </p>
                            <p className="text-blue-300/70 text-sm">
                              {formatDate(tx.timestamp)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-6 border-t border-blue-500/20 bg-gradient-to-r from-blue-950/20 to-black/40">
            <div className="flex items-center justify-between">
              <p className="text-blue-300/70 text-sm">
                Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredTransactions.length)} of {filteredTransactions.length}
              </p>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600/20 to-blue-800/20 hover:from-blue-500/30 hover:to-blue-700/30 border border-blue-500/30 hover:border-blue-400/50 rounded-lg text-blue-100 font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                
                <span className="px-4 py-2 text-blue-100">
                  {currentPage} of {totalPages}
                </span>
                
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600/20 to-blue-800/20 hover:from-blue-500/30 hover:to-blue-700/30 border border-blue-500/30 hover:border-blue-400/50 rounded-lg text-blue-100 font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}