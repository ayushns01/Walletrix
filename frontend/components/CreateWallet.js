'use client'

import { useState } from 'react';
import { Wallet, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useWallet } from '@/contexts/DatabaseWalletContext';
import toast from 'react-hot-toast';

export default function CreateWallet({ onComplete }) {
  const { generateWallet } = useWallet();
  const [step, setStep] = useState(1);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [mnemonic, setMnemonic] = useState('');
  const [mnemonicConfirmed, setMnemonicConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleCreateWallet = async () => {
    console.log('Creating wallet...'); // Debug log
    
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
      console.log('Calling generateWallet...'); // Debug log
      const walletData = await generateWallet(password);
      console.log('Wallet generated:', walletData); // Debug log
      setMnemonic(walletData.mnemonic);
      setStep(2);
    } catch (error) {
      console.error('Error in handleCreateWallet:', error);
      toast.error('Failed to create wallet: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = () => {
    if (!mnemonicConfirmed) {
      toast.error('Please confirm you have saved your recovery phrase');
      return;
    }
    onComplete();
  };

  return (
    <div className="max-w-lg mx-auto">
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border border-purple-500/20">
        {/* Step 1: Set Password */}
        {step === 1 && (
          <div>
            <div className="flex items-center justify-center mb-6">
              <Wallet className="w-16 h-16 text-purple-400" />
            </div>
            <h2 className="text-2xl font-bold text-white text-center mb-2">
              Create New Wallet
            </h2>
            <p className="text-gray-400 text-center mb-6">
              Set a strong password to secure your wallet
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                    placeholder="Enter password (min 8 characters)"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Confirm Password
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                  placeholder="Confirm password"
                />
              </div>

              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 flex gap-3">
                <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-300">
                  <p className="font-medium mb-1">Important:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>This password encrypts your wallet locally</li>
                    <li>It cannot be recovered if lost</li>
                    <li>Use a strong, unique password</li>
                  </ul>
                </div>
              </div>

              <button
                onClick={handleCreateWallet}
                disabled={loading || !password || !confirmPassword}
                className="w-full py-3 px-6 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
              >
                {loading ? 'Creating Wallet...' : 'Continue'}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Show Recovery Phrase */}
        {step === 2 && (
          <div>
            <h2 className="text-2xl font-bold text-white text-center mb-2">
              Recovery Phrase
            </h2>
            <p className="text-gray-400 text-center mb-6">
              Write down these 12 words in order and keep them safe
            </p>

            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-6 flex gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-300">
                <p className="font-medium mb-1">⚠️ Never share your recovery phrase!</p>
                <p className="text-xs">
                  Anyone with these words can access your funds. Store them securely offline.
                </p>
              </div>
            </div>

            <div className="bg-gray-900 rounded-lg p-6 mb-6">
              <div className="grid grid-cols-3 gap-3">
                {mnemonic.split(' ').map((word, index) => (
                  <div
                    key={index}
                    className="bg-gray-800 rounded-lg p-3 text-center border border-gray-700"
                  >
                    <span className="text-gray-500 text-xs">{index + 1}.</span>
                    <p className="text-white font-medium">{word}</p>
                  </div>
                ))}
              </div>
            </div>

            <label className="flex items-start gap-3 mb-6 cursor-pointer">
              <input
                type="checkbox"
                checked={mnemonicConfirmed}
                onChange={(e) => setMnemonicConfirmed(e.target.checked)}
                className="mt-1 w-5 h-5 rounded border-gray-600 text-purple-600 focus:ring-purple-500"
              />
              <span className="text-sm text-gray-300">
                I have written down my recovery phrase and stored it in a safe place. I understand that I will lose access to my wallet if I lose this phrase.
              </span>
            </label>

            <button
              onClick={handleComplete}
              disabled={!mnemonicConfirmed}
              className="w-full py-3 px-6 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
            >
              Complete Setup
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
