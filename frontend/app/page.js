'use client'

import { useState, useEffect } from 'react'
import { Wallet, Send, Download, Settings, LogOut, Plus, FileDown, User, Users, Trash2, Menu, X, Lock } from 'lucide-react'
import { useWallet } from '@/contexts/DatabaseWalletContext'
import { useUser, useClerk, SignedIn, SignedOut, SignInButton, UserButton, useAuth } from '@clerk/nextjs'
import toast from 'react-hot-toast'
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

export default function Home() {
  const { user: clerkUser, isLoaded: isUserLoaded, isSignedIn } = useUser()
  const { signOut } = useClerk()
  const { getToken } = useAuth()

  const {
    wallet,
    isLocked,
    balances,
    tokens,
    prices,
    user,
    isAuthenticated,
    login,
    logout,
    userWallets,
    activeWalletId,
    setActiveWalletId,
    importLocalStorageWallet,
    deleteWallet,
    unlockWallet,
    lockWallet,
    selectedNetwork,
    showWalkthroughOnUnlock,
    setShowWalkthroughOnUnlock
  } = useWallet()

  const [view, setView] = useState('landing') // landing, welcome, create, import, multisig-detail
  const [selectedAsset, setSelectedAsset] = useState(null)
  const [showSendModal, setShowSendModal] = useState(false)
  const [showReceiveModal, setShowReceiveModal] = useState(false)
  const [selectedMultiSigWallet, setSelectedMultiSigWallet] = useState(null)
  const [multiSigWallets, setMultiSigWallets] = useState([])
  const [loadingMultiSig, setLoadingMultiSig] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showAccountDetails, setShowAccountDetails] = useState(false)
  const [showWalletSelector, setShowWalletSelector] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [showWalkthrough, setShowWalkthrough] = useState(false)

  // Auto-unlock wallet for Clerk users
  useEffect(() => {
    if (clerkUser && wallet && isLocked) {
      // Use Clerk user ID as password for auto-unlock
      unlockWallet(clerkUser.id).catch(console.error);
    }
  }, [clerkUser, wallet, isLocked]);

  // Show walkthrough when wallet is unlocked (if enabled in settings)
  useEffect(() => {
    if (typeof window !== 'undefined' && wallet && !isLocked && showWalkthroughOnUnlock) {
      // Check if we should show walkthrough after reload
      const shouldShowAfterReload = window.localStorage.getItem('walletrix_show_walkthrough_on_load');
      if (shouldShowAfterReload === 'true') {
        window.localStorage.removeItem('walletrix_show_walkthrough_on_load');
        setTimeout(() => {
          setShowWalkthrough(true);
        }, 1200); // Reduced delay for smoother experience
      } else {
        // Show walkthrough every time wallet is unlocked (not just after creation)
        const hasShownThisSession = window.sessionStorage.getItem('walletrix_walkthrough_shown');
        if (!hasShownThisSession) {
          window.sessionStorage.setItem('walletrix_walkthrough_shown', 'true');
          setTimeout(() => {
            setShowWalkthrough(true);
          }, 800); // Reduced delay to prevent blink
        }
      }
    }
  }, [wallet, isLocked, showWalkthroughOnUnlock]);

  // Clear session flag when wallet locks
  useEffect(() => {
    if (isLocked) {
      sessionStorage.removeItem('walletrix_walkthrough_shown');
    }
  }, [isLocked]);

  // Fetch multi-sig wallets
  useEffect(() => {
    const fetchMultiSigWallets = async () => {
      if (!clerkUser || !isSignedIn) return;

      setLoadingMultiSig(true);
      try {
        // Use getToken from useAuth hook (already defined at component level)
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

  // Handle wallet creation/import completion
  const handleWalletCreated = async () => {
    if (isAuthenticated) {
      // For authenticated users, mark to show walkthrough after reload
      if (typeof window !== 'undefined' && showWalkthroughOnUnlock) {
        window.localStorage.setItem('walletrix_show_walkthrough_on_load', 'true');
      }
      // Trigger a refresh by clearing and reloading
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    } else {
      // For non-authenticated users, show walkthrough directly
      setView('welcome');
      if (showWalkthroughOnUnlock) {
        setTimeout(() => {
          setShowWalkthrough(true);
        }, 1500); // Small delay for smooth transition
      }
    }
  };

  // Handle quick send/receive
  const handleQuickAction = (action, asset) => {
    setSelectedAsset(asset)
    if (action === 'send') {
      setShowSendModal(true)
    } else {
      setShowReceiveModal(true)
    }
  }

  // Show landing page if no wallet and view is 'landing'
  if (!wallet && view === 'landing') {
    return <LandingPage onGetStarted={() => setView('welcome')} />
  }

  // Show unlock screen if wallet exists but is locked
  if (wallet && isLocked) {
    return (
      <UnlockWallet
        onDeleteWallet={deleteWallet}
      />
    )
  }

  // Show wallet setup screens or wallet list for authenticated users
  if (!wallet) {
    return (
      <main className="min-h-screen">
        <div className="container mx-auto px-4 py-8">
          {view === 'welcome' && (
            <div className="max-w-md mx-auto text-center py-20">
              <div className="glass-effect rounded-3xl p-10 border border-blue-500/30 shadow-2xl shadow-blue-500/20">
                <Wallet className="w-24 h-24 text-blue-400 mx-auto mb-8 blue-glow" />
                <h2 className="text-4xl font-bold gradient-text mb-6">Welcome to Walletrix</h2>
                <p className="text-blue-100/80 mb-10 text-lg leading-relaxed">
                  Your secure, independent cryptocurrency wallet. Manage Bitcoin, Ethereum, and more with ultimate security.
                </p>

                {/* Authentication Banner - Only shown when signed out */}
                <SignedOut>
                  <div className="mb-8 p-4 bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-xl border border-blue-500/30">
                    <h3 className="text-lg font-semibold text-blue-100 mb-2">Sign in to Get Started</h3>
                    <p className="text-blue-200/70 text-sm mb-4">
                      Create and manage your crypto wallets securely. Supports Google, GitHub, and email authentication.
                    </p>
                    <SignInButton mode="modal">
                      <button
                        className="w-full py-3 px-6 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold rounded-lg transition-all duration-300 flex items-center justify-center gap-2"
                      >
                        <User className="w-5 h-5" />
                        Sign In / Register
                      </button>
                    </SignInButton>
                  </div>
                </SignedOut>

                {/* Wallet Management - Only shown when signed in */}
                <SignedIn>
                  {isUserLoaded && clerkUser && (
                    <>
                      <div className="mb-6 p-4 bg-gradient-to-r from-purple-900/30 to-blue-900/30 rounded-xl border border-purple-500/30">
                        <p className="text-blue-100 mb-1">Welcome back!</p>
                        <p className="text-sm text-blue-300">{clerkUser.primaryEmailAddress?.emailAddress}</p>
                      </div>

                      {/* Show existing wallets if any */}
                      {(userWallets && userWallets.length > 0) || (multiSigWallets && multiSigWallets.length > 0) ? (
                        <div className="mb-6">
                          <h3 className="text-lg font-semibold text-blue-100 mb-3">Your Wallets</h3>
                          <div className="space-y-2">
                            {/* Regular Wallets */}
                            {userWallets && userWallets.map((w) => (
                              <button
                                key={w.id}
                                onClick={() => {
                                  setActiveWalletId(w.id);
                                }}
                                className="w-full p-4 bg-gradient-to-r from-blue-900/40 to-blue-800/30 hover:from-blue-800/50 hover:to-blue-700/40 rounded-xl border border-blue-500/30 hover:border-blue-400/50 transition-all text-left"
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-blue-100 font-medium">{w.name || 'Unnamed Wallet'}</p>
                                    <p className="text-xs text-blue-300 mt-1">
                                      Created {new Date(w.createdAt).toLocaleDateString()}
                                    </p>
                                  </div>
                                  <Wallet className="w-5 h-5 text-blue-400" />
                                </div>
                              </button>
                            ))}

                            {/* Multi-Sig Wallets */}
                            {multiSigWallets && multiSigWallets.map((msw) => (
                              <button
                                key={`multisig-${msw.id}`}
                                onClick={() => {
                                  setSelectedMultiSigWallet(msw);
                                  setView('multisig-detail');
                                }}
                                className="w-full p-4 bg-gradient-to-r from-purple-900/40 to-purple-800/30 hover:from-purple-800/50 hover:to-purple-700/40 rounded-xl border border-purple-500/30 hover:border-purple-400/50 transition-all text-left"
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-purple-100 font-medium">{msw.name}</p>
                                    <p className="text-xs text-purple-300/70 mt-1">
                                      Multi-Sig ({msw.requiredSignatures}/{msw.totalSigners}) • {msw.network}
                                    </p>
                                  </div>
                                  <Users className="w-5 h-5 text-purple-400" />
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      <div className="space-y-3">
                        <button
                          onClick={() => setView('create')}
                          className="w-full py-4 px-8 bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-500 hover:to-blue-700 text-white font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-3 btn-glow shadow-lg shadow-blue-500/30"
                        >
                          <Plus className="w-6 h-6" />
                          Create New Wallet
                        </button>
                        <button
                          onClick={() => setView('import')}
                          className="w-full py-3 px-6 bg-gradient-to-r from-gray-800 to-black hover:from-gray-700 hover:to-gray-900 text-blue-100 font-medium rounded-xl transition-all duration-300 flex items-center justify-center gap-2 border border-blue-500/30 hover:border-blue-400/50"
                        >
                          <FileDown className="w-5 h-5" />
                          Import Existing Wallet
                        </button>
                      </div>
                    </>
                  )}
                </SignedIn>
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
              <CreateWallet
                onComplete={() => setView('dashboard')}
                onMultiSigCreated={(wallet) => {
                  setSelectedMultiSigWallet(wallet);
                  setView('multisig-detail');
                }}
              />
            </div>
          )}

          {view === 'multisig-detail' && selectedMultiSigWallet && (
            <MultiSigWalletDetail
              walletId={selectedMultiSigWallet.id}
              onBack={() => {
                setSelectedMultiSigWallet(null);
                setView('dashboard');
              }}
            />
          )}

          {view === 'import' && (
            <div className="py-8">
              <button
                onClick={() => setView('welcome')}
                className="mb-8 text-blue-300 hover:text-blue-100 transition-all duration-300 text-lg font-medium flex items-center gap-2 hover:bg-blue-500/10 px-3 py-2 rounded-lg"
              >
                ← Back to Welcome
              </button>
              <ImportWallet onComplete={() => setView('dashboard')} />
            </div>
          )}
        </div>

        {/* Auth handled by Clerk modals */}
      </main>
    )
  }

  // Main Dashboard
  return (
    <main className="min-h-screen">
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

      <div className="container mx-auto px-4 py-8 lg:py-8 pt-24 lg:pt-8">
        {/* Desktop Header */}
        <header className="hidden lg:flex items-center justify-between mb-10 glass-effect rounded-2xl p-6 border border-blue-500/20 shadow-xl relative" style={{ zIndex: 100 }}>
          <div className="flex items-center gap-3 group cursor-pointer">
            <div className="relative w-14 h-14">
              {/* Rotating geometric frames */}
              <div className="absolute inset-0 border-2 border-blue-400/40 rounded-lg animate-spin" style={{ animationDuration: '8s' }} />
              <div className="absolute inset-0 border-2 border-cyan-400/30 rounded-lg animate-spin" style={{ animationDuration: '12s', animationDirection: 'reverse' }} />

              {/* Center wallet icon */}
              <div className="absolute inset-0 flex items-center justify-center z-10">
                <svg className="w-8 h-8 text-blue-300 group-hover:text-cyan-300 transition-colors" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
                </svg>
              </div>

              {/* Network nodes */}
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-cyan-400 rounded-full shadow-lg shadow-cyan-400/50 group-hover:shadow-cyan-300/70 transition-shadow" />
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-blue-400 rounded-full shadow-lg shadow-blue-400/50 group-hover:shadow-blue-300/70 transition-shadow" />

              {/* Animated gradient glow */}
              <div className="absolute inset-0 blur-xl bg-gradient-to-r from-blue-400/30 to-cyan-400/30 group-hover:from-cyan-400/40 group-hover:to-blue-400/40 transition-all" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-cyan-300 to-blue-400 bg-clip-text text-transparent group-hover:tracking-wide transition-all">Walletrix</h1>
              <p className="text-sm text-cyan-300/80 group-hover:text-cyan-200 transition-colors">Multi-Chain Network</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div data-tour="network-selector">
              <NetworkSelector />
            </div>

            {/* Desktop User Info & Controls */}
            {isAuthenticated && userWallets.length > 1 && (
              <button
                onClick={() => setShowWalletSelector(true)}
                className="p-3 rounded-xl bg-gradient-to-r from-blue-900/30 to-blue-800/20 hover:from-blue-800/40 hover:to-blue-700/30 border border-blue-500/30 text-blue-100 transition-all duration-300 hover:scale-105"
                title="Switch Wallet"
              >
                <Wallet className="w-5 h-5" />
              </button>
            )}

            <div className="flex items-center gap-3">
              <SignedOut>
                <SignInButton mode="modal">
                  <button
                    className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold rounded-xl transition-all duration-300 flex items-center gap-2 shadow-lg shadow-purple-500/30 hover:scale-105"
                  >
                    <User className="w-5 h-5" />
                    Sign In
                  </button>
                </SignInButton>
              </SignedOut>
              <SignedIn>
                <UserButton
                  appearance={{
                    elements: {
                      avatarBox: "w-11 h-11 shadow-lg shadow-blue-500/30",
                      userButtonPopoverCard: "bg-gray-900 border-gray-700",
                      userButtonPopoverActionButton: "text-white hover:bg-gray-700"
                    }
                  }}
                />
              </SignedIn>
              <button
                data-tour="lock-button"
                onClick={() => {
                  if (lockWallet) {
                    lockWallet()
                  }
                }}
                className="p-3 rounded-xl bg-gradient-to-r from-orange-900/30 to-orange-800/20 hover:from-orange-800/40 hover:to-orange-700/30 border border-orange-500/30 text-orange-100 transition-all duration-300 hover:scale-105"
                title="Lock Wallet"
              >
                <Lock className="w-6 h-6" />
              </button>
              {/* Header Actions */}
              <div className="flex items-center gap-2">
                {/* Notification Bell */}
                <NotificationBell currentWalletId={activeWalletId} />

                {/* Settings Button */}
                <button
                  data-tour="settings-button"
                  onClick={() => setShowSettings(!showSettings)}
                  className="p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                  title="Settings"
                >
                  <Settings className="w-6 h-6" />
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Settings Modal moved to end of component */}
        {false && (
          <div className="max-w-4xl mx-auto mb-8 relative" style={{ zIndex: 1000 }}>
            <div className="glass-effect rounded-2xl p-8 border border-blue-500/30 shadow-2xl shadow-blue-500/30">
              <h3 className="text-xl font-bold text-blue-100 mb-6">Settings</h3>
              <div className="space-y-4">
                {isAuthenticated && clerkUser ? (
                  <>
                    <div className="p-4 bg-gradient-to-r from-blue-900/20 to-purple-900/20 rounded-xl border border-blue-500/20">
                      <h4 className="font-semibold text-blue-100 mb-2">Account: {clerkUser.primaryEmailAddress?.emailAddress}</h4>
                      <p className="text-sm text-blue-300">
                        {userWallets.length} wallet{userWallets.length !== 1 ? 's' : ''}
                      </p>
                      <p className="text-xs text-blue-400 mt-2">
                        Authenticated via Clerk • {clerkUser.fullName || 'User'}
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        setShowAccountDetails(true);
                        setShowSettings(false);
                      }}
                      className="w-full py-4 px-6 bg-gradient-to-r from-blue-900/30 to-blue-800/20 hover:from-blue-800/40 hover:to-blue-700/30 text-blue-100 font-semibold rounded-xl transition-all duration-300 text-left border border-blue-500/20 hover:border-blue-400/40 flex items-center gap-3"
                    >
                      <User className="w-5 h-5" />
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
                        className="w-full py-4 px-6 bg-gradient-to-r from-green-900/30 to-green-800/20 hover:from-green-800/40 hover:to-green-700/30 text-green-300 font-semibold rounded-xl transition-all duration-300 text-left border border-green-500/20 hover:border-green-400/40 flex items-center gap-3"
                      >
                        <Download className="w-5 h-5" />
                        Import Browser Wallet to Account
                      </button>
                    )}

                    {/* Delete Active Wallet */}
                    {activeWalletId && (
                      <button
                        onClick={async () => {
                          const activeWallet = userWallets.find(w => w.id === activeWalletId);
                          if (!activeWallet) return;

                          if (confirm(`Are you sure you want to delete "${activeWallet.name}"? This action cannot be undone. Make sure you have backed up your recovery phrase.`)) {
                            try {
                              await deleteWallet(activeWalletId);
                              setShowSettings(false);
                            } catch (error) {
                              console.error('Delete failed:', error);
                            }
                          }
                        }}
                        className="w-full py-4 px-6 bg-gradient-to-r from-red-900/30 to-red-800/20 hover:from-red-800/40 hover:to-red-700/30 text-red-300 font-semibold rounded-xl transition-all duration-300 text-left border border-red-500/20 hover:border-red-400/40 flex items-center gap-3"
                      >
                        <Trash2 className="w-5 h-5" />
                        Delete Current Wallet
                      </button>
                    )}

                    <button
                      onClick={async () => {
                        await signOut();
                        logout();
                        setShowSettings(false);
                      }}
                      className="w-full py-4 px-6 bg-gradient-to-r from-orange-900/30 to-orange-800/20 hover:from-orange-800/40 hover:to-orange-700/30 text-orange-300 font-semibold rounded-xl transition-all duration-300 text-left border border-orange-500/20 hover:border-orange-400/40 flex items-center gap-3"
                    >
                      <LogOut className="w-5 h-5" />
                      Sign Out
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

                    <SignInButton mode="modal">
                      <button
                        onClick={() => setShowSettings(false)}
                        className="w-full py-4 px-6 bg-gradient-to-r from-purple-900/30 to-blue-800/20 hover:from-purple-800/40 hover:to-blue-700/30 text-purple-300 font-semibold rounded-xl transition-all duration-300 text-left border border-purple-500/20 hover:border-purple-400/40 flex items-center gap-3"
                      >
                        <Users className="w-5 h-5" />
                        Sign In / Register
                      </button>
                    </SignInButton>

                    <button
                      onClick={() => {
                        setShowAccountDetails(true);
                        setShowSettings(false);
                      }}
                      className="w-full py-4 px-6 bg-gradient-to-r from-blue-900/30 to-blue-800/20 hover:from-blue-800/40 hover:to-blue-700/30 text-blue-100 font-semibold rounded-xl transition-all duration-300 text-left border border-blue-500/20 hover:border-blue-400/40 flex items-center gap-3"
                    >
                      <User className="w-5 h-5" />
                      Account Details & Private Keys
                    </button>

                    {/* Delete Local Wallet */}
                    {wallet && (
                      <button
                        onClick={() => {
                          if (confirm('Are you sure you want to delete your local wallet? This action cannot be undone. Make sure you have backed up your recovery phrase.')) {
                            deleteWallet();
                            setShowSettings(false);
                            setView('welcome');
                          }
                        }}
                        className="w-full py-4 px-6 bg-gradient-to-r from-red-900/30 to-red-800/20 hover:from-red-800/40 hover:to-red-700/30 text-red-300 font-semibold rounded-xl transition-all duration-300 text-left border border-red-500/20 hover:border-red-400/40 flex items-center gap-3"
                      >
                        <Trash2 className="w-5 h-5" />
                        Delete Local Wallet
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions Bar */}
        <div className="max-w-4xl mx-auto mb-8 relative" style={{ zIndex: 1 }}>
          <div className="glass-effect rounded-2xl p-4 lg:p-6 border border-blue-500/30 shadow-xl shadow-blue-500/20">
            <div className="grid grid-cols-2 lg:flex gap-3 lg:gap-6 lg:justify-center">
              <button
                data-tour="send-button"
                onClick={() => {
                  const [chain] = (selectedNetwork || 'ethereum-mainnet').split('-');
                  let asset;
                  if (chain === 'bitcoin') {
                    asset = { name: 'Bitcoin', symbol: 'BTC', balance: balances.bitcoin || '0', priceData: prices.bitcoin, icon: '₿' };
                  } else if (chain === 'solana') {
                    asset = { name: 'Solana', symbol: 'SOL', balance: balances.solana || '0', priceData: prices.solana, icon: '◎' };
                  } else {
                    asset = { name: 'Ethereum', symbol: 'ETH', balance: balances.ethereum || '0', priceData: prices.ethereum, icon: 'Ξ' };
                  }
                  handleQuickAction('send', asset);
                }}
                className="flex items-center justify-center gap-3 py-4 px-4 lg:px-8 bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-500 hover:to-blue-700 text-white font-bold rounded-xl transition-all duration-300 hover:scale-105 shadow-lg shadow-blue-500/30"
              >
                <Send className="w-5 h-5" />
                <span className="hidden sm:inline">Send</span>
              </button>
              <button
                data-tour="receive-button"
                onClick={() => {
                  const [chain] = (selectedNetwork || 'ethereum-mainnet').split('-');
                  let asset;
                  if (chain === 'bitcoin') {
                    asset = { name: 'Bitcoin', symbol: 'BTC', icon: '₿' };
                  } else if (chain === 'solana') {
                    asset = { name: 'Solana', symbol: 'SOL', icon: '◎' };
                  } else {
                    asset = { name: 'Ethereum', symbol: 'ETH', icon: 'Ξ' };
                  }
                  handleQuickAction('receive', asset);
                }}
                className="flex items-center justify-center gap-3 py-4 px-4 lg:px-8 bg-gradient-to-r from-green-600 to-green-800 hover:from-green-500 hover:to-green-700 text-white font-bold rounded-xl transition-all duration-300 hover:scale-105 shadow-lg shadow-green-500/30"
              >
                <Download className="w-5 h-5" />
                <span className="hidden sm:inline">Receive</span>
              </button>
            </div>
          </div>
        </div>

        {/* Dashboard */}
        <div className="max-w-4xl mx-auto relative" style={{ zIndex: 1, willChange: 'contents' }}>
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
