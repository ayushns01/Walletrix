'use client'

import { useState } from 'react';
import { Wallet, Eye, EyeOff, AlertCircle, Shield, Users } from 'lucide-react';
import { useWallet } from '@/contexts/DatabaseWalletContext';
import { useUser } from '@clerk/nextjs';
import toast from 'react-hot-toast';
import CreateMultiSigWallet from './CreateMultiSigWallet';

export default function CreateWallet({ onComplete, onMultiSigCreated }) {
  const { generateWallet, isAuthenticated } = useWallet();
  const { user: clerkUser } = useUser();
  const [walletType, setWalletType] = useState(null); // 'regular' or 'multisig'
  const [step, setStep] = useState(0); // Start at 0 for type selection
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [mnemonic, setMnemonic] = useState('');
  const [mnemonicConfirmed, setMnemonicConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [walletName, setWalletName] = useState('');

  // Always require password for wallet encryption
  const requiresPassword = true;

  const handleCreateWallet = async () => {

    // Always validate password
    if (!password || password.trim() === '') {
      toast.error('⚠️ Password is required');
      return;
    }

    if (password.length < 8) {
      toast.error('⚠️ Password must be at least 8 characters long for security');
      return;
    }

    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
      toast.error('⚠️ Password should contain uppercase, lowercase, and numbers for better security');
      // Warning only, don't block
    }

    if (password !== confirmPassword) {
      toast.error('❌ Passwords do not match. Please check and try again.');
      return;
    }

    try {
      setLoading(true);
      toast.loading('🔐 Creating your secure wallet...');
      const walletData = await generateWallet(password, walletName || undefined);
      toast.dismiss();
      toast.success('✅ Wallet created successfully!');
      setMnemonic(walletData.mnemonic);
      setStep(2);
    } catch (error) {
      console.error('Error in handleCreateWallet:', error);
      toast.dismiss();
      if (error.message.includes('network')) {
        toast.error('❌ Network error. Please check your internet connection.');
      } else if (error.message.includes('already exists')) {
        toast.error('❌ A wallet already exists. Please import or delete the existing wallet.');
      } else {
        toast.error('❌ Failed to create wallet: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = () => {
    if (!mnemonicConfirmed) {
      toast.error('⚠️ Please confirm that you have safely backed up your recovery phrase. This is critical for wallet recovery!');
      return;
    }
    toast.success('✅ Setup complete! Your wallet is ready to use.');
    onComplete();
  };

  return (
    <div className="max-w-lg mx-auto">
      {/* Show Multi-Sig Modal if selected */}
      {walletType === 'multisig' ? (
        <CreateMultiSigWallet
          onClose={() => {
            setWalletType(null);
            setStep(0);
          }}
          onSuccess={(createdWallet) => {
            toast.success('✅ Multi-Sig wallet created successfully!');
            // Pass the created wallet to parent for navigation
            if (onMultiSigCreated) {
              onMultiSigCreated(createdWallet);
            } else {
              onComplete();
            }
          }}
        />
      ) : (
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border border-purple-500/20">
          {/* Step 0: Select Wallet Type */}
          {step === 0 && (
            <div>
              <div className="flex items-center justify-center mb-6">
                <Wallet className="w-16 h-16 text-purple-400" />
              </div>
              <h2 className="text-2xl font-bold text-white text-center mb-2">
                Choose Wallet Type
              </h2>
              <p className="text-gray-400 text-center mb-8">
                Select the type of wallet you want to create
              </p>

              <div className="space-y-4">
                {/* Regular Wallet Option */}
                <button
                  onClick={() => {
                    setWalletType('regular');
                    setStep(1);
                  }}
                  className="w-full p-6 bg-gradient-to-br from-purple-600/20 to-blue-600/20 border-2 border-purple-500/30 hover:border-purple-500 rounded-xl transition-all group text-left"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-purple-500/30 transition-colors">
                      <Shield className="w-6 h-6 text-purple-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white mb-1">
                        Regular Wallet
                      </h3>
                      <p className="text-sm text-gray-400 mb-2">
                        Standard HD wallet with single-signature control
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <span className="text-xs px-2 py-1 bg-green-500/20 text-green-300 rounded">
                          Easy to use
                        </span>
                        <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-300 rounded">
                          Instant access
                        </span>
                        <span className="text-xs px-2 py-1 bg-purple-500/20 text-purple-300 rounded">
                          12-word backup
                        </span>
                      </div>
                    </div>
                  </div>
                </button>

                {/* Multi-Sig Wallet Option */}
                <button
                  onClick={() => {
                    setWalletType('multisig');
                  }}
                  className="w-full p-6 bg-gradient-to-br from-blue-600/20 to-purple-600/20 border-2 border-blue-500/30 hover:border-blue-500 rounded-xl transition-all group text-left"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-blue-500/30 transition-colors">
                      <Users className="w-6 h-6 text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white mb-1">
                        Multi-Sig Wallet
                      </h3>
                      <p className="text-sm text-gray-400 mb-2">
                        Requires multiple signatures for enhanced security
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <span className="text-xs px-2 py-1 bg-orange-500/20 text-orange-300 rounded">
                          Enhanced security
                        </span>
                        <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-300 rounded">
                          Team wallets
                        </span>
                        <span className="text-xs px-2 py-1 bg-purple-500/20 text-purple-300 rounded">
                          M-of-N signatures
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              </div>

              <div className="mt-6 bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-300">
                    <p className="font-medium mb-1">Not sure which to choose?</p>
                    <p className="text-xs text-blue-400">
                      Regular wallets are perfect for personal use. Multi-Sig wallets are ideal for teams, DAOs, or high-value assets requiring multiple approvals.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Set Password or Wallet Name */}
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
                {/* Wallet Name (optional) */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Wallet Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={walletName}
                    onChange={(e) => setWalletName(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                    placeholder="e.g., Main Wallet, Trading Wallet"
                  />
                </div>

                {/* Password fields */}
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
            <div className="space-y-5">
              {/* Header */}
              <div className="text-center">
                <div className="w-16 h-16 mx-auto bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-2xl flex items-center justify-center mb-4 border border-amber-500/30">
                  <span className="text-3xl">🔐</span>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  Your Recovery Phrase
                </h2>
                <p className="text-slate-400 text-sm">
                  Write down these 12 words in order. This is the only way to recover your wallet.
                </p>
              </div>

              {/* Critical Security Warning */}
              <div className="bg-gradient-to-r from-red-500/10 to-red-600/10 border border-red-500/30 rounded-2xl p-4">
                <div className="flex gap-3">
                  <div className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="w-5 h-5 text-red-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-red-300 mb-2">Critical Security Warning</p>
                    <ul className="text-xs text-red-200/80 space-y-1">
                      <li className="flex items-start gap-2">
                        <span className="text-red-400 mt-0.5">•</span>
                        Anyone with this phrase can steal your funds
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-red-400 mt-0.5">•</span>
                        Never share it with anyone, including support staff
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-red-400 mt-0.5">•</span>
                        Never store digitally - no screenshots or cloud storage
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Recovery Phrase Display */}
              <div className="relative bg-slate-800/50 rounded-2xl p-5 border border-slate-700/50">
                {/* Show/Hide Toggle */}
                <div className="absolute top-3 right-3 z-10">
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2 ${showPassword
                        ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25'
                      }`}
                  >
                    {showPassword ? (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                        Hide
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        Reveal
                      </>
                    )}
                  </button>
                </div>

                {/* Words Grid */}
                <div className={`grid grid-cols-3 gap-3 pt-8 transition-all duration-300 ${!showPassword ? 'blur-lg select-none pointer-events-none' : ''}`}>
                  {mnemonic.split(' ').map((word, index) => (
                    <div
                      key={index}
                      className="bg-slate-900/80 rounded-xl p-3 border border-slate-700/50 hover:border-purple-500/30 transition-colors group"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 bg-purple-500/20 rounded-lg flex items-center justify-center text-[10px] font-bold text-purple-400">
                          {index + 1}
                        </span>
                        <p className="text-white font-medium text-sm">{word}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Blur Overlay Message */}
                {!showPassword && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="bg-slate-800/90 backdrop-blur-sm px-6 py-3 rounded-xl border border-slate-600/50 shadow-xl">
                      <p className="text-slate-200 text-sm font-medium flex items-center gap-2">
                        <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        Click "Reveal" to show your phrase
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirmation Checkbox */}
              <label className="flex items-start gap-4 p-4 bg-slate-800/30 rounded-xl border border-slate-700/50 cursor-pointer hover:border-purple-500/30 transition-colors">
                <div className="relative flex items-center justify-center flex-shrink-0 mt-0.5">
                  <input
                    type="checkbox"
                    checked={mnemonicConfirmed}
                    onChange={(e) => setMnemonicConfirmed(e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`w-6 h-6 rounded-lg border-2 transition-all flex items-center justify-center ${mnemonicConfirmed
                      ? 'bg-gradient-to-r from-green-500 to-emerald-500 border-green-500'
                      : 'border-slate-600 bg-slate-800'
                    }`}>
                    {mnemonicConfirmed && (
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
                <span className="text-sm text-slate-300 leading-relaxed">
                  I have written down my recovery phrase and stored it in a safe place. I understand that losing this phrase means losing access to my wallet forever.
                </span>
              </label>

              {/* Complete Button */}
              <button
                onClick={handleComplete}
                disabled={!mnemonicConfirmed}
                className="w-full py-4 px-6 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-green-500/25 hover:shadow-green-500/40 disabled:shadow-none hover:scale-[1.02] active:scale-[0.98]"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Complete Setup
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
