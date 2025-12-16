'use client'

import { useState } from 'react'
import { 
  X, User, Shield, Globe, Bell, Lock, Wallet, Download, 
  Trash2, Key, Eye, EyeOff, Settings as SettingsIcon, 
  HelpCircle, FileText, ExternalLink, ChevronRight, AlertTriangle,
  Users, LogOut, Moon, Sun, Smartphone, Languages, Database, FileDown, Sparkles
} from 'lucide-react'
import { useWallet } from '@/contexts/DatabaseWalletContext'
import { useUser, useClerk } from '@clerk/nextjs'
import toast from 'react-hot-toast'

export default function Settings({ isOpen, onClose, onOpenAccountDetails, onStartTutorial }) {
  const { user: clerkUser } = useUser()
  const { signOut } = useClerk()
  const { 
    userWallets, 
    activeWalletId, 
    deleteWallet, 
    deleteDatabaseWallet,
    importLocalStorageWallet,
    logout,
    user,
    isAuthenticated,
    autoLockEnabled,
    setAutoLockEnabled,
    autoLockTimeout,
    setAutoLockTimeout,
    showWalkthroughOnUnlock,
    setShowWalkthroughOnUnlock
  } = useWallet()
  
  const [activeTab, setActiveTab] = useState('account')
  const [showPrivateKey, setShowPrivateKey] = useState(false)
  const [showMobileSidebar, setShowMobileSidebar] = useState(false)

  if (!isOpen) return null

  const tabs = [
    { id: 'account', name: 'Account', icon: User },
    { id: 'security', name: 'Security', icon: Shield },
    { id: 'wallet', name: 'Wallet Management', icon: Wallet },
    { id: 'network', name: 'Networks', icon: Globe },
    { id: 'privacy', name: 'Privacy', icon: Eye },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'appearance', name: 'Appearance', icon: Moon },
    { id: 'advanced', name: 'Advanced', icon: SettingsIcon },
    { id: 'about', name: 'About & Support', icon: HelpCircle },
  ]

  const handleDeleteWallet = async () => {
    const activeWallet = userWallets.find(w => w.id === activeWalletId)
    if (!activeWallet) return
    
    if (confirm(`Are you sure you want to delete "${activeWallet.name}"? This action cannot be undone. Make sure you have backed up your recovery phrase.`)) {
      try {
        const result = await deleteDatabaseWallet(activeWalletId)
        if (result.success) {
          // Success toast already shown in deleteDatabaseWallet
          onClose()
        }
      } catch (error) {
        console.error('Delete failed:', error)
        toast.error('Failed to delete wallet')
      }
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      logout()
      toast.success('Signed out successfully')
      onClose()
    } catch (error) {
      console.error('Sign out failed:', error)
      toast.error('Failed to sign out')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-lg flex items-center justify-center p-2 sm:p-4 animate-fade-in" style={{ zIndex: 9998 }}>
      <div className="glass-effect rounded-2xl sm:rounded-3xl w-full max-w-6xl h-[95vh] sm:h-[90vh] border border-blue-500/30 shadow-2xl shadow-blue-500/20 flex flex-col animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between p-3 sm:p-6 border-b border-blue-500/20">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="relative hidden sm:block">
              <SettingsIcon className="w-8 h-8 text-blue-400" />
              <div className="absolute inset-0 blur-xl bg-blue-400/30" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold gradient-text">Settings</h2>
              <p className="text-xs sm:text-sm text-blue-300 hidden sm:block">Manage your wallet preferences</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 sm:p-3 hover:bg-red-500/20 rounded-xl transition-all duration-200 group"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6 text-blue-300 group-hover:text-red-400" />
          </button>
        </div>

        <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
          {/* Mobile Tab Navigation */}
          <div className="lg:hidden w-full border-b border-blue-500/20 overflow-x-auto custom-scrollbar flex-shrink-0">
            <div className="flex gap-1 p-2 min-w-max">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-blue-600/30 to-blue-800/30 text-blue-100 border border-blue-500/40'
                      : 'text-blue-300 hover:bg-blue-900/20'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  <span className="font-medium text-xs">{tab.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Desktop Sidebar */}
          <div className="hidden lg:block w-64 border-r border-blue-500/20 p-4 overflow-y-auto custom-scrollbar flex-shrink-0">
            <nav className="space-y-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-blue-600/30 to-blue-800/30 text-blue-100 border border-blue-500/40'
                      : 'text-blue-300 hover:bg-blue-900/20'
                  }`}
                >
                  <tab.icon className="w-5 h-5" />
                  <span className="font-medium text-sm">{tab.name}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-6">
            {/* Account Tab */}
            {activeTab === 'account' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-blue-100 mb-3 sm:mb-4">Account Information</h3>
                  
                  {isAuthenticated && clerkUser ? (
                    <div className="space-y-4">
                      <div className="glass-effect rounded-xl p-4 sm:p-6 border border-blue-500/20">
                        <div className="flex items-center gap-3 sm:gap-4 mb-4">
                          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r from-blue-600 to-blue-800 rounded-full flex items-center justify-center text-white font-bold text-xl sm:text-2xl shadow-lg shadow-blue-500/30">
                            {clerkUser.firstName?.[0] || clerkUser.primaryEmailAddress?.emailAddress?.[0].toUpperCase() || 'U'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-base sm:text-lg font-bold text-blue-100 truncate">
                              {clerkUser.fullName || 'User'}
                            </h4>
                            <p className="text-xs sm:text-sm text-blue-300 truncate">{clerkUser.primaryEmailAddress?.emailAddress}</p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 sm:gap-4 mt-4 pt-4 border-t border-blue-500/20">
                          <div>
                            <p className="text-xs text-blue-400 mb-1">Wallets</p>
                            <p className="text-lg font-bold text-blue-100">{userWallets.length}</p>
                          </div>
                          <div>
                            <p className="text-xs text-blue-400 mb-1">Account Type</p>
                            <p className="text-lg font-bold text-blue-100">Premium</p>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={handleSignOut}
                        className="w-full py-3 sm:py-4 px-4 sm:px-6 bg-gradient-to-r from-red-900/30 to-red-800/20 hover:from-red-800/40 hover:to-red-700/30 text-red-300 font-semibold rounded-xl transition-all duration-300 border border-red-500/20 hover:border-red-400/40 flex items-center justify-center gap-2 sm:gap-3 text-sm sm:text-base"
                      >
                        <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
                        Sign Out
                      </button>
                    </div>
                  ) : (
                    <div className="glass-effect rounded-xl p-6 border border-blue-500/20">
                      <p className="text-blue-300 mb-4">You're using Walletrix in local mode. Sign in to sync across devices and enable cloud backup.</p>
                      <button className="w-full py-3 px-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-semibold rounded-xl transition-all duration-300">
                        Sign In / Register
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-blue-100 mb-3 sm:mb-4">Security & Privacy</h3>
                  
                  <div className="space-y-4">
                    {/* View Private Keys Section */}
                    <div className="glass-effect rounded-xl p-4 sm:p-6 border border-red-500/30 bg-red-900/10">
                      <div className="flex items-start gap-2 sm:gap-3 mb-3 sm:mb-4">
                        <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-red-400 mt-1 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-red-300 mb-2 text-sm sm:text-base">Private Keys & Recovery Phrase</h4>
                          <p className="text-xs sm:text-sm text-red-200/80 mb-3 sm:mb-4">
                            Never share your private keys or recovery phrase with anyone. Anyone with access to these can steal your funds.
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          onClose()
                          if (onOpenAccountDetails) {
                            onOpenAccountDetails()
                          }
                        }}
                        className="w-full py-2.5 sm:py-3 px-4 sm:px-6 bg-gradient-to-r from-red-900/40 to-red-800/30 hover:from-red-800/50 hover:to-red-700/40 text-red-300 font-semibold rounded-xl transition-all duration-300 border border-red-500/30 hover:border-red-400/50 flex items-center justify-center gap-2 sm:gap-3 text-xs sm:text-sm"
                      >
                        <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span className="truncate">View Private Keys & Recovery Phrase</span>
                      </button>
                    </div>

                    <div className="glass-effect rounded-xl p-4 sm:p-6 border border-blue-500/20">
                      <div className="flex items-center justify-between mb-3 gap-2">
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                          <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-green-400 flex-shrink-0" />
                          <h4 className="font-semibold text-blue-100 text-sm sm:text-base truncate">Auto-Lock Wallet</h4>
                        </div>
                        <button
                          onClick={() => {
                            setAutoLockEnabled(!autoLockEnabled)
                            toast.success(autoLockEnabled ? 'Auto-lock disabled' : 'Auto-lock enabled')
                          }}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            autoLockEnabled ? 'bg-green-500' : 'bg-gray-600'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              autoLockEnabled ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                      <p className="text-xs sm:text-sm text-blue-300 ml-6 sm:ml-8 mb-3">
                        Automatically lock wallet after inactivity
                      </p>
                      
                      {autoLockEnabled && (
                        <div className="ml-6 sm:ml-8 space-y-2">
                          <label className="block text-xs sm:text-sm text-blue-200 mb-1">
                            Lock after (seconds):
                          </label>
                          <select
                            value={autoLockTimeout / 1000}
                            onChange={(e) => {
                              const seconds = parseInt(e.target.value)
                              setAutoLockTimeout(seconds * 1000)
                              toast.success(`Auto-lock set to ${seconds} seconds`)
                            }}
                            className="w-full sm:w-48 px-3 py-2 bg-blue-900/30 border border-blue-500/30 rounded-lg text-blue-100 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                          >
                            <option value="15">15 seconds</option>
                            <option value="30">30 seconds</option>
                            <option value="60">1 minute</option>
                            <option value="120">2 minutes</option>
                            <option value="300">5 minutes</option>
                            <option value="600">10 minutes</option>
                          </select>
                        </div>
                      )}
                    </div>

                    <div className="glass-effect rounded-xl p-4 sm:p-6 border border-blue-500/20">
                      <div className="flex items-center justify-between mb-3 gap-2">
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                          <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400 flex-shrink-0" />
                          <h4 className="font-semibold text-blue-100 text-sm sm:text-base truncate">Show Tutorial on Unlock</h4>
                        </div>
                        <button
                          onClick={() => {
                            setShowWalkthroughOnUnlock(!showWalkthroughOnUnlock)
                            toast.success(showWalkthroughOnUnlock ? '❌ Tutorial disabled' : '✅ Tutorial enabled')
                          }}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            showWalkthroughOnUnlock ? 'bg-purple-500' : 'bg-gray-600'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              showWalkthroughOnUnlock ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                      <p className="text-xs sm:text-sm text-blue-300 ml-6 sm:ml-8">
                        Automatically show feature walkthrough when wallet is unlocked
                      </p>
                    </div>

                    <div className="glass-effect rounded-xl p-4 sm:p-6 border border-blue-500/20">
                      <div className="flex items-center justify-between mb-2 gap-2">
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                          <Key className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400 flex-shrink-0" />
                          <h4 className="font-semibold text-blue-100 text-sm sm:text-base truncate">Biometric Authentication</h4>
                        </div>
                        <span className="text-xs sm:text-sm px-2 sm:px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full whitespace-nowrap">Coming Soon</span>
                      </div>
                      <p className="text-xs sm:text-sm text-blue-300 ml-6 sm:ml-8">Use fingerprint or face recognition to unlock</p>
                    </div>

                    <div className="glass-effect rounded-xl p-4 sm:p-6 border border-blue-500/20">
                      <div className="flex items-center justify-between mb-2 gap-2">
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                          <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400 flex-shrink-0" />
                          <h4 className="font-semibold text-blue-100 text-sm sm:text-base truncate">Two-Factor Authentication</h4>
                        </div>
                        <span className="text-xs sm:text-sm px-2 sm:px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full whitespace-nowrap">Coming Soon</span>
                      </div>
                      <p className="text-xs sm:text-sm text-blue-300 ml-6 sm:ml-8">Add an extra layer of security to your account</p>
                    </div>

                    <div className="glass-effect rounded-xl p-4 sm:p-6 border border-blue-500/20">
                      <div className="flex items-center justify-between mb-2 gap-2">
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                          <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400 flex-shrink-0" />
                          <h4 className="font-semibold text-blue-100 text-sm sm:text-base truncate">Transaction Signing</h4>
                        </div>
                        <span className="text-xs sm:text-sm px-2 sm:px-3 py-1 bg-green-500/20 text-green-300 rounded-full whitespace-nowrap">Active</span>
                      </div>
                      <p className="text-xs sm:text-sm text-blue-300 ml-6 sm:ml-8">Require password for transaction signing</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Wallet Management Tab */}
            {activeTab === 'wallet' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-blue-100 mb-3 sm:mb-4">Wallet Management</h3>
                  
                  <div className="space-y-4">
                    {/* Current Wallets */}
                    <div className="glass-effect rounded-xl p-4 sm:p-6 border border-blue-500/20">
                      <h4 className="font-semibold text-blue-100 mb-3 sm:mb-4 flex items-center gap-2 text-sm sm:text-base">
                        <Wallet className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
                        Your Wallets ({userWallets.length})
                      </h4>
                      
                      {userWallets.map((w) => (
                        <div key={w.id} className="p-3 sm:p-4 bg-blue-900/20 rounded-lg border border-blue-500/20 mb-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-blue-100 text-sm sm:text-base truncate">{w.name || 'Unnamed Wallet'}</p>
                              <p className="text-xs text-blue-300 mt-1">
                                Created {new Date(w.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                            {w.id === activeWalletId && (
                              <span className="text-xs px-2 sm:px-3 py-1 bg-green-500/20 text-green-300 rounded-full whitespace-nowrap">Active</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Export/Backup Wallet */}
                    {activeWalletId && (
                      <button
                        onClick={() => {
                          onClose()
                          if (onOpenAccountDetails) {
                            onOpenAccountDetails()
                          }
                        }}
                        className="w-full py-3 sm:py-4 px-4 sm:px-6 bg-gradient-to-r from-blue-900/30 to-blue-800/20 hover:from-blue-800/40 hover:to-blue-700/30 text-blue-300 font-semibold rounded-xl transition-all duration-300 border border-blue-500/20 hover:border-blue-400/40 flex items-center justify-center gap-2 sm:gap-3 text-sm sm:text-base"
                      >
                        <FileDown className="w-4 h-4 sm:w-5 sm:h-5" />
                        Export Wallet Backup
                      </button>
                    )}

                    {/* Import Browser Wallet */}
                    {activeWalletId === null && (
                      <button
                        onClick={async () => {
                          try {
                            await importLocalStorageWallet()
                            toast.success('Wallet imported successfully')
                          } catch (error) {
                            console.error('Import failed:', error)
                            toast.error('Failed to import wallet')
                          }
                        }}
                        className="w-full py-3 sm:py-4 px-4 sm:px-6 bg-gradient-to-r from-green-900/30 to-green-800/20 hover:from-green-800/40 hover:to-green-700/30 text-green-300 font-semibold rounded-xl transition-all duration-300 border border-green-500/20 hover:border-green-400/40 flex items-center justify-center gap-2 sm:gap-3 text-sm sm:text-base"
                      >
                        <Download className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span className="truncate">Import Browser Wallet to Account</span>
                      </button>
                    )}

                    {/* Delete Active Wallet */}
                    {activeWalletId && (
                      <button
                        onClick={handleDeleteWallet}
                        className="w-full py-3 sm:py-4 px-4 sm:px-6 bg-gradient-to-r from-red-900/30 to-red-800/20 hover:from-red-800/40 hover:to-red-700/30 text-red-300 font-semibold rounded-xl transition-all duration-300 border border-red-500/20 hover:border-red-400/40 flex items-center justify-center gap-2 sm:gap-3 text-sm sm:text-base"
                      >
                        <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                        Delete Current Wallet
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Network Tab */}
            {activeTab === 'network' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-blue-100 mb-3 sm:mb-4">Network Preferences</h3>
                  
                  <div className="space-y-4">
                    <div className="glass-effect rounded-xl p-4 sm:p-6 border border-blue-500/20">
                      <h4 className="font-semibold text-blue-100 mb-2 text-sm sm:text-base">Default Network</h4>
                      <p className="text-xs sm:text-sm text-blue-300 mb-3 sm:mb-4">Choose which network to use by default</p>
                      <div className="space-y-2">
                        {['Ethereum Mainnet', 'Polygon', 'Arbitrum', 'Optimism'].map((network) => (
                          <label key={network} className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-blue-900/20 rounded-lg cursor-pointer hover:bg-blue-800/30 transition-all">
                            <input type="radio" name="network" className="w-4 h-4 flex-shrink-0" />
                            <span className="text-blue-100 text-sm sm:text-base flex-1 min-w-0 truncate">{network}</span>
                            <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-300 rounded-full whitespace-nowrap">Coming Soon</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="glass-effect rounded-xl p-4 sm:p-6 border border-blue-500/20">
                      <h4 className="font-semibold text-blue-100 mb-2 text-sm sm:text-base">Custom RPC Endpoints</h4>
                      <p className="text-xs sm:text-sm text-blue-300 mb-3 sm:mb-4">Add your own RPC endpoints for better performance</p>
                      <button className="w-full py-2.5 sm:py-3 px-4 sm:px-6 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 font-medium rounded-lg transition-all duration-300 border border-blue-500/20 text-sm sm:text-base">
                        Add Custom RPC (Coming Soon)
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Privacy Tab */}
            {activeTab === 'privacy' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-blue-100 mb-3 sm:mb-4">Privacy & Data</h3>
                  
                  <div className="space-y-4">
                    <div className="glass-effect rounded-xl p-4 sm:p-6 border border-blue-500/20">
                      <div className="flex items-start justify-between gap-3 mb-2 sm:mb-4">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-blue-100 text-sm sm:text-base">Analytics & Crash Reports</h4>
                          <p className="text-xs sm:text-sm text-blue-300 mt-1">Help improve Walletrix by sharing anonymous usage data</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                          <input type="checkbox" className="sr-only peer" />
                          <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    </div>

                    <div className="glass-effect rounded-xl p-4 sm:p-6 border border-blue-500/20">
                      <div className="flex items-start justify-between gap-3 mb-2 sm:mb-4">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-blue-100 text-sm sm:text-base">Hide Balance on Dashboard</h4>
                          <p className="text-xs sm:text-sm text-blue-300 mt-1">Mask your balance with asterisks</p>
                        </div>
                        <span className="text-xs sm:text-sm px-2 sm:px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full whitespace-nowrap">Coming Soon</span>
                      </div>
                    </div>

                    <div className="glass-effect rounded-xl p-4 sm:p-6 border border-blue-500/20">
                      <div className="flex items-start justify-between gap-3 mb-2 sm:mb-4">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-blue-100 text-sm sm:text-base">Transaction History Export</h4>
                          <p className="text-xs sm:text-sm text-blue-300 mt-1">Download your transaction history as CSV</p>
                        </div>
                        <button className="px-3 sm:px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 rounded-lg transition-all text-xs sm:text-sm whitespace-nowrap">
                          Export
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-blue-100 mb-3 sm:mb-4">Notifications</h3>
                  
                  <div className="space-y-4">
                    <div className="glass-effect rounded-xl p-4 sm:p-6 border border-blue-500/20">
                      <h4 className="font-semibold text-blue-100 mb-3 sm:mb-4 text-sm sm:text-base">Push Notifications</h4>
                      
                      {['Transaction Confirmations', 'Price Alerts', 'Security Alerts', 'Network Updates'].map((item) => (
                        <div key={item} className="flex items-center justify-between gap-3 py-2 sm:py-3 border-b border-blue-500/10 last:border-0">
                          <span className="text-blue-200 text-sm sm:text-base flex-1 min-w-0 truncate">{item}</span>
                          <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                            <input type="checkbox" className="sr-only peer" defaultChecked />
                            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                          </label>
                        </div>
                      ))}
                    </div>

                    <div className="glass-effect rounded-xl p-4 sm:p-6 border border-blue-500/20">
                      <h4 className="font-semibold text-blue-100 mb-2 text-sm sm:text-base">Email Notifications</h4>
                      <p className="text-xs sm:text-sm text-blue-300 mb-3 sm:mb-4">Receive important updates via email</p>
                      <span className="text-xs sm:text-sm px-2 sm:px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full">Coming Soon</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Appearance Tab */}
            {activeTab === 'appearance' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-blue-100 mb-3 sm:mb-4">Appearance</h3>
                  
                  <div className="space-y-4">
                    <div className="glass-effect rounded-xl p-4 sm:p-6 border border-blue-500/20">
                      <h4 className="font-semibold text-blue-100 mb-3 sm:mb-4 text-sm sm:text-base">Theme</h4>
                      <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-blue-900/20 rounded-lg">
                        <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400 flex-shrink-0" />
                        <span className="text-blue-100 text-sm sm:text-base flex-1">Dark Theme</span>
                        <span className="text-xs px-2 sm:px-3 py-1 bg-green-500/20 text-green-300 rounded-full whitespace-nowrap">Active</span>
                      </div>
                    </div>

                    <div className="glass-effect rounded-xl p-4 sm:p-6 border border-blue-500/20">
                      <h4 className="font-semibold text-blue-100 mb-3 sm:mb-4 text-sm sm:text-base">Language</h4>
                      <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-blue-900/20 rounded-lg">
                        <Languages className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400 flex-shrink-0" />
                        <span className="text-blue-100 text-sm sm:text-base flex-1">English (US)</span>
                        <span className="text-xs px-2 sm:px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full whitespace-nowrap">Default</span>
                      </div>
                    </div>

                    <div className="glass-effect rounded-xl p-4 sm:p-6 border border-blue-500/20">
                      <h4 className="font-semibold text-blue-100 mb-3 sm:mb-4 text-sm sm:text-base">Currency Display</h4>
                      <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-blue-900/20 rounded-lg">
                        <Database className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400 flex-shrink-0" />
                        <span className="text-blue-100 text-sm sm:text-base flex-1">USD ($)</span>
                        <span className="text-xs px-2 sm:px-3 py-1 bg-green-500/20 text-green-300 rounded-full whitespace-nowrap">Active</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Advanced Tab */}
            {activeTab === 'advanced' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-blue-100 mb-3 sm:mb-4">Advanced Settings</h3>
                  
                  <div className="space-y-4">
                    <div className="glass-effect rounded-xl p-4 sm:p-6 border border-yellow-500/20 bg-yellow-900/10">
                      <div className="flex items-start gap-2 sm:gap-3">
                        <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-400 mt-1 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-yellow-300 mb-2 text-sm sm:text-base">Caution</h4>
                          <p className="text-xs sm:text-sm text-yellow-200/80">
                            Advanced settings can affect wallet security and functionality. Only change these if you know what you're doing.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="glass-effect rounded-xl p-4 sm:p-6 border border-blue-500/20">
                      <h4 className="font-semibold text-blue-100 mb-2 text-sm sm:text-base">Gas Price Settings</h4>
                      <p className="text-xs sm:text-sm text-blue-300 mb-3 sm:mb-4">Customize gas price for transactions</p>
                      <span className="text-xs sm:text-sm px-2 sm:px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full">Coming Soon</span>
                    </div>

                    <div className="glass-effect rounded-xl p-4 sm:p-6 border border-blue-500/20">
                      <h4 className="font-semibold text-blue-100 mb-2 text-sm sm:text-base">Developer Mode</h4>
                      <p className="text-xs sm:text-sm text-blue-300 mb-3 sm:mb-4">Enable advanced debugging features</p>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    <div className="glass-effect rounded-xl p-4 sm:p-6 border border-blue-500/20">
                      <h4 className="font-semibold text-blue-100 mb-2 text-sm sm:text-base">Tutorial Walkthrough</h4>
                      <p className="text-xs sm:text-sm text-blue-300 mb-3 sm:mb-4">Start the interactive tutorial guide</p>
                      <button 
                        onClick={() => {
                          onClose();
                          sessionStorage.removeItem('walletrix_walkthrough_shown');
                          if (onStartTutorial) {
                            setTimeout(() => {
                              onStartTutorial();
                            }, 300);
                          }
                          toast.success('✨ Starting tutorial...');
                        }}
                        className="px-4 sm:px-6 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 rounded-lg transition-all text-sm sm:text-base"
                      >
                        Start Tutorial
                      </button>
                    </div>

                    <div className="glass-effect rounded-xl p-4 sm:p-6 border border-blue-500/20">
                      <h4 className="font-semibold text-blue-100 mb-2 text-sm sm:text-base">Clear Cache</h4>
                      <p className="text-xs sm:text-sm text-blue-300 mb-3 sm:mb-4">Clear cached data and preferences</p>
                      <button className="px-4 sm:px-6 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-300 rounded-lg transition-all text-sm sm:text-base">
                        Clear Cache
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* About Tab */}
            {activeTab === 'about' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-blue-100 mb-3 sm:mb-4">About Walletrix</h3>
                  
                  <div className="space-y-4">
                    <div className="glass-effect rounded-xl p-4 sm:p-6 border border-blue-500/20 text-center">
                      <div className="relative inline-block mb-3 sm:mb-4">
                        <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto relative">
                          {/* Rotating geometric frames */}
                          <div className="absolute inset-0 border-2 border-blue-400/40 rounded-2xl animate-spin" style={{animationDuration: '10s'}} />
                          <div className="absolute inset-0 border-2 border-cyan-400/30 rounded-2xl animate-spin" style={{animationDuration: '15s', animationDirection: 'reverse'}} />
                          
                          {/* Center circle with wallet */}
                          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/40 to-blue-800/30 rounded-2xl backdrop-blur-sm border border-blue-500/20 flex items-center justify-center">
                            <svg className="w-10 h-10 sm:w-12 sm:h-12 text-blue-300" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
                            </svg>
                          </div>
                          
                          {/* Network nodes at corners */}
                          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-cyan-400 rounded-full shadow-lg shadow-cyan-400/50" />
                          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-blue-400 rounded-full shadow-lg shadow-blue-400/50" />
                          <div className="absolute top-1/2 -translate-y-1/2 -left-1 w-2 h-2 bg-purple-400 rounded-full shadow-lg shadow-purple-400/50" />
                          <div className="absolute top-1/2 -translate-y-1/2 -right-1 w-2 h-2 bg-cyan-400 rounded-full shadow-lg shadow-cyan-400/50" />
                        </div>
                        <div className="absolute inset-0 blur-2xl bg-gradient-to-r from-blue-400/30 to-cyan-400/30" />
                      </div>
                      <h4 className="text-xl sm:text-2xl font-bold gradient-text mb-2">Walletrix</h4>
                      <p className="text-blue-300 mb-3 sm:mb-4 text-sm sm:text-base">Version 1.0.0</p>
                      <p className="text-xs sm:text-sm text-blue-300/80 max-w-md mx-auto px-2">
                        Your secure, self-custodial cryptocurrency wallet supporting multiple blockchain networks.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 sm:gap-4">
                      <button
                        onClick={() => {
                          onClose();
                          sessionStorage.removeItem('walletrix_walkthrough_shown');
                          if (onStartTutorial) {
                            setTimeout(() => {
                              onStartTutorial();
                            }, 300);
                          }
                          toast.success('✨ Starting tutorial...');
                        }}
                        className="glass-effect rounded-xl p-3 sm:p-4 border border-green-500/20 hover:border-green-400/40 transition-all group text-left"
                      >
                        <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-green-400 mb-2" />
                        <h4 className="font-semibold text-green-100 mb-1 text-xs sm:text-sm">Start Tutorial</h4>
                        <p className="text-xs text-green-300 hidden sm:block">Learn how to use Walletrix</p>
                        <ChevronRight className="w-4 h-4 text-green-400 mt-2 group-hover:translate-x-1 transition-transform" />
                      </button>

                      <a href="#" className="glass-effect rounded-xl p-3 sm:p-4 border border-blue-500/20 hover:border-blue-400/40 transition-all group">
                        <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-blue-400 mb-2" />
                        <h4 className="font-semibold text-blue-100 mb-1 text-xs sm:text-sm">Documentation</h4>
                        <p className="text-xs text-blue-300 hidden sm:block">View documentation</p>
                        <ExternalLink className="w-4 h-4 text-blue-400 mt-2 group-hover:translate-x-1 transition-transform" />
                      </a>

                      <a href="#" className="glass-effect rounded-xl p-3 sm:p-4 border border-blue-500/20 hover:border-blue-400/40 transition-all group">
                        <HelpCircle className="w-6 h-6 sm:w-8 sm:h-8 text-blue-400 mb-2" />
                        <h4 className="font-semibold text-blue-100 mb-1 text-xs sm:text-sm">Support</h4>
                        <p className="text-xs text-blue-300 hidden sm:block">Get help and support</p>
                        <ExternalLink className="w-4 h-4 text-blue-400 mt-2 group-hover:translate-x-1 transition-transform" />
                      </a>
                    </div>

                    <div className="glass-effect rounded-xl p-4 sm:p-6 border border-blue-500/20">
                      <h4 className="font-semibold text-blue-100 mb-3 sm:mb-4 text-sm sm:text-base">Legal</h4>
                      <div className="space-y-2">
                        {['Terms of Service', 'Privacy Policy', 'License Agreement'].map((item) => (
                          <a
                            key={item}
                            href="#"
                            className="flex items-center justify-between gap-2 p-2 sm:p-3 bg-blue-900/20 rounded-lg hover:bg-blue-800/30 transition-all group"
                          >
                            <span className="text-blue-200 text-xs sm:text-sm truncate">{item}</span>
                            <ChevronRight className="w-4 h-4 text-blue-400 group-hover:translate-x-1 transition-transform flex-shrink-0" />
                          </a>
                        ))}
                      </div>
                    </div>

                    <div className="glass-effect rounded-xl p-4 sm:p-6 border border-blue-500/20 text-center">
                      <p className="text-xs sm:text-sm text-blue-300">
                        © 2025 Walletrix. All rights reserved.
                      </p>
                      <p className="text-xs text-blue-400 mt-2">
                        Built with ❤️ for the crypto community
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
