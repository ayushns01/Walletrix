'use client'

import { useState, useEffect, useRef } from 'react'
import { Wallet, Settings, Plus, FileDown, User, Users, Trash2, Menu, X, Lock, ChevronRight, ArrowLeft, Bot } from 'lucide-react'
import { useWallet } from '@/contexts/DatabaseWalletContext'
import { useUser, SignedIn, SignedOut, SignInButton, UserButton, useAuth } from '@clerk/nextjs'
import toast from 'react-hot-toast'
import { telegramAPI } from '@/lib/api'
import CreateWallet from '@/components/CreateWallet'
import ImportWallet from '@/components/ImportWallet'
import UnlockWallet from '@/components/UnlockWallet'
import Dashboard from '@/components/Dashboard'
import SendModal from '@/components/SendModal'
import ReceiveModal from '@/components/ReceiveModal'
import AccountDetails from '@/components/AccountDetails'
import NetworkSelector from '@/components/NetworkSelector'
import WalletSelector from '@/components/WalletSelector'
import LandingPage from '@/components/LandingPage'
import SettingsModal from '@/components/Settings'
import NotificationBell from '@/components/NotificationBell'
import Walkthrough from '@/components/Walkthrough'
import MultiSigWalletDetail from '@/components/MultiSigWalletDetail'
import ErrorBoundary from '@/components/ErrorBoundary'
import TelegramHomeCard from '@/components/TelegramHomeCard'
import TelegramLinkPage from '@/components/TelegramLinkPage'

function formatNetworkLabel(networkKey = 'ethereum-mainnet') {
  const [chain, network] = String(networkKey || 'ethereum-mainnet').split('-')
  const chainLabels = {
    ethereum: 'Ethereum',
    bitcoin: 'Bitcoin',
    solana: 'Solana',
    polygon: 'Polygon',
    arbitrum: 'Arbitrum',
    optimism: 'Optimism',
    bsc: 'BNB Smart Chain',
    avalanche: 'Avalanche',
    base: 'Base',
  }

  const networkLabels = {
    mainnet: 'Mainnet',
    sepolia: 'Sepolia',
    amoy: 'Amoy',
    testnet: 'Testnet',
    'mainnet-beta': 'Mainnet Beta',
  }

  const chainLabel = chainLabels[chain] || chain || 'Ethereum'
  const networkLabel = networkLabels[network] || (network ? network.charAt(0).toUpperCase() + network.slice(1) : '')

  return networkLabel ? `${chainLabel} ${networkLabel}` : chainLabel
}

function truncateMiddle(value, start = 8, end = 6) {
  if (!value) return 'Not available'
  if (value.length <= start + end + 3) return value
  return `${value.slice(0, start)}...${value.slice(-end)}`
}

function getWalletAddressForNetwork(wallet, selectedNetwork = 'ethereum-mainnet') {
  if (!wallet) return ''

  const [chain] = String(selectedNetwork || 'ethereum-mainnet').split('-')
  if (chain === 'bitcoin') return wallet?.bitcoin?.address || ''
  if (chain === 'solana') return wallet?.solana?.address || ''
  return wallet?.ethereum?.address || ''
}

export default function Home() {
  const { user: clerkUser, isLoaded: isUserLoaded, isSignedIn } = useUser()
  const { getToken } = useAuth()

  const {
    wallet,
    isLocked,
    balances,
    tokens,
    prices,
    isAuthenticated,
    userWallets,
    activeWalletId,
    setActiveWalletId,
    switchWallet,
    setSelectedNetwork,
    deleteWallet,
    deleteDatabaseWallet,
    unlockWallet,
    lockWallet,
    selectedNetwork,
    showWalkthroughOnUnlock,
    setShowWalkthroughOnUnlock
  } = useWallet()

  const [mounted, setMounted] = useState(false)
  const [view, setView] = useState('landing')
  const [selectedAsset, setSelectedAsset] = useState(null)
  const [showSendModal, setShowSendModal] = useState(false)
  const [showReceiveModal, setShowReceiveModal] = useState(false)
  const [sendRecipientPreset, setSendRecipientPreset] = useState('')
  const [sendPresetLabel, setSendPresetLabel] = useState('')
  const [sendPresetDescription, setSendPresetDescription] = useState('')
  const [selectedMultiSigWallet, setSelectedMultiSigWallet] = useState(null)
  const [multiSigWallets, setMultiSigWallets] = useState([])
  const [loadingMultiSig, setLoadingMultiSig] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showAccountDetails, setShowAccountDetails] = useState(false)
  const [showWalletSelector, setShowWalletSelector] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [showWalkthrough, setShowWalkthrough] = useState(false)
  const [guestMode, setGuestMode] = useState(false)
  const [telegramBotWalletAddress, setTelegramBotWalletAddress] = useState('')
  const autoUnlockAttempted = useRef(false)
  const activeWalletRecord = userWallets.find((candidate) => candidate.id === activeWalletId)
  const activeWalletLabel = activeWalletRecord?.name || activeWalletRecord?.label || 'Main Wallet'
  const activeWalletAddress = getWalletAddressForNetwork(wallet, selectedNetwork)
  const activeNetworkLabel = formatNetworkLabel(selectedNetwork)

  // Handle hydration - read localStorage only on client after mount
  useEffect(() => {
    setMounted(true)
    const savedGuestMode = localStorage.getItem('walletrix_guest_mode') === 'true'
    setGuestMode(savedGuestMode)
  }, [])

  // Reactive view setting based on wallet state
  useEffect(() => {
    if (!mounted) return; // Wait for initial mount and hydration

    if (wallet && !isLocked) {
      setView('dashboard');
    } else if (wallet && isLocked) {
      setView('locked');
    } else if (!wallet && guestMode) {
      setView('welcome');
    } else if (!wallet && !guestMode) {
      setView('landing');
    }
  }, [wallet, isLocked, guestMode, mounted]);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem('walletrix_guest_mode', guestMode.toString())
    }
  }, [guestMode, mounted])

  useEffect(() => {
    if (clerkUser?.id && wallet && isLocked && !autoUnlockAttempted.current) {
      autoUnlockAttempted.current = true;
      unlockWallet(clerkUser.id).catch((error) => {
        console.error('Auto-unlock failed:', error);
      });
    }
    if (!isLocked) {
      autoUnlockAttempted.current = false;
    }
  }, [clerkUser?.id, wallet, isLocked]);

  useEffect(() => {
    if (typeof window !== 'undefined' && wallet && !isLocked && showWalkthroughOnUnlock) {

      const shouldShowAfterReload = window.localStorage.getItem('walletrix_show_walkthrough_on_load');
      if (shouldShowAfterReload === 'true') {
        window.localStorage.removeItem('walletrix_show_walkthrough_on_load');
        setTimeout(() => {
          setShowWalkthrough(true);
        }, 1200);
      } else {

        const hasShownThisSession = window.sessionStorage.getItem('walletrix_walkthrough_shown');
        if (!hasShownThisSession) {
          window.sessionStorage.setItem('walletrix_walkthrough_shown', 'true');
          setTimeout(() => {
            setShowWalkthrough(true);
          }, 800);
        }
      }
    }
  }, [wallet, isLocked, showWalkthroughOnUnlock]);

  useEffect(() => {
    if (isLocked) {
      sessionStorage.removeItem('walletrix_walkthrough_shown');
    }
  }, [isLocked]);

  useEffect(() => {
    const fetchMultiSigWallets = async () => {
      if (!clerkUser || !isSignedIn) return;

      setLoadingMultiSig(true);
      try {

        const token = await getToken();

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/wallet/multisig/user/${clerkUser.id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        const data = await response.json();

        if (data.success) {
          setMultiSigWallets(data.multiSigWallets || []);
        }
      } catch (error) {
        console.error('Failed to fetch multi-sig wallets:', error);
      } finally {
        setLoadingMultiSig(false);
      }
    };

    fetchMultiSigWallets();
  }, [clerkUser, isSignedIn, getToken]);

  useEffect(() => {
    let cancelled = false

    const fetchTelegramStatus = async () => {
      if (!clerkUser || !isSignedIn) {
        setTelegramBotWalletAddress('')
        return
      }

      try {
        const token = await getToken()
        if (!token) return

        const status = await telegramAPI.getStatus(token)
        if (!cancelled) {
          setTelegramBotWalletAddress(status?.linked && status?.botWallet?.address ? status.botWallet.address : '')
        }
      } catch (error) {
        if (!cancelled) {
          setTelegramBotWalletAddress('')
        }
      }
    }

    fetchTelegramStatus()
    return () => {
      cancelled = true
    }
  }, [clerkUser, getToken, isSignedIn])

  const handleWalletCreated = async () => {
    if (isAuthenticated) {
      if (typeof window !== 'undefined' && showWalkthroughOnUnlock) {
        window.localStorage.setItem('walletrix_show_walkthrough_on_load', 'true');
      }
      // State is already set in generateWallet/importWallet — just switch view
      setView('dashboard');
    } else {

      setView('welcome');
      if (showWalkthroughOnUnlock) {
        setTimeout(() => {
          setShowWalkthrough(true);
        }, 1500);
      }
    }
  };

  const handleQuickAction = (action, asset) => {
    setSendRecipientPreset('')
    setSendPresetLabel('')
    setSendPresetDescription('')
    setSelectedAsset(asset)
    if (action === 'send') {
      setShowSendModal(true)
    } else {
      setShowReceiveModal(true)
    }
  }

  const buildPrimaryAssetForSelectedNetwork = () => {
    const [chain] = (selectedNetwork || 'ethereum-mainnet').split('-')

    if (chain === 'bitcoin') {
      return { name: 'Bitcoin', symbol: 'BTC', balance: balances.bitcoin || '0', priceData: prices.bitcoin, icon: '₿' }
    }

    if (chain === 'solana') {
      return { name: 'Solana', symbol: 'SOL', balance: balances.solana || '0', priceData: prices.solana, icon: '◎' }
    }

    return { name: 'Ethereum', symbol: 'ETH', balance: balances.ethereum || '0', priceData: prices.ethereum, icon: 'Ξ' }
  }

  const handlePrimarySend = () => {
    handleQuickAction('send', buildPrimaryAssetForSelectedNetwork())
  }

  const handlePrimaryReceive = () => {
    const asset = buildPrimaryAssetForSelectedNetwork()
    handleQuickAction('receive', {
      name: asset.name,
      symbol: asset.symbol,
      icon: asset.icon,
    })
  }

  const handleFundBotWallet = async (botWalletAddress, walletId = null) => {
    if (!botWalletAddress) {
      toast.error('Bot wallet address not available right now.')
      return
    }

    if (walletId && walletId !== activeWalletId) {
      await switchWallet(walletId)
    } else if (!wallet && activeWalletId) {
      await switchWallet(activeWalletId)
    }

    if (selectedNetwork !== 'ethereum-sepolia') {
      setSelectedNetwork('ethereum-sepolia')
      toast.success('Switched to Ethereum Sepolia for bot funding.')
    }

    if (!wallet && !walletId && !activeWalletId) {
      toast.error('Choose a wallet first to fund the bot wallet.')
      return
    }

    setSelectedAsset({
      name: 'Ethereum',
      symbol: 'ETH',
      balance: balances.ethereum || '0',
      priceData: prices.ethereum,
      icon: 'Ξ',
    })
    setSendRecipientPreset(botWalletAddress)
    setSendPresetLabel('Telegram Bot Wallet')
    setSendPresetDescription('Recipient is prefilled with your bot wallet. Send Sepolia ETH from your active wallet to top it up.')
    setShowSendModal(true)
  }

  const getWalletCardSummary = (walletRecord) => {
    const description = (walletRecord?.description || '').trim()
    const genericDescriptions = new Set([
      '',
      'Generated wallet',
      'Imported from recovery phrase',
      'Personal multi-chain wallet',
    ])

    if (!genericDescriptions.has(description)) {
      return description
    }
    return ''
  }

  // Prevent hydration mismatch by rendering consistent initial state
  if (!mounted) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="animate-pulse">
          <Wallet className="w-12 h-12 text-purple-500" />
        </div>
      </main>
    )
  }

  // If wallet exists and is locked, show unlock screen
  if (wallet && isLocked) {
    return (
      <UnlockWallet
        onDeleteWallet={deleteWallet}
        onImportWallet={async () => {
          if (confirm('This will delete your current locked wallet so you can restore from a recovery phrase. Make sure you have your 12-word phrase ready. Continue?')) {
            await deleteWallet();
            setView('import');
          }
        }}
      />
    )
  }

  // If no wallet and on landing page, show landing page
  if (!wallet && view === 'landing' && !guestMode) {
    return (
      <LandingPage
        onGetStarted={() => setView('welcome')}
        onGuestMode={() => {
          setGuestMode(true)
          setView('welcome')
        }}
      />
    )
  }

  // If no wallet, show wallet creation/import flows
  if (!wallet) {
    return (
      <main className="min-h-screen bg-black text-white overflow-x-hidden relative">
        {}
        <div className="animated-bg" style={{ filter: 'blur(1px)' }}>
          {}
          <div className="stars">
            {[...Array(150)].map((_, i) => {
              const duration = 15 + (i * 0.2) % 20;
              const delay = -(i * 0.15) % 15;
              return (
                <div
                  key={`star-distant-${i}`}
                  className="star-distant"
                  style={{
                    left: `${(i * 7.19) % 100}%`,
                    top: `${(i * 11.37) % 100}%`,
                    animation: `star-drift ${duration}s ease-in-out ${delay}s infinite`
                  }}
                />
              );
            })}
          </div>

          {}
          <div className="stars">
            {[...Array(40)].map((_, i) => {
              const duration = 12 + (i * 0.5) % 18;
              const delay = -(i * 0.4) % 12;
              return (
                <div
                  key={`star-${i}`}
                  className="star"
                  style={{
                    left: `${(i * 13.71) % 100}%`,
                    top: `${(i * 17.83) % 100}%`,
                    animation: `star-float ${duration}s ease-in-out ${delay}s infinite`
                  }}
                />
              );
            })}
          </div>

          {}
          {[...Array(4)].map((_, i) => {
            const colors = [
              'radial-gradient(circle, rgba(138, 43, 226, 0.6), rgba(138, 43, 226, 0.3) 40%, transparent 70%)',
              'radial-gradient(circle, rgba(59, 130, 246, 0.5), rgba(59, 130, 246, 0.25) 40%, transparent 70%)',
              'radial-gradient(circle, rgba(219, 39, 119, 0.4), rgba(219, 39, 119, 0.2) 40%, transparent 70%)',
              'radial-gradient(circle, rgba(96, 165, 250, 0.6), rgba(96, 165, 250, 0.3) 40%, transparent 70%)'
            ];
            const duration = 50 + (i * 9.7) % 40;
            const delay = -(i * 12.3) % 50;
            const positions = [
              { left: 15, top: 20, width: 650, height: 450 },
              { left: 65, top: 60, width: 550, height: 400 },
              { left: 35, top: 75, width: 700, height: 500 },
              { left: 80, top: 25, width: 600, height: 420 }
            ];
            return (
              <div
                key={`nebula-${i}`}
                className="nebula"
                style={{
                  width: `${positions[i].width}px`,
                  height: `${positions[i].height}px`,
                  left: `${positions[i].left}%`,
                  top: `${positions[i].top}%`,
                  background: colors[i],
                  animation: `nebula-drift ${duration}s ease-in-out ${delay}s infinite`
                }}
              />
            );
          })}

          {}
          {[...Array(3)].map((_, i) => {
            const rotateDuration = 60 + (i * 13.3) % 40;
            const driftDuration = 50 + (i * 9.7) % 30;
            const delay = -(i * 19.3) % 60;
            const positions = [
              { left: 25, top: 45, width: 900, height: 350, rotation: 45 },
              { left: 70, top: 15, width: 1000, height: 400, rotation: 120 },
              { left: 10, top: 70, width: 850, height: 380, rotation: 270 }
            ];
            return (
              <div
                key={`galaxy-${i}`}
                className="galaxy"
                style={{
                  width: `${positions[i].width}px`,
                  height: `${positions[i].height}px`,
                  left: `${positions[i].left}%`,
                  top: `${positions[i].top}%`,
                  background: 'radial-gradient(ellipse, rgba(167, 139, 250, 0.4), rgba(59, 130, 246, 0.25) 40%, rgba(96, 165, 250, 0.1) 60%, transparent 80%)',
                  animation: `galaxy-rotate ${rotateDuration}s linear ${delay}s infinite, galaxy-drift ${driftDuration}s ease-in-out ${delay}s infinite`,
                  transform: `rotate(${positions[i].rotation}deg)`
                }}
              />
            );
          })}
        </div>

        <div className="container mx-auto px-4 py-8 relative" style={{ zIndex: 10 }}>
          {view === 'welcome' && (
            <div className="max-w-lg mx-auto text-center py-12">
              <div className="bg-gradient-to-b from-slate-800/90 to-slate-900/95 backdrop-blur-xl rounded-3xl p-8 md:p-12 border border-blue-500/20 shadow-2xl shadow-blue-500/10">

                {/* Back to Landing */}
                <div className="flex justify-start mb-6">
                  <button
                    onClick={() => { setGuestMode(false); setView('landing'); }}
                    className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors px-3 py-2 hover:bg-slate-700/50 rounded-lg"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span className="text-sm">Back</span>
                  </button>
                </div>

                {}
                <div className="flex items-center gap-4 justify-center mb-8 group cursor-pointer">
                  <div className="relative w-16 h-16">
                    {}
                    <div className="absolute inset-0">
                      {}
                      <div className="absolute inset-2 border-2 border-blue-400/40 rounded transform rotate-45 transition-all duration-500" />
                      <div className="absolute inset-1 border border-cyan-400/20 rounded-lg transform -rotate-45 transition-all duration-500" />
                    </div>

                    {}
                    <div className="absolute top-0 left-1/2 w-2 h-2 bg-blue-400 rounded-full -translate-x-1/2 group-hover:bg-cyan-400 transition-colors" />
                    <div className="absolute bottom-0 left-1/2 w-2 h-2 bg-blue-400 rounded-full -translate-x-1/2 group-hover:bg-cyan-400 transition-colors" />
                    <div className="absolute left-0 top-1/2 w-2 h-2 bg-cyan-400 rounded-full -translate-y-1/2 group-hover:bg-blue-400 transition-colors" />
                    <div className="absolute right-0 top-1/2 w-2 h-2 bg-cyan-400 rounded-full -translate-y-1/2 group-hover:bg-blue-400 transition-colors" />

                    {}
                    <div className="relative z-10 flex items-center justify-center h-full">
                      <Wallet className="w-8 h-8 text-blue-300 group-hover:text-cyan-300 transition-all duration-300 drop-shadow-[0_0_8px_rgba(96,165,250,0.5)] animate-pulse" />
                    </div>

                    {}
                    <div className="absolute inset-0 blur-xl bg-gradient-to-r from-blue-400/30 via-cyan-400/30 to-blue-400/30 animate-spin" style={{ animationDuration: '4s' }} />
                  </div>
                  <div className="text-left">
                    <span className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-cyan-300 to-blue-400 bg-clip-text text-transparent group-hover:tracking-wide transition-all">Walletrix</span>
                    <div className="text-xs text-cyan-400/70 font-medium tracking-widest uppercase">Multi-Chain Network Wallet</div>
                  </div>
                </div>

                <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                  Welcome to <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">Walletrix</span>
                </h2>
                <p className="text-slate-300 mb-8 text-base leading-relaxed">
                  Your secure, non-custodial cryptocurrency wallet. Full control of your Bitcoin, Ethereum, and more.
                </p>

                {}
                {!guestMode && (
                  <SignedOut>
                    <div className="mb-8 p-5 bg-gradient-to-r from-blue-900/40 to-cyan-900/40 rounded-2xl border border-blue-500/30">
                      <h3 className="text-lg font-semibold text-white mb-2">Get Started</h3>
                      <p className="text-slate-300 text-sm mb-5">
                        Sign in with Google, GitHub, or email to create your wallet.
                      </p>
                      <SignInButton mode="modal">
                        <button
                          className="w-full py-4 px-6 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-400 hover:to-cyan-400 text-white font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-3 shadow-lg shadow-blue-500/30 hover:scale-[1.02]"
                        >
                          <User className="w-5 h-5" />
                          Sign In / Create Account
                        </button>
                      </SignInButton>
                    </div>
                  </SignedOut>
                )}

                {}
                {guestMode && (
                  <div className="mb-8 p-5 bg-gradient-to-r from-amber-900/30 to-orange-900/30 rounded-2xl border border-amber-500/30">
                    <h3 className="text-lg font-semibold text-amber-200 mb-2">👋 Guest Mode</h3>
                    <p className="text-amber-100/80 text-sm">
                      You're using Walletrix without an account. Your wallet will be stored locally on this device only.
                    </p>
                  </div>
                )}

                {/* Wallet Management - Only shown when signed in */}
                <SignedIn>
                  {isUserLoaded && clerkUser && (
                    <>
                      {/* User Info Card */}
                      <div className="mb-6 p-4 bg-gradient-to-r from-slate-700/50 to-slate-800/50 rounded-xl border border-slate-600/50">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold">
                            {clerkUser.firstName?.[0] || clerkUser.primaryEmailAddress?.emailAddress?.[0]?.toUpperCase() || '?'}
                          </div>
                          <div className="text-left">
                            <p className="text-white font-medium text-sm">Welcome back!</p>
                            <p className="text-slate-400 text-xs">{clerkUser.primaryEmailAddress?.emailAddress}</p>
                          </div>
                        </div>
                      </div>

                      <div className="mb-6">
                        <h3 className="mb-3 text-left text-sm font-semibold uppercase tracking-wider text-slate-400">
                          Wallet Services
                        </h3>
                        <TelegramHomeCard
                          onOpen={() => setView('telegram-link')}
                        />
                      </div>

                      {/* Show existing wallets if any */}
                      {(userWallets && userWallets.length > 0) || (multiSigWallets && multiSigWallets.length > 0) ? (
                        <div className="mb-6">
                          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3 text-left">Your Wallets</h3>
                          <div className="space-y-3">
                            {/* Regular Wallets */}
                            {userWallets && userWallets.map((w) => (
                              <div
                                key={w.id}
                                className="flex items-center gap-2 w-full group"
                              >
                                <button
                                  onClick={() => {
                                    setActiveWalletId(w.id);
                                  }}
                                  className={`flex-1 rounded-xl border p-4 text-left transition-all ${
                                    activeWalletId === w.id
                                      ? 'border-blue-400/50 bg-blue-900/20 shadow-lg shadow-blue-900/20'
                                      : 'border-slate-600/50 bg-slate-700/50 hover:border-blue-400/50 hover:bg-slate-600/50'
                                  }`}
                                >
                                  <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                                      <Wallet className="w-6 h-6 text-white" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <p className="text-white font-medium truncate">{w.name || 'Unnamed Wallet'}</p>
                                        {activeWalletId === w.id && (
                                          <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-200">
                                            Active
                                          </span>
                                        )}
                                      </div>
                                      {getWalletCardSummary(w) ? (
                                        <p className="mt-1 text-sm text-slate-300 truncate">
                                          {getWalletCardSummary(w)}
                                        </p>
                                      ) : null}
                                      <p className="text-xs text-slate-500 mt-3">
                                        Created {new Date(w.createdAt).toLocaleDateString()}
                                      </p>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
                                  </div>
                                </button>
                                {telegramBotWalletAddress && (
                                  <button
                                    onClick={async () => {
                                      await handleFundBotWallet(telegramBotWalletAddress, w.id)
                                    }}
                                    className="flex items-center gap-2 px-3 py-3 text-sky-300 hover:text-sky-200 hover:bg-sky-500/10 rounded-xl border border-sky-500/30 hover:border-sky-400/50 transition-all flex-shrink-0 bg-sky-500/5"
                                    title={`Fund Telegram bot wallet using ${w.name || 'this wallet'}`}
                                  >
                                    <Bot className="w-4 h-4" />
                                    <span className="hidden sm:inline text-sm font-medium">Fund Bot</span>
                                  </button>
                                )}
                                <button
                                  onClick={async () => {
                                    if (confirm(`Delete "${w.name || 'Unnamed Wallet'}"? Make sure you've backed up your recovery phrase.`)) {
                                      await deleteDatabaseWallet(w.id);
                                    }
                                  }}
                                  className="p-3 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl border border-slate-600/50 hover:border-red-500/50 transition-all flex-shrink-0"
                                  title="Delete wallet"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            ))}

                            {/* Multi-Sig Wallets */}
                            {multiSigWallets && multiSigWallets.map((msw) => (
                              <button
                                key={`multisig-${msw.id}`}
                                onClick={() => {
                                  setSelectedMultiSigWallet(msw);
                                  setView('multisig-detail');
                                }}
                                className="w-full p-4 bg-slate-700/50 hover:bg-slate-600/50 rounded-xl border border-slate-600/50 hover:border-purple-400/50 transition-all text-left group"
                              >
                                <div className="flex items-center gap-4">
                                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                                    <Users className="w-6 h-6 text-white" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-white font-medium truncate">{msw.name}</p>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                      Multi-Sig ({msw.requiredSignatures}/{msw.totalSigners}) • {msw.network}
                                    </p>
                                  </div>
                                  <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-purple-400 group-hover:translate-x-1 transition-all" />
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      <div className="space-y-3">
                        <button
                          onClick={() => setView('create')}
                          className="w-full py-4 px-6 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-400 hover:to-cyan-400 text-white font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-3 shadow-lg shadow-blue-500/30 hover:scale-[1.02]"
                        >
                          <Plus className="w-5 h-5" />
                          Create New Wallet
                        </button>
                        <button
                          onClick={() => setView('import')}
                          className="w-full py-3 px-6 bg-slate-700/50 hover:bg-slate-600/50 text-slate-200 font-medium rounded-xl transition-all duration-300 flex items-center justify-center gap-2 border border-slate-600/50 hover:border-slate-500/50"
                        >
                          <FileDown className="w-5 h-5" />
                          Import Existing Wallet
                        </button>
                      </div>
                    </>
                  )}
                </SignedIn>

                {/* Guest Mode Wallet Creation */}
                {guestMode && (
                  <div className="space-y-3">
                    <button
                      onClick={() => setView('create')}
                      className="w-full py-4 px-6 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-400 hover:to-cyan-400 text-white font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-3 shadow-lg shadow-blue-500/30 hover:scale-[1.02]"
                    >
                      <Plus className="w-5 h-5" />
                      Create New Wallet
                    </button>
                    <button
                      onClick={() => setView('import')}
                      className="w-full py-3 px-6 bg-slate-700/50 hover:bg-slate-600/50 text-slate-200 font-medium rounded-xl transition-all duration-300 flex items-center justify-center gap-2 border border-slate-600/50 hover:border-slate-500/50"
                    >
                      <FileDown className="w-5 h-5" />
                      Import Existing Wallet
                    </button>

                    {/* Option to sign in instead */}
                    <div className="pt-4 text-center">
                      <p className="text-slate-400 text-sm mb-2">Want cloud sync & backup?</p>
                      <SignInButton mode="modal">
                        <button className="text-blue-400 hover:text-blue-300 text-sm font-medium underline">
                          Sign in to enable cloud features
                        </button>
                      </SignInButton>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {view === 'create' && (
            <div className="py-8">
              <button
                onClick={() => setView('welcome')}
                className="mb-8 flex items-center gap-2 text-slate-400 hover:text-white transition-colors px-3 py-2 hover:bg-slate-800/50 rounded-lg"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Back</span>
              </button>
              <ErrorBoundary>
                <CreateWallet
                  onComplete={() => setView('dashboard')}
                  onMultiSigCreated={(wallet) => {
                    setSelectedMultiSigWallet(wallet);
                    setView('multisig-detail');
                  }}
                />
              </ErrorBoundary>
            </div>
          )}

          {view === 'telegram-link' && (
            <ErrorBoundary>
              <TelegramLinkPage
                isSignedIn={Boolean(isSignedIn && clerkUser)}
                getToken={getToken}
                onBack={() => setView('welcome')}
              />
            </ErrorBoundary>
          )}

          {view === 'multisig-detail' && selectedMultiSigWallet && (
            <ErrorBoundary>
              <MultiSigWalletDetail
                walletId={selectedMultiSigWallet.id}
                onBack={() => {
                  setSelectedMultiSigWallet(null);
                  setView('multisig');
                }}
              />
            </ErrorBoundary>
          )}

          {view === 'import' && (
            <div className="py-8">
              <button
                onClick={() => setView('welcome')}
                className="mb-8 flex items-center gap-2 text-slate-400 hover:text-white transition-colors px-3 py-2 hover:bg-slate-800/50 rounded-lg"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Back</span>
              </button>
              <ErrorBoundary>
                <ImportWallet onComplete={() => setView('dashboard')} />
              </ErrorBoundary>
            </div>
          )}
        </div>

        {/* Auth handled by Clerk modals */}
      </main>
    )
  }

  // Main Dashboard
  return (
    <main className="wallet-shell-bg min-h-screen text-white overflow-x-hidden relative">
      {/* Animated Background - Same as Landing Page with subtle blur */}
      <div className="animated-bg lg:hidden" style={{ filter: 'blur(1px)' }}>
        {/* Distant Stars Layer */}
        <div className="stars">
          {[...Array(150)].map((_, i) => {
            const duration = 15 + (i * 0.2) % 20;
            const delay = -(i * 0.15) % 15;
            return (
              <div
                key={`star-distant-${i}`}
                className="star-distant"
                style={{
                  left: `${(i * 7.19) % 100}%`,
                  top: `${(i * 11.37) % 100}%`,
                  animation: `star-drift ${duration}s ease-in-out ${delay}s infinite`
                }}
              />
            );
          })}
        </div>

        {/* Bright Stars */}
        <div className="stars">
          {[...Array(40)].map((_, i) => {
            const duration = 12 + (i * 0.5) % 18;
            const delay = -(i * 0.4) % 12;
            return (
              <div
                key={`star-${i}`}
                className="star"
                style={{
                  left: `${(i * 13.71) % 100}%`,
                  top: `${(i * 17.83) % 100}%`,
                  animation: `star-float ${duration}s ease-in-out ${delay}s infinite`
                }}
              />
            );
          })}
        </div>

        {/* Nebula Clouds */}
        {[...Array(4)].map((_, i) => {
          const colors = [
            'radial-gradient(circle, rgba(138, 43, 226, 0.6), rgba(138, 43, 226, 0.3) 40%, transparent 70%)',
            'radial-gradient(circle, rgba(59, 130, 246, 0.5), rgba(59, 130, 246, 0.25) 40%, transparent 70%)',
            'radial-gradient(circle, rgba(219, 39, 119, 0.4), rgba(219, 39, 119, 0.2) 40%, transparent 70%)',
            'radial-gradient(circle, rgba(96, 165, 250, 0.6), rgba(96, 165, 250, 0.3) 40%, transparent 70%)'
          ];
          const duration = 50 + (i * 9.7) % 40;
          const delay = -(i * 12.3) % 50;
          const positions = [
            { left: 15, top: 20, width: 650, height: 450 },
            { left: 65, top: 60, width: 550, height: 400 },
            { left: 35, top: 75, width: 700, height: 500 },
            { left: 80, top: 25, width: 600, height: 420 }
          ];
          return (
            <div
              key={`nebula-${i}`}
              className="nebula"
              style={{
                width: `${positions[i].width}px`,
                height: `${positions[i].height}px`,
                left: `${positions[i].left}%`,
                top: `${positions[i].top}%`,
                background: colors[i],
                animation: `nebula-drift ${duration}s ease-in-out ${delay}s infinite`
              }}
            />
          );
        })}

        {/* Distant Galaxies */}
        {[...Array(3)].map((_, i) => {
          const rotateDuration = 60 + (i * 13.3) % 40;
          const driftDuration = 50 + (i * 9.7) % 30;
          const delay = -(i * 19.3) % 60;
          const positions = [
            { left: 25, top: 45, width: 900, height: 350, rotation: 45 },
            { left: 70, top: 15, width: 1000, height: 400, rotation: 120 },
            { left: 10, top: 70, width: 850, height: 380, rotation: 270 }
          ];
          return (
            <div
              key={`galaxy-${i}`}
              className="galaxy"
              style={{
                width: `${positions[i].width}px`,
                height: `${positions[i].height}px`,
                left: `${positions[i].left}%`,
                top: `${positions[i].top}%`,
                background: 'radial-gradient(ellipse, rgba(167, 139, 250, 0.4), rgba(59, 130, 246, 0.25) 40%, rgba(96, 165, 250, 0.1) 60%, transparent 80%)',
                animation: `galaxy-rotate ${rotateDuration}s linear ${delay}s infinite, galaxy-drift ${driftDuration}s ease-in-out ${delay}s infinite`,
                transform: `rotate(${positions[i].rotation}deg)`
              }}
            />
          );
        })}
      </div>

      {/* Mobile Navigation Header */}
      <nav className="lg:hidden fixed top-0 left-0 right-0 bg-black/90 backdrop-blur-xl border-b border-blue-500/20" style={{ zIndex: 100 }}>
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3 group">
            <div className="relative w-10 h-10">
              {/* Geometric pattern */}
              <div className="absolute inset-2 border-2 border-blue-400/40 rounded transform rotate-45 transition-all" />
              <div className="absolute inset-1 border border-cyan-400/20 rounded-lg transform -rotate-45 transition-all" />

              {/* Corner nodes */}
              <div className="absolute top-0 left-1/2 w-1 h-1 bg-blue-400 rounded-full -translate-x-1/2" />
              <div className="absolute bottom-0 left-1/2 w-1 h-1 bg-blue-400 rounded-full -translate-x-1/2" />
              <div className="absolute left-0 top-1/2 w-1 h-1 bg-cyan-400 rounded-full -translate-y-1/2" />
              <div className="absolute right-0 top-1/2 w-1 h-1 bg-cyan-400 rounded-full -translate-y-1/2" />

              {/* Icon */}
              <div className="relative z-10 flex items-center justify-center h-full">
                <Wallet className="w-5 h-5 text-blue-300 drop-shadow-[0_0_6px_rgba(96,165,250,0.5)]" />
              </div>

              {/* Glow */}
              <div className="absolute inset-0 blur-lg bg-gradient-to-r from-blue-400/15 via-cyan-400/15 to-blue-400/15 animate-spin" style={{ animationDuration: '8s' }} />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-blue-400 via-cyan-300 to-blue-400 bg-clip-text text-transparent">Walletrix</span>
          </div>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg bg-blue-900/30 text-blue-100"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu Overlay */}
        {mobileMenuOpen && (
          <div className="absolute top-full left-0 right-0 bg-black/95 backdrop-blur-2xl border-b border-blue-500/20 p-4 space-y-4">
            <NetworkSelector />
            <div className="pt-4 border-t border-blue-500/20 space-y-3">
              <button
                onClick={() => {
                  if (lockWallet) {
                    lockWallet()
                  }
                  setMobileMenuOpen(false)
                }}
                className="w-full px-4 py-3 bg-orange-900/30 hover:bg-orange-800/40 rounded-lg text-orange-100 flex items-center gap-3 transition-all"
              >
                <Lock className="w-5 h-5" />
                Lock Wallet
              </button>
              <button
                onClick={() => {
                  setShowSettings(true)
                  setMobileMenuOpen(false)
                }}
                className="w-full px-4 py-3 bg-blue-900/30 hover:bg-blue-800/40 rounded-lg text-blue-100 flex items-center gap-3 transition-all"
              >
                <Settings className="w-5 h-5" />
                Settings
              </button>
              {userWallets.length > 1 && (
                <button
                  onClick={() => {
                    setShowWalletSelector(true)
                    setMobileMenuOpen(false)
                  }}
                  className="w-full px-4 py-3 bg-blue-900/30 hover:bg-blue-800/40 rounded-lg text-blue-100 flex items-center gap-3 transition-all"
                >
                  <Users className="w-5 h-5" />
                  Switch Wallet ({userWallets.length})
                </button>
              )}
              <SignedIn>
                <div className="px-4 py-3 bg-blue-900/20 rounded-lg">
                  <UserButton
                    appearance={{
                      elements: {
                        avatarBox: "w-10 h-10"
                      }
                    }}
                  />
                </div>
              </SignedIn>
            </div>
          </div>
        )}
      </nav>

      <div className="mx-auto max-w-[1600px] px-4 pb-8 pt-24 lg:px-6 lg:pb-10 lg:pt-6">
        <div className="lg:grid lg:grid-cols-[96px_minmax(0,1fr)] lg:gap-6">
          <div className="hidden lg:block lg:w-[96px]" aria-hidden="true" />
          <aside
            className="wallet-rail hidden lg:fixed lg:z-20 lg:flex lg:min-h-[calc(100vh-3rem)] lg:w-[96px] lg:flex-col lg:justify-between"
            style={{ left: 'max(1.5rem, calc((100vw - 1600px) / 2 + 1.5rem))' }}
          >
            <div className="space-y-6">
              <div className="flex justify-center">
                <div className="wallet-brand-mark">
                  <Wallet className="h-5 w-5 text-white" />
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => setView('welcome')}
                  className="wallet-rail-button"
                  title="Back to Wallet Home"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>

                {isAuthenticated && userWallets.length > 1 ? (
                  <button
                    onClick={() => setShowWalletSelector(true)}
                    className="wallet-rail-button"
                    title="Switch Wallet"
                  >
                    <Users className="h-5 w-5" />
                  </button>
                ) : null}

                <button
                  onClick={() => setView('telegram-link')}
                  className="wallet-rail-button"
                  title="Telegram Bot Workspace"
                >
                  <Bot className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <button
                data-tour="settings-button"
                onClick={() => setShowSettings(true)}
                className="wallet-rail-button"
                title="Settings"
              >
                <Settings className="h-5 w-5" />
              </button>

              <button
                data-tour="lock-button"
                onClick={() => {
                  if (lockWallet) {
                    lockWallet()
                  }
                }}
                className="wallet-rail-button wallet-rail-button-warning"
                title="Lock Wallet"
              >
                <Lock className="h-5 w-5" />
              </button>
            </div>
          </aside>

          <div className="relative space-y-6" style={{ zIndex: 1 }}>
            <header className="wallet-shell-header relative z-30 hidden lg:flex lg:items-start lg:justify-between lg:gap-6">
              <div className="min-w-0">
                <p className="wallet-shell-kicker">Portfolio Workspace</p>
                <div className="mt-4 flex items-center gap-3">
                  <h1 className="text-3xl font-semibold tracking-tight text-white">
                    {activeWalletLabel}
                  </h1>
                  <span className="wallet-shell-badge">
                    {activeNetworkLabel}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-400">
                  {truncateMiddle(activeWalletAddress)} {userWallets.length > 1 ? `• ${userWallets.length} wallets available` : '• Personal workspace'}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div data-tour="network-selector" className="relative z-40">
                  <NetworkSelector />
                </div>

                <NotificationBell currentWalletId={activeWalletId} />

                <SignedOut>
                  <SignInButton mode="modal">
                    <button className="wallet-shell-action">
                      <User className="h-4 w-4" />
                      <span>Sign In</span>
                    </button>
                  </SignInButton>
                </SignedOut>

                <SignedIn>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-1.5 shadow-[0_18px_48px_rgba(2,6,23,0.32)]">
                    <UserButton
                      appearance={{
                        elements: {
                          avatarBox: "h-10 w-10 ring-1 ring-white/10 transition-all hover:ring-white/20",
                          userButtonPopoverCard: "bg-slate-900 border border-slate-800 shadow-2xl",
                          userButtonPopoverActionButton: "text-white hover:bg-slate-800"
                        }
                      }}
                    />
                  </div>
                </SignedIn>
              </div>
            </header>

            <div className="relative z-0 lg:pl-1">
              <ErrorBoundary>
                <Dashboard
                  onFundBot={handleFundBotWallet}
                  onSend={handlePrimarySend}
                  onReceive={handlePrimaryReceive}
                />
              </ErrorBoundary>
            </div>
          </div>
        </div>

        {/* Modals */}
        <SendModal
          isOpen={showSendModal}
          onClose={() => {
            setShowSendModal(false)
            setSelectedAsset(null)
            setSendRecipientPreset('')
            setSendPresetLabel('')
            setSendPresetDescription('')
          }}
          asset={selectedAsset}
          initialRecipient={sendRecipientPreset}
          presetLabel={sendPresetLabel}
          presetDescription={sendPresetDescription}
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

        <WalletSelector
          isOpen={showWalletSelector}
          onClose={() => setShowWalletSelector(false)}
          onCreateWallet={() => setView('create')}
        />

        <SettingsModal
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          onOpenAccountDetails={() => {
            setShowSettings(false)
            setShowAccountDetails(true)
          }}
          onStartTutorial={() => setShowWalkthrough(true)}
        />

        <Walkthrough
          isOpen={showWalkthrough}
          onClose={() => setShowWalkthrough(false)}
        />
      </div>
    </main>
  )
}
