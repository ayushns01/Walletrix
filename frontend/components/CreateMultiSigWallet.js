'use client';

import { useState } from 'react';
import { useAuth } from '@clerk/nextjs';

export default function CreateMultiSigWallet({ onClose, onSuccess }) {
    const { getToken } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [step, setStep] = useState(1);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        network: 'ethereum',
        type: 'gnosis-safe',
        requiredSignatures: 2,
        owners: ['', '', ''], // Start with 3 owners
        publicKeys: ['', '', ''], // For Bitcoin
    });

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleOwnerChange = (index, value) => {
        const newOwners = [...formData.owners];
        newOwners[index] = value;
        setFormData(prev => ({ ...prev, owners: newOwners }));
    };

    const handlePublicKeyChange = (index, value) => {
        const newKeys = [...formData.publicKeys];
        newKeys[index] = value;
        setFormData(prev => ({ ...prev, publicKeys: newKeys }));
    };

    const addSigner = () => {
        if (formData.network === 'ethereum' || formData.network === 'sepolia') {
            setFormData(prev => ({
                ...prev,
                owners: [...prev.owners, '']
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                publicKeys: [...prev.publicKeys, '']
            }));
        }
    };

    const removeSigner = (index) => {
        if (formData.network === 'ethereum' || formData.network === 'sepolia') {
            setFormData(prev => ({
                ...prev,
                owners: prev.owners.filter((_, i) => i !== index)
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                publicKeys: prev.publicKeys.filter((_, i) => i !== index)
            }));
        }
    };

    const handleNetworkChange = (network) => {
        setFormData(prev => ({
            ...prev,
            network,
            type: (network === 'ethereum' || network === 'sepolia') ? 'gnosis-safe' : 'p2wsh'
        }));
    };

    const validateForm = () => {
        if (!formData.name.trim()) {
            setError('Please enter a wallet name');
            return false;
        }

        if (formData.network === 'ethereum' || formData.network === 'sepolia') {
            const validOwners = formData.owners.filter(o => o.trim());
            if (validOwners.length < 2) {
                setError('At least 2 owners required');
                return false;
            }
            if (formData.requiredSignatures > validOwners.length) {
                setError('Required signatures cannot exceed total owners');
                return false;
            }
            // Validate Ethereum addresses
            const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
            for (const owner of validOwners) {
                if (!ethAddressRegex.test(owner)) {
                    setError(`Invalid Ethereum address: ${owner}`);
                    return false;
                }
            }
        } else {
            const validKeys = formData.publicKeys.filter(k => k.trim());
            if (validKeys.length < 2) {
                setError('At least 2 public keys required');
                return false;
            }
            if (formData.requiredSignatures > validKeys.length) {
                setError('Required signatures cannot exceed total signers');
                return false;
            }
        }

        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!validateForm()) return;

        setLoading(true);

        try {
            const token = await getToken();

            const payload = {
                name: formData.name,
                network: formData.network,
                type: formData.type,
                requiredSignatures: formData.requiredSignatures,
            };

            if (formData.network === 'ethereum') {
                payload.owners = formData.owners.filter(o => o.trim());
            } else {
                payload.publicKeys = formData.publicKeys.filter(k => k.trim());
            }

            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/wallet/multisig/create`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            console.log('Multi-sig creation response:', { status: response.status, data });

            if (!response.ok) {
                throw new Error(data.error || 'Failed to create multi-sig wallet');
            }

            // Pass the created wallet to the success callback
            onSuccess?.(data.multiSigWallet);
            onClose?.();
        } catch (err) {
            console.error('Multi-sig creation error:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const totalSigners = (formData.network === 'ethereum' || formData.network === 'sepolia')
        ? formData.owners.filter(o => o.trim()).length
        : formData.publicKeys.filter(k => k.trim()).length;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-purple-500/20">
                {/* Header */}
                <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-blue-600 p-6 rounded-t-2xl">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-2xl font-bold text-white">Create Multi-Sig Wallet</h2>
                            <p className="text-purple-100 text-sm mt-1">
                                Secure wallet requiring multiple signatures
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Wallet Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Wallet Name *
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => handleInputChange('name', e.target.value)}
                            placeholder="e.g., Company Treasury"
                            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
                            required
                        />
                    </div>

                    {/* Network Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-3">
                            Network *
                        </label>
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                type="button"
                                onClick={() => handleNetworkChange('ethereum')}
                                className={`p-4 rounded-lg border-2 transition-all ${(formData.network === 'ethereum' || formData.network === 'sepolia')
                                    ? 'border-purple-500 bg-purple-500/10'
                                    : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                                    }`}
                            >
                                <div className="text-left">
                                    <div className="font-semibold text-white">Ethereum</div>
                                    <div className="text-xs text-gray-400 mt-1">Gnosis Safe</div>
                                    <div className="text-xs text-purple-400 mt-1">Multi-Sig Wallet</div>
                                </div>
                            </button>
                            <button
                                type="button"
                                onClick={() => handleNetworkChange('bitcoin')}
                                className={`p-4 rounded-lg border-2 transition-all ${formData.network === 'bitcoin'
                                    ? 'border-orange-500 bg-orange-500/10'
                                    : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                                    }`}
                            >
                                <div className="text-left">
                                    <div className="font-semibold text-white">Bitcoin</div>
                                    <div className="text-xs text-gray-400 mt-1">P2WSH SegWit</div>
                                    <div className="text-xs text-orange-400 mt-1">Multi-Sig Wallet</div>
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* Bitcoin Type Selection */}
                    {formData.network === 'bitcoin' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-3">
                                Bitcoin Type
                            </label>
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    type="button"
                                    onClick={() => handleInputChange('type', 'p2wsh')}
                                    className={`p-3 rounded-lg border-2 transition-all ${formData.type === 'p2wsh'
                                        ? 'border-purple-500 bg-purple-500/10'
                                        : 'border-gray-700 bg-gray-800'
                                        }`}
                                >
                                    <div className="text-sm font-medium text-white">P2WSH</div>
                                    <div className="text-xs text-gray-400">SegWit (Lower fees)</div>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleInputChange('type', 'p2sh')}
                                    className={`p-3 rounded-lg border-2 transition-all ${formData.type === 'p2sh'
                                        ? 'border-purple-500 bg-purple-500/10'
                                        : 'border-gray-700 bg-gray-800'
                                        }`}
                                >
                                    <div className="text-sm font-medium text-white">P2SH</div>
                                    <div className="text-xs text-gray-400">Legacy</div>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Signers */}
                    <div>
                        <div className="flex justify-between items-center mb-3">
                            <label className="block text-sm font-medium text-gray-300">
                                {(formData.network === 'ethereum' || formData.network === 'sepolia') ? 'Owners' : 'Public Keys'} *
                            </label>
                            <button
                                type="button"
                                onClick={addSigner}
                                className="text-sm text-purple-400 hover:text-purple-300 flex items-center gap-1"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Add Signer
                            </button>
                        </div>

                        <div className="space-y-3">
                            {(formData.network === 'ethereum' || formData.network === 'sepolia') ? (
                                formData.owners.map((owner, index) => (
                                    <div key={index} className="flex gap-2">
                                        <input
                                            type="text"
                                            value={owner}
                                            onChange={(e) => handleOwnerChange(index, e.target.value)}
                                            placeholder={`0x... (Owner ${index + 1})`}
                                            className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
                                        />
                                        {formData.owners.length > 2 && (
                                            <button
                                                type="button"
                                                onClick={() => removeSigner(index)}
                                                className="px-3 py-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        )}
                                    </div>
                                ))
                            ) : (
                                formData.publicKeys.map((key, index) => (
                                    <div key={index} className="flex gap-2">
                                        <input
                                            type="text"
                                            value={key}
                                            onChange={(e) => handlePublicKeyChange(index, e.target.value)}
                                            placeholder={`Public Key ${index + 1}`}
                                            className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all font-mono text-sm"
                                        />
                                        {formData.publicKeys.length > 2 && (
                                            <button
                                                type="button"
                                                onClick={() => removeSigner(index)}
                                                className="px-3 py-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Required Signatures */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Required Signatures: {formData.requiredSignatures} of {totalSigners}
                        </label>
                        <input
                            type="range"
                            min="1"
                            max={totalSigners || 1}
                            value={formData.requiredSignatures}
                            onChange={(e) => handleInputChange('requiredSignatures', parseInt(e.target.value))}
                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                            <span>1</span>
                            <span>{totalSigners}</span>
                        </div>
                    </div>

                    {/* Info Box */}
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                        <div className="flex gap-3">
                            <svg className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div className="text-sm text-blue-300">
                                <p className="font-medium mb-1">Multi-Signature Security</p>
                                <p className="text-blue-400">
                                    This wallet will require {formData.requiredSignatures} out of {totalSigners} signatures to approve transactions.
                                    {formData.network === 'ethereum' && ' Uses Gnosis Safe smart contract.'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                            <div className="flex gap-3">
                                <svg className="w-5 h-5 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <p className="text-sm text-red-300">{error}</p>
                            </div>
                        </div>
                    )}

                    {/* Actions */}
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
                            className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Creating...
                                </>
                            ) : (
                                'Create Multi-Sig Wallet'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
