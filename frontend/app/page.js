'use client'

import { useState } from 'react'
import { Wallet, Send, Download, Settings, ArrowUpRight, ArrowDownRight } from 'lucide-react'

export default function Home() {
  const [isWalletCreated, setIsWalletCreated] = useState(false)

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <Wallet className="w-8 h-8 text-purple-400" />
            <h1 className="text-2xl font-bold text-white">Walletrix</h1>
          </div>
          <button className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white">
            <Settings className="w-5 h-5" />
          </button>
        </header>

        {!isWalletCreated ? (
          /* Welcome Screen */
          <div className="max-w-md mx-auto text-center py-20">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border border-purple-500/20">
              <Wallet className="w-20 h-20 text-purple-400 mx-auto mb-6" />
              <h2 className="text-3xl font-bold text-white mb-4">Welcome to Walletrix</h2>
              <p className="text-gray-300 mb-8">
                Your secure, independent cryptocurrency wallet. Manage Bitcoin, Ethereum, and more.
              </p>
              <div className="space-y-4">
                <button
                  onClick={() => setIsWalletCreated(true)}
                  className="w-full py-3 px-6 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors"
                >
                  Create New Wallet
                </button>
                <button className="w-full py-3 px-6 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors">
                  Import Existing Wallet
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Dashboard */
          <div className="max-w-4xl mx-auto">
            {/* Balance Card */}
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-6 mb-6 text-white">
              <p className="text-sm opacity-80 mb-2">Total Balance</p>
              <h2 className="text-4xl font-bold mb-4">$0.00</h2>
              <div className="flex gap-4">
                <button className="flex items-center gap-2 py-2 px-4 bg-white/20 hover:bg-white/30 rounded-lg transition-colors">
                  <Send className="w-4 h-4" />
                  Send
                </button>
                <button className="flex items-center gap-2 py-2 px-4 bg-white/20 hover:bg-white/30 rounded-lg transition-colors">
                  <Download className="w-4 h-4" />
                  Receive
                </button>
              </div>
            </div>

            {/* Assets List */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/20">
              <h3 className="text-xl font-bold text-white mb-4">Your Assets</h3>
              <div className="space-y-3">
                {[
                  { name: 'Bitcoin', symbol: 'BTC', amount: '0.00', value: '$0.00' },
                  { name: 'Ethereum', symbol: 'ETH', amount: '0.00', value: '$0.00' },
                  { name: 'USD Coin', symbol: 'USDC', amount: '0.00', value: '$0.00' },
                ].map((asset) => (
                  <div
                    key={asset.symbol}
                    className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg hover:bg-gray-700 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                        {asset.symbol[0]}
                      </div>
                      <div>
                        <p className="text-white font-semibold">{asset.name}</p>
                        <p className="text-gray-400 text-sm">{asset.symbol}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-semibold">{asset.amount}</p>
                      <p className="text-gray-400 text-sm">{asset.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Transactions */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/20 mt-6">
              <h3 className="text-xl font-bold text-white mb-4">Recent Transactions</h3>
              <div className="text-center py-8 text-gray-400">
                <p>No transactions yet</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
