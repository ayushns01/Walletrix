'use client'

import { useState } from 'react';
import { Download, AlertCircle } from 'lucide-react';
import { useWallet } from '@/contexts/WalletContext';
import toast from 'react-hot-toast';

export default function ImportWallet({ onComplete }) {
  const { importWallet } = useWallet();
  const [mnemonic, setMnemonic] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleImport = async () => {
    const words = mnemonic.trim().split(/\s+/);
    
    if (words.length !== 12) {
      toast.error('Recovery phrase must be 12 words');
      return;
    }

    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    try {
      setLoading(true);
      await importWallet(mnemonic.trim(), password);
      onComplete();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border border-purple-500/20">
        <div className="flex items-center justify-center mb-6">
          <Download className="w-16 h-16 text-purple-400" />
        </div>
        <h2 className="text-2xl font-bold text-white text-center mb-2">
          Import Wallet
        </h2>
        <p className="text-gray-400 text-center mb-6">
          Enter your 12-word recovery phrase to restore your wallet
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Recovery Phrase
            </label>
            <textarea
              value={mnemonic}
              onChange={(e) => setMnemonic(e.target.value)}
              rows={4}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500 resize-none"
              placeholder="Enter your 12 words separated by spaces"
            />
            <p className="text-xs text-gray-500 mt-1">
              {mnemonic.trim().split(/\s+/).filter(Boolean).length} / 12 words
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              New Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
              placeholder="Create a password (min 8 characters)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
              placeholder="Confirm password"
            />
          </div>

          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-300">
              <p className="font-medium mb-1">Security Notice:</p>
              <p className="text-xs">
                Your recovery phrase will be encrypted with this password. Make sure to use a strong password that you can remember.
              </p>
            </div>
          </div>

          <button
            onClick={handleImport}
            disabled={loading || !mnemonic || !password || !confirmPassword}
            className="w-full py-3 px-6 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
          >
            {loading ? 'Importing Wallet...' : 'Import Wallet'}
          </button>
        </div>
      </div>
    </div>
  );
}
