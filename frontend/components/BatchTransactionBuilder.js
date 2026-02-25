'use client'

import { useState, useCallback } from 'react';
import { Plus, Trash2, Send, ArrowRight, Loader2, Package, AlertCircle, GripVertical } from 'lucide-react';
import toast from 'react-hot-toast';
import { ethers } from 'ethers';

/**
 * BatchTransactionBuilder
 * Queue multiple operations → preview → sign once via EIP-712 → submit.
 * This is a key differentiator of the Smart Vault — do multiple things in one tx.
 */
export default function BatchTransactionBuilder({ vaultAddress, onSubmit, onClose }) {
    const [transactions, setTransactions] = useState([
        { id: 1, to: '', value: '', data: '0x', label: '' },
    ]);
    const [step, setStep] = useState('build'); // 'build' | 'review' | 'signing' | 'submitted'
    const [submitting, setSubmitting] = useState(false);

    const addTransaction = () => {
        if (transactions.length >= 10) {
            toast.error('Maximum 10 transactions per batch');
            return;
        }
        setTransactions(prev => [
            ...prev,
            { id: Date.now(), to: '', value: '', data: '0x', label: '' },
        ]);
    };

    const removeTransaction = (id) => {
        if (transactions.length <= 1) {
            toast.error('Batch must contain at least one transaction');
            return;
        }
        setTransactions(prev => prev.filter(tx => tx.id !== id));
    };

    const updateTransaction = (id, field, value) => {
        setTransactions(prev =>
            prev.map(tx => (tx.id === id ? { ...tx, [field]: value } : tx))
        );
    };

    const validateTransactions = useCallback(() => {
        for (const tx of transactions) {
            if (!tx.to || !ethers.isAddress(tx.to)) {
                toast.error(`Invalid address in transaction: ${tx.label || 'unnamed'}`);
                return false;
            }
            if (tx.value && isNaN(parseFloat(tx.value))) {
                toast.error(`Invalid ETH value in transaction: ${tx.label || 'unnamed'}`);
                return false;
            }
        }
        return true;
    }, [transactions]);

    const handleReview = () => {
        if (!validateTransactions()) return;
        setStep('review');
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        setStep('signing');
        try {
            const batchData = transactions.map(tx => ({
                to: tx.to,
                value: ethers.parseEther(tx.value || '0').toString(),
                data: tx.data || '0x',
            }));

            await onSubmit(batchData);
            setStep('submitted');
            toast.success('Batch transaction submitted!');
        } catch (error) {
            console.error('Batch submit failed:', error);
            toast.error('Failed to submit batch: ' + error.message);
            setStep('review');
        } finally {
            setSubmitting(false);
        }
    };

    const totalValue = transactions.reduce((sum, tx) => {
        const val = parseFloat(tx.value || '0');
        return sum + (isNaN(val) ? 0 : val);
    }, 0);

    return (
        <div className="bg-slate-800/60 backdrop-blur-xl rounded-2xl border border-slate-700/50 overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-slate-700/50">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-xl flex items-center justify-center border border-cyan-500/30">
                            <Package className="w-5 h-5 text-cyan-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-white">Batch Transaction</h3>
                            <p className="text-xs text-slate-400">Execute multiple operations in one transaction</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-500 bg-slate-700/50 px-3 py-1 rounded-full">
                            {transactions.length} of 10
                        </span>
                        {onClose && (
                            <button onClick={onClose} className="text-slate-400 hover:text-white text-sm">✕</button>
                        )}
                    </div>
                </div>
            </div>

            {/* Build Step */}
            {step === 'build' && (
                <div className="p-5 space-y-4">
                    {transactions.map((tx, index) => (
                        <div
                            key={tx.id}
                            className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/40 hover:border-slate-600/50 transition-colors"
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <GripVertical className="w-4 h-4 text-slate-600" />
                                    <span className="w-6 h-6 bg-cyan-500/20 rounded-lg flex items-center justify-center text-xs font-bold text-cyan-400">
                                        {index + 1}
                                    </span>
                                    <input
                                        type="text"
                                        value={tx.label}
                                        onChange={(e) => updateTransaction(tx.id, 'label', e.target.value)}
                                        placeholder="Label (optional)"
                                        className="bg-transparent text-sm text-slate-300 font-medium focus:outline-none placeholder-slate-600"
                                    />
                                </div>
                                <button
                                    onClick={() => removeTransaction(tx.id)}
                                    className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs text-slate-500 mb-1">Recipient Address</label>
                                    <input
                                        type="text"
                                        value={tx.to}
                                        onChange={(e) => updateTransaction(tx.id, 'to', e.target.value)}
                                        placeholder="0x..."
                                        className="w-full px-3 py-2.5 bg-slate-800/80 border border-slate-700/50 rounded-lg text-white text-sm font-mono focus:outline-none focus:border-cyan-500/50 placeholder-slate-600"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs text-slate-500 mb-1">Value (ETH)</label>
                                        <input
                                            type="text"
                                            value={tx.value}
                                            onChange={(e) => updateTransaction(tx.id, 'value', e.target.value)}
                                            placeholder="0.0"
                                            className="w-full px-3 py-2.5 bg-slate-800/80 border border-slate-700/50 rounded-lg text-white text-sm font-mono focus:outline-none focus:border-cyan-500/50 placeholder-slate-600"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-500 mb-1">Calldata (hex)</label>
                                        <input
                                            type="text"
                                            value={tx.data}
                                            onChange={(e) => updateTransaction(tx.id, 'data', e.target.value)}
                                            placeholder="0x"
                                            className="w-full px-3 py-2.5 bg-slate-800/80 border border-slate-700/50 rounded-lg text-white text-sm font-mono focus:outline-none focus:border-cyan-500/50 placeholder-slate-600"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Add Transaction Button */}
                    <button
                        onClick={addTransaction}
                        className="w-full py-3 border-2 border-dashed border-slate-700 hover:border-cyan-500/50 rounded-xl text-slate-400 hover:text-cyan-400 flex items-center justify-center gap-2 transition-all"
                    >
                        <Plus className="w-4 h-4" />
                        Add Transaction
                    </button>

                    {/* Summary Bar */}
                    <div className="flex items-center justify-between bg-slate-900/60 rounded-xl p-4 border border-slate-700/40">
                        <div>
                            <p className="text-xs text-slate-500">Total Value</p>
                            <p className="text-lg font-semibold text-white">{totalValue.toFixed(4)} ETH</p>
                        </div>
                        <button
                            onClick={handleReview}
                            disabled={transactions.length === 0}
                            className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 disabled:from-slate-700 disabled:to-slate-700 text-white font-semibold rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40"
                        >
                            Review Batch
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Review Step */}
            {step === 'review' && (
                <div className="p-5 space-y-4">
                    <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-4 flex gap-3">
                        <AlertCircle className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-cyan-300">
                            <p className="font-medium mb-1">Review Your Batch</p>
                            <p className="text-xs text-cyan-400">
                                You&apos;ll sign once to execute all {transactions.length} transactions atomically.
                                If any operation fails, the entire batch reverts.
                            </p>
                        </div>
                    </div>

                    {transactions.map((tx, index) => (
                        <div key={tx.id} className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/40">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="w-6 h-6 bg-cyan-500/20 rounded-lg flex items-center justify-center text-xs font-bold text-cyan-400">
                                    {index + 1}
                                </span>
                                <span className="text-sm text-white font-medium">
                                    {tx.label || `Transaction ${index + 1}`}
                                </span>
                            </div>
                            <div className="space-y-1 text-xs font-mono">
                                <p className="text-slate-400">To: <span className="text-slate-200">{tx.to}</span></p>
                                <p className="text-slate-400">Value: <span className="text-emerald-400">{tx.value || '0'} ETH</span></p>
                                {tx.data !== '0x' && (
                                    <p className="text-slate-400">Data: <span className="text-slate-200 break-all">{tx.data}</span></p>
                                )}
                            </div>
                        </div>
                    ))}

                    <div className="flex gap-3">
                        <button
                            onClick={() => setStep('build')}
                            className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-xl transition-colors"
                        >
                            Back to Edit
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={submitting}
                            className="flex-1 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25"
                        >
                            <Send className="w-4 h-4" />
                            Sign & Submit
                        </button>
                    </div>
                </div>
            )}

            {/* Signing Step */}
            {step === 'signing' && (
                <div className="p-10 text-center">
                    <Loader2 className="w-12 h-12 text-cyan-400 animate-spin mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-white mb-2">Signing Batch Transaction</h3>
                    <p className="text-sm text-slate-400">
                        Check your wallet for the EIP-712 signature request...
                    </p>
                </div>
            )}

            {/* Submitted Step */}
            {step === 'submitted' && (
                <div className="p-10 text-center">
                    <div className="w-16 h-16 mx-auto bg-gradient-to-br from-emerald-500/20 to-green-500/20 rounded-2xl flex items-center justify-center mb-4 border border-emerald-500/30">
                        <span className="text-3xl">✅</span>
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">Batch Submitted!</h3>
                    <p className="text-sm text-slate-400 mb-6">
                        {transactions.length} transactions submitted to the bundler.
                        Gas was sponsored by Walletrix.
                    </p>
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-xl transition-colors"
                    >
                        Done
                    </button>
                </div>
            )}
        </div>
    );
}
