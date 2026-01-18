'use client'

import { useState } from 'react';
import { Lock, Trash2 } from 'lucide-react';
import { useWallet } from '@/contexts/DatabaseWalletContext';
import toast from 'react-hot-toast';

export default function UnlockWallet({ onDeleteWallet }) {
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
    <div className="min-h-screen bg-gradient-to-br from-black via-blue-950 to-black flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-black/40 to-blue-950/30"></div>
      <div className="absolute top-20 left-20 w-64 h-64 bg-blue-400/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-20 right-20 w-48 h-48 bg-blue-600/10 rounded-full blur-2xl"></div>

      <div className="max-w-md w-full relative z-10">
        <div className="glass-effect rounded-3xl p-8 border border-blue-500/30 shadow-2xl shadow-blue-500/30">
          <div className="flex items-center justify-center mb-8">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-500/20 to-blue-600/10 rounded-full flex items-center justify-center border border-blue-500/30 shadow-lg shadow-blue-500/20">
              <Lock className="w-12 h-12 text-blue-300" />
            </div>
          </div>

          <h2 className="text-3xl font-bold text-blue-100 text-center mb-3 gradient-text">
            Wallet Locked
          </h2>
          <p className="text-blue-300/80 text-center mb-8 text-lg">
            Enter your password to unlock your wallet
          </p>

          <form onSubmit={handleUnlock} className="space-y-6">
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-6 py-4 bg-gradient-to-r from-black/60 to-blue-950/40 border border-blue-500/30 rounded-xl text-blue-100 placeholder-blue-300/50 focus:outline-none focus:border-blue-400/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300"
                placeholder="Enter your password"
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={loading || !password}
              className="w-full py-4 px-6 bg-gradient-to-r from-blue-600/80 to-blue-800/80 hover:from-blue-500/90 hover:to-blue-700/90 disabled:from-gray-600/50 disabled:to-gray-700/50 disabled:cursor-not-allowed text-blue-100 font-bold rounded-xl transition-all duration-300 shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 btn-glow text-lg"
            >
              {loading ? 'Unlocking...' : 'Unlock Wallet'}
            </button>
          </form>

          <div className="mt-8 text-center space-y-4">
            <p className="text-sm text-blue-300/70">
              Forgot your password?{' '}
              <a href="#" className="text-blue-400 hover:text-blue-300 font-semibold transition-colors duration-300">
                Restore from recovery phrase
              </a>
            </p>

            {}
            {onDeleteWallet && (
              <div className="pt-4 border-t border-blue-500/20">
                <button
                  onClick={() => {
                    if (confirm('Are you sure you want to delete this wallet? Make sure you have backed up your recovery phrase!')) {
                      onDeleteWallet();
                      toast.success('Wallet deleted. You can now create a new one.');
                    }
                  }}
                  className="text-red-400 hover:text-red-300 font-medium transition-colors duration-300 flex items-center gap-2 mx-auto hover:bg-red-500/10 px-3 py-2 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Wallet & Start Fresh
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
