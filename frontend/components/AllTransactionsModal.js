'use client'

import { useState, useEffect, useCallback } from 'react';
import { X, ArrowUpRight, ArrowDownRight, Search, Filter, Download, Calendar, TrendingUp, SortAsc, SortDesc } from 'lucide-react';
import api, { blockchainAPI } from '../lib/api';
import toast from 'react-hot-toast';

export default function AllTransactionsModal({ isOpen, onClose, transactions: initialTransactions, wallet, selectedNetwork, onTransactionClick }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // all, incoming, outgoing
  const [networkFilter, setNetworkFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('timestamp');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [amountMin, setAmountMin] = useState('');
  const [amountMax, setAmountMax] = useState('');
  const [isAdvancedSearch, setIsAdvancedSearch] = useState(false);
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState(initialTransactions || []);
  const [pagination, setPagination] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [showAnalytics, setShowAnalytics] = useState(false);

  const itemsPerPage = 10;
  const [allTransactions, setAllTransactions] = useState([]);
  const [fetchingFromBlockchain, setFetchingFromBlockchain] = useState(false);

  // Fetch fresh transactions from Etherscan when modal opens
  const fetchFreshTransactions = useCallback(async () => {
    if (!wallet) return;
    
    setFetchingFromBlockchain(true);
    try {
      const [chain, network] = selectedNetwork.split('-');
      
      if (chain === 'ethereum' || ['polygon', 'arbitrum', 'optimism', 'bsc', 'avalanche', 'base'].includes(chain)) {
        const address = wallet.ethereum?.address;
        if (!address) {
          toast.error('No Ethereum address found');
          return;
        }
        
        // Fetch up to 100 transactions from Etherscan
        const response = await blockchainAPI.getEthereumTransactions(address, 1, 100, selectedNetwork);
        
        if (response.success && response.transactions) {
          // Normalize and filter valid transactions
          const validTxs = response.transactions
            .filter(tx => tx.hash && (tx.value_eth || tx.value))
            .map(tx => ({
              ...tx,
              network: selectedNetwork,
              txHash: tx.hash,
              amount: tx.value_eth || tx.value || '0',
              tokenSymbol: tx.tokenSymbol || 'ETH',
              status: tx.status || 'confirmed'
            }));
          setAllTransactions(validTxs);
          toast.success(`Loaded ${validTxs.length} transactions from blockchain`);
        } else {
          setAllTransactions([]);
          toast.info('No transactions found on blockchain');
        }
      } else if (chain === 'bitcoin') {
        const address = wallet.bitcoin?.address;
        if (!address) {
          toast.error('No Bitcoin address found');
          return;
        }
        
        const response = await blockchainAPI.getBitcoinTransactions(address, network);
        
        if (response.success && response.transactions) {
          // Normalize and filter valid Bitcoin transactions
          const validTxs = response.transactions
            .filter(tx => tx.hash && (tx.value_btc || tx.value))
            .map(tx => ({
              ...tx,
              network: selectedNetwork,
              txHash: tx.hash,
              amount: tx.value_btc || tx.value || '0',
              tokenSymbol: 'BTC',
              status: tx.status || 'confirmed'
            }));
          setAllTransactions(validTxs);
          toast.success(`Loaded ${validTxs.length} transactions from blockchain`);
        } else {
          setAllTransactions([]);
          toast.info('No transactions found on blockchain');
        }
      }
    } catch (error) {
      console.error('Error fetching transactions from blockchain:', error);
      
      // Handle specific error cases
      if (error.response?.status === 429) {
        toast.error('Rate limit exceeded. Showing cached transactions.');
      } else {
        toast.error('Failed to fetch fresh transactions. Showing cached data.');
      }
      
      // Always fallback to initial transactions if fetch fails
      setAllTransactions(initialTransactions || []);
    } finally {
      setFetchingFromBlockchain(false);
    }
  }, [wallet, selectedNetwork, initialTransactions]);

  // Reset filters and fetch fresh transactions when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentPage(1);
      // Show cached transactions immediately
      setAllTransactions(initialTransactions || []);
      // Then fetch fresh transactions from Etherscan in background
      fetchFreshTransactions();
      if (wallet?.id) {
        loadAnalytics();
      }
    } else {
      // Reset filters when modal closes
      setSearchTerm('');
      setFilterType('all');
      setNetworkFilter('');
      setStatusFilter('');
      setDateFrom('');
      setDateTo('');
      setAmountMin('');
      setAmountMax('');
      setIsAdvancedSearch(false);
      setAllTransactions([]);
    }
  }, [isOpen, wallet?.id, fetchFreshTransactions]);

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    try {
      // Filter transactions locally from blockchain data
      let filtered = [...(allTransactions || [])];

      // Apply search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        filtered = filtered.filter(tx => 
          tx.hash?.toLowerCase().includes(search) ||
          tx.from?.toLowerCase().includes(search) ||
          tx.to?.toLowerCase().includes(search)
        );
      }

      // Apply type filter
      if (filterType !== 'all') {
        const isOutgoing = (tx) => 
          tx.from?.toLowerCase() === wallet?.ethereum?.address?.toLowerCase() ||
          tx.from?.toLowerCase() === wallet?.bitcoin?.address?.toLowerCase();
        
        if (filterType === 'outgoing') {
          filtered = filtered.filter(tx => isOutgoing(tx));
        } else if (filterType === 'incoming') {
          filtered = filtered.filter(tx => !isOutgoing(tx));
        }
      }

      // Apply network filter
      if (networkFilter) {
        filtered = filtered.filter(tx => tx.network === networkFilter);
      }

      // Apply status filter
      if (statusFilter) {
        filtered = filtered.filter(tx => tx.status?.toLowerCase() === statusFilter.toLowerCase());
      }

      // Apply date filters
      if (dateFrom || dateTo) {
        filtered = filtered.filter(tx => {
          const txDate = new Date(tx.timestamp?.includes('T') ? tx.timestamp : parseInt(tx.timestamp) * 1000);
          if (dateFrom && txDate < new Date(dateFrom)) return false;
          if (dateTo && txDate > new Date(dateTo)) return false;
          return true;
        });
      }

      // Apply amount filters
      if (amountMin || amountMax) {
        filtered = filtered.filter(tx => {
          const amount = parseFloat(tx.value_eth || tx.value_btc || 0);
          if (amountMin && amount < parseFloat(amountMin)) return false;
          if (amountMax && amount > parseFloat(amountMax)) return false;
          return true;
        });
      }

      // Apply sorting
      filtered.sort((a, b) => {
        let aVal, bVal;
        
        if (sortBy === 'timestamp') {
          aVal = new Date(a.timestamp?.includes('T') ? a.timestamp : parseInt(a.timestamp) * 1000).getTime();
          bVal = new Date(b.timestamp?.includes('T') ? b.timestamp : parseInt(b.timestamp) * 1000).getTime();
        } else if (sortBy === 'amount') {
          aVal = parseFloat(a.value_eth || a.value_btc || 0);
          bVal = parseFloat(b.value_eth || b.value_btc || 0);
        }
        
        return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
      });

      // Apply pagination
      const startIndex = (currentPage - 1) * itemsPerPage;
      const paginatedTxs = filtered.slice(startIndex, startIndex + itemsPerPage);
      
      setTransactions(paginatedTxs);
      setPagination({
        currentPage,
        totalPages: Math.ceil(filtered.length / itemsPerPage),
        totalItems: filtered.length,
        itemsPerPage
      });
    } catch (error) {
      console.error('Error loading transactions:', error);
      setTransactions(allTransactions || []);
    } finally {
      setLoading(false);
    }
  }, [wallet?.id, currentPage, searchTerm, filterType, networkFilter, statusFilter, sortBy, sortOrder, dateFrom, dateTo, amountMin, amountMax, allTransactions]);

  const loadAnalytics = useCallback(async () => {
    if (!wallet?.id) return;

    try {
      const params = new URLSearchParams();
      if (networkFilter) params.append('network', networkFilter);

      const response = await api.get(`/api/v1/transactions/wallet/${wallet.id}/analytics?${params}`);
      
      if (response.success) {
        setAnalytics(response.data);
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    }
  }, [wallet?.id, networkFilter]);

  const exportTransactions = async (format) => {
    if (!wallet?.id) return;

    try {
      const params = new URLSearchParams({ format });
      if (networkFilter) params.append('network', networkFilter);
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/transactions/wallet/${wallet.id}/export?${params}`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `transactions_${new Date().toISOString().split('T')[0]}.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error exporting transactions:', error);
    }
  };

  // Trigger search when filters change
  useEffect(() => {
    if (isOpen && allTransactions && allTransactions.length > 0) {
      const timeoutId = setTimeout(() => {
        setCurrentPage(1);
        loadTransactions();
      }, 300); // Debounce search

      return () => clearTimeout(timeoutId);
    }
  }, [searchTerm, filterType, networkFilter, statusFilter, sortBy, sortOrder, dateFrom, dateTo, amountMin, amountMax, isOpen, loadTransactions, allTransactions]);

  // Load transactions when page changes
  useEffect(() => {
    if (isOpen && currentPage > 1) {
      loadTransactions();
    }
  }, [currentPage, isOpen, loadTransactions]);

  if (!isOpen) return null;

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterType('all');
    setNetworkFilter('');
    setStatusFilter('');
    setDateFrom('');
    setDateTo('');
    setAmountMin('');
    setAmountMax('');
    setCurrentPage(1);
  };

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

  const getNetworkOptions = () => {
    const networks = [...new Set(transactions.map(tx => tx.network))];
    return networks.filter(Boolean);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="glass-effect rounded-3xl border border-blue-500/30 shadow-2xl shadow-blue-500/30 max-w-7xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-blue-500/20">
          <div className="flex items-center gap-4">
            <div>
              <h2 className="text-2xl font-bold text-blue-100">Transaction History</h2>
              <p className="text-blue-300/70">
                {fetchingFromBlockchain ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin">⏳</span> Fetching from Etherscan...
                  </span>
                ) : (
                  pagination ? `${pagination.totalItems} transactions found` : `${transactions.length} transactions`
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAnalytics(!showAnalytics)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600/20 to-purple-800/20 hover:from-purple-500/30 hover:to-purple-700/30 border border-purple-500/30 rounded-xl text-purple-100 transition-all duration-300"
              >
                <TrendingUp className="w-4 h-4" />
                Analytics
              </button>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-blue-500/20 rounded-xl transition-colors"
          >
            <X className="w-6 h-6 text-blue-300" />
          </button>
        </div>

        {/* Analytics Panel */}
        {showAnalytics && analytics && (
          <div className="p-6 border-b border-blue-500/20 bg-gradient-to-r from-purple-950/20 to-black/40">
            <h3 className="text-lg font-semibold text-purple-100 mb-4">Transaction Analytics (30 days)</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-green-500/20 to-green-600/10 border border-green-500/30 rounded-xl p-4">
                <div className="text-green-300 text-sm">Total Transactions</div>
                <div className="text-green-100 text-2xl font-bold">{analytics.overview.totalTransactions}</div>
              </div>
              <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/30 rounded-xl p-4">
                <div className="text-blue-300 text-sm">Incoming</div>
                <div className="text-blue-100 text-2xl font-bold">{analytics.overview.incomingTransactions}</div>
              </div>
              <div className="bg-gradient-to-br from-orange-500/20 to-orange-600/10 border border-orange-500/30 rounded-xl p-4">
                <div className="text-orange-300 text-sm">Outgoing</div>
                <div className="text-orange-100 text-2xl font-bold">{analytics.overview.outgoingTransactions}</div>
              </div>
              <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/30 rounded-xl p-4">
                <div className="text-purple-300 text-sm">Success Rate</div>
                <div className="text-purple-100 text-2xl font-bold">{analytics.overview.successRate}%</div>
              </div>
            </div>
          </div>
        )}

        {/* Filters and Search */}
        <div className="p-6 border-b border-blue-500/20 bg-gradient-to-r from-blue-950/20 to-black/40 space-y-4">
          {/* Basic Search and Filters */}
          <div className="flex flex-col lg:flex-row gap-4">
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
            
            <div className="flex gap-3">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-4 py-3 bg-gradient-to-r from-black/60 to-blue-950/40 border border-blue-500/30 rounded-xl text-blue-100 focus:border-blue-400/50 focus:outline-none"
              >
                <option value="all">All Types</option>
                <option value="incoming">Incoming</option>
                <option value="outgoing">Outgoing</option>
              </select>

              <button
                onClick={() => setIsAdvancedSearch(!isAdvancedSearch)}
                className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600/20 to-blue-800/20 hover:from-blue-500/30 hover:to-blue-700/30 border border-blue-500/30 rounded-xl text-blue-100 transition-all duration-300"
              >
                <Filter className="w-4 h-4" />
                {isAdvancedSearch ? 'Hide Filters' : 'More Filters'}
              </button>

              <button
                onClick={() => exportTransactions('csv')}
                className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-green-600/20 to-green-800/20 hover:from-green-500/30 hover:to-green-700/30 border border-green-500/30 rounded-xl text-green-100 transition-all duration-300"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            </div>
          </div>

          {/* Advanced Filters */}
          {isAdvancedSearch && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-blue-500/20">
              <select
                value={networkFilter}
                onChange={(e) => setNetworkFilter(e.target.value)}
                className="px-4 py-3 bg-gradient-to-r from-black/60 to-blue-950/40 border border-blue-500/30 rounded-xl text-blue-100 focus:border-blue-400/50 focus:outline-none"
              >
                <option value="">All Networks</option>
                {getNetworkOptions().map(network => (
                  <option key={network} value={network}>{network}</option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-3 bg-gradient-to-r from-black/60 to-blue-950/40 border border-blue-500/30 rounded-xl text-blue-100 focus:border-blue-400/50 focus:outline-none"
              >
                <option value="">All Status</option>
                <option value="confirmed">Confirmed</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>

              <div className="flex gap-2">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="flex-1 px-3 py-3 bg-gradient-to-r from-black/60 to-blue-950/40 border border-blue-500/30 rounded-xl text-blue-100 focus:border-blue-400/50 focus:outline-none"
                />
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="flex-1 px-3 py-3 bg-gradient-to-r from-black/60 to-blue-950/40 border border-blue-500/30 rounded-xl text-blue-100 focus:border-blue-400/50 focus:outline-none"
                />
              </div>

              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Min amount"
                  value={amountMin}
                  onChange={(e) => setAmountMin(e.target.value)}
                  className="flex-1 px-3 py-3 bg-gradient-to-r from-black/60 to-blue-950/40 border border-blue-500/30 rounded-xl text-blue-100 placeholder-blue-300/50 focus:border-blue-400/50 focus:outline-none"
                />
                <input
                  type="number"
                  placeholder="Max amount"
                  value={amountMax}
                  onChange={(e) => setAmountMax(e.target.value)}
                  className="flex-1 px-3 py-3 bg-gradient-to-r from-black/60 to-blue-950/40 border border-blue-500/30 rounded-xl text-blue-100 placeholder-blue-300/50 focus:border-blue-400/50 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Active filters and clear button */}
          {(searchTerm || filterType !== 'all' || networkFilter || statusFilter || dateFrom || dateTo || amountMin || amountMax) && (
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2 text-sm text-blue-300">
                <span>Active filters:</span>
                {filterType !== 'all' && <span className="bg-blue-500/20 px-2 py-1 rounded">{filterType}</span>}
                {networkFilter && <span className="bg-blue-500/20 px-2 py-1 rounded">{networkFilter}</span>}
                {statusFilter && <span className="bg-blue-500/20 px-2 py-1 rounded">{statusFilter}</span>}
                {(dateFrom || dateTo) && <span className="bg-blue-500/20 px-2 py-1 rounded">date range</span>}
                {(amountMin || amountMax) && <span className="bg-blue-500/20 px-2 py-1 rounded">amount range</span>}
                {searchTerm && <span className="bg-blue-500/20 px-2 py-1 rounded">"{searchTerm}"</span>}
              </div>
              <button
                onClick={clearFilters}
                className="text-sm text-blue-300 hover:text-blue-100 underline"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>

        {/* Transactions List */}
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
              <span className="ml-3 text-blue-100">Loading transactions...</span>
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-lg text-blue-100/80">No transactions found</p>
              <p className="text-sm text-blue-300/60 mt-2">
                {searchTerm || filterType !== 'all' || networkFilter || statusFilter || dateFrom || dateTo || amountMin || amountMax
                  ? 'Try adjusting your search or filter criteria' 
                  : 'Your transaction history will appear here'
                }
              </p>
            </div>
          ) : (
            <div className="p-6 space-y-3">
              {/* Sort controls */}
              <div className="flex items-center gap-4 pb-4 border-b border-blue-500/20">
                <span className="text-sm text-blue-300">Sort by:</span>
                <button
                  onClick={() => handleSort('timestamp')}
                  className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm transition-colors ${
                    sortBy === 'timestamp' ? 'bg-blue-500/30 text-blue-100' : 'text-blue-300 hover:text-blue-100'
                  }`}
                >
                  Date
                  {sortBy === 'timestamp' && (sortOrder === 'desc' ? <SortDesc className="w-4 h-4" /> : <SortAsc className="w-4 h-4" />)}
                </button>
                <button
                  onClick={() => handleSort('amount')}
                  className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm transition-colors ${
                    sortBy === 'amount' ? 'bg-blue-500/30 text-blue-100' : 'text-blue-300 hover:text-blue-100'
                  }`}
                >
                  Amount
                  {sortBy === 'amount' && (sortOrder === 'desc' ? <SortDesc className="w-4 h-4" /> : <SortAsc className="w-4 h-4" />)}
                </button>
              </div>

              {transactions.map((tx, index) => {
                const isOutgoing = tx.from?.toLowerCase() === wallet?.ethereum?.address?.toLowerCase() || 
                                 tx.from?.toLowerCase() === wallet?.bitcoin?.address?.toLowerCase() ||
                                 !tx.isIncoming;

                return (
                  <div
                    key={tx.id || index}
                    onClick={() => onTransactionClick(tx)}
                    className="group relative overflow-hidden bg-gradient-to-r from-black/60 via-blue-950/40 to-black/60 rounded-2xl border border-blue-500/20 hover:border-blue-400/40 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/25 hover:-translate-y-1 cursor-pointer"
                  >
                    <div className={`absolute left-0 top-0 w-1 h-full ${isOutgoing ? 'bg-gradient-to-b from-red-400 to-red-600' : 'bg-gradient-to-b from-green-400 to-green-600'}`}></div>
                    
                    <div className="relative p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1">
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
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-1">
                              <p className="text-blue-50 font-semibold">
                                {isOutgoing ? 'Sent' : 'Received'}
                              </p>
                              <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${
                                tx.status === 'confirmed' ? 'bg-green-500/20 text-green-300 border border-green-500/30' :
                                tx.status === 'pending' ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' :
                                'bg-red-500/20 text-red-300 border border-red-500/30'
                              }`}>
                                {tx.status?.toUpperCase()}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-2 text-sm text-blue-300/80">
                              <span className="capitalize">{tx.network}</span>
                              <span className="text-blue-400/60">•</span>
                              <span className="font-mono">{formatHash(tx.txHash)}</span>
                              <span className="text-blue-400/60">•</span>
                              <span>{tx.tokenSymbol}</span>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <p className={`font-bold text-lg ${
                              isOutgoing ? 'text-red-300' : 'text-green-300'
                            }`}>
                              {isOutgoing ? '-' : '+'}{formatAmount(tx.amount)} {tx.tokenSymbol}
                            </p>
                            <p className="text-blue-300/70 text-sm">
                              {formatDate(tx.timestamp)}
                            </p>
                            {tx.usdValue && (
                              <p className="text-blue-400/60 text-xs">
                                ${parseFloat(tx.usdValue).toFixed(2)} USD
                              </p>
                            )}
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
        {pagination && pagination.totalPages > 1 && (
          <div className="p-6 border-t border-blue-500/20 bg-gradient-to-r from-blue-950/20 to-black/40">
            <div className="flex items-center justify-between">
              <p className="text-blue-300/70 text-sm">
                Showing {((pagination.currentPage - 1) * itemsPerPage) + 1}-{Math.min(pagination.currentPage * itemsPerPage, pagination.totalItems)} of {pagination.totalItems}
              </p>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={!pagination.hasPreviousPage}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600/20 to-blue-800/20 hover:from-blue-500/30 hover:to-blue-700/30 border border-blue-500/30 hover:border-blue-400/50 rounded-lg text-blue-100 font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                
                <span className="px-4 py-2 text-blue-100">
                  {pagination.currentPage} of {pagination.totalPages}
                </span>
                
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, pagination.totalPages))}
                  disabled={!pagination.hasNextPage}
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