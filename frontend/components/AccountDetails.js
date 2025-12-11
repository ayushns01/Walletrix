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
  const [copiedField, setCopiedField] = useState('');

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setPassword('');
      setIsUnlocked(false);
      setWalletData(null);
      setShowMnemonic(false);
      setShowEthPrivateKey(false);
      setShowBtcPrivateKey(false);
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
      },
      bitcoin: {
        address: walletData.bitcoin.address,
        privateKey: walletData.bitcoin.privateKey,
      },
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-purple-500/20">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <Key className="w-6 h-6 text-purple-400" />
            <h3 className="text-xl font-bold text-white">Account Details</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <Eye className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Security Warning */}
        <div className="p-6 border-b border-gray-700">
          <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5" />
              <div>
                <h4 className="text-red-300 font-semibold mb-2">Security Warning</h4>
                <ul className="text-red-200 text-sm space-y-1">
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
          /* Password Entry */
          <div className="p-6">
            <div className="max-w-md mx-auto">
              <div className="text-center mb-6">
                <Shield className="w-12 h-12 text-purple-400 mx-auto mb-3" />
                <h4 className="text-lg font-semibold text-white mb-2">Enter Password</h4>
                <p className="text-gray-400 text-sm">
                  Enter your wallet password to view sensitive information
                </p>
              </div>

              <div className="space-y-4">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter wallet password"
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                  onKeyPress={(e) => e.key === 'Enter' && handleUnlock()}
                />
                
                <button
                  onClick={handleUnlock}
                  disabled={loading || !password}
                  className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 text-white font-semibold rounded-lg transition-colors"
                >
                  {loading ? 'Unlocking...' : 'Unlock Wallet'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Wallet Details */
          <div className="p-6 space-y-6">
            {/* Action Buttons */}
            <div className="flex justify-end">
              <button
                onClick={handleDownloadBackup}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                <Download className="w-4 h-4" />
                Download Backup
              </button>
            </div>

            {/* Mnemonic Phrase */}
            <div className="bg-gray-700/50 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Key className="w-5 h-5 text-purple-400" />
                  Recovery Phrase (Mnemonic)
                </h4>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowMnemonic(!showMnemonic)}
                    className="p-2 hover:bg-gray-600 rounded-lg transition-colors"
                  >
                    {showMnemonic ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-400" />}
                  </button>
                  <button
                    onClick={() => handleCopy(walletData.mnemonic, 'Mnemonic Phrase')}
                    className="p-2 hover:bg-gray-600 rounded-lg transition-colors"
                  >
                    {copiedField === 'Mnemonic Phrase' ? 
                      <Check className="w-4 h-4 text-green-400" /> : 
                      <Copy className="w-4 h-4 text-gray-400" />
                    }
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 mb-4">
                {walletData.mnemonic ? walletData.mnemonic.split(' ').map((word, index) => (
                  <div key={index} className="bg-gray-800 p-3 rounded-lg">
                    <span className="text-xs text-gray-400">{index + 1}.</span>
                    <span className="text-white ml-2 font-mono">
                      {showMnemonic ? word : '●●●●●'}
                    </span>
                  </div>
                )) : <p className="text-gray-400">No mnemonic available</p>}
              </div>
              
              <p className="text-yellow-300 text-sm">
                ⚠️ This phrase can recover your entire wallet. Store it safely!
              </p>
            </div>

            {/* Ethereum Details */}
            <div className="bg-gray-700/50 rounded-lg p-6">
              <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <span className="text-blue-400">Ξ</span>
                Ethereum Account
              </h4>
              
              <div className="space-y-4">
                {/* Ethereum Address */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Public Address
                  </label>
                  <div className="flex items-center gap-2 p-3 bg-gray-800 rounded-lg">
                    <span className="text-white font-mono text-sm flex-1 break-all">
                      {walletData?.ethereum?.address || 'N/A'}
                    </span>
                    <button
                      onClick={() => handleCopy(walletData?.ethereum?.address || '', 'Ethereum Address')}
                      disabled={!walletData?.ethereum?.address}
                      className="p-2 hover:bg-gray-600 rounded-lg transition-colors"
                    >
                      {copiedField === 'Ethereum Address' ? 
                        <Check className="w-4 h-4 text-green-400" /> : 
                        <Copy className="w-4 h-4 text-gray-400" />
                      }
                    </button>
                  </div>
                </div>

                {/* Ethereum Private Key */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Private Key
                  </label>
                  <div className="flex items-center gap-2 p-3 bg-gray-800 rounded-lg">
                    <span className="text-white font-mono text-sm flex-1 break-all">
                      {showEthPrivateKey ? (walletData?.ethereum?.privateKey || 'N/A') : '●'.repeat(66)}
                    </span>
                    <button
                      onClick={() => setShowEthPrivateKey(!showEthPrivateKey)}
                      disabled={!walletData?.ethereum?.privateKey}
                      className="p-2 hover:bg-gray-600 rounded-lg transition-colors"
                    >
                      {showEthPrivateKey ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-400" />}
                    </button>
                    <button
                      onClick={() => handleCopy(walletData?.ethereum?.privateKey || '', 'Ethereum Private Key')}
                      disabled={!walletData?.ethereum?.privateKey}
                      className="p-2 hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {copiedField === 'Ethereum Private Key' ? 
                        <Check className="w-4 h-4 text-green-400" /> : 
                        <Copy className="w-4 h-4 text-gray-400" />
                      }
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Bitcoin Details */}
            <div className="bg-gray-700/50 rounded-lg p-6">
              <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <span className="text-orange-400">₿</span>
                Bitcoin Account
              </h4>
              
              <div className="space-y-4">
                {/* Bitcoin Address */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Public Address
                  </label>
                  <div className="flex items-center gap-2 p-3 bg-gray-800 rounded-lg">
                    <span className="text-white font-mono text-sm flex-1 break-all">
                      {walletData?.bitcoin?.address || 'N/A'}
                    </span>
                    <button
                      onClick={() => handleCopy(walletData?.bitcoin?.address || '', 'Bitcoin Address')}
                      disabled={!walletData?.bitcoin?.address}
                      className="p-2 hover:bg-gray-600 rounded-lg transition-colors"
                    >
                      {copiedField === 'Bitcoin Address' ? 
                        <Check className="w-4 h-4 text-green-400" /> : 
                        <Copy className="w-4 h-4 text-gray-400" />
                      }
                    </button>
                  </div>
                </div>

                {/* Bitcoin Private Key */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Private Key (WIF Format)
                  </label>
                  <div className="flex items-center gap-2 p-3 bg-gray-800 rounded-lg">
                    <span className="text-white font-mono text-sm flex-1 break-all">
                      {showBtcPrivateKey ? (walletData?.bitcoin?.privateKey || 'N/A') : '●'.repeat(52)}
                    </span>
                    <button
                      onClick={() => setShowBtcPrivateKey(!showBtcPrivateKey)}
                      disabled={!walletData?.bitcoin?.privateKey}
                      className="p-2 hover:bg-gray-600 rounded-lg transition-colors"
                    >
                      {showBtcPrivateKey ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-400" />}
                    </button>
                    <button
                      onClick={() => handleCopy(walletData?.bitcoin?.privateKey || '', 'Bitcoin Private Key')}
                      disabled={!walletData?.bitcoin?.privateKey}
                      className="p-2 hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {copiedField === 'Bitcoin Private Key' ? 
                        <Check className="w-4 h-4 text-green-400" /> : 
                        <Copy className="w-4 h-4 text-gray-400" />
                      }
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Wallet Information */}
            <div className="bg-gray-700/50 rounded-lg p-6">
              <h4 className="text-lg font-semibold text-white mb-4">Wallet Information</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Derivation Path (Ethereum)
                  </label>
                  <div className="p-3 bg-gray-800 rounded-lg">
                    <span className="text-white font-mono text-sm">m/44'/60'/0'/0/0</span>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Derivation Path (Bitcoin)
                  </label>
                  <div className="p-3 bg-gray-800 rounded-lg">
                    <span className="text-white font-mono text-sm">m/44'/0'/0'/0/0</span>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Wallet Type
                  </label>
                  <div className="p-3 bg-gray-800 rounded-lg">
                    <span className="text-white text-sm">Hierarchical Deterministic (HD)</span>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Encryption
                  </label>
                  <div className="p-3 bg-gray-800 rounded-lg">
                    <span className="text-white text-sm">AES-256 Encrypted</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Security Reminder */}
            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
              <h4 className="text-red-300 font-semibold mb-2">Remember:</h4>
              <ul className="text-red-200 text-sm space-y-1">
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