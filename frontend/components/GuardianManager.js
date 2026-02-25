'use client'

import { useState, useEffect } from 'react';
import { Shield, UserPlus, UserMinus, AlertTriangle, Clock, CheckCircle, XCircle, Loader2, Info, Users } from 'lucide-react';
import { ethers } from 'ethers';
import toast from 'react-hot-toast';

/**
 * GuardianManager
 * Manage social recovery guardians for a Smart Vault.
 * - View current guardians and threshold
 * - Add/remove guardians
 * - Initiate or approve recovery requests
 */
export default function GuardianManager({ smartAccountId, guardians: initialGuardians = [], threshold: initialThreshold = 0, onUpdate }) {
    const [guardians, setGuardians] = useState(initialGuardians);
    const [threshold, setThreshold] = useState(initialThreshold);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newGuardianAddress, setNewGuardianAddress] = useState('');
    const [newGuardianLabel, setNewGuardianLabel] = useState('');
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('guardians'); // 'guardians' | 'recovery'

    // Recovery state
    const [recoveryPending, setRecoveryPending] = useState(false);
    const [recoveryNewOwner, setRecoveryNewOwner] = useState('');
    const [recoveryApprovals, setRecoveryApprovals] = useState(0);
    const [recoveryExecuteAfter, setRecoveryExecuteAfter] = useState(null);

    const handleAddGuardian = async () => {
        if (!newGuardianAddress || !ethers.isAddress(newGuardianAddress)) {
            toast.error('Please enter a valid Ethereum address');
            return;
        }

        if (guardians.some(g => g.guardianAddress.toLowerCase() === newGuardianAddress.toLowerCase())) {
            toast.error('This guardian already exists');
            return;
        }

        setLoading(true);
        try {
            // Call backend API to add guardian
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/smart-vault/guardians`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    smartAccountId,
                    guardianAddress: newGuardianAddress,
                    label: newGuardianLabel || undefined,
                }),
            });

            const result = await response.json();
            if (!result.success) throw new Error(result.error);

            setGuardians(prev => [...prev, result.data]);
            setNewGuardianAddress('');
            setNewGuardianLabel('');
            setShowAddForm(false);
            toast.success('Guardian added!');
            onUpdate?.();
        } catch (error) {
            console.error('Add guardian failed:', error);
            toast.error('Failed to add guardian: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveGuardian = async (guardianAddress) => {
        setLoading(true);
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/smart-vault/guardians`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ smartAccountId, guardianAddress }),
            });

            const result = await response.json();
            if (!result.success) throw new Error(result.error);

            setGuardians(prev => prev.filter(g => g.guardianAddress !== guardianAddress));
            toast.success('Guardian removed');
            onUpdate?.();
        } catch (error) {
            console.error('Remove guardian failed:', error);
            toast.error('Failed to remove guardian: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const formatTimeRemaining = (timestamp) => {
        if (!timestamp) return '';
        const now = Date.now();
        const diff = new Date(timestamp).getTime() - now;
        if (diff <= 0) return 'Ready to execute';
        const hours = Math.floor(diff / 3600000);
        const minutes = Math.floor((diff % 3600000) / 60000);
        return `${hours}h ${minutes}m remaining`;
    };

    return (
        <div className="bg-slate-800/60 backdrop-blur-xl rounded-2xl border border-slate-700/50 overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-slate-700/50">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-orange-500/20 to-amber-500/20 rounded-xl flex items-center justify-center border border-orange-500/30">
                        <Shield className="w-5 h-5 text-orange-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-white">Social Recovery</h3>
                        <p className="text-xs text-slate-400">
                            {guardians.length} guardian{guardians.length !== 1 ? 's' : ''} ·
                            Threshold: {threshold} of {guardians.length}
                        </p>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-700/50">
                <button
                    onClick={() => setActiveTab('guardians')}
                    className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'guardians'
                            ? 'text-white border-b-2 border-cyan-500'
                            : 'text-slate-400 hover:text-white'
                        }`}
                >
                    <Users className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />
                    Guardians
                </button>
                <button
                    onClick={() => setActiveTab('recovery')}
                    className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'recovery'
                            ? 'text-white border-b-2 border-cyan-500'
                            : 'text-slate-400 hover:text-white'
                        }`}
                >
                    <Clock className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />
                    Recovery
                    {recoveryPending && (
                        <span className="ml-1.5 w-2 h-2 bg-orange-500 rounded-full inline-block animate-pulse" />
                    )}
                </button>
            </div>

            {/* Guardians Tab */}
            {activeTab === 'guardians' && (
                <div className="p-5 space-y-4">
                    {/* Guardian List */}
                    {guardians.length === 0 ? (
                        <div className="text-center py-8">
                            <div className="w-14 h-14 mx-auto bg-slate-700/50 rounded-2xl flex items-center justify-center mb-3">
                                <Users className="w-7 h-7 text-slate-500" />
                            </div>
                            <p className="text-slate-400 text-sm mb-1">No guardians added yet</p>
                            <p className="text-slate-500 text-xs">Add trusted contacts who can help recover your vault</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {guardians.map((guardian, index) => (
                                <div
                                    key={guardian.id || index}
                                    className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl border border-slate-700/40 hover:border-slate-600/50 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 bg-gradient-to-br from-orange-500/20 to-amber-500/20 rounded-lg flex items-center justify-center">
                                            <span className="text-sm font-bold text-orange-400">
                                                {index + 1}
                                            </span>
                                        </div>
                                        <div>
                                            <p className="text-sm text-white font-medium">
                                                {guardian.label || `Guardian ${index + 1}`}
                                            </p>
                                            <p className="text-xs text-slate-400 font-mono">
                                                {guardian.guardianAddress.slice(0, 6)}...{guardian.guardianAddress.slice(-4)}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleRemoveGuardian(guardian.guardianAddress)}
                                        disabled={loading}
                                        className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                                    >
                                        <UserMinus className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Add Guardian Form */}
                    {showAddForm ? (
                        <div className="bg-slate-900/50 rounded-xl p-4 border border-cyan-500/30 space-y-3">
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Guardian Address</label>
                                <input
                                    type="text"
                                    value={newGuardianAddress}
                                    onChange={(e) => setNewGuardianAddress(e.target.value)}
                                    placeholder="0x..."
                                    className="w-full px-3 py-2.5 bg-slate-800/80 border border-slate-700/50 rounded-lg text-white text-sm font-mono focus:outline-none focus:border-cyan-500/50 placeholder-slate-600"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Label (optional)</label>
                                <input
                                    type="text"
                                    value={newGuardianLabel}
                                    onChange={(e) => setNewGuardianLabel(e.target.value)}
                                    placeholder="e.g., Alice, Dad, Backup Phone"
                                    className="w-full px-3 py-2.5 bg-slate-800/80 border border-slate-700/50 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500/50 placeholder-slate-600"
                                />
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => { setShowAddForm(false); setNewGuardianAddress(''); setNewGuardianLabel(''); }}
                                    className="flex-1 py-2.5 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAddGuardian}
                                    disabled={loading || !newGuardianAddress}
                                    className="flex-1 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 disabled:from-slate-700 disabled:to-slate-700 text-white text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-1.5"
                                >
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                                    Add
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={() => setShowAddForm(true)}
                            className="w-full py-3 border-2 border-dashed border-slate-700 hover:border-cyan-500/50 rounded-xl text-slate-400 hover:text-cyan-400 flex items-center justify-center gap-2 transition-all"
                        >
                            <UserPlus className="w-4 h-4" />
                            Add Guardian
                        </button>
                    )}

                    {/* Threshold Info */}
                    {guardians.length > 0 && (
                        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex gap-3">
                            <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-blue-300">
                                <p className="text-xs text-blue-400">
                                    Recovery requires <span className="font-bold text-blue-300">{threshold}</span> of{' '}
                                    <span className="font-bold text-blue-300">{guardians.length}</span> guardians to approve.
                                    The 48-hour timelock gives you time to cancel unauthorized recovery attempts.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Recovery Tab */}
            {activeTab === 'recovery' && (
                <div className="p-5 space-y-4">
                    {recoveryPending ? (
                        <div className="space-y-4">
                            {/* Active Recovery */}
                            <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4">
                                <div className="flex gap-3">
                                    <AlertTriangle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-medium text-orange-300 mb-1">Recovery In Progress</p>
                                        <p className="text-xs text-orange-400 font-mono mb-2">
                                            New Owner: {recoveryNewOwner.slice(0, 10)}...{recoveryNewOwner.slice(-6)}
                                        </p>
                                        <div className="flex items-center gap-2 text-xs text-slate-400">
                                            <Clock className="w-3.5 h-3.5" />
                                            {formatTimeRemaining(recoveryExecuteAfter)}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Approval Progress */}
                            <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/40">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-sm text-slate-300 font-medium">Approvals</span>
                                    <span className="text-sm text-slate-400">
                                        {recoveryApprovals} / {threshold}
                                    </span>
                                </div>
                                <div className="w-full bg-slate-700 rounded-full h-2">
                                    <div
                                        className="bg-gradient-to-r from-orange-500 to-amber-500 h-2 rounded-full transition-all duration-500"
                                        style={{ width: `${threshold > 0 ? (recoveryApprovals / threshold) * 100 : 0}%` }}
                                    />
                                </div>
                            </div>

                            {/* Cancel Button (owner only) */}
                            <button
                                className="w-full py-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 font-semibold rounded-xl transition-colors border border-red-500/30 flex items-center justify-center gap-2"
                            >
                                <XCircle className="w-4 h-4" />
                                Cancel Recovery
                            </button>
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <div className="w-14 h-14 mx-auto bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-3 border border-emerald-500/20">
                                <CheckCircle className="w-7 h-7 text-emerald-400" />
                            </div>
                            <p className="text-slate-300 text-sm font-medium mb-1">No Recovery Active</p>
                            <p className="text-slate-500 text-xs">
                                Your vault is secure. Guardians can initiate recovery if you lose access.
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
