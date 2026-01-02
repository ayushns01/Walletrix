'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import CreateMultiSigWallet from './CreateMultiSigWallet';

export default function MultiSigWalletList() {
    const { getToken } = useAuth();
    const [wallets, setWallets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedWallet, setSelectedWallet] = useState(null);

    useEffect(() => {
        loadWallets();
    }, []);

    const loadWallets = async () => {
        try {
            const token = await getToken();
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/wallet/multisig/user/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            const data = await response.json();
            if (data.success) {
                setWallets(data.multiSigWallets || []);
            }
        } catch (error) {
            console.error('Failed to load multi-sig wallets:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleWalletCreated = (newWallet) => {
        setWallets(prev => [newWallet, ...prev]);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-white">Multi-Sig Wallets</h2>
                    <p className="text-gray-400 mt-1">Secure wallets requiring multiple signatures</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all font-medium flex items-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Create Multi-Sig
                </button>
            </div>

            {/* Wallets Grid */}
            {wallets.length === 0 ? (
                <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-12 text-center border border-gray-700">
                    <div className="w-16 h-16 bg-purple-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">No Multi-Sig Wallets Yet</h3>
                    <p className="text-gray-400 mb-6">Create your first multi-signature wallet for enhanced security</p>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all font-medium inline-flex items-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Create Multi-Sig Wallet
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {wallets.map((wallet) => (
                        <div
                            key={wallet.id}
                            onClick={() => setSelectedWallet(wallet)}
                            className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 border border-gray-700 hover:border-purple-500/50 transition-all cursor-pointer group"
                        >
                            {/* Network Badge */}
                            <div className="flex items-center justify-between mb-4">
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${wallet.network === 'ethereum'
                                        ? 'bg-blue-500/20 text-blue-300'
                                        : 'bg-orange-500/20 text-orange-300'
                                    }`}>
                                    {wallet.network === 'ethereum' ? '⟠ Ethereum' : '₿ Bitcoin'}
                                </span>
                                <span className="text-xs text-gray-500">{wallet.type}</span>
                            </div>

                            {/* Wallet Name */}
                            <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-purple-400 transition-colors">
                                {wallet.name}
                            </h3>

                            {/* Address */}
                            <div className="mb-4">
                                <p className="text-xs text-gray-500 mb-1">Address</p>
                                <p className="text-sm text-gray-300 font-mono truncate">{wallet.address}</p>
                            </div>

                            {/* Signature Info */}
                            <div className="flex items-center justify-between pt-4 border-t border-gray-700">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center">
                                        <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Signatures</p>
                                        <p className="text-sm font-semibold text-white">
                                            {wallet.requiredSignatures}/{wallet.totalSigners}
                                        </p>
                                    </div>
                                </div>
                                {wallet.transactionCount > 0 && (
                                    <div className="text-right">
                                        <p className="text-xs text-gray-500">Transactions</p>
                                        <p className="text-sm font-semibold text-white">{wallet.transactionCount}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Modal */}
            {showCreateModal && (
                <CreateMultiSigWallet
                    onClose={() => setShowCreateModal(false)}
                    onSuccess={handleWalletCreated}
                />
            )}

            {/* Wallet Details Modal (placeholder) */}
            {selectedWallet && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full p-6 border border-purple-500/20">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-white">{selectedWallet.name}</h2>
                            <button
                                onClick={() => setSelectedWallet(null)}
                                className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="space-y-4 text-gray-300">
                            <div>
                                <p className="text-sm text-gray-500">Network</p>
                                <p className="text-lg capitalize">{selectedWallet.network}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Address</p>
                                <p className="text-sm font-mono break-all">{selectedWallet.address}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Required Signatures</p>
                                <p className="text-lg">{selectedWallet.requiredSignatures} of {selectedWallet.totalSigners}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
