'use client'

import { useWallet } from '@/contexts/WalletContext';
import { ChevronDown, Globe } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

const networks = [
  // Ethereum Networks
  {
    id: 'ethereum-mainnet',
    name: 'Ethereum Mainnet',
    chain: 'ethereum',
    network: 'mainnet',
    icon: '⟠',
    color: 'text-blue-500',
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
    color: 'text-purple-500',
    explorer: 'https://sepolia.etherscan.io',
    rpcUrl: 'https://sepolia.infura.io/v3/',
    chainId: 11155111,
  },
  {
    id: 'ethereum-goerli',
    name: 'Goerli Testnet',
    chain: 'ethereum',
    network: 'goerli',
    icon: '⟠',
    color: 'text-orange-500',
    explorer: 'https://goerli.etherscan.io',
    rpcUrl: 'https://goerli.infura.io/v3/',
    chainId: 5,
  },
  {
    id: 'ethereum-holesky',
    name: 'Holesky Testnet',
    chain: 'ethereum',
    network: 'holesky',
    icon: '⟠',
    color: 'text-green-500',
    explorer: 'https://holesky.etherscan.io',
    rpcUrl: 'https://ethereum-holesky.publicnode.com',
    chainId: 17000,
  },
  
  // Polygon Networks
  {
    id: 'polygon-mainnet',
    name: 'Polygon Mainnet',
    chain: 'polygon',
    network: 'mainnet',
    icon: '⬟',
    color: 'text-purple-600',
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
    color: 'text-purple-400',
    explorer: 'https://mumbai.polygonscan.com',
    rpcUrl: 'https://rpc-mumbai.maticvigil.com',
    chainId: 80001,
  },
  
  // Arbitrum Networks
  {
    id: 'arbitrum-one',
    name: 'Arbitrum One',
    chain: 'arbitrum',
    network: 'mainnet',
    icon: '🔵',
    color: 'text-blue-600',
    explorer: 'https://arbiscan.io',
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    chainId: 42161,
  },
  {
    id: 'arbitrum-goerli',
    name: 'Arbitrum Goerli',
    chain: 'arbitrum',
    network: 'goerli',
    icon: '🔵',
    color: 'text-blue-400',
    explorer: 'https://goerli.arbiscan.io',
    rpcUrl: 'https://goerli-rollup.arbitrum.io/rpc',
    chainId: 421613,
  },
  
  // Optimism Networks
  {
    id: 'optimism-mainnet',
    name: 'Optimism Mainnet',
    chain: 'optimism',
    network: 'mainnet',
    icon: '🔴',
    color: 'text-red-500',
    explorer: 'https://optimistic.etherscan.io',
    rpcUrl: 'https://mainnet.optimism.io',
    chainId: 10,
  },
  {
    id: 'optimism-goerli',
    name: 'Optimism Goerli',
    chain: 'optimism',
    network: 'goerli',
    icon: '🔴',
    color: 'text-red-400',
    explorer: 'https://goerli-optimism.etherscan.io',
    rpcUrl: 'https://goerli.optimism.io',
    chainId: 420,
  },
  
  // Binance Smart Chain
  {
    id: 'bsc-mainnet',
    name: 'BSC Mainnet',
    chain: 'bsc',
    network: 'mainnet',
    icon: '⚡',
    color: 'text-yellow-500',
    explorer: 'https://bscscan.com',
    rpcUrl: 'https://bsc-dataseed.binance.org',
    chainId: 56,
  },
  {
    id: 'bsc-testnet',
    name: 'BSC Testnet',
    chain: 'bsc',
    network: 'testnet',
    icon: '⚡',
    color: 'text-yellow-400',
    explorer: 'https://testnet.bscscan.com',
    rpcUrl: 'https://data-seed-prebsc-1-s1.binance.org:8545',
    chainId: 97,
  },
  
  // Avalanche Networks
  {
    id: 'avalanche-mainnet',
    name: 'Avalanche C-Chain',
    chain: 'avalanche',
    network: 'mainnet',
    icon: '🔺',
    color: 'text-red-600',
    explorer: 'https://snowtrace.io',
    rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
    chainId: 43114,
  },
  {
    id: 'avalanche-fuji',
    name: 'Avalanche Fuji',
    chain: 'avalanche',
    network: 'fuji',
    icon: '🔺',
    color: 'text-red-400',
    explorer: 'https://testnet.snowtrace.io',
    rpcUrl: 'https://api.avax-test.network/ext/bc/C/rpc',
    chainId: 43113,
  },
  
  // Solana Networks
  {
    id: 'solana-mainnet',
    name: 'Solana Mainnet',
    chain: 'solana',
    network: 'mainnet-beta',
    icon: '◉',
    color: 'text-gradient-to-r from-purple-400 to-pink-400',
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
    color: 'text-purple-400',
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
    color: 'text-pink-400',
    explorer: 'https://explorer.solana.com?cluster=testnet',
    rpcUrl: 'https://api.testnet.solana.com',
    chainId: 102,
  },
  
  // Bitcoin Networks
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
    color: 'text-yellow-500',
    explorer: 'https://blockstream.info/testnet',
    rpcUrl: 'https://bitcoin-testnet-rpc.com',
    chainId: 1,
  },
  
  // Additional Layer 2 Networks
  {
    id: 'base-mainnet',
    name: 'Base Mainnet',
    chain: 'base',
    network: 'mainnet',
    icon: '🔷',
    color: 'text-blue-700',
    explorer: 'https://basescan.org',
    rpcUrl: 'https://mainnet.base.org',
    chainId: 8453,
  },
  {
    id: 'base-goerli',
    name: 'Base Goerli',
    chain: 'base',
    network: 'goerli',
    icon: '🔷',
    color: 'text-blue-500',
    explorer: 'https://goerli.basescan.org',
    rpcUrl: 'https://goerli.base.org',
    chainId: 84531,
  },
];

export default function NetworkSelector() {
  const { selectedNetwork, setSelectedNetwork } = useWallet();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const currentNetwork = networks.find(n => n.id === selectedNetwork) || networks[0];

  // Close dropdown when clicking outside
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
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 transition-all min-w-[200px]"
      >
        <Globe className="w-4 h-4 text-gray-400" />
        <span className={`text-lg ${currentNetwork.color}`}>
          {currentNetwork.icon}
        </span>
        <span className="text-sm font-medium text-white truncate">
          {currentNetwork.name}
        </span>
        <ChevronDown 
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      {isOpen && (
        <div className="absolute left-1/2 transform -translate-x-1/2 mt-2 w-80 bg-gray-800 border border-gray-700 rounded-lg shadow-2xl z-50 overflow-hidden">
          <div className="py-2 max-h-96 overflow-y-auto custom-scrollbar">
            <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-700">
              Ethereum & Layer 2
            </div>
            {networks.filter(n => ['ethereum', 'polygon', 'arbitrum', 'optimism', 'base'].includes(n.chain)).map((network) => (
              <button
                key={network.id}
                onClick={() => handleNetworkChange(network.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-700 transition-colors ${
                  selectedNetwork === network.id ? 'bg-gray-700/50' : ''
                }`}
              >
                <span className={`text-xl ${network.color}`}>
                  {network.icon}
                </span>
                <div className="flex-1 text-left">
                  <div className="text-sm font-medium text-white">
                    {network.name}
                  </div>
                  <div className="text-xs text-gray-400">
                    Chain ID: {network.chainId}
                  </div>
                </div>
                {selectedNetwork === network.id && (
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                )}
              </button>
            ))}
            
            <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-700 border-t mt-2">
              BSC & Avalanche
            </div>
            {networks.filter(n => ['bsc', 'avalanche'].includes(n.chain)).map((network) => (
              <button
                key={network.id}
                onClick={() => handleNetworkChange(network.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-700 transition-colors ${
                  selectedNetwork === network.id ? 'bg-gray-700/50' : ''
                }`}
              >
                <span className={`text-xl ${network.color}`}>
                  {network.icon}
                </span>
                <div className="flex-1 text-left">
                  <div className="text-sm font-medium text-white">
                    {network.name}
                  </div>
                  <div className="text-xs text-gray-400">
                    Chain ID: {network.chainId}
                  </div>
                </div>
                {selectedNetwork === network.id && (
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                )}
              </button>
            ))}
            
            <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-700 border-t mt-2">
              Solana
            </div>
            {networks.filter(n => n.chain === 'solana').map((network) => (
              <button
                key={network.id}
                onClick={() => handleNetworkChange(network.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-700 transition-colors ${
                  selectedNetwork === network.id ? 'bg-gray-700/50' : ''
                }`}
              >
                <span className={`text-xl ${network.color}`}>
                  {network.icon}
                </span>
                <div className="flex-1 text-left">
                  <div className="text-sm font-medium text-white">
                    {network.name}
                  </div>
                  <div className="text-xs text-gray-400">
                    {network.network.charAt(0).toUpperCase() + network.network.slice(1)}
                  </div>
                </div>
                {selectedNetwork === network.id && (
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                )}
              </button>
            ))}
            
            <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-700 border-t mt-2">
              Bitcoin
            </div>
            {networks.filter(n => n.chain === 'bitcoin').map((network) => (
              <button
                key={network.id}
                onClick={() => handleNetworkChange(network.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-700 transition-colors ${
                  selectedNetwork === network.id ? 'bg-gray-700/50' : ''
                }`}
              >
                <span className={`text-xl ${network.color}`}>
                  {network.icon}
                </span>
                <div className="flex-1 text-left">
                  <div className="text-sm font-medium text-white">
                    {network.name}
                  </div>
                  <div className="text-xs text-gray-400">
                    {network.network.charAt(0).toUpperCase() + network.network.slice(1)}
                  </div>
                </div>
                {selectedNetwork === network.id && (
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
