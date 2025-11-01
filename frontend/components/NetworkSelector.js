'use client'

import { useWallet } from '@/contexts/WalletContext';
import { ChevronDown, Globe } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

const networks = [
  {
    id: 'ethereum-mainnet',
    name: 'Ethereum Mainnet',
    chain: 'ethereum',
    network: 'mainnet',
    icon: '⟠',
    color: 'text-blue-500',
    explorer: 'https://etherscan.io',
  },
  {
    id: 'ethereum-sepolia',
    name: 'Sepolia Testnet',
    chain: 'ethereum',
    network: 'sepolia',
    icon: '⟠',
    color: 'text-purple-500',
    explorer: 'https://sepolia.etherscan.io',
  },
  {
    id: 'ethereum-goerli',
    name: 'Goerli Testnet',
    chain: 'ethereum',
    network: 'goerli',
    icon: '⟠',
    color: 'text-orange-500',
    explorer: 'https://goerli.etherscan.io',
  },
  {
    id: 'bitcoin-mainnet',
    name: 'Bitcoin Mainnet',
    chain: 'bitcoin',
    network: 'mainnet',
    icon: '₿',
    color: 'text-orange-400',
    explorer: 'https://blockchain.info',
  },
  {
    id: 'bitcoin-testnet',
    name: 'Bitcoin Testnet',
    chain: 'bitcoin',
    network: 'testnet',
    icon: '₿',
    color: 'text-yellow-500',
    explorer: 'https://blockstream.info/testnet',
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
        className="flex items-center space-x-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 transition-all"
      >
        <Globe className="w-4 h-4 text-gray-400" />
        <span className={`text-lg ${currentNetwork.color}`}>
          {currentNetwork.icon}
        </span>
        <span className="text-sm font-medium text-white">
          {currentNetwork.name}
        </span>
        <ChevronDown 
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-gray-800 border border-gray-700 rounded-lg shadow-2xl z-50 overflow-hidden">
          <div className="py-1">
            {networks.map((network) => (
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
                    {network.chain.charAt(0).toUpperCase() + network.chain.slice(1)}
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
