'use client'

import { useState } from 'react';
import { Lock } from 'lucide-react';
import { useWallet } from '@/contexts/WalletContext';

export default function UnlockWallet() {
  const { unlockWallet } = useWallet();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUnlock = async (e) => {
    e.preventDefault();
    
    if (!password) return;

    try {
      setLoading(true);
      await unlockWallet(password);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border border-purple-500/20">
          <div className="flex items-center justify-center mb-6">
            <div className="w-20 h-20 bg-purple-600/20 rounded-full flex items-center justify-center">
              <Lock className="w-10 h-10 text-purple-400" />
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-white text-center mb-2">
            Wallet Locked
          </h2>
          <p className="text-gray-400 text-center mb-8">
            Enter your password to unlock your wallet
          </p>

          <form onSubmit={handleUnlock} className="space-y-4">
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                placeholder="Enter your password"
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={loading || !password}
              className="w-full py-3 px-6 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
            >
              {loading ? 'Unlocking...' : 'Unlock Wallet'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-400">
              Forgot your password?{' '}
              <a href="#" className="text-purple-400 hover:text-purple-300">
                Restore from recovery phrase
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
