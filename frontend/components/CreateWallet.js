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
    console.log('Creating wallet...'); // Debug log

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
      console.log('Calling generateWallet...'); // Debug log
      const walletData = await generateWallet(password, walletName || undefined);
      console.log('Wallet generated:', walletData); // Debug log
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
            <div>
              <h2 className="text-2xl font-bold text-white text-center mb-2">
                🔒 Recovery Phrase
              </h2>
              <p className="text-gray-400 text-center mb-6">
                Write down these 12 words on paper. Never screenshot or copy digitally.
              </p>

              {/* Critical Security Warnings */}
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-4">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-red-300">
                    <p className="font-bold mb-2">⚠️ CRITICAL SECURITY WARNINGS:</p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>Anyone with this phrase can steal your funds</li>
                      <li>Never share it with anyone, even support staff</li>
                      <li>Never store it digitally (no screenshots, cloud, etc.)</li>
                      <li>Check for cameras or people watching</li>
                      <li>Write it on paper and store in multiple secure locations</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-6 flex gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-300">
                  <p className="font-medium mb-1">⚠️ Never share your recovery phrase!</p>
                  <p className="text-xs">
                    Anyone with these words can access your funds. Store them securely offline.
                  </p>
                </div>
              </div>

              <div className="bg-gray-900 rounded-lg p-6 mb-6 relative">
                <div className="absolute top-2 right-2 z-10">
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-xs px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors font-medium"
                  >
                    {showPassword ? '👁️ Hide' : '👁️‍🗨️ Show'}
                  </button>
                </div>
                <div className={`grid grid-cols-3 gap-3 transition-all duration-200 ${!showPassword ? 'blur-xl select-none pointer-events-none' : ''}`}>
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
                {!showPassword && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <p className="text-gray-300 text-sm font-medium bg-gray-800 px-4 py-2 rounded-lg">
                      🔒 Click "Show" to reveal your recovery phrase
                    </p>
                  </div>
                )}
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
      )}
    </div>
  );
}
