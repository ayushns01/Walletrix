'use client'

import { useState } from 'react'
import { Wallet, Send, Download, Settings, LogOut, Plus, FileDown, User, Users } from 'lucide-react'
import { useWallet } from '@/contexts/DatabaseWalletContext'
import CreateWallet from '@/components/CreateWallet'
import ImportWallet from '@/components/ImportWallet'
import UnlockWallet from '@/components/UnlockWallet'
import Dashboard from '@/components/Dashboard'
import SendModal from '@/components/SendModal'
import ReceiveModal from '@/components/ReceiveModal'
import AccountDetails from '@/components/AccountDetails'
import NetworkSelector from '@/components/NetworkSelector'
import AuthModal from '@/components/AuthModal'
import WalletSelector from '@/components/WalletSelector'

export default function Home() {
  const { 
    wallet, 
    isLocked, 
    balances, 
    tokens, 
    prices,
    user,
    isAuthenticated,
    logout,
    userWallets,
    activeWalletId,
    importLocalStorageWallet,
    deleteWallet
  } = useWallet()
  
  const [view, setView] = useState('welcome') // welcome, create, import
  const [selectedAsset, setSelectedAsset] = useState(null)
  const [showSendModal, setShowSendModal] = useState(false)
  const [showReceiveModal, setShowReceiveModal] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showAccountDetails, setShowAccountDetails] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showWalletSelector, setShowWalletSelector] = useState(false)

  // Handle quick send/receive
  const handleQuickAction = (action, asset) => {
    setSelectedAsset(asset)
    if (action === 'send') {
      setShowSendModal(true)
    } else {
      setShowReceiveModal(true)
    }
  }

  // Show unlock screen if wallet exists but is locked
  if (wallet && isLocked) {
    return (
      <UnlockWallet 
        onDeleteWallet={deleteWallet}
      />
    )
  }

  // Show wallet setup screens
  if (!wallet) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-black via-blue-950 to-black">
        <div className="container mx-auto px-4 py-8">
          {view === 'welcome' && (
            <div className="max-w-md mx-auto text-center py-20">
              <div className="glass-effect rounded-3xl p-10 border border-blue-500/30 shadow-2xl shadow-blue-500/20">
                <Wallet className="w-24 h-24 text-blue-400 mx-auto mb-8 blue-glow" />
                <h2 className="text-4xl font-bold gradient-text mb-6">Welcome to Walletrix</h2>
                <p className="text-blue-100/80 mb-10 text-lg leading-relaxed">
                  Your secure, independent cryptocurrency wallet. Manage Bitcoin, Ethereum, and more with ultimate security.
                </p>
                
                {/* Authentication Banner */}
                {!isAuthenticated && (
                  <div className="mb-8 p-4 bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-xl border border-blue-500/30">
                    <h3 className="text-lg font-semibold text-blue-100 mb-2">Sign in for Multi-Device Sync</h3>
                    <p className="text-blue-200/70 text-sm mb-4">
                      Save your wallets securely and access them from any device
                    </p>
                    <button
                      onClick={() => setShowAuthModal(true)}
                      className="w-full py-3 px-6 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold rounded-lg transition-all duration-300 flex items-center justify-center gap-2"
                    >
                      <User className="w-5 h-5" />
                      Sign In / Register
                    </button>
                  </div>
                )}
                
                <div className="space-y-6">
                  <button
                    onClick={() => setView('create')}
                    className="w-full py-4 px-8 bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-500 hover:to-blue-700 text-white font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-3 btn-glow shadow-lg shadow-blue-500/30"
                  >
                    <Plus className="w-6 h-6" />
                    Create New Wallet
                  </button>
                  <button
                    onClick={() => setView('import')}
                    className="w-full py-4 px-8 bg-gradient-to-r from-gray-800 to-black hover:from-gray-700 hover:to-gray-900 text-blue-100 font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-3 border border-blue-500/30 hover:border-blue-400/50"
                  >
                    <FileDown className="w-6 h-6" />
                    Import Existing Wallet
                  </button>
                </div>
              </div>
            </div>
          )}

          {view === 'create' && (
            <div className="py-8">
              <button
                onClick={() => setView('welcome')}
                className="mb-8 text-blue-300 hover:text-blue-100 transition-all duration-300 text-lg font-medium flex items-center gap-2 hover:bg-blue-500/10 px-3 py-2 rounded-lg"
              >
                ← Back to Welcome
              </button>
              <CreateWallet onComplete={() => {}} />
            </div>
          )}

          {view === 'import' && (
            <div className="py-8">
              <button
                onClick={() => setView('welcome')}
                className="mb-8 text-blue-300 hover:text-blue-100 transition-all duration-300 text-lg font-medium flex items-center gap-2 hover:bg-blue-500/10 px-3 py-2 rounded-lg"
              >
                ← Back to Welcome
              </button>
              <ImportWallet onComplete={() => {}} />
            </div>
          )}
        </div>
      </main>
    )
  }

  // Main Dashboard
  return (
    <main className="min-h-screen bg-gradient-to-br from-black via-blue-950 to-black">
      <div className="container mx-auto px-4 py-8">
        {/* Top Header with Logo and Network Selector */}
        <header className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-3">
            <Wallet className="w-10 h-10 text-blue-400 blue-glow" />
            <h1 className="text-3xl font-bold gradient-text">Walletrix</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <NetworkSelector />
            
            {/* User Info & Wallet Selector */}
            {isAuthenticated && (
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm text-blue-100">{user?.email}</p>
                  {userWallets.length > 1 && (
                    <p className="text-xs text-blue-300">
                      {userWallets.length} wallets
                    </p>
                  )}
                </div>
                {userWallets.length > 1 && (
                  <button
                    onClick={() => setShowWalletSelector(true)}
                    className="p-3 rounded-xl bg-gradient-to-r from-black to-gray-900 hover:from-blue-900/50 hover:to-black border border-blue-500/30 text-blue-100 transition-all duration-300 shadow-lg shadow-blue-500/20"
                    title="Switch Wallet"
                  >
                    <Users className="w-6 h-6" />
                  </button>
                )}
              </div>
            )}
            
            <div className="flex items-center gap-3">
              {!isAuthenticated && (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-medium rounded-lg transition-all duration-300 flex items-center gap-2"
                >
                  <User className="w-4 h-4" />
                  Sign In
                </button>
              )}
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-3 rounded-xl bg-gradient-to-r from-black to-gray-900 hover:from-blue-900/50 hover:to-black border border-blue-500/30 text-blue-100 transition-all duration-300 shadow-lg shadow-blue-500/20"
              >
                <Settings className="w-6 h-6" />
              </button>
              <button
                onClick={isAuthenticated ? logout : () => {
                  // Legacy lock for non-authenticated users
                  if (typeof lockWallet === 'function') {
                    lockWallet();
                  }
                }}
                className="p-3 rounded-xl bg-gradient-to-r from-black to-gray-900 hover:from-blue-900/50 hover:to-black border border-blue-500/30 text-blue-100 transition-all duration-300 shadow-lg shadow-blue-500/20"
                title={isAuthenticated ? "Logout" : "Lock Wallet"}
              >
                <LogOut className="w-6 h-6" />
              </button>
            </div>
          </div>
        </header>

        {/* Settings Dropdown */}
        {showSettings && (
          <div className="max-w-4xl mx-auto mb-8">
            <div className="glass-effect rounded-2xl p-8 border border-blue-500/30 shadow-2xl shadow-blue-500/30">
              <h3 className="text-xl font-bold text-blue-100 mb-6">Settings</h3>
              <div className="space-y-4">
                {isAuthenticated ? (
                  <>
                    <div className="p-4 bg-gradient-to-r from-blue-900/20 to-purple-900/20 rounded-xl border border-blue-500/20">
                      <h4 className="font-semibold text-blue-100 mb-2">Account: {user?.email}</h4>
                      <p className="text-sm text-blue-300">
                        {userWallets.length} wallet{userWallets.length !== 1 ? 's' : ''} • Database sync enabled
                      </p>
                    </div>
                    
                    <button
                      onClick={() => {
                        setShowAccountDetails(true);
                        setShowSettings(false);
                      }}
                      className="w-full py-4 px-6 bg-gradient-to-r from-blue-900/30 to-blue-800/20 hover:from-blue-800/40 hover:to-blue-700/30 text-blue-100 font-semibold rounded-xl transition-all duration-300 text-left border border-blue-500/20 hover:border-blue-400/40"
                    >
                      Account Details & Private Keys
                    </button>
                    
                    {/* Import localStorage wallet if exists */}
                    {wallet && !activeWalletId && (
                      <button
                        onClick={async () => {
                          try {
                            await importLocalStorageWallet();
                            setShowSettings(false);
                          } catch (error) {
                            console.error('Import failed:', error);
                          }
                        }}
                        className="w-full py-4 px-6 bg-gradient-to-r from-green-900/30 to-green-800/20 hover:from-green-800/40 hover:to-green-700/30 text-green-300 font-semibold rounded-xl transition-all duration-300 text-left border border-green-500/20 hover:border-green-400/40"
                      >
                        Import Browser Wallet to Account
                      </button>
                    )}
                    
                    <button
                      onClick={() => {
                        logout();
                        setShowSettings(false);
                      }}
                      className="w-full py-4 px-6 bg-gradient-to-r from-orange-900/30 to-orange-800/20 hover:from-orange-800/40 hover:to-orange-700/30 text-orange-300 font-semibold rounded-xl transition-all duration-300 text-left border border-orange-500/20 hover:border-orange-400/40"
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <div className="p-4 bg-gradient-to-r from-purple-900/20 to-blue-900/20 rounded-xl border border-purple-500/20">
                      <h4 className="font-semibold text-blue-100 mb-2">Local Wallet Mode</h4>
                      <p className="text-sm text-blue-300">
                        Sign in to sync across devices and backup to cloud
                      </p>
                    </div>
                    
                    <button
                      onClick={() => {
                        setShowAuthModal(true);
                        setShowSettings(false);
                      }}
                      className="w-full py-4 px-6 bg-gradient-to-r from-purple-900/30 to-blue-800/20 hover:from-purple-800/40 hover:to-blue-700/30 text-purple-300 font-semibold rounded-xl transition-all duration-300 text-left border border-purple-500/20 hover:border-purple-400/40"
                    >
                      Sign In / Register
                    </button>
                    
                    <button
                      onClick={() => {
                        setShowAccountDetails(true);
                        setShowSettings(false);
                      }}
                      className="w-full py-4 px-6 bg-gradient-to-r from-blue-900/30 to-blue-800/20 hover:from-blue-800/40 hover:to-blue-700/30 text-blue-100 font-semibold rounded-xl transition-all duration-300 text-left border border-blue-500/20 hover:border-blue-400/40"
                    >
                      Account Details & Private Keys
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions Bar */}
        <div className="max-w-4xl mx-auto mb-8">
          <div className="glass-effect rounded-2xl p-6 border border-blue-500/30 shadow-xl shadow-blue-500/20">
            <div className="flex gap-6 justify-center">
              <button
                onClick={() => handleQuickAction('send', {
                  name: 'Ethereum',
                  symbol: 'ETH',
                  balance: balances.ethereum || '0',
                  priceData: prices.ethereum,
                  icon: 'Ξ',
                })}
                className="flex items-center gap-3 py-4 px-8 bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-500 hover:to-blue-700 text-white font-bold rounded-xl transition-all duration-300 btn-glow shadow-lg shadow-blue-500/30"
              >
                <Send className="w-5 h-5" />
                Send
              </button>
              <button
                onClick={() => handleQuickAction('receive', {
                  name: 'Ethereum',
                  symbol: 'ETH',
                  icon: 'Ξ',
                })}
                className="flex items-center gap-3 py-4 px-8 bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-500 hover:to-blue-700 text-white font-bold rounded-xl transition-all duration-300 btn-glow shadow-lg shadow-blue-500/30"
              >
                <Download className="w-5 h-5" />
                Receive
              </button>
            </div>
          </div>
        </div>

        {/* Dashboard */}
        <div className="max-w-4xl mx-auto">
          <Dashboard />
        </div>

        {/* Modals */}
        <SendModal
          isOpen={showSendModal}
          onClose={() => {
            setShowSendModal(false)
            setSelectedAsset(null)
          }}
          asset={selectedAsset}
        />

        <ReceiveModal
          isOpen={showReceiveModal}
          onClose={() => {
            setShowReceiveModal(false)
            setSelectedAsset(null)
          }}
          asset={selectedAsset}
        />

        <AccountDetails
          isOpen={showAccountDetails}
          onClose={() => setShowAccountDetails(false)}
        />

        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
        />

        <WalletSelector
          isOpen={showWalletSelector}
          onClose={() => setShowWalletSelector(false)}
        />
      </div>
    </main>
  )
}
