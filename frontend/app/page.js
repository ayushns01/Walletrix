'use client'

import { useState, useEffect } from 'react'
import { Wallet, Send, Download, Settings, LogOut, Plus, FileDown, User, Users, Trash2, Menu, X, Lock, ChevronRight } from 'lucide-react'
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

  const [mounted, setMounted] = useState(false)
  const [view, setView] = useState('landing')
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
  const [guestMode, setGuestMode] = useState(false)

  // Handle hydration - read localStorage only on client after mount
  useEffect(() => {
    setMounted(true)
    const savedGuestMode = localStorage.getItem('walletrix_guest_mode') === 'true'
    setGuestMode(savedGuestMode)
  }, [])

  useEffect(() => {
    if (mounted) {
      localStorage.setItem('walletrix_guest_mode', guestMode.toString())
    }
  }, [guestMode, mounted])

  useEffect(() => {
    if (clerkUser && wallet && isLocked) {

      unlockWallet(clerkUser.id).catch(console.error);
    }
  }, [clerkUser, wallet, isLocked]);

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

  const handleWalletCreated = async () => {
    if (isAuthenticated) {

      if (typeof window !== 'undefined' && showWalkthroughOnUnlock) {
        window.localStorage.setItem('walletrix_show_walkthrough_on_load', 'true');
      }

      if (typeof window !== 'undefined') {
        window.location.reload();
      }
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
    setSelectedAsset(asset)
    if (action === 'send') {
      setShowSendModal(true)
    } else {
      setShowReceiveModal(true)
    }
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

  if (wallet && isLocked) {
    return (
      <UnlockWallet
        onDeleteWallet={deleteWallet}
      />
    )
  }

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

                      {/* Show existing wallets if any */}
                      {(userWallets && userWallets.length > 0) || (multiSigWallets && multiSigWallets.length > 0) ? (
                        <div className="mb-6">
                          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3 text-left">Your Wallets</h3>
                          <div className="space-y-3">
                            {/* Regular Wallets */}
                            {userWallets && userWallets.map((w) => (
                              <button
                                key={w.id}
                                onClick={() => {
                                  setActiveWalletId(w.id);
                                }}
                                className="w-full p-4 bg-slate-700/50 hover:bg-slate-600/50 rounded-xl border border-slate-600/50 hover:border-blue-400/50 transition-all text-left group"
                              >
                                <div className="flex items-center gap-4">
                                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                                    <Wallet className="w-6 h-6 text-white" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-white font-medium truncate">{w.name || 'Unnamed Wallet'}</p>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                      Created {new Date(w.createdAt).toLocaleDateString()}
                                    </p>
                                  </div>
                                  <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
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
                setView('multisig');
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
    <main className="min-h-screen bg-black text-white overflow-x-hidden relative">
      {/* Animated Background - Same as Landing Page with subtle blur */}
      <div className="animated-bg" style={{ filter: 'blur(1px)' }}>
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

      <div className="container mx-auto px-4 py-8 lg:py-8 pt-24 lg:pt-8">
        {/* Desktop Header */}
        <header className="hidden lg:flex items-center justify-between mb-8 bg-slate-800/80 backdrop-blur-xl rounded-2xl px-6 py-4 border border-slate-700/50 shadow-xl relative" style={{ zIndex: 100 }}>
          <div className="flex items-center gap-5">
            {/* Back Button */}
            <button
              onClick={() => setView('welcome')}
              className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors p-2 hover:bg-slate-700/50 rounded-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                <Wallet className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Walletrix</h1>
                <p className="text-xs text-slate-400">Multi-Chain Wallet</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div data-tour="network-selector">
              <NetworkSelector />
            </div>

            {/* Desktop User Info & Controls */}
            {isAuthenticated && userWallets.length > 1 && (
              <button
                onClick={() => setShowWalletSelector(true)}
                className="p-2.5 rounded-xl bg-slate-700/50 hover:bg-slate-600/50 border border-slate-600/50 text-slate-300 hover:text-white transition-all"
                title="Switch Wallet"
              >
                <Wallet className="w-5 h-5" />
              </button>
            )}

            <div className="flex items-center gap-2">
              {/* Notification Bell */}
              <NotificationBell currentWalletId={activeWalletId} />

              {/* Lock Button */}
              <button
                data-tour="lock-button"
                onClick={() => {
                  if (lockWallet) {
                    lockWallet()
                  }
                }}
                className="group relative p-3 rounded-xl bg-gradient-to-br from-orange-500/30 via-amber-500/20 to-orange-600/30 hover:from-orange-500/50 hover:via-amber-500/30 hover:to-orange-600/50 border border-orange-400/50 hover:border-orange-300/70 text-orange-300 hover:text-orange-200 transition-all duration-300 shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40 hover:scale-110"
                title="Lock Wallet"
              >
                <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-orange-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <Lock className="w-5 h-5 relative z-10 group-hover:animate-pulse" />
              </button>

              {/* Settings Button */}
              <button
                data-tour="settings-button"
                onClick={() => setShowSettings(!showSettings)}
                className="group relative p-3 rounded-xl bg-gradient-to-br from-purple-500/30 via-blue-500/20 to-cyan-600/30 hover:from-purple-500/50 hover:via-blue-500/30 hover:to-cyan-600/50 border border-purple-400/50 hover:border-cyan-300/70 text-purple-300 hover:text-cyan-200 transition-all duration-300 shadow-lg shadow-purple-500/20 hover:shadow-cyan-500/40 hover:scale-110"
                title="Settings"
              >
                <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-cyan-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <Settings className="w-5 h-5 relative z-10 group-hover:rotate-90 transition-transform duration-500" />
              </button>

              {/* Clerk User Button - Moved to end */}
              <SignedOut>
                {/* Delete Wallet Button - Only in Guest Mode */}
                {guestMode && wallet && (
                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this wallet? This cannot be undone.')) {
                        deleteWallet()
                        setGuestMode(false)
                        setView('landing')
                      }
                    }}
                    className="group relative p-3 rounded-xl bg-gradient-to-br from-red-500/30 via-red-500/20 to-red-600/30 hover:from-red-500/50 hover:via-red-500/30 hover:to-red-600/50 border border-red-400/50 hover:border-red-300/70 text-red-300 hover:text-red-200 transition-all duration-300 shadow-lg shadow-red-500/20 hover:shadow-red-500/40 hover:scale-110"
                    title="Delete Wallet"
                  >
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-red-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <Trash2 className="w-5 h-5 relative z-10" />
                  </button>
                )}

                <SignInButton mode="modal">
                  <button className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-400 hover:to-cyan-400 text-white font-semibold rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-blue-500/25 hover:shadow-blue-400/40 hover:scale-105">
                    <User className="w-4 h-4" />
                    Sign In
                  </button>
                </SignInButton>
              </SignedOut>
              <SignedIn>
                <UserButton
                  appearance={{
                    elements: {
                      avatarBox: "w-10 h-10 ring-2 ring-blue-500/30 hover:ring-cyan-400/50 transition-all",
                      userButtonPopoverCard: "bg-slate-800 border-slate-700",
                      userButtonPopoverActionButton: "text-white hover:bg-slate-700"
                    }
                  }}
                />
              </SignedIn>
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
        <div className="max-w-4xl mx-auto mb-6 relative" style={{ zIndex: 1 }}>
          <div className="bg-slate-800/60 backdrop-blur-xl rounded-2xl p-4 border border-slate-700/50">
            <div className="grid grid-cols-2 gap-3">
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
                className="flex items-center justify-center gap-3 py-4 px-6 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white font-semibold rounded-xl transition-all hover:scale-[1.02] shadow-lg shadow-blue-500/20"
              >
                <Send className="w-5 h-5" />
                <span>Send</span>
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
                className="flex items-center justify-center gap-3 py-4 px-6 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-semibold rounded-xl transition-all hover:scale-[1.02] shadow-lg shadow-emerald-500/20"
              >
                <Download className="w-5 h-5" />
                <span>Receive</span>
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
