'use client';

import { TrendingUp, RefreshCw, Send, Download, ArrowUpRight } from 'lucide-react';
import { useState, useMemo } from 'react';
import toast from 'react-hot-toast';

export default function MultiSigDashboard({ wallet, balances, onRefresh, onSend, onReceive, currentNetwork }) {
    const [refreshing, setRefreshing] = useState(false);

    const handleRefresh = async () => {
        setRefreshing(true);
        try {
            await onRefresh();
        } catch (error) {
            console.error('Refresh failed:', error);
            toast.error('Failed to refresh data');
        } finally {
            setTimeout(() => setRefreshing(false), 500);
        }
    };

    // Calculate total value
    const totalValue = useMemo(() => {
        if (!balances || !balances.balance) return 0;
        // For now, just show the balance - price calculation can be added later
        return parseFloat(balances.balance) || 0;
    }, [balances]);

    const networkSymbol = wallet?.network === 'bitcoin' ? 'BTC' : 'ETH';
    const networkIcon = wallet?.network === 'bitcoin' ? '₿' : 'Ξ';

    return (
        <div className="space-y-6">
            {/* Total Balance Card */}
            <div className="bg-gradient-to-br from-black via-purple-900 to-purple-950 rounded-3xl p-8 text-white relative overflow-hidden border border-purple-500/30 shadow-2xl shadow-purple-500/30">
                <div className="absolute top-0 right-0 w-64 h-64 bg-purple-400/10 rounded-full -mr-32 -mt-32 blur-xl"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-600/10 rounded-full -ml-24 -mb-24 blur-lg"></div>

                <div className="relative">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex-1">
                            <p className="text-lg text-purple-200/80 font-medium">Multi-Sig Balance</p>
                            <p className="text-sm text-purple-300/60 mt-1">
                                {wallet?.requiredSignatures}/{wallet?.totalSigners} signatures required
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleRefresh}
                                disabled={refreshing}
                                className="p-3 hover:bg-purple-500/20 rounded-xl transition-all duration-300 border border-purple-500/30 hover:border-purple-400/50"
                            >
                                <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''} text-purple-300`} />
                            </button>
                        </div>
                    </div>

                    <h2 className="text-5xl font-bold mb-6 gradient-text">
                        {balances?.balance || '0'} {networkSymbol}
                    </h2>

                    {/* Quick Actions */}
                    <div className="grid grid-cols-2 gap-4">
                        <button
                            onClick={onSend}
                            className="flex items-center justify-center gap-2 py-4 px-6 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 rounded-xl transition-all duration-300 font-semibold shadow-lg shadow-purple-500/30"
                        >
                            <Send className="w-5 h-5" />
                            Send
                        </button>
                        <button
                            onClick={onReceive}
                            className="flex items-center justify-center gap-2 py-4 px-6 bg-purple-500/20 hover:bg-purple-500/30 rounded-xl transition-all duration-300 font-semibold border border-purple-500/30"
                        >
                            <Download className="w-5 h-5" />
                            Receive
                        </button>
                    </div>
                </div>
            </div>

            {/* Assets List */}
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 border border-purple-500/20">
                <h3 className="text-xl font-bold text-white mb-4">Assets</h3>
                <div className="space-y-3">
                    {/* Native Asset */}
                    <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-xl hover:bg-gray-800/70 transition-all">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center text-2xl">
                                {networkIcon}
                            </div>
                            <div>
                                <p className="font-semibold text-white">
                                    {wallet?.network === 'bitcoin' ? 'Bitcoin' : currentNetwork === 'sepolia' ? 'Sepolia ETH' : 'Ethereum'}
                                </p>
                                <p className="text-sm text-gray-400">{networkSymbol}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="font-semibold text-white">{balances?.balance || '0'} {networkSymbol}</p>
                            <p className="text-sm text-gray-400">
                                {currentNetwork === 'sepolia' ? 'Testnet' : 'Mainnet'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Multi-Sig Info */}
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 border border-purple-500/20">
                <h3 className="text-xl font-bold text-white mb-4">Multi-Sig Configuration</h3>
                <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-purple-500/10 rounded-xl border border-purple-500/20">
                        <p className="text-sm text-purple-300 mb-1">Required Signatures</p>
                        <p className="text-2xl font-bold text-white">{wallet?.requiredSignatures}</p>
                    </div>
                    <div className="p-4 bg-purple-500/10 rounded-xl border border-purple-500/20">
                        <p className="text-sm text-purple-300 mb-1">Total Signers</p>
                        <p className="text-2xl font-bold text-white">{wallet?.totalSigners}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
