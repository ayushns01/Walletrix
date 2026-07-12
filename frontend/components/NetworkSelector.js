'use client'

import { useWallet } from '@/contexts/DatabaseWalletContext';
import { Check, ChevronDown, Globe } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

const networks = [
  {
    id: 'ethereum-mainnet',
    name: 'Ethereum Mainnet',
    chain: 'ethereum',
    network: 'mainnet',
    icon: '⟠',
    color: 'text-blue-300',
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
    color: 'text-cyan-300',
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
    color: 'text-violet-300',
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
    color: 'text-violet-200',
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
    color: 'text-amber-300',
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
    color: 'text-orange-200',
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
    color: 'text-fuchsia-300',
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
    color: 'text-violet-200',
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
    color: 'text-pink-200',
    explorer: 'https://explorer.solana.com?cluster=testnet',
    rpcUrl: 'https://api.testnet.solana.com',
    chainId: 102,
  },
];

function formatNetworkMeta(network) {
  if (network.chain === 'solana') {
    if (network.network === 'mainnet-beta') return 'Cluster mainnet';
    return `Cluster ${network.network}`;
  }

  if (network.chain === 'bitcoin') {
    return network.network === 'mainnet' ? 'Production chain' : 'Sandbox chain';
  }

  return `Chain ID ${network.chainId}`;
}

function createSection(title, items) {
  return { title, items };
}

function NetworkOption({ network, isSelected, onSelect }) {
  return (
    <button
      onClick={() => onSelect(network.id)}
      className={`group flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left transition-all duration-200 ${
        isSelected
          ? 'border-sky-400/25 bg-sky-950/95 shadow-[0_14px_32px_rgba(14,165,233,0.12)]'
          : 'border-white/[0.06] bg-slate-950/92 hover:border-white/[0.12] hover:bg-slate-900/95'
      }`}
    >
      <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-black/20 text-base ${network.color}`}>
        {network.icon}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-slate-100">
            {network.name}
          </p>
          {isSelected ? (
            <span className="rounded-full border border-sky-400/20 bg-sky-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-200">
              Active
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-xs text-slate-400">
          {formatNetworkMeta(network)}
        </p>
      </div>

      <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/8 bg-white/[0.03] text-slate-400 transition group-hover:border-white/12 group-hover:text-slate-200">
        {isSelected ? <Check className="h-4 w-4 text-sky-300" /> : <ChevronDown className="h-4 w-4 -rotate-90" />}
      </div>
    </button>
  );
}

function NetworkColumn({ title, subtitle, sections, selectedNetwork, onSelect }) {
  return (
    <div className="flex-1 bg-[#0c1119] p-4 sm:p-5">
      <div className="mb-4 border-b border-white/[0.08] pb-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
          {title}
        </p>
        <p className="mt-2 text-sm text-slate-500">
          {subtitle}
        </p>
      </div>

      <div className="space-y-4">
        {sections.map((section) => (
          <div key={section.title} className="space-y-2">
            <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
              {section.title}
            </p>
            <div className="space-y-2">
              {section.items.map((network) => (
                <NetworkOption
                  key={network.id}
                  network={network}
                  isSelected={selectedNetwork === network.id}
                  onSelect={onSelect}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function NetworkSelector() {
  const { selectedNetwork, setSelectedNetwork } = useWallet();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const currentNetwork = networks.find((network) => network.id === selectedNetwork) || networks[0];

  const mainnetSections = useMemo(() => ([
    createSection('Ethereum & Layer 2', networks.filter((network) => ['ethereum', 'polygon'].includes(network.chain) && network.network === 'mainnet')),
    createSection('Solana', networks.filter((network) => network.chain === 'solana' && network.network === 'mainnet-beta')),
    createSection('Bitcoin', networks.filter((network) => network.chain === 'bitcoin' && network.network === 'mainnet')),
  ]), []);

  const testnetSections = useMemo(() => ([
    createSection('Ethereum & Layer 2', networks.filter((network) => ['ethereum', 'polygon'].includes(network.chain) && network.network !== 'mainnet')),
    createSection('Solana', networks.filter((network) => network.chain === 'solana' && network.network !== 'mainnet-beta')),
    createSection('Bitcoin', networks.filter((network) => network.chain === 'bitcoin' && network.network === 'testnet')),
  ]), []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const handleNetworkChange = (networkId) => {
    setSelectedNetwork(networkId);
    setIsOpen(false);
  };

  return (
    <div className={`relative w-full ${isOpen ? 'z-[90]' : 'z-10'}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen((open) => !open)}
        className={`flex w-full min-w-0 items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition-all duration-200 sm:min-w-[260px] ${
          isOpen
            ? 'border-sky-400/20 bg-white/[0.12] shadow-[0_22px_54px_rgba(15,23,42,0.32)]'
            : 'border-white/[0.08] bg-white/[0.08] hover:border-white/[0.14] hover:bg-white/[0.11]'
        }`}
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border border-white/[0.08] bg-black/20 text-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
            <Globe className="h-[18px] w-[18px] text-slate-300" />
          </div>

          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
              Active network
            </p>
            <div className="mt-1 flex min-w-0 items-center gap-2">
              <span className={`text-base ${currentNetwork.color}`}>
                {currentNetwork.icon}
              </span>
              <span className="truncate text-sm font-medium text-slate-100">
                {currentNetwork.name}
              </span>
            </div>
          </div>
        </div>

        <ChevronDown
          className={`h-[18px] w-[18px] flex-shrink-0 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-slate-200' : ''}`}
        />
      </button>

      {isOpen ? (
        <div className="absolute right-0 z-[100] mt-3 w-[min(760px,calc(100vw-2rem))] overflow-hidden rounded-[28px] border border-white/[0.12] bg-[#090e15] shadow-[0_32px_80px_rgba(2,6,23,0.52)]">
          <div className="border-b border-white/[0.08] bg-[#0b1119] px-5 py-4 sm:px-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
              Network routing
            </p>
            <div className="mt-2 flex items-center gap-2">
              <span className={`text-base ${currentNetwork.color}`}>
                {currentNetwork.icon}
              </span>
              <p className="text-sm text-slate-200">
                {currentNetwork.name}
              </p>
            </div>
          </div>

          <div className="flex flex-col divide-y divide-white/[0.06] bg-[#0a1018] sm:flex-row sm:divide-x sm:divide-y-0">
            <NetworkColumn
              title="Mainnets"
              subtitle="Primary production routes for live assets and balances."
              sections={mainnetSections}
              selectedNetwork={selectedNetwork}
              onSelect={handleNetworkChange}
            />
            <NetworkColumn
              title="Testnets"
              subtitle="Sandbox networks for flows, bot funding, and rehearsal."
              sections={testnetSections}
              selectedNetwork={selectedNetwork}
              onSelect={handleNetworkChange}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
