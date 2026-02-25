'use client'

import { useState } from 'react';
import { Shield, Zap, Users, ChevronRight, Sparkles, Clock, ArrowLeft, Info } from 'lucide-react';

/**
 * WalletTypeSelector
 * Presented during wallet creation — user chooses between:
 * 1. Standard Wallet (EOA) — classic BIP-39 experience
 * 2. Smart Vault (ERC-4337) — gasless, batch tx, social recovery
 */
export default function WalletTypeSelector({ onSelect, onBack }) {
    const [hoveredType, setHoveredType] = useState(null);

    const walletTypes = [
        {
            id: 'eoa',
            title: 'Standard Wallet',
            subtitle: 'Externally Owned Account (EOA)',
            description: 'Classic wallet powered by your 12-word seed phrase. You pay gas directly.',
            icon: Shield,
            gradient: 'from-purple-600/20 to-blue-600/20',
            borderColor: 'border-purple-500/30 hover:border-purple-500',
            iconBg: 'bg-purple-500/20 group-hover:bg-purple-500/30',
            iconColor: 'text-purple-400',
            features: [
                { label: 'Instant setup', color: 'bg-green-500/20 text-green-300' },
                { label: '12-word backup', color: 'bg-purple-500/20 text-purple-300' },
                { label: 'Multi-chain', color: 'bg-blue-500/20 text-blue-300' },
            ],
            details: [
                'Full control over private keys',
                'Works on all EVM chains, Bitcoin, and Solana',
                'You pay gas fees for every transaction',
                'Standard security model — protect your seed phrase',
            ],
        },
        {
            id: 'smart_vault',
            title: 'Smart Vault',
            subtitle: 'ERC-4337 Smart Account',
            description: 'Next-gen wallet with gasless transactions, batch execution, and social recovery.',
            icon: Zap,
            gradient: 'from-cyan-600/20 to-blue-600/20',
            borderColor: 'border-cyan-500/30 hover:border-cyan-500',
            iconBg: 'bg-cyan-500/20 group-hover:bg-cyan-500/30',
            iconColor: 'text-cyan-400',
            features: [
                { label: 'Gasless', color: 'bg-cyan-500/20 text-cyan-300', icon: '⛽' },
                { label: 'Batch transactions', color: 'bg-blue-500/20 text-blue-300', icon: '📦' },
                { label: 'Social recovery', color: 'bg-orange-500/20 text-orange-300', icon: '🛡️' },
            ],
            details: [
                'Gas fees sponsored by Walletrix — free transactions',
                'Execute multiple operations in a single click',
                'Assign guardians for account recovery if you lose your key',
                'Role-based permissions for team operations',
                '48-hour timelock protects against unauthorized recovery',
            ],
            recommended: true,
        },
    ];

    return (
        <div className="max-w-2xl mx-auto">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border border-slate-700/50">
                {/* Header */}
                <div className="text-center mb-8">
                    {onBack && (
                        <button
                            onClick={onBack}
                            className="absolute left-8 top-8 p-2 text-slate-400 hover:text-white transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                    )}
                    <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-2xl flex items-center justify-center mb-4 border border-blue-500/30">
                        <Sparkles className="w-8 h-8 text-blue-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Choose Your Wallet Type</h2>
                    <p className="text-slate-400 text-sm">
                        Select the wallet architecture that fits your needs
                    </p>
                </div>

                {/* Wallet Type Cards */}
                <div className="space-y-4 mb-6">
                    {walletTypes.map((type) => (
                        <button
                            key={type.id}
                            onClick={() => onSelect(type.id)}
                            onMouseEnter={() => setHoveredType(type.id)}
                            onMouseLeave={() => setHoveredType(null)}
                            className={`w-full p-6 bg-gradient-to-br ${type.gradient} border-2 ${type.borderColor} rounded-xl transition-all group text-left relative overflow-hidden`}
                        >
                            {/* Recommended Badge */}
                            {type.recommended && (
                                <div className="absolute top-3 right-3 px-3 py-1 bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-xs font-bold rounded-full shadow-lg shadow-cyan-500/25">
                                    ✨ Recommended
                                </div>
                            )}

                            <div className="flex items-start gap-4">
                                <div className={`w-12 h-12 ${type.iconBg} rounded-xl flex items-center justify-center flex-shrink-0 transition-colors`}>
                                    <type.icon className={`w-6 h-6 ${type.iconColor}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-lg font-semibold text-white mb-0.5">{type.title}</h3>
                                    <p className="text-xs text-slate-500 font-mono mb-2">{type.subtitle}</p>
                                    <p className="text-sm text-slate-400 mb-3">{type.description}</p>

                                    {/* Feature Tags */}
                                    <div className="flex flex-wrap gap-2 mb-3">
                                        {type.features.map((feature, idx) => (
                                            <span key={idx} className={`text-xs px-2.5 py-1 ${feature.color} rounded-lg font-medium`}>
                                                {feature.icon && <span className="mr-1">{feature.icon}</span>}
                                                {feature.label}
                                            </span>
                                        ))}
                                    </div>

                                    {/* Expanded Details on Hover */}
                                    <div className={`overflow-hidden transition-all duration-300 ${hoveredType === type.id ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}>
                                        <ul className="space-y-1.5 pt-2 border-t border-slate-700/50">
                                            {type.details.map((detail, idx) => (
                                                <li key={idx} className="text-xs text-slate-400 flex items-start gap-2">
                                                    <span className="text-slate-500 mt-0.5">•</span>
                                                    {detail}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>

                                <ChevronRight className={`w-5 h-5 text-slate-500 group-hover:text-white transition-all flex-shrink-0 mt-1 ${hoveredType === type.id ? 'translate-x-1' : ''}`} />
                            </div>
                        </button>
                    ))}
                </div>

                {/* Info Box */}
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                    <div className="flex gap-3">
                        <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-blue-300">
                            <p className="font-medium mb-1">Can I upgrade later?</p>
                            <p className="text-xs text-blue-400">
                                Yes! You can deploy a Smart Vault on top of any Standard Wallet at any time.
                                Your EOA acts as the signer — nothing changes about your existing setup.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
