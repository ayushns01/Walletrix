'use client'

import { useWallet } from '@/contexts/DatabaseWalletContext';
import { ChevronDown, Globe } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

const networks = [

  {
    id: 'ethereum-mainnet',
    name: 'Ethereum Mainnet',
    chain: 'ethereum',
    network: 'mainnet',
    icon: '⟠',
    color: 'text-blue-400',
    explorer: 'https://etherscan.io',
    rpcUrl: 'https://mainnet.infura.io/v3/',
    chainId: 1,
  },
  {
    id: 'ethereum-sepolia',
    name: 'Sepolia Testnet',
    chain: 'ethereum',
    network: 'sepolia',
    icon: '⟠',
    color: 'text-cyan-400',
    explorer: 'https://sepolia.etherscan.io',
    rpcUrl: 'https://sepolia.infura.io/v3/',
    chainId: 11155111,
  },

  {
    id: 'polygon-mainnet',
    name: 'Polygon Mainnet',
    chain: 'polygon',
    network: 'mainnet',
    icon: '⬟',
    color: 'text-purple-400',
    explorer: 'https://polygonscan.com',
    rpcUrl: 'https://polygon-rpc.com',
    chainId: 137,
  },
  {
    id: 'polygon-mumbai',
    name: 'Polygon Mumbai',
    chain: 'polygon',
    network: 'mumbai',
    icon: '⬟',
    color: 'text-purple-300',
    explorer: 'https://mumbai.polygonscan.com',
    rpcUrl: 'https://rpc-mumbai.maticvigil.com',
    chainId: 80001,
  },

  {
    id: 'bitcoin-mainnet',
    name: 'Bitcoin Mainnet',
    chain: 'bitcoin',
    network: 'mainnet',
    icon: '₿',
    color: 'text-orange-400',
    explorer: 'https://blockchain.info',
    rpcUrl: 'https://bitcoin-rpc.com',
    chainId: 0,
  },
  {
    id: 'bitcoin-testnet',
    name: 'Bitcoin Testnet',
    chain: 'bitcoin',
    network: 'testnet',
    icon: '₿',
    color: 'text-orange-300',
    explorer: 'https://blockstream.info/testnet',
    rpcUrl: 'https://bitcoin-testnet-rpc.com',
    chainId: 1,
  },

  {
    id: 'solana-mainnet',
    name: 'Solana Mainnet',
    chain: 'solana',
    network: 'mainnet-beta',
    icon: '◉',
    color: 'text-purple-400',
    explorer: 'https://explorer.solana.com',
    rpcUrl: 'https://api.mainnet-beta.solana.com',
    chainId: 101,
  },
  {
    id: 'solana-devnet',
    name: 'Solana Devnet',
    chain: 'solana',
    network: 'devnet',
    icon: '◉',
    color: 'text-purple-300',
    explorer: 'https://explorer.solana.com?cluster=devnet',
    rpcUrl: 'https://api.devnet.solana.com',
    chainId: 103,
  },
  {
    id: 'solana-testnet',
    name: 'Solana Testnet',
    chain: 'solana',
    network: 'testnet',
    icon: '◉',
    color: 'text-pink-300',
    explorer: 'https://explorer.solana.com?cluster=testnet',
    rpcUrl: 'https://api.testnet.solana.com',
    chainId: 102,
  },
];

export default function NetworkSelector() {
  const { selectedNetwork, setSelectedNetwork } = useWallet();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const currentNetwork = networks.find(n => n.id === selectedNetwork) || networks[0];

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNetworkChange = (networkId) => {
    setSelectedNetwork(networkId);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef} style={{ zIndex: 1000 }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-3 px-4 py-3 bg-gradient-to-r from-black to-gray-900 hover:from-gray-900 hover:to-blue-900 rounded-xl border border-blue-500/30 shadow-lg shadow-blue-500/20 transition-all duration-300 min-w-[220px] backdrop-blur-sm"
      >
        <Globe className="w-5 h-5 text-blue-400" />
        <span className={`text-lg ${currentNetwork.color}`}>
          {currentNetwork.icon}
        </span>
        <span className="text-sm font-medium text-blue-100 truncate">
          {currentNetwork.name}
        </span>
        <ChevronDown
          className={`w-5 h-5 text-blue-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute left-1/2 transform -translate-x-1/2 mt-3 w-[95vw] sm:w-[650px] bg-gradient-to-br from-black via-gray-900 to-blue-950 border border-blue-500/40 rounded-2xl shadow-2xl shadow-blue-500/30 overflow-hidden backdrop-blur-xl" style={{ zIndex: 1000 }}>
          <div className="flex flex-col sm:flex-row">
            {}
            <div className="flex-1 border-r-0 sm:border-r border-blue-500/30">
              <div className="px-6 py-4 text-sm font-bold text-blue-300 uppercase tracking-wider border-b border-blue-500/30 bg-gradient-to-r from-blue-950/50 to-black/50 backdrop-blur-sm">
                🌐 Mainnets
              </div>
              <div className="py-3 max-h-96 overflow-y-auto custom-scrollbar">
                {}
                <div className="px-6 py-2 text-xs font-semibold text-blue-400 uppercase tracking-wider">
                  Ethereum & Layer 2
                </div>
                {networks.filter(n => ['ethereum', 'polygon'].includes(n.chain) && n.network === 'mainnet').map((network) => (
                  <button
                    key={network.id}
                    onClick={() => handleNetworkChange(network.id)}
                    className={`w-full flex items-center space-x-3 px-6 py-3 hover:bg-gradient-to-r hover:from-blue-900/30 hover:to-black/50 transition-all duration-200 ${
                      selectedNetwork === network.id ? 'bg-gradient-to-r from-blue-800/40 to-blue-900/40 border-l-2 border-blue-400' : ''
                    }`}
                  >
                    <span className={`text-lg ${network.color}`}>
                      {network.icon}
                    </span>
                    <div className="flex-1 text-left">
                      <div className="text-sm font-medium text-blue-50">
                        {network.name.replace(' Mainnet', '')}
                      </div>
                      <div className="text-xs text-blue-300/70">
                        ID: {network.chainId}
                      </div>
                    </div>
                    {selectedNetwork === network.id && (
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                    )}
                  </button>
                ))}

                {}
                <div className="px-6 py-2 text-xs font-semibold text-blue-400 uppercase tracking-wider border-t border-blue-500/20 mt-3">
                  Solana
                </div>
                {networks.filter(n => n.chain === 'solana' && n.network === 'mainnet-beta').map((network) => (
                  <button
                    key={network.id}
                    onClick={() => handleNetworkChange(network.id)}
                    className={`w-full flex items-center space-x-3 px-6 py-3 hover:bg-gradient-to-r hover:from-blue-900/30 hover:to-black/50 transition-all duration-200 ${
                      selectedNetwork === network.id ? 'bg-gradient-to-r from-blue-800/40 to-blue-900/40 border-l-2 border-blue-400' : ''
                    }`}
                  >
                    <span className={`text-lg ${network.color}`}>
                      {network.icon}
                    </span>
                    <div className="flex-1 text-left">
                      <div className="text-sm font-medium text-blue-50">
                        {network.name.replace(' Mainnet', '')}
                      </div>
                      <div className="text-xs text-blue-300/70">
                        ID: {network.chainId}
                      </div>
                    </div>
                    {selectedNetwork === network.id && (
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                    )}
                  </button>
                ))}

                {}
                <div className="px-6 py-2 text-xs font-semibold text-blue-400 uppercase tracking-wider border-t border-blue-500/20 mt-3">
                  Bitcoin
                </div>
                {networks.filter(n => n.chain === 'bitcoin' && n.network === 'mainnet').map((network) => (
                  <button
                    key={network.id}
                    onClick={() => handleNetworkChange(network.id)}
                    className={`w-full flex items-center space-x-3 px-6 py-3 hover:bg-gradient-to-r hover:from-blue-900/30 hover:to-black/50 transition-all duration-200 ${
                      selectedNetwork === network.id ? 'bg-gradient-to-r from-blue-800/40 to-blue-900/40 border-l-2 border-blue-400' : ''
                    }`}
                  >
                    <span className={`text-lg ${network.color}`}>
                      {network.icon}
                    </span>
                    <div className="flex-1 text-left">
                      <div className="text-sm font-medium text-blue-50">
                        {network.name.replace(' Mainnet', '')}
                      </div>
                      <div className="text-xs text-blue-300/70">
                        ID: {network.chainId}
                      </div>
                    </div>
                    {selectedNetwork === network.id && (
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {}
            <div className="flex-1 border-t sm:border-t-0 border-blue-500/30">
              <div className="px-6 py-4 text-sm font-bold text-blue-200 uppercase tracking-wider border-b border-blue-500/30 bg-gradient-to-r from-black/50 to-blue-950/50 backdrop-blur-sm">
                🧪 Testnets
              </div>
              <div className="py-3 max-h-96 overflow-y-auto custom-scrollbar">
                {}
                <div className="px-6 py-2 text-xs font-semibold text-blue-400 uppercase tracking-wider">
                  Ethereum & Layer 2
                </div>
                {networks.filter(n => ['ethereum', 'polygon'].includes(n.chain) && n.network !== 'mainnet').map((network) => (
                  <button
                    key={network.id}
                    onClick={() => handleNetworkChange(network.id)}
                    className={`w-full flex items-center space-x-3 px-6 py-3 hover:bg-gradient-to-r hover:from-blue-900/30 hover:to-black/50 transition-all duration-200 ${
                      selectedNetwork === network.id ? 'bg-gradient-to-r from-blue-800/40 to-blue-900/40 border-l-2 border-blue-400' : ''
                    }`}
                  >
                    <span className={`text-lg ${network.color}`}>
                      {network.icon}
                    </span>
                    <div className="flex-1 text-left">
                      <div className="text-sm font-medium text-blue-50">
                        {network.name.replace(' Testnet', '')}
                      </div>
                      <div className="text-xs text-blue-300/70">
                        ID: {network.chainId}
                      </div>
                    </div>
                    {selectedNetwork === network.id && (
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                    )}
                  </button>
                ))}

                {}
                <div className="px-6 py-2 text-xs font-semibold text-blue-400 uppercase tracking-wider border-t border-blue-500/20 mt-3">
                  Solana
                </div>
                {networks.filter(n => n.chain === 'solana' && n.network !== 'mainnet-beta').map((network) => (
                  <button
                    key={network.id}
                    onClick={() => handleNetworkChange(network.id)}
                    className={`w-full flex items-center space-x-3 px-6 py-3 hover:bg-gradient-to-r hover:from-blue-900/30 hover:to-black/50 transition-all duration-200 ${
                      selectedNetwork === network.id ? 'bg-gradient-to-r from-blue-800/40 to-blue-900/40 border-l-2 border-blue-400' : ''
                    }`}
                  >
                    <span className={`text-lg ${network.color}`}>
                      {network.icon}
                    </span>
                    <div className="flex-1 text-left">
                      <div className="text-sm font-medium text-blue-50">
                        {network.name}
                      </div>
                      <div className="text-xs text-blue-300/70">
                        {network.network.charAt(0).toUpperCase() + network.network.slice(1)}
                      </div>
                    </div>
                    {selectedNetwork === network.id && (
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                    )}
                  </button>
                ))}

                {}
                <div className="px-6 py-2 text-xs font-semibold text-blue-400 uppercase tracking-wider border-t border-blue-500/20 mt-3">
                  Bitcoin
                </div>
                {networks.filter(n => n.chain === 'bitcoin' && n.network === 'testnet').map((network) => (
                  <button
                    key={network.id}
                    onClick={() => handleNetworkChange(network.id)}
                    className={`w-full flex items-center space-x-3 px-6 py-3 hover:bg-gradient-to-r hover:from-blue-900/30 hover:to-black/50 transition-all duration-200 ${
                      selectedNetwork === network.id ? 'bg-gradient-to-r from-blue-800/40 to-blue-900/40 border-l-2 border-blue-400' : ''
                    }`}
                  >
                    <span className={`text-lg ${network.color}`}>
                      {network.icon}
                    </span>
                    <div className="flex-1 text-left">
                      <div className="text-sm font-medium text-blue-50">
                        {network.name.replace(' Testnet', '')}
                      </div>
                      <div className="text-xs text-blue-300/70">
                        ID: {network.chainId}
                      </div>
                    </div>
                    {selectedNetwork === network.id && (
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
