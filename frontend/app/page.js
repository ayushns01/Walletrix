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
      <main className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
        <div className="container mx-auto px-4 py-8">
          {view === 'welcome' && (
            <div className="max-w-md mx-auto text-center py-20">
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border border-purple-500/20">
                <Wallet className="w-20 h-20 text-purple-400 mx-auto mb-6" />
                <h2 className="text-3xl font-bold text-white mb-4">Welcome to Walletrix</h2>
                <p className="text-gray-300 mb-8">
                  Your secure, independent cryptocurrency wallet. Manage Bitcoin, Ethereum, and more.
                </p>
                <div className="space-y-4">
                  <button
                    onClick={() => setView('create')}
                    className="w-full py-3 px-6 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus className="w-5 h-5" />
                    Create New Wallet
                  </button>
                  <button
                    onClick={() => setView('import')}
                    className="w-full py-3 px-6 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <FileDown className="w-5 h-5" />
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
                className="mb-6 text-gray-400 hover:text-white transition-colors"
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
                className="mb-6 text-gray-400 hover:text-white transition-colors"
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
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <Wallet className="w-8 h-8 text-purple-400" />
            <h1 className="text-2xl font-bold text-white">Walletrix</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white transition-colors"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button
              onClick={lockWallet}
              className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white transition-colors"
              title="Lock Wallet"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Settings Dropdown */}
        {showSettings && (
          <div className="max-w-4xl mx-auto mb-6">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/20">
              <h3 className="text-lg font-bold text-white mb-4">Settings</h3>
              <div className="space-y-3">
                <button
                  onClick={() => {
                    setShowAccountDetails(true);
                    setShowSettings(false);
                  }}
                  className="w-full py-3 px-4 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 font-semibold rounded-lg transition-colors text-left"
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
                  className="w-full py-3 px-4 bg-red-600/20 hover:bg-red-600/30 text-red-400 font-semibold rounded-lg transition-colors text-left"
                >
                  Delete Wallet
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions Bar */}
        <div className="max-w-4xl mx-auto mb-6">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-4 border border-purple-500/20">
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => handleQuickAction('send', {
                  name: 'Ethereum',
                  symbol: 'ETH',
                  balance: balances.ethereum || '0',
                  priceData: prices.ethereum,
                  icon: 'Ξ',
                })}
                className="flex items-center gap-2 py-3 px-6 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors"
              >
                <Send className="w-4 h-4" />
                Send
              </button>
              <button
                onClick={() => handleQuickAction('receive', {
                  name: 'Ethereum',
                  symbol: 'ETH',
                  icon: 'Ξ',
                })}
                className="flex items-center gap-2 py-3 px-6 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors"
              >
                <Download className="w-4 h-4" />
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
