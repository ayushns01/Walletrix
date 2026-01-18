'use client'

import { useState, useEffect } from 'react';
import { Eye, EyeOff, Copy, Key, Shield, AlertTriangle, Download, Check } from 'lucide-react';
import { useWallet } from '@/contexts/DatabaseWalletContext';
import { walletAPI } from '@/lib/api';
import toast from 'react-hot-toast';

export default function AccountDetails({ isOpen, onClose }) {
  const { wallet } = useWallet();
  const [password, setPassword] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [walletData, setWalletData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showMnemonic, setShowMnemonic] = useState(false);
  const [showEthPrivateKey, setShowEthPrivateKey] = useState(false);
  const [showBtcPrivateKey, setShowBtcPrivateKey] = useState(false);
  const [showSolPrivateKey, setShowSolPrivateKey] = useState(false);
  const [copiedField, setCopiedField] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setPassword('');
      setIsUnlocked(false);
      setWalletData(null);
      setShowMnemonic(false);
      setShowEthPrivateKey(false);
      setShowBtcPrivateKey(false);
      setShowSolPrivateKey(false);
      setCopiedField('');
    }
  }, [isOpen]);

  const handleUnlock = async () => {
    if (!password) {
      toast.error('Please enter your password');
      return;
    }

    if (!wallet || (!wallet.encryptedData && !wallet.encrypted)) {
      toast.error('No wallet data available');
      return;
    }

    try {
      setLoading(true);

      const decrypted = await walletAPI.decryptData(wallet.encryptedData || wallet.encrypted, password);

      if (!decrypted.success) {
        toast.error('Invalid password');
        return;
      }

      const walletDataString = decrypted.decrypted || decrypted.data;

      if (!walletDataString) {
        toast.error('No wallet data found');
        return;
      }

      const parsedWalletData = JSON.parse(walletDataString);
      setWalletData(parsedWalletData);
      setIsUnlocked(true);
      toast.success('Wallet unlocked successfully!');

    } catch (error) {
      console.error('Error unlocking wallet:', error);
      toast.error('Failed to unlock wallet');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text, fieldName) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    toast.success(`${fieldName} copied to clipboard!`);
    setTimeout(() => setCopiedField(''), 2000);
  };

  const handleDownloadBackup = () => {
    if (!walletData) return;

    const backupData = {
      mnemonic: walletData.mnemonic,
      ethereum: {
        address: walletData.ethereum.address,
        privateKey: walletData.ethereum.privateKey,
        note: 'This address and private key work on all EVM chains: Ethereum, Polygon, Arbitrum, Avalanche, Optimism, Base, BSC'
      },
      bitcoin: {
        address: walletData.bitcoin.address,
        privateKey: walletData.bitcoin.privateKey,
      },
      solana: walletData.solana ? {
        address: walletData.solana.address,
        privateKey: walletData.solana.privateKey,
      } : undefined,
      createdAt: new Date().toISOString(),
      version: '1.0.0'
    };

    const dataStr = JSON.stringify(backupData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `walletrix-backup-${new Date().toISOString().split('T')[0]}.json`;
    link.click();

    URL.revokeObjectURL(url);
    toast.success('Wallet backup downloaded!');
  };

  if (!isOpen || !wallet) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-lg flex items-center justify-center p-2 sm:p-4 animate-fade-in" style={{ zIndex: 9999 }}>
      <div className="glass-effect rounded-2xl sm:rounded-3xl max-w-4xl w-full h-[95vh] sm:h-[90vh] border border-blue-500/30 shadow-2xl shadow-blue-500/20 flex flex-col animate-scale-in">
        {}
        <div className="flex items-center justify-between p-3 sm:p-6 border-b border-blue-500/20 flex-shrink-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="relative hidden sm:block">
              <Key className="w-8 h-8 text-blue-400" />
              <div className="absolute inset-0 blur-xl bg-blue-400/30" />
            </div>
            <div>
              <h3 className="text-xl sm:text-2xl font-bold gradient-text">Account Details</h3>
              <p className="text-xs sm:text-sm text-blue-300 hidden sm:block">View your private keys and recovery phrase</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 sm:p-3 hover:bg-red-500/20 rounded-xl transition-all duration-200 group"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-blue-300 group-hover:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {}
        <div className="p-3 sm:p-6 border-b border-blue-500/20 flex-shrink-0">
          <div className="glass-effect rounded-xl p-3 sm:p-4 border border-red-500/30 bg-red-900/10">
            <div className="flex items-start gap-2 sm:gap-3">
              <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-red-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <h4 className="text-red-300 font-semibold mb-2 text-sm sm:text-base">Security Warning</h4>
                <ul className="text-red-200 text-xs sm:text-sm space-y-1">
                  <li>• Never share your private keys or mnemonic phrase with anyone</li>
                  <li>• Store this information securely offline</li>
                  <li>• Anyone with access to this information can control your funds</li>
                  <li>• Make sure no one can see your screen</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {!isUnlocked ? (

          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-6">
            <div className="max-w-md mx-auto">
              <div className="text-center mb-6">
                <div className="relative inline-block mb-4">
                  <Shield className="w-16 h-16 sm:w-20 sm:h-20 text-blue-400 mx-auto" />
                  <div className="absolute inset-0 blur-2xl bg-blue-400/30" />
                </div>
                <h4 className="text-xl sm:text-2xl font-bold gradient-text mb-2">Enter Password</h4>
                <p className="text-blue-300 text-sm sm:text-base">
                  Enter your wallet password to view sensitive information
                </p>
              </div>

              <div className="space-y-4">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter wallet password"
                  className="w-full px-4 py-3 sm:py-4 glass-effect border border-blue-500/30 rounded-xl text-blue-100 placeholder-blue-400/50 focus:outline-none focus:border-blue-400/60 transition-all text-sm sm:text-base"
                  onKeyPress={(e) => e.key === 'Enter' && handleUnlock()}
                />

                <button
                  onClick={handleUnlock}
                  disabled={loading || !password}
                  className="w-full py-3 sm:py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 disabled:from-blue-600/50 disabled:to-blue-700/50 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg shadow-blue-500/30 disabled:shadow-none text-sm sm:text-base"
                >
                  {loading ? 'Unlocking...' : 'Unlock Wallet'}
                </button>
              </div>
            </div>
          </div>
        ) : (

          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-6 space-y-4 sm:space-y-6">
            {}
            <div className="flex justify-end">
              <button
                onClick={handleDownloadBackup}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-3 bg-gradient-to-r from-green-900/30 to-green-800/20 hover:from-green-800/40 hover:to-green-700/30 text-green-300 font-semibold rounded-xl transition-all duration-300 border border-green-500/20 hover:border-green-400/40 text-xs sm:text-sm"
              >
                <Download className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">Download Backup</span>
                <span className="sm:hidden">Backup</span>
              </button>
            </div>

            {}
            <div className="bg-gradient-to-br from-slate-800/80 to-slate-800/50 rounded-2xl p-5 sm:p-6 border border-amber-500/30">
              <div className="flex items-center justify-between mb-4 gap-2">
                <h4 className="text-base sm:text-lg font-semibold text-white flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-xl flex items-center justify-center border border-amber-500/30 flex-shrink-0">
                    <span className="text-xl">🔐</span>
                  </div>
                  <span className="truncate">Recovery Phrase</span>
                </h4>
                <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                  <button
                    onClick={() => setShowMnemonic(!showMnemonic)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-1.5 ${showMnemonic
                        ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25'
                      }`}
                  >
                    {showMnemonic ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    {showMnemonic ? 'Hide' : 'Reveal'}
                  </button>
                  <button
                    onClick={() => handleCopy(walletData.mnemonic, 'Mnemonic Phrase')}
                    className="p-2 bg-slate-700/50 hover:bg-slate-600/50 rounded-lg transition-colors border border-slate-600/50"
                  >
                    {copiedField === 'Mnemonic Phrase' ?
                      <Check className="w-4 h-4 text-green-400" /> :
                      <Copy className="w-4 h-4 text-slate-400" />
                    }
                  </button>
                </div>
              </div>

              <div className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 mb-4 transition-all duration-300 ${!showMnemonic ? 'blur-lg select-none pointer-events-none' : ''}`}>
                {walletData.mnemonic ? walletData.mnemonic.split(' ').map((word, index) => (
                  <div key={index} className="bg-slate-900/80 rounded-xl p-2.5 sm:p-3 border border-slate-700/50 hover:border-purple-500/30 transition-colors">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 sm:w-6 sm:h-6 bg-purple-500/20 rounded-lg flex items-center justify-center text-[10px] font-bold text-purple-400 flex-shrink-0">
                        {index + 1}
                      </span>
                      <span className="text-white font-mono text-xs sm:text-sm">
                        {showMnemonic ? word : '●●●●●'}
                      </span>
                    </div>
                  </div>
                )) : <p className="text-slate-400 col-span-full">No mnemonic available</p>}
              </div>

              {!showMnemonic && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="bg-slate-800/90 backdrop-blur-sm px-4 py-2 rounded-xl border border-slate-600/50">
                    <p className="text-slate-200 text-sm font-medium flex items-center gap-2">
                      <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      Click "Reveal" to show
                    </p>
                  </div>
                </div>
              )}

              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex gap-2">
                <svg className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-amber-200/80 text-xs sm:text-sm">
                  This phrase can recover your entire wallet. Store it safely and never share it!
                </p>
              </div>
            </div>

            {}
            <div className="glass-effect rounded-xl p-4 sm:p-6 border border-blue-500/20">
              <h4 className="text-base sm:text-lg font-semibold text-blue-100 mb-3 sm:mb-4 flex items-center gap-2">
                <span className="text-blue-400 text-xl">Ξ</span>
                <div>
                  <div>Ethereum & EVM Chains</div>
                  <p className="text-xs text-blue-400 font-normal mt-0.5">Works on Polygon, Arbitrum, Avalanche, Optimism, Base, BSC</p>
                </div>
              </h4>

              <div className="space-y-3 sm:space-y-4">
                {}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-blue-300 mb-2">
                    Public Address
                  </label>
                  <div className="flex items-center gap-2 p-2 sm:p-3 bg-blue-900/20 rounded-lg border border-blue-500/10">
                    <span className="text-blue-100 font-mono text-xs sm:text-sm flex-1 break-all">
                      {walletData?.ethereum?.address || 'N/A'}
                    </span>
                    <button
                      onClick={() => handleCopy(walletData?.ethereum?.address || '', 'Ethereum Address')}
                      disabled={!walletData?.ethereum?.address}
                      className="p-1.5 sm:p-2 hover:bg-blue-600/20 rounded-lg transition-colors flex-shrink-0"
                    >
                      {copiedField === 'Ethereum Address' ?
                        <Check className="w-4 h-4 text-green-400" /> :
                        <Copy className="w-4 h-4 text-blue-400" />
                      }
                    </button>
                  </div>
                </div>

                {}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-blue-300 mb-2">
                    Private Key
                  </label>
                  <div className="flex items-center gap-1 sm:gap-2 p-2 sm:p-3 bg-blue-900/20 rounded-lg border border-blue-500/10">
                    <span className="text-blue-100 font-mono text-xs sm:text-sm flex-1 break-all">
                      {showEthPrivateKey ? (walletData?.ethereum?.privateKey || 'N/A') : '●'.repeat(66)}
                    </span>
                    <button
                      onClick={() => setShowEthPrivateKey(!showEthPrivateKey)}
                      disabled={!walletData?.ethereum?.privateKey}
                      className="p-1.5 sm:p-2 hover:bg-blue-600/20 rounded-lg transition-colors flex-shrink-0"
                    >
                      {showEthPrivateKey ? <EyeOff className="w-4 h-4 text-blue-400" /> : <Eye className="w-4 h-4 text-blue-400" />}
                    </button>
                    <button
                      onClick={() => handleCopy(walletData?.ethereum?.privateKey || '', 'Ethereum Private Key')}
                      disabled={!walletData?.ethereum?.privateKey}
                      className="p-1.5 sm:p-2 hover:bg-blue-600/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                    >
                      {copiedField === 'Ethereum Private Key' ?
                        <Check className="w-4 h-4 text-green-400" /> :
                        <Copy className="w-4 h-4 text-blue-400" />
                      }
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {}
            <div className="glass-effect rounded-xl p-4 sm:p-6 border border-blue-500/20">
              <h4 className="text-base sm:text-lg font-semibold text-blue-100 mb-3 sm:mb-4 flex items-center gap-2">
                <span className="text-orange-400 text-xl">₿</span>
                Bitcoin Account
              </h4>

              <div className="space-y-3 sm:space-y-4">
                {}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-blue-300 mb-2">
                    Public Address
                  </label>
                  <div className="flex items-center gap-2 p-2 sm:p-3 bg-blue-900/20 rounded-lg border border-blue-500/10">
                    <span className="text-blue-100 font-mono text-xs sm:text-sm flex-1 break-all">
                      {walletData?.bitcoin?.address || 'N/A'}
                    </span>
                    <button
                      onClick={() => handleCopy(walletData?.bitcoin?.address || '', 'Bitcoin Address')}
                      disabled={!walletData?.bitcoin?.address}
                      className="p-1.5 sm:p-2 hover:bg-blue-600/20 rounded-lg transition-colors flex-shrink-0"
                    >
                      {copiedField === 'Bitcoin Address' ?
                        <Check className="w-4 h-4 text-green-400" /> :
                        <Copy className="w-4 h-4 text-blue-400" />
                      }
                    </button>
                  </div>
                </div>

                {}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-blue-300 mb-2">
                    Private Key (WIF Format)
                  </label>
                  <div className="flex items-center gap-1 sm:gap-2 p-2 sm:p-3 bg-blue-900/20 rounded-lg border border-blue-500/10">
                    <span className="text-blue-100 font-mono text-xs sm:text-sm flex-1 break-all">
                      {showBtcPrivateKey ? (walletData?.bitcoin?.privateKey || 'N/A') : '●'.repeat(52)}
                    </span>
                    <button
                      onClick={() => setShowBtcPrivateKey(!showBtcPrivateKey)}
                      disabled={!walletData?.bitcoin?.privateKey}
                      className="p-1.5 sm:p-2 hover:bg-blue-600/20 rounded-lg transition-colors flex-shrink-0"
                    >
                      {showBtcPrivateKey ? <EyeOff className="w-4 h-4 text-blue-400" /> : <Eye className="w-4 h-4 text-blue-400" />}
                    </button>
                    <button
                      onClick={() => handleCopy(walletData?.bitcoin?.privateKey || '', 'Bitcoin Private Key')}
                      disabled={!walletData?.bitcoin?.privateKey}
                      className="p-1.5 sm:p-2 hover:bg-blue-600/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                    >
                      {copiedField === 'Bitcoin Private Key' ?
                        <Check className="w-4 h-4 text-green-400" /> :
                        <Copy className="w-4 h-4 text-blue-400" />
                      }
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {}
            {walletData?.solana && (
              <div className="glass-effect rounded-xl p-4 sm:p-6 border border-blue-500/20">
                <h4 className="text-base sm:text-lg font-semibold text-blue-100 mb-3 sm:mb-4 flex items-center gap-2">
                  <span className="text-purple-400 text-xl">◎</span>
                  Solana Account
                </h4>

                <div className="space-y-3 sm:space-y-4">
                  {}
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-blue-300 mb-2">
                      Public Address
                    </label>
                    <div className="flex items-center gap-2 p-2 sm:p-3 bg-blue-900/20 rounded-lg border border-blue-500/10">
                      <span className="text-blue-100 font-mono text-xs sm:text-sm flex-1 break-all">
                        {walletData?.solana?.address || 'N/A'}
                      </span>
                      <button
                        onClick={() => handleCopy(walletData?.solana?.address || '', 'Solana Address')}
                        disabled={!walletData?.solana?.address}
                        className="p-1.5 sm:p-2 hover:bg-blue-600/20 rounded-lg transition-colors flex-shrink-0"
                      >
                        {copiedField === 'Solana Address' ?
                          <Check className="w-4 h-4 text-green-400" /> :
                          <Copy className="w-4 h-4 text-blue-400" />
                        }
                      </button>
                    </div>
                  </div>

                  {}
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-blue-300 mb-2">
                      Private Key
                    </label>
                    <div className="flex items-center gap-1 sm:gap-2 p-2 sm:p-3 bg-blue-900/20 rounded-lg border border-blue-500/10">
                      <span className="text-blue-100 font-mono text-xs sm:text-sm flex-1 break-all">
                        {showSolPrivateKey ? (walletData?.solana?.privateKey || 'N/A') : '●'.repeat(88)}
                      </span>
                      <button
                        onClick={() => setShowSolPrivateKey(!showSolPrivateKey)}
                        disabled={!walletData?.solana?.privateKey}
                        className="p-1.5 sm:p-2 hover:bg-blue-600/20 rounded-lg transition-colors flex-shrink-0"
                      >
                        {showSolPrivateKey ? <EyeOff className="w-4 h-4 text-blue-400" /> : <Eye className="w-4 h-4 text-blue-400" />}
                      </button>
                      <button
                        onClick={() => handleCopy(walletData?.solana?.privateKey || '', 'Solana Private Key')}
                        disabled={!walletData?.solana?.privateKey}
                        className="p-1.5 sm:p-2 hover:bg-blue-600/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                      >
                        {copiedField === 'Solana Private Key' ?
                          <Check className="w-4 h-4 text-green-400" /> :
                          <Copy className="w-4 h-4 text-blue-400" />
                        }
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {}
            <div className="glass-effect rounded-xl p-4 sm:p-6 border border-blue-500/20">
              <h4 className="text-base sm:text-lg font-semibold text-blue-100 mb-3 sm:mb-4">Wallet Information</h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-blue-300 mb-2">
                    Derivation Path (Ethereum)
                  </label>
                  <div className="p-2 sm:p-3 bg-blue-900/20 rounded-lg border border-blue-500/10">
                    <span className="text-blue-100 font-mono text-xs sm:text-sm">m/44'/60'/0'/0/0</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-blue-300 mb-2">
                    Derivation Path (Bitcoin)
                  </label>
                  <div className="p-2 sm:p-3 bg-blue-900/20 rounded-lg border border-blue-500/10">
                    <span className="text-blue-100 font-mono text-xs sm:text-sm">m/44'/0'/0'/0/0</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-blue-300 mb-2">
                    Wallet Type
                  </label>
                  <div className="p-2 sm:p-3 bg-blue-900/20 rounded-lg border border-blue-500/10">
                    <span className="text-blue-100 text-xs sm:text-sm">Hierarchical Deterministic (HD)</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-blue-300 mb-2">
                    Encryption
                  </label>
                  <div className="p-2 sm:p-3 bg-blue-900/20 rounded-lg border border-blue-500/10">
                    <span className="text-blue-100 text-xs sm:text-sm">AES-256 Encrypted</span>
                  </div>
                </div>
              </div>
            </div>

            {}
            <div className="glass-effect rounded-xl p-3 sm:p-4 border border-red-500/30 bg-red-900/10">
              <h4 className="text-red-300 font-semibold mb-2 text-sm sm:text-base">Remember:</h4>
              <ul className="text-red-200 text-xs sm:text-sm space-y-1">
                <li>• Close this window when you're done</li>
                <li>• Never take screenshots of this information</li>
                <li>• Use the download backup feature for safe storage</li>
                <li>• Keep your password secure and never share it</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
