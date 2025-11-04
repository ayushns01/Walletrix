'use client'

import { useState } from 'react'
import { Wallet, Send, Download, Settings, LogOut, Plus, FileDown } from 'lucide-react'
import { useWallet } from '@/contexts/WalletContext'
import CreateWallet from '@/components/CreateWallet'
import ImportWallet from '@/components/ImportWallet'
import UnlockWallet from '@/components/UnlockWallet'
import Dashboard from '@/components/Dashboard'
import SendModal from '@/components/SendModal'
import ReceiveModal from '@/components/ReceiveModal'
import AccountDetails from '@/components/AccountDetails'
import NetworkSelector from '@/components/NetworkSelector'

export default function Home() {
  const { wallet, isLocked, lockWallet, deleteWallet, balances, tokens, prices } = useWallet()
  const [view, setView] = useState('welcome') // welcome, create, import
  const [selectedAsset, setSelectedAsset] = useState(null)
  const [showSendModal, setShowSendModal] = useState(false)
  const [showReceiveModal, setShowReceiveModal] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showAccountDetails, setShowAccountDetails] = useState(false)

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
    return <UnlockWallet />
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
                className="mb-8 text-blue-300 hover:text-blue-100 transition-colors text-lg font-medium"
              >
                ← Back
              </button>
              <CreateWallet onComplete={() => {}} />
            </div>
          )}

          {view === 'import' && (
            <div className="py-8">
              <button
                onClick={() => setView('welcome')}
                className="mb-8 text-blue-300 hover:text-blue-100 transition-colors text-lg font-medium"
              >
                ← Back
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
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-3 rounded-xl bg-gradient-to-r from-black to-gray-900 hover:from-blue-900/50 hover:to-black border border-blue-500/30 text-blue-100 transition-all duration-300 shadow-lg shadow-blue-500/20"
              >
                <Settings className="w-6 h-6" />
              </button>
              <button
                onClick={lockWallet}
                className="p-3 rounded-xl bg-gradient-to-r from-black to-gray-900 hover:from-blue-900/50 hover:to-black border border-blue-500/30 text-blue-100 transition-all duration-300 shadow-lg shadow-blue-500/20"
                title="Lock Wallet"
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
                <button
                  onClick={() => {
                    setShowAccountDetails(true);
                    setShowSettings(false);
                  }}
                  className="w-full py-4 px-6 bg-gradient-to-r from-blue-900/30 to-blue-800/20 hover:from-blue-800/40 hover:to-blue-700/30 text-blue-100 font-semibold rounded-xl transition-all duration-300 text-left border border-blue-500/20 hover:border-blue-400/40"
                >
                  Account Details & Private Keys
                </button>
                
                <button
                  onClick={() => {
                    if (confirm('Are you sure you want to delete your wallet? Make sure you have backed up your recovery phrase!')) {
                      deleteWallet()
                      setShowSettings(false)
                    }
                  }}
                  className="w-full py-4 px-6 bg-gradient-to-r from-red-900/30 to-red-800/20 hover:from-red-800/40 hover:to-red-700/30 text-red-300 font-semibold rounded-xl transition-all duration-300 text-left border border-red-500/20 hover:border-red-400/40"
                >
                  Delete Wallet
                </button>
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
      </div>
    </main>
  )
}
