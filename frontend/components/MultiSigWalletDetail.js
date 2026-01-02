'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { ArrowLeft, Send, Download, Settings, Users, Shield, Clock, CheckCircle, XCircle, TrendingUp, RefreshCw, Copy, ExternalLink, X, Lock, AlertTriangle, FileText, Eye, EyeOff, Bell } from 'lucide-react';
import toast from 'react-hot-toast';
import MultiSigDashboard from './MultiSigDashboard';

export default function MultiSigWalletDetail({ walletId, onBack }) {
    const { getToken } = useAuth();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [wallet, setWallet] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [pendingTransactions, setPendingTransactions] = useState([]);
    const [showCreateTx, setShowCreateTx] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [activeTab, setActiveTab] = useState('overview'); // overview, transactions, signers, settings
    const [error, setError] = useState('');
    const [currentNetwork, setCurrentNetwork] = useState('ethereum'); // Toggle between 'ethereum' and 'sepolia'

    useEffect(() => {
        if (walletId) {
            fetchWalletData(currentNetwork);
        }
    }, [walletId, currentNetwork]); // Refetch when network changes

    const fetchWalletData = async (network = 'ethereum') => {
        try {
            setLoading(true);
            const token = await getToken();



            // Fetch wallet details
            const walletRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/wallet/multisig/${walletId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const walletData = await walletRes.json();



            if (walletData.success) {
                // Map backend response to frontend structure
                const mappedWallet = {
                    ...walletData.multiSigWallet,
                    walletType: walletData.multiSigWallet.type || walletData.multiSigWallet.walletType,
                    redeemScript: walletData.multiSigWallet.redeemScript
                };



                setWallet(mappedWallet);

                // Fetch balance if address exists - use backend proxy
                if (mappedWallet.address && mappedWallet.address !== 'pending-deployment') {
                    try {
                        const effectiveNetwork = network.toLowerCase();
                        let balanceValue = '0';

                        // Use backend proxy to fetch balance

                        const balanceRes = await fetch(
                            `${process.env.NEXT_PUBLIC_API_URL}/api/v1/wallet/multisig/${walletId}/balance?network=${effectiveNetwork}`,
                            {
                                headers: { 'Authorization': `Bearer ${token}` }
                            }
                        );

                        if (balanceRes.ok) {
                            const balanceData = await balanceRes.json();
                            if (balanceData.success && balanceData.balance) {
                                balanceValue = balanceData.balance;
                            } else {

                                balanceValue = effectiveNetwork === 'bitcoin' ? '0.00000000' : '0.0000';
                            }
                        } else {

                            balanceValue = effectiveNetwork === 'bitcoin' ? '0.00000000' : '0.0000';
                        }

                        mappedWallet.balance = balanceValue;
                        mappedWallet.currentNetwork = effectiveNetwork;
                        setWallet({ ...mappedWallet });
                    } catch (balanceErr) {

                        mappedWallet.balance = '0';
                        setWallet({ ...mappedWallet });
                    }
                }
            } else {

            }

            // Fetch transactions
            const txRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/wallet/multisig/${walletId}/transactions`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const txData = await txRes.json();



            if (txData.success) {
                setTransactions(txData.transactions);
                setPendingTransactions(txData.transactions.filter(tx => tx.status === 'pending' || tx.status === 'ready'));
            }
        } catch (err) {
            setError('Failed to load wallet data');

            toast.error('Failed to load wallet data');
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchWalletData();
        setTimeout(() => setRefreshing(false), 500);
        toast.success('Wallet data refreshed');
    };

    const copyAddress = () => {
        if (wallet?.address) {
            navigator.clipboard.writeText(wallet.address);
            toast.success('Address copied to clipboard');
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'pending': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
            case 'ready': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
            case 'executed': return 'text-green-400 bg-green-400/10 border-green-400/20';
            case 'rejected': return 'text-red-400 bg-red-400/10 border-red-400/20';
            default: return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'pending': return <Clock className="w-4 h-4" />;
            case 'ready': return <CheckCircle className="w-4 h-4" />;
            case 'executed': return <CheckCircle className="w-4 h-4" />;
            case 'rejected': return <XCircle className="w-4 h-4" />;
            default: return <Clock className="w-4 h-4" />;
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500 mx-auto mb-4"></div>
                    <p className="text-gray-400">Loading wallet...</p>
                </div>
            </div>
        );
    }

    if (!wallet) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-red-400 mb-4">Wallet not found</p>
                    <button onClick={onBack} className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 border-b border-purple-500/20">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <button
                            onClick={onBack}
                            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                            <span>Back</span>
                        </button>

                        {/* Network Toggle for Ethereum wallets */}
                        {(wallet?.network === 'ethereum' || wallet?.network === 'sepolia') && (
                            <div className="flex items-center gap-2 bg-gray-800/50 rounded-lg p-1 border border-gray-700/50">
                                <button
                                    onClick={() => setCurrentNetwork('ethereum')}
                                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${currentNetwork === 'ethereum'
                                        ? 'bg-green-600 text-white shadow-lg'
                                        : 'text-gray-400 hover:text-white'
                                        }`}
                                >
                                    Mainnet
                                </button>
                                <button
                                    onClick={() => setCurrentNetwork('sepolia')}
                                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${currentNetwork === 'sepolia'
                                        ? 'bg-yellow-600 text-white shadow-lg'
                                        : 'text-gray-400 hover:text-white'
                                        }`}
                                >
                                    Sepolia
                                </button>
                            </div>
                        )}

                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleRefresh}
                                className={`p-2 text-gray-400 hover:text-white transition-all rounded-lg hover:bg-gray-800 ${refreshing ? 'animate-spin' : ''}`}
                                disabled={refreshing}
                            >
                                <RefreshCw className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => setShowSettings(!showSettings)}
                                className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-800"
                            >
                                <Settings className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-6">
                {/* Wallet Header Card */}
                <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 border border-purple-500/20 mb-6">
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-3 bg-purple-500/10 rounded-xl">
                                    <Users className="w-6 h-6 text-purple-400" />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold text-white">{wallet.name}</h1>
                                    <p className="text-sm text-gray-400 capitalize">{wallet.network} Multi-Sig Wallet</p>
                                </div>
                            </div>

                            {/* Wallet Address Display with Debug */}
                            <div className="mt-4 p-4 bg-gray-900/50 rounded-xl border border-gray-700/50">
                                <p className="text-xs text-gray-400 mb-2">Wallet Address</p>
                                <div className="flex items-center gap-2">
                                    <p className="text-white font-mono text-sm break-all flex-1">
                                        {wallet.address || 'Address not available - Check console'}
                                    </p>
                                    {wallet.address && wallet.address !== 'pending-deployment' && (
                                        <>
                                            <button onClick={copyAddress} className="p-2 hover:bg-gray-700 rounded-lg transition-colors flex-shrink-0">
                                                <Copy className="w-4 h-4 text-gray-400 hover:text-white" />
                                            </button>
                                            <a
                                                href={`https://${wallet.network === 'ethereum' ? 'etherscan.io' : wallet.network === 'sepolia' ? 'sepolia.etherscan.io' : 'blockchain.com'}/address/${wallet.address}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-2 hover:bg-gray-700 rounded-lg transition-colors flex-shrink-0"
                                            >
                                                <ExternalLink className="w-4 h-4 text-gray-400 hover:text-white" />
                                            </a>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Debug Panel - Shows what data is loaded */}
                            <details className="mt-4">
                                <summary className="cursor-pointer text-xs text-yellow-400 hover:text-yellow-300 font-bold">
                                    🔍 Debug Info (Click to expand)
                                </summary>
                                <div className="mt-2 p-3 bg-yellow-900/20 rounded-lg border border-yellow-500/20">
                                    <div className="text-xs text-yellow-200 space-y-1 font-mono">
                                        <p><strong>Wallet ID:</strong> {wallet.id || '❌'}</p>
                                        <p><strong>Name:</strong> {wallet.name || '❌'}</p>
                                        <p><strong>Address:</strong> {wallet.address || '❌ MISSING'}</p>
                                        <p><strong>Network:</strong> {wallet.network || '❌'}</p>
                                        <p><strong>Type:</strong> {wallet.walletType || wallet.type || '❌'}</p>
                                        <p><strong>Signers Count:</strong> {wallet.signers?.length || '❌'}</p>
                                        <p><strong>Redeem Script:</strong> {wallet.redeemScript ? '✅ Present' : '❌ Missing'}</p>
                                        <p><strong>Balance:</strong> {wallet.balance || 'Not loaded yet'}</p>
                                        <p className="text-yellow-300 mt-2">Check browser console for full wallet object</p>
                                    </div>
                                </div>
                            </details>
                        </div>

                        <button
                            onClick={() => setShowCreateTx(true)}
                            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all flex items-center gap-2 font-medium"
                        >
                            <Send className="w-5 h-5" />
                            New Transaction
                        </button>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-4 gap-4 mt-6">
                        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                            <div className="flex items-center gap-2 text-gray-400 mb-2">
                                <Shield className="w-4 h-4" />
                                <span className="text-sm">Threshold</span>
                            </div>
                            <p className="text-2xl font-bold text-white">
                                {wallet.requiredSignatures}/{wallet.totalSigners}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">Signatures required</p>
                        </div>

                        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                            <div className="flex items-center gap-2 text-gray-400 mb-2">
                                <Users className="w-4 h-4" />
                                <span className="text-sm">Signers</span>
                            </div>
                            <p className="text-2xl font-bold text-white">{wallet.totalSigners}</p>
                            <p className="text-xs text-gray-500 mt-1">Total owners</p>
                        </div>

                        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                            <div className="flex items-center gap-2 text-gray-400 mb-2">
                                <TrendingUp className="w-4 h-4" />
                                <span className="text-sm">Balance</span>
                            </div>
                            <p className="text-2xl font-bold text-green-400">
                                {wallet.balance ? `${wallet.balance} ${wallet.network === 'bitcoin' ? 'BTC' : 'ETH'}` : 'Loading...'}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">Current balance</p>
                        </div>

                        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                            <div className="flex items-center gap-2 text-gray-400 mb-2">
                                <Clock className="w-4 h-4" />
                                <span className="text-sm">Pending</span>
                            </div>
                            <p className="text-2xl font-bold text-yellow-400">{pendingTransactions.length}</p>
                            <p className="text-xs text-gray-500 mt-1">Awaiting signatures</p>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="bg-gray-800/30 rounded-xl p-1 mb-6 flex gap-1">
                    {['overview', 'transactions', 'signers'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`flex-1 px-6 py-3 rounded-lg font-medium transition-all capitalize ${activeTab === tab
                                ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
                                : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                {activeTab === 'overview' && (
                    <div className="space-y-6">
                        {/* Dashboard Component */}
                        <MultiSigDashboard
                            wallet={wallet}
                            balances={{ balance: wallet.balance }}
                            onRefresh={() => fetchWalletData(currentNetwork)}
                            onSend={() => setShowCreateTx(true)}
                            onReceive={() => toast.info('Receive modal coming soon')}
                            currentNetwork={currentNetwork}
                        />

                        {/* Pending Transactions */}
                        {pendingTransactions.length > 0 && (
                            <div>
                                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-yellow-400" />
                                    Pending Transactions
                                </h2>
                                <div className="space-y-3">
                                    {pendingTransactions.map(tx => (
                                        <TransactionCard key={tx.id} transaction={tx} getStatusColor={getStatusColor} getStatusIcon={getStatusIcon} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Recent Transactions */}
                        <div>
                            <h2 className="text-xl font-bold text-white mb-4">Recent Activity</h2>
                            {transactions.length === 0 ? (
                                <div className="bg-gray-800/50 rounded-xl p-12 text-center border border-gray-700/50">
                                    <Send className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                                    <p className="text-gray-400">No transactions yet</p>
                                    <p className="text-sm text-gray-500 mt-1">Create your first transaction to get started</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {transactions.slice(0, 5).map(tx => (
                                        <TransactionCard key={tx.id} transaction={tx} getStatusColor={getStatusColor} getStatusIcon={getStatusIcon} />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'transactions' && (
                    <div>
                        <h2 className="text-xl font-bold text-white mb-4">All Transactions</h2>
                        {transactions.length === 0 ? (
                            <div className="bg-gray-800/50 rounded-xl p-12 text-center border border-gray-700/50">
                                <Send className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                                <p className="text-gray-400">No transactions yet</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {transactions.map(tx => (
                                    <TransactionCard key={tx.id} transaction={tx} getStatusColor={getStatusColor} getStatusIcon={getStatusIcon} detailed />
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'signers' && (
                    <div>
                        <h2 className="text-xl font-bold text-white mb-4">Wallet Signers</h2>
                        <div className="grid gap-4">
                            {wallet.signers?.map((signer, index) => (
                                <div key={signer.id} className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-5 border border-gray-700/50">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-purple-500/10 rounded-full flex items-center justify-center">
                                                <span className="text-lg font-bold text-purple-400">#{index + 1}</span>
                                            </div>
                                            <div>
                                                <p className="text-white font-medium">{signer.label || `Signer ${index + 1}`}</p>
                                                <p className="text-sm text-gray-400 font-mono">{signer.address || signer.publicKey}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="px-3 py-1 bg-green-500/10 text-green-400 rounded-full text-sm border border-green-500/20">
                                                Active
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Create Transaction Modal */}
            {showCreateTx && (
                <CreateTransactionModal
                    walletId={walletId}
                    onClose={() => setShowCreateTx(false)}
                    onSuccess={() => {
                        setShowCreateTx(false);
                        fetchWalletData();
                    }}
                />
            )}

            {/* Settings Modal */}
            {showSettings && (
                <SettingsModal
                    wallet={wallet}
                    onClose={() => setShowSettings(false)}
                />
            )}
        </div>
    );
}

// Transaction Card Component
function TransactionCard({ transaction, getStatusColor, getStatusIcon, detailed = false }) {
    return (
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-5 border border-gray-700/50 hover:border-purple-500/30 transition-all">
            <div className="flex justify-between items-start">
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 border ${getStatusColor(transaction.status)}`}>
                            {getStatusIcon(transaction.status)}
                            {transaction.status}
                        </span>
                        <span className="text-gray-500 text-sm">
                            {new Date(transaction.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <Send className="w-4 h-4 text-gray-500" />
                            <span className="text-white font-medium">{transaction.amount} {transaction.tokenSymbol}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-400">To:</span>
                            <span className="text-sm text-gray-300 font-mono">{transaction.toAddress}</span>
                        </div>
                        {detailed && transaction.txHash && (
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-400">Tx Hash:</span>
                                <span className="text-sm text-gray-300 font-mono">{transaction.txHash}</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="text-right">
                    <div className="text-sm text-gray-400 mb-2">Signatures</div>
                    <div className="text-2xl font-bold text-white">
                        {transaction.currentSignatures}/{transaction.requiredSignatures}
                    </div>
                    {transaction.status === 'ready' && (
                        <button className="mt-3 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium">
                            Execute
                        </button>
                    )}
                    {transaction.status === 'pending' && (
                        <button className="mt-3 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium">
                            Sign
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

// Create Transaction Modal
function CreateTransactionModal({ walletId, onClose, onSuccess }) {
    const { getToken } = useAuth();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        toAddress: '',
        amount: '',
        tokenSymbol: 'ETH',
        data: ''
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const token = await getToken();
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/wallet/multisig/${walletId}/transaction`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (data.success) {
                toast.success('Transaction created successfully!');
                onSuccess();
            } else {
                toast.error(data.error || 'Failed to create transaction');
            }
        } catch (err) {
            console.error(err);
            toast.error('Failed to create transaction');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-purple-500/20">
                <h2 className="text-2xl font-bold text-white mb-6">Create Transaction</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Recipient Address</label>
                        <input
                            type="text"
                            value={formData.toAddress}
                            onChange={(e) => setFormData({ ...formData, toAddress: e.target.value })}
                            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
                            placeholder="0x..."
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Amount</label>
                        <input
                            type="number"
                            step="0.000001"
                            value={formData.amount}
                            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
                            placeholder="0.0"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Token</label>
                        <select
                            value={formData.tokenSymbol}
                            onChange={(e) => setFormData({ ...formData, tokenSymbol: e.target.value })}
                            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
                        >
                            <option value="ETH">ETH</option>
                            <option value="BTC">BTC</option>
                        </select>
                    </div>
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50 font-medium"
                        >
                            {loading ? 'Creating...' : 'Create'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// Settings Modal - Enhanced Version with Full Multi-Sig Details
function SettingsModal({ wallet, onClose }) {
    const [activeTab, setActiveTab] = useState('general');
    const [showSignerKey, setShowSignerKey] = useState({});

    const tabs = [
        { id: 'general', name: 'General', icon: Settings },
        { id: 'signers', name: 'Signers & Keys', icon: Users },
        { id: 'security', name: 'Security', icon: Shield },
        { id: 'contract', name: 'Contract Details', icon: FileText },
        { id: 'advanced', name: 'Advanced', icon: Settings }
    ];

    const toggleSignerKey = (signerId) => {
        setShowSignerKey(prev => ({ ...prev, [signerId]: !prev[signerId] }));
    };

    const getExplorerUrl = () => {
        const network = wallet.network.toLowerCase();
        if (network === 'ethereum' || network === 'sepolia') {
            const subdomain = network === 'sepolia' ? 'sepolia.' : '';
            return `https://${subdomain}etherscan.io/address/${wallet.address}`;
        } else if (network === 'bitcoin') {
            return `https://blockchain.com/btc/address/${wallet.address}`;
        }
        return '#';
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-lg flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full border border-purple-500/20 max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-purple-500/20">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-500/10 rounded-lg">
                            <Settings className="w-6 h-6 text-purple-400" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white">Multi-Sig Wallet Settings</h2>
                            <p className="text-sm text-gray-400">{wallet.name}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                    >
                        <X className="w-6 h-6 text-gray-400 hover:text-red-400" />
                    </button>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* Sidebar */}
                    <div className="w-52 border-r border-purple-500/20 p-4 overflow-y-auto">
                        <nav className="space-y-2">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === tab.id
                                        ? 'bg-gradient-to-r from-purple-600/30 to-blue-600/30 text-white border border-purple-500/40'
                                        : 'text-gray-400 hover:bg-gray-800/50 hover:text-white'
                                        }`}
                                >
                                    <tab.icon className="w-5 h-5" />
                                    <span className="font-medium text-sm">{tab.name}</span>
                                </button>
                            ))}
                        </nav>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6">
                        {/* General Tab */}
                        {activeTab === 'general' && (
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-xl font-bold text-white mb-4">General Information</h3>

                                    <div className="space-y-4">
                                        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                                            <p className="text-sm text-gray-400 mb-2">Wallet Name</p>
                                            <p className="text-white font-medium text-lg">{wallet.name}</p>
                                        </div>

                                        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                                            <p className="text-sm text-gray-400 mb-2">Multi-Sig Wallet Address</p>
                                            <div className="flex items-center gap-2">
                                                <p className="text-white font-mono text-sm flex-1 truncate">
                                                    {wallet.address || 'Address not available'}
                                                </p>
                                                {wallet.address && (
                                                    <button
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(wallet.address);
                                                            toast.success('Address copied!');
                                                        }}
                                                        className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                                                    >
                                                        <Copy className="w-4 h-4 text-gray-400" />
                                                    </button>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-500 mt-2">This is the shared wallet address controlled by all signers</p>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                                                <p className="text-sm text-gray-400 mb-2">Network</p>
                                                <p className="text-white font-medium capitalize">{wallet.network}</p>
                                                {wallet.network.toLowerCase() === 'sepolia' && (
                                                    <span className="inline-block mt-2 px-2 py-1 bg-yellow-500/10 text-yellow-400 rounded text-xs border border-yellow-500/20">
                                                        Testnet
                                                    </span>
                                                )}
                                            </div>

                                            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                                                <p className="text-sm text-gray-400 mb-2">Wallet Type</p>
                                                <p className="text-white font-medium">{wallet.walletType}</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                                                <p className="text-sm text-gray-400 mb-2">Signature Threshold</p>
                                                <p className="text-white font-medium text-lg">{wallet.requiredSignatures} of {wallet.totalSigners}</p>
                                                <p className="text-xs text-gray-500 mt-1">Signatures required to execute</p>
                                            </div>

                                            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                                                <p className="text-sm text-gray-400 mb-2">Created</p>
                                                <p className="text-white font-medium">{new Date(wallet.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                                            </div>
                                        </div>

                                        <div className="bg-blue-900/20 rounded-xl p-4 border border-blue-500/20">
                                            <div className="flex items-start gap-3">
                                                <ExternalLink className="w-5 h-5 text-blue-400 mt-0.5" />
                                                <div className="flex-1">
                                                    <h4 className="text-white font-medium mb-1">View on Block Explorer</h4>
                                                    <p className="text-sm text-gray-400 mb-3">View this wallet on the blockchain explorer</p>
                                                    <a
                                                        href={getExplorerUrl()}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 rounded-lg transition-colors text-sm"
                                                    >
                                                        Open Explorer
                                                        <ExternalLink className="w-4 h-4" />
                                                    </a>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Signers & Keys Tab */}
                        {activeTab === 'signers' && (
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-xl font-bold text-white mb-2">Wallet Signers & Keys</h3>
                                    <p className="text-gray-400 mb-6">View public keys and addresses of all wallet signers</p>

                                    <div className="space-y-3">
                                        {wallet.signers?.map((signer, index) => (
                                            <div key={signer.id} className="bg-gray-800/50 rounded-xl p-5 border border-gray-700/50">
                                                <div className="flex items-start gap-4">
                                                    <div className="w-12 h-12 bg-purple-500/10 rounded-full flex items-center justify-center flex-shrink-0">
                                                        <span className="text-lg font-bold text-purple-400">#{index + 1}</span>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between mb-3">
                                                            <p className="text-white font-medium">{signer.label || `Signer ${index + 1}`}</p>
                                                            <span className="px-3 py-1 bg-green-500/10 text-green-400 rounded-full text-sm border border-green-500/20 flex-shrink-0">
                                                                Active
                                                            </span>
                                                        </div>

                                                        <div className="space-y-3">
                                                            <div>
                                                                <p className="text-xs text-gray-400 mb-1">Address</p>
                                                                <div className="flex items-center gap-2">
                                                                    <p className="text-sm text-gray-300 font-mono truncate flex-1">{signer.address}</p>
                                                                    <button
                                                                        onClick={() => {
                                                                            navigator.clipboard.writeText(signer.address);
                                                                            toast.success('Address copied!');
                                                                        }}
                                                                        className="p-1 hover:bg-gray-700 rounded transition-colors"
                                                                    >
                                                                        <Copy className="w-3 h-3 text-gray-400" />
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            {signer.publicKey && (
                                                                <div>
                                                                    <div className="flex items-center justify-between mb-1">
                                                                        <p className="text-xs text-gray-400">Public Key</p>
                                                                        <button
                                                                            onClick={() => toggleSignerKey(signer.id)}
                                                                            className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                                                                        >
                                                                            {showSignerKey[signer.id] ? (
                                                                                <><EyeOff className="w-3 h-3" /> Hide</>
                                                                            ) : (
                                                                                <><Eye className="w-3 h-3" /> Show</>
                                                                            )}
                                                                        </button>
                                                                    </div>
                                                                    {showSignerKey[signer.id] ? (
                                                                        <div className="flex items-center gap-2">
                                                                            <p className="text-xs text-gray-300 font-mono break-all flex-1 bg-gray-900/50 p-2 rounded">{signer.publicKey}</p>
                                                                            <button
                                                                                onClick={() => {
                                                                                    navigator.clipboard.writeText(signer.publicKey);
                                                                                    toast.success('Public key copied!');
                                                                                }}
                                                                                className="p-1 hover:bg-gray-700 rounded transition-colors flex-shrink-0"
                                                                            >
                                                                                <Copy className="w-3 h-3 text-gray-400" />
                                                                            </button>
                                                                        </div>
                                                                    ) : (
                                                                        <p className="text-xs text-gray-500 font-mono">••••••••••••••••••••••••••••••••</p>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="mt-6 bg-yellow-900/20 rounded-xl p-4 border border-yellow-500/20">
                                        <div className="flex items-start gap-3">
                                            <Shield className="w-5 h-5 text-yellow-400 mt-0.5" />
                                            <div>
                                                <h4 className="text-yellow-300 font-medium mb-1">About Multi-Sig Keys</h4>
                                                <p className="text-sm text-yellow-200/80">
                                                    Multi-sig wallets don't have a single private key. Each signer controls their own private key.
                                                    The wallet address is derived from all public keys combined with the signature threshold.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Security Tab */}
                        {activeTab === 'security' && (
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-xl font-bold text-white mb-4">Security Settings</h3>

                                    <div className="space-y-4">
                                        <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700/50">
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-3">
                                                    <Shield className="w-5 h-5 text-green-400" />
                                                    <h4 className="text-white font-medium">Multi-Signature Protection</h4>
                                                </div>
                                                <span className="px-3 py-1 bg-green-500/10 text-green-400 rounded-full text-sm border border-green-500/20">
                                                    Active
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-400 ml-8">
                                                All transactions require {wallet.requiredSignatures} out of {wallet.totalSigners} signatures to execute
                                            </p>
                                        </div>

                                        <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700/50">
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-3">
                                                    <Bell className="w-5 h-5 text-blue-400" />
                                                    <h4 className="text-white font-medium">Transaction Notifications</h4>
                                                </div>
                                                <span className="px-3 py-1 bg-green-500/10 text-green-400 rounded-full text-sm border border-green-500/20">
                                                    Enabled
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-400 ml-8">
                                                Receive notifications for pending transactions requiring your signature
                                            </p>
                                        </div>

                                        <div className="bg-red-900/20 rounded-xl p-5 border border-red-500/20">
                                            <div className="flex items-start gap-3">
                                                <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5" />
                                                <div>
                                                    <h4 className="text-red-300 font-medium mb-2">Security Best Practices</h4>
                                                    <ul className="text-sm text-red-200/80 space-y-1 list-disc list-inside">
                                                        <li>Each signer should secure their own private keys</li>
                                                        <li>Verify transaction details before signing</li>
                                                        <li>Never share your individual private keys</li>
                                                        <li>Use hardware wallets for maximum security</li>
                                                        <li>Regularly review pending transactions</li>
                                                    </ul>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Contract Details Tab */}
                        {activeTab === 'contract' && (
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-xl font-bold text-white mb-4">Contract & Script Details</h3>

                                    <div className="space-y-4">
                                        {wallet.redeemScript && (
                                            <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700/50">
                                                <h4 className="text-white font-medium mb-2 flex items-center gap-2">
                                                    <FileText className="w-5 h-5 text-purple-400" />
                                                    Redeem Script
                                                </h4>
                                                <p className="text-sm text-gray-400 mb-3">
                                                    The redeem script defines the multi-signature requirements
                                                </p>
                                                <div className="bg-gray-900/50 rounded-lg p-3 font-mono text-xs text-gray-300 break-all max-h-40 overflow-y-auto">
                                                    {wallet.redeemScript}
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(wallet.redeemScript);
                                                        toast.success('Redeem script copied!');
                                                    }}
                                                    className="mt-3 px-4 py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 rounded-lg transition-colors text-sm flex items-center gap-2"
                                                >
                                                    <Copy className="w-4 h-4" />
                                                    Copy Redeem Script
                                                </button>
                                            </div>
                                        )}

                                        <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700/50">
                                            <h4 className="text-white font-medium mb-3">Wallet Configuration</h4>
                                            <div className="space-y-2 text-sm">
                                                <div className="flex justify-between py-2 border-b border-gray-700/50">
                                                    <span className="text-gray-400">Network</span>
                                                    <span className="text-white capitalize">{wallet.network}</span>
                                                </div>
                                                <div className="flex justify-between py-2 border-b border-gray-700/50">
                                                    <span className="text-gray-400">Wallet Type</span>
                                                    <span className="text-white">{wallet.walletType}</span>
                                                </div>
                                                <div className="flex justify-between py-2 border-b border-gray-700/50">
                                                    <span className="text-gray-400">Total Signers</span>
                                                    <span className="text-white">{wallet.totalSigners}</span>
                                                </div>
                                                <div className="flex justify-between py-2">
                                                    <span className="text-gray-400">Required Signatures</span>
                                                    <span className="text-white">{wallet.requiredSignatures}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Advanced Tab */}
                        {activeTab === 'advanced' && (
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-xl font-bold text-white mb-4">Advanced Settings</h3>

                                    <div className="space-y-4">
                                        <div className="bg-yellow-900/20 rounded-xl p-4 border border-yellow-500/20 mb-6">
                                            <div className="flex items-start gap-3">
                                                <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5" />
                                                <div>
                                                    <h4 className="text-yellow-300 font-medium mb-1">Caution</h4>
                                                    <p className="text-sm text-yellow-200/80">
                                                        Advanced settings can affect wallet functionality. Only modify if you understand the implications.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700/50">
                                            <h4 className="text-white font-medium mb-2">Export Wallet Configuration</h4>
                                            <p className="text-sm text-gray-400 mb-4">Download wallet configuration for backup purposes</p>
                                            <button
                                                onClick={() => {
                                                    const config = {
                                                        name: wallet.name,
                                                        address: wallet.address,
                                                        network: wallet.network,
                                                        walletType: wallet.walletType,
                                                        requiredSignatures: wallet.requiredSignatures,
                                                        totalSigners: wallet.totalSigners,
                                                        signers: wallet.signers?.map(s => ({
                                                            address: s.address,
                                                            publicKey: s.publicKey,
                                                            label: s.label
                                                        })),
                                                        redeemScript: wallet.redeemScript,
                                                        createdAt: wallet.createdAt
                                                    };
                                                    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
                                                    const url = URL.createObjectURL(blob);
                                                    const a = document.createElement('a');
                                                    a.href = url;
                                                    a.download = `${wallet.name}-config.json`;
                                                    a.click();
                                                    toast.success('Configuration exported!');
                                                }}
                                                className="px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 rounded-lg transition-colors text-sm flex items-center gap-2"
                                            >
                                                <Download className="w-4 h-4" />
                                                Export Configuration
                                            </button>
                                        </div>

                                        <div className="bg-red-900/20 rounded-xl p-5 border border-red-500/20">
                                            <h4 className="text-red-300 font-medium mb-2">Danger Zone</h4>
                                            <p className="text-sm text-red-200/80 mb-4">Irreversible actions that affect this wallet</p>
                                            <button className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-300 rounded-lg transition-colors text-sm font-medium">
                                                Archive Wallet
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-purple-500/20">
                    <button
                        onClick={onClose}
                        className="w-full px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
                    >
                        Close Settings
                    </button>
                </div>
            </div>
        </div>
    );
}


