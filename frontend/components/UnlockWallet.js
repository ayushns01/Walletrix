'use client'

import { useState } from 'react';
import { Lock, Trash2 } from 'lucide-react';
import { useWallet } from '@/contexts/DatabaseWalletContext';
import toast from 'react-hot-toast';

export default function UnlockWallet({ onDeleteWallet, onImportWallet }) {
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
    <div className="min-h-screen bg-gradient-to-br from-black via-wx-accent to-black flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-gradient-to-br from-wx-surface via-black/40 to-wx-bg"></div>
      <div className="absolute top-20 left-20 w-64 h-64 bg-[rgba(103,209,239,0.10)] rounded-full blur-3xl"></div>
      <div className="absolute bottom-20 right-20 w-48 h-48 bg-[rgba(103,209,239,0.10)] rounded-full blur-2xl"></div>

      <div className="max-w-md w-full relative z-10">
        <div className="glass-effect rounded-3xl p-8 border border-[rgba(103,209,239,0.30)] shadow-2xl shadow-[rgba(103,209,239,0.30)]">
          <div className="flex items-center justify-center mb-8">
            <div className="w-24 h-24 bg-gradient-to-br from-[rgba(103,209,239,0.20)] to-[rgba(103,209,239,0.10)] rounded-full flex items-center justify-center border border-[rgba(103,209,239,0.30)] shadow-lg shadow-[rgba(103,209,239,0.20)]">
              <Lock className="w-12 h-12 text-wx-accent" />
            </div>
          </div>

          <h2 className="text-3xl font-bold text-wx-ink text-center mb-3">
            Wallet Locked
          </h2>
          <p className="text-wx-dim text-center mb-8 text-lg">
            Enter your password to unlock your wallet
          </p>

          <form onSubmit={handleUnlock} className="space-y-6">
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-6 py-4 bg-wx-surface border border-wx-line-strong rounded-wx-sm text-wx-ink placeholder-wx-dim focus:outline-none focus:border-wx-accent focus:ring-2 focus:ring-wx-accent transition-all duration-300 ease-wx"
                placeholder="Enter your password"
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={loading || !password}
              className="w-full py-4 px-6 bg-wx-accent hover:shadow-wx-glow-lg disabled:bg-wx-surface disabled:text-wx-dim disabled:shadow-none disabled:cursor-not-allowed text-wx-bg font-bold rounded-full transition-all duration-300 ease-wx shadow-wx-glow text-lg"
            >
              {loading ? 'Unlocking...' : 'Unlock Wallet'}
            </button>
          </form>

          <div className="mt-8 text-center space-y-4">
            <p className="text-sm text-wx-dim">
              Forgot your password?{' '}
              <button
                onClick={onImportWallet}
                className="text-wx-accent hover:text-wx-ink font-semibold transition-colors duration-300 underline"
              >
                Restore from recovery phrase
              </button>
            </p>

            {}
            {onDeleteWallet && (
              <div className="pt-4 border-t border-wx-line">
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
