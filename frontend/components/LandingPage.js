'use client'

import { useState, useEffect } from 'react'
import {
  Wallet, Shield, Zap, Globe, ChevronRight, Check,
  Bitcoin, Coins, Lock, Smartphone, TrendingUp, Users,
  Github, Twitter, Mail, ArrowRight, Menu, X, Loader2, Key, Linkedin
} from 'lucide-react'
import { SignInButton, UserButton, useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'

export default function LandingPage({ onGetStarted, onGuestMode }) {
  const { isSignedIn, isLoaded } = useUser()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const features = [
    {
      icon: Shield,
      title: 'Industry-Standard Security',
      description: 'Argon2id + AES-256-GCM encryption. Same standards protecting banks.'
    },
    {
      icon: Globe,
      title: 'Multi-Chain',
      description: 'Bitcoin, Ethereum, Polygon, and Solana in one unified wallet.'
    },
    {
      icon: Key,
      title: 'Social Recovery',
      description: "Shamir's Secret Sharing protects you from losing access forever."
    },
    {
      icon: Users,
      title: 'Multi-Sig Wallets',
      description: 'Require multiple signatures for high-value transactions.'
    },
    {
      icon: Lock,
      title: '100% Self-Custody',
      description: 'Your keys never leave your device. Zero trust required.'
    },
    {
      icon: Zap,
      title: 'Privacy First',
      description: 'Stealth addresses with real ECDH let you receive payments privately.'
    }
  ]

  const networks = [
    { name: 'Bitcoin', color: 'from-orange-500 to-orange-600', logo: 'https://cryptologos.cc/logos/bitcoin-btc-logo.svg' },
    { name: 'Ethereum', color: 'from-blue-500 to-blue-600', logo: 'https://cryptologos.cc/logos/ethereum-eth-logo.svg' },
    { name: 'Polygon', color: 'from-purple-500 to-purple-600', logo: 'https://cryptologos.cc/logos/polygon-matic-logo.svg' },
    { name: 'Solana', color: 'from-purple-400 to-pink-500', logo: 'https://cryptologos.cc/logos/solana-sol-logo.svg' }
  ]

  const stats = [
    { value: '4', label: 'Blockchains' },
    { value: '100%', label: 'Self-Custody' },
    { value: 'Multi-Sig', label: 'Team Wallets' },
    { value: 'Argon2id', label: 'Encryption' }
  ]

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden relative" style={{ position: 'relative', zIndex: 0 }}>
      {/* Animated Background - Deep Space */}
      <div className="animated-bg">
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

      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 transition-all duration-300 ${scrolled ? 'bg-black/80 backdrop-blur-xl border-b border-blue-500/20 shadow-lg shadow-blue-500/10' : ''
        }`} style={{ zIndex: 100 }}>
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3 group cursor-pointer">
              <div className="relative w-12 h-12">
                {/* Geometric background pattern */}
                <div className="absolute inset-0">
                  {/* Central hexagon */}
                  <div className="absolute inset-2 border-2 border-blue-400/40 rounded transform rotate-45 transition-all duration-500" />
                  <div className="absolute inset-1 border border-cyan-400/20 rounded-lg transform -rotate-45 transition-all duration-500" />
                </div>

                {/* Network nodes */}
                <div className="absolute top-0 left-1/2 w-1.5 h-1.5 bg-blue-400 rounded-full -translate-x-1/2 group-hover:bg-cyan-400 transition-colors" />
                <div className="absolute bottom-0 left-1/2 w-1.5 h-1.5 bg-blue-400 rounded-full -translate-x-1/2 group-hover:bg-cyan-400 transition-colors" />
                <div className="absolute left-0 top-1/2 w-1.5 h-1.5 bg-cyan-400 rounded-full -translate-y-1/2 group-hover:bg-blue-400 transition-colors" />
                <div className="absolute right-0 top-1/2 w-1.5 h-1.5 bg-cyan-400 rounded-full -translate-y-1/2 group-hover:bg-blue-400 transition-colors" />

                {/* Central wallet icon */}
                <div className="relative z-10 flex items-center justify-center h-full">
                  <Wallet className="w-6 h-6 text-blue-300 group-hover:text-cyan-300 transition-all duration-300 drop-shadow-[0_0_8px_rgba(96,165,250,0.5)] animate-pulse" />
                </div>

                {/* Rotating glow */}
                <div className="absolute inset-0 blur-xl bg-gradient-to-r from-blue-400/30 via-cyan-400/30 to-blue-400/30 animate-spin" style={{ animationDuration: '4s' }} />
              </div>
              <div>
                <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 via-cyan-300 to-blue-400 bg-clip-text text-transparent group-hover:tracking-wide transition-all">Walletrix</span>
                <div className="text-[10px] text-cyan-400/70 font-medium tracking-widest uppercase hidden sm:block">Multi-Chain Network Wallet</div>
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-blue-100 hover:text-blue-400 transition-colors">Features</a>
              <a href="#networks" className="text-blue-100 hover:text-blue-400 transition-colors">Networks</a>
              <a href="#security" className="text-blue-100 hover:text-blue-400 transition-colors">Security</a>
              {!isLoaded ? (
                <button
                  disabled
                  className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg font-semibold flex items-center gap-2 shadow-lg shadow-blue-500/30 opacity-60 cursor-not-allowed"
                >
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading...
                </button>
              ) : isSignedIn ? (
                <>
                  <button
                    onClick={onGetStarted}
                    className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 rounded-lg font-semibold transition-all duration-300 flex items-center gap-2 shadow-lg shadow-blue-500/30"
                  >
                    Open Wallet <ArrowRight className="w-4 h-4" />
                  </button>
                  <UserButton
                    afterSignOutUrl="/"
                    appearance={{
                      elements: {
                        userButtonAvatarBox: 'w-10 h-10 border-2 border-blue-500/50 hover:border-blue-400 transition-all',
                        userButtonPopoverCard: 'bg-slate-800/95 backdrop-blur-xl border border-blue-500/40 shadow-2xl',
                        userButtonPopoverActionButton: 'text-blue-100 hover:text-white hover:bg-blue-600/80 transition-all',
                        userButtonPopoverActionButtonText: 'text-blue-100 font-medium',
                        userButtonPopoverActionButtonIcon: 'text-blue-300',
                        userButtonPopoverFooter: 'hidden',
                      }
                    }}
                  />
                </>
              ) : (
                <SignInButton mode="modal" forceRedirectUrl="/">
                  <button className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 rounded-lg font-semibold transition-all duration-300 flex items-center gap-2 shadow-lg shadow-blue-500/30">
                    Get Started <ArrowRight className="w-4 h-4" />
                  </button>
                </SignInButton>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 hover:bg-blue-900/30 rounded-lg transition-colors"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden mt-4 pb-4 space-y-3 border-t border-blue-500/20 pt-4">
              <a href="#features" className="block py-2 text-blue-100 hover:text-blue-400 transition-colors">Features</a>
              <a href="#networks" className="block py-2 text-blue-100 hover:text-blue-400 transition-colors">Networks</a>
              <a href="#security" className="block py-2 text-blue-100 hover:text-blue-400 transition-colors">Security</a>
              {!isLoaded ? (
                <button
                  disabled
                  className="w-full px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg font-semibold flex items-center justify-center gap-2 opacity-60 cursor-not-allowed"
                >
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading...
                </button>
              ) : isSignedIn ? (
                <div className="space-y-3">
                  <button
                    onClick={onGetStarted}
                    className="w-full px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg font-semibold flex items-center justify-center gap-2"
                  >
                    Open Wallet <ArrowRight className="w-4 h-4" />
                  </button>
                  <div className="flex justify-center">
                    <UserButton
                      afterSignOutUrl="/"
                      appearance={{
                        elements: {
                          userButtonAvatarBox: 'w-10 h-10 border-2 border-blue-500/50 hover:border-blue-400 transition-all',
                          userButtonPopoverCard: 'bg-slate-800/95 backdrop-blur-xl border border-blue-500/40 shadow-2xl',
                          userButtonPopoverActionButton: 'text-blue-100 hover:text-white hover:bg-blue-600/80 transition-all',
                          userButtonPopoverActionButtonText: 'text-blue-100 font-medium',
                          userButtonPopoverActionButtonIcon: 'text-blue-300',
                          userButtonPopoverFooter: 'hidden',
                        }
                      }}
                    />
                  </div>
                </div>
              ) : (
                <SignInButton mode="modal" forceRedirectUrl="/">
                  <button className="w-full px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg font-semibold flex items-center justify-center gap-2">
                    Get Started <ArrowRight className="w-4 h-4" />
                  </button>
                </SignInButton>
              )}
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-52 pb-20 px-4 relative" style={{ zIndex: 10 }}>
        <div className="container mx-auto max-w-5xl">
          <div className="text-center animate-fade-in">

            {/* Main Title */}
            <div className="mb-8">
              <p className="text-lg md:text-xl text-blue-300/80 mb-2 font-medium tracking-wider uppercase">
                Welcome to
              </p>
              <h1 className="text-6xl md:text-8xl lg:text-9xl font-extrabold leading-tight">
                <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(59,130,246,0.5)]">
                  Walletrix
                </span>
              </h1>
            </div>

            {/* Subtitle */}
            <p className="text-lg md:text-xl text-blue-100/80 mb-12 max-w-2xl mx-auto leading-relaxed font-light">
              Your keys. Your coins. Your control. A multi-chain wallet with enterprise-grade encryption, supporting Ethereum, Bitcoin, Solana, and 7+ EVM networks.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-5 justify-center items-center">
              {!isLoaded ? (
                <button
                  disabled
                  className="px-10 py-5 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl font-bold text-lg flex items-center gap-3 shadow-2xl shadow-blue-500/40 opacity-60 cursor-not-allowed"
                >
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Loading...
                </button>
              ) : isSignedIn ? (
                <button
                  onClick={onGetStarted}
                  className="group px-10 py-5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 rounded-2xl font-bold text-lg transition-all duration-300 flex items-center gap-3 shadow-2xl shadow-blue-500/40 hover:shadow-blue-400/60 hover:scale-105 hover:-translate-y-1"
                >
                  <Wallet className="w-5 h-5" />
                  Open Your Wallet
                  <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              ) : (
                <SignInButton mode="modal" forceRedirectUrl="/">
                  <button className="group px-10 py-5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 rounded-2xl font-bold text-lg transition-all duration-300 flex items-center gap-3 shadow-2xl shadow-blue-500/40 hover:shadow-blue-400/60 hover:scale-105 hover:-translate-y-1">
                    <Zap className="w-5 h-5" />
                    Sign In & Create Wallet
                    <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                </SignInButton>
              )}

              <a
                href="#features"
                className="group px-10 py-5 bg-white/5 hover:bg-white/10 border-2 border-blue-400/30 hover:border-blue-400/60 rounded-2xl font-bold text-lg transition-all duration-300 flex items-center gap-2 hover:scale-105"
              >
                Explore Features
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </a>
            </div>

            {/* Continue without login - Only show when NOT signed in */}
            {!isSignedIn && (
              <button
                onClick={onGuestMode}
                className="mt-8 px-10 py-5 bg-gradient-to-r from-purple-600/20 to-pink-600/20 hover:from-purple-600/40 hover:to-pink-600/40 border-2 border-purple-400/50 hover:border-purple-400/80 rounded-2xl font-bold text-lg text-purple-200 hover:text-white transition-all duration-300 flex items-center gap-3 mx-auto group shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 hover:scale-105"
              >
                <Globe className="w-5 h-5 text-purple-300 group-hover:text-white" />
                <span>Try Without Account</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="gradient-text">Why Choose Walletrix?</span>
            </h2>
            <p className="text-blue-100/70 text-lg max-w-2xl mx-auto">
              Advanced cryptography meets intuitive design
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => {
              const colors = [
                'from-purple-500 to-pink-600',
                'from-blue-500 to-cyan-600',
                'from-green-500 to-emerald-600',
                'from-orange-500 to-red-600',
                'from-indigo-500 to-purple-600',
                'from-cyan-500 to-blue-600'
              ];
              return (
                <div
                  key={i}
                  className="group glass-effect rounded-2xl p-6 border border-blue-500/20 hover:border-blue-400/40 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-blue-500/10 animate-fade-in"
                  style={{ animationDelay: `${i * 0.1}s` }}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colors[i]} flex items-center justify-center flex-shrink-0`}>
                      <feature.icon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold mb-2 text-white">{feature.title}</h3>
                      <p className="text-blue-200/70 text-sm leading-relaxed">{feature.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Networks Section */}
      <section id="networks" className="py-20 px-4 bg-black/20">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="gradient-text">Multi-Chain Compatible</span>
            </h2>
            <p className="text-blue-100/70 text-lg max-w-2xl mx-auto">
              Access multiple blockchain networks from a single, unified interface
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
            {networks.map((network, i) => (
              <div
                key={i}
                className="group glass-effect rounded-xl p-6 border border-blue-500/20 hover:border-blue-400/40 transition-all duration-300 hover:scale-110 hover:-translate-y-2 text-center animate-fade-in"
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                <div className="w-16 h-16 mx-auto mb-3 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <img
                    src={network.logo}
                    alt={`${network.name} logo`}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="text-blue-100 font-semibold text-sm">{network.name}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section id="security" className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="gradient-text">Advanced Security</span>
            </h2>
            <p className="text-blue-100/70 text-lg max-w-2xl mx-auto">
              Your keys never leave your device. Protected by cryptographic standards used by Fortune 500 companies.
            </p>
          </div>

          {/* Hero Security Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
            {[
              { value: '256-bit', label: 'AES-GCM Encryption', sublabel: 'Authenticated encryption' },
              { value: '600K', label: 'PBKDF2 Iterations', sublabel: 'OWASP 2024 standard' },
              { value: '64 MB', label: 'Argon2id Memory', sublabel: 'GPU-resistant' },
              { value: '100%', label: 'Non-Custodial', sublabel: 'Your keys only' }
            ].map((stat, i) => (
              <div
                key={i}
                className="glass-effect rounded-xl p-6 border border-blue-500/20 hover:border-green-400/50 transition-all duration-300 hover:scale-105 text-center group animate-scale-in"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className="text-3xl font-bold text-green-400 mb-1">{stat.value}</div>
                <div className="text-blue-100 text-sm font-medium">{stat.label}</div>
                <div className="text-blue-300/50 text-xs mt-1">{stat.sublabel}</div>
              </div>
            ))}
          </div>

          {/* 4 Core Security Features */}
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            {/* Argon2id */}
            <div className="glass-effect rounded-2xl p-8 border border-blue-500/20 hover:border-blue-400/40 transition-all duration-300 hover:scale-[1.02] group">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                  <Shield className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Argon2id Password Hashing</h3>
                  <span className="text-xs text-green-400 font-medium">🏆 Password Hashing Competition Winner</span>
                </div>
              </div>
              <p className="text-blue-200/80 text-sm leading-relaxed">
                The same algorithm protecting government systems. 64MB memory cost makes GPU/ASIC brute-force attacks economically infeasible.
              </p>
            </div>

            {/* Shamir Secret Sharing */}
            <div className="glass-effect rounded-2xl p-8 border border-blue-500/20 hover:border-blue-400/40 transition-all duration-300 hover:scale-[1.02] group">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
                  <Key className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Shamir's Secret Sharing</h3>
                  <span className="text-xs text-cyan-400 font-medium">Social Recovery System</span>
                </div>
              </div>
              <p className="text-blue-200/80 text-sm leading-relaxed">
                Split your seed phrase into 5 parts, need any 3 to recover. Even if 2 guardians are compromised, your funds stay safe.
              </p>
            </div>

            {/* Privacy Commitments */}
            <div className="glass-effect rounded-2xl p-8 border border-blue-500/20 hover:border-blue-400/40 transition-all duration-300 hover:scale-[1.02] group">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                  <Lock className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Stealth Addresses</h3>
                  <span className="text-xs text-emerald-400 font-medium">ECDH on secp256k1</span>
                </div>
              </div>
              <p className="text-blue-200/80 text-sm leading-relaxed">
                Receive payments to one-time addresses. Real elliptic curve cryptography ensures each payment goes to a unique, unlinkable address.
              </p>
            </div>

            {/* Multi-Signature */}
            <div className="glass-effect rounded-2xl p-8 border border-blue-500/20 hover:border-blue-400/40 transition-all duration-300 hover:scale-[1.02] group">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                  <Users className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Multi-Signature Wallets</h3>
                  <span className="text-xs text-orange-400 font-medium">Bitcoin P2WSH + Ethereum Gnosis Safe</span>
                </div>
              </div>
              <p className="text-blue-200/80 text-sm leading-relaxed">
                Require 2-of-3 or 3-of-5 signatures for transactions. Enterprise-grade security for teams and high-value accounts.
              </p>
            </div>
          </div>

          {/* Trust Badge */}
          <div className="text-center">
            <div className="inline-flex flex-wrap items-center justify-center gap-4 md:gap-6 glass-effect rounded-2xl px-6 md:px-8 py-5 border border-green-500/30 hover:border-green-400/50 transition-all duration-300 group">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-green-400 font-medium text-sm">12 Rate Limiters</span>
              </div>
              <div className="hidden md:block w-px h-5 bg-blue-500/30" />
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-green-400 font-medium text-sm">15+ Security Headers</span>
              </div>
              <div className="hidden md:block w-px h-5 bg-blue-500/30" />
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-green-400 font-medium text-sm">2FA + Session Control</span>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <div className="glass-effect rounded-3xl p-12 border border-blue-500/20 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10" />
            <div className="relative z-10">
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                <span className="gradient-text">Ready to Get Started?</span>
              </h2>
              <p className="text-blue-100/70 text-lg mb-10 max-w-2xl mx-auto">
                Join thousands of users managing their crypto securely with Walletrix
              </p>

              {!isLoaded ? (
                <button
                  disabled
                  className="group px-10 py-5 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl font-bold text-xl flex items-center gap-3 mx-auto shadow-2xl shadow-blue-500/50 opacity-60 cursor-not-allowed"
                >
                  <Loader2 className="w-6 h-6 animate-spin" />
                  Loading...
                </button>
              ) : isSignedIn ? (
                <button
                  onClick={onGetStarted}
                  className="group px-10 py-5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 rounded-xl font-bold text-xl transition-all duration-300 flex items-center gap-3 mx-auto shadow-2xl shadow-blue-500/50 hover:scale-105"
                >
                  Open Your Wallet Now
                  <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
                </button>
              ) : (
                <SignInButton mode="modal" forceRedirectUrl="/">
                  <button className="group px-10 py-5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 rounded-xl font-bold text-xl transition-all duration-300 flex items-center gap-3 mx-auto shadow-2xl shadow-blue-500/50 hover:scale-105">
                    Create Your Wallet Now
                    <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
                  </button>
                </SignInButton>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-blue-500/20">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <Wallet className="w-8 h-8 text-blue-400" />
                <span className="text-xl font-bold gradient-text">Walletrix</span>
              </div>
              <p className="text-blue-200/70 text-sm">
                Your secure gateway to decentralized finance
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4 text-blue-100">Product</h4>
              <ul className="space-y-2 text-sm text-blue-200/70">
                <li><a href="#features" className="hover:text-blue-400 transition-colors">Features</a></li>
                <li><a href="#networks" className="hover:text-blue-400 transition-colors">Networks</a></li>
                <li><a href="#security" className="hover:text-blue-400 transition-colors">Security</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4 text-blue-100">Resources</h4>
              <ul className="space-y-2 text-sm text-blue-200/70">
                <li><a href="#" className="hover:text-blue-400 transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-blue-400 transition-colors">API</a></li>
                <li><a href="#" className="hover:text-blue-400 transition-colors">Support</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4 text-blue-100">Connect</h4>
              <div className="flex gap-4">
                <a href="https://github.com/ayushns01" target="_blank" rel="noopener noreferrer" className="w-10 h-10 glass-effect rounded-full flex items-center justify-center border border-blue-500/20 hover:border-blue-400/40 hover:scale-110 transition-all">
                  <Github className="w-5 h-5 text-blue-400" />
                </a>
                <a href="https://www.linkedin.com/in/ayush-n-a6a89a19a/" target="_blank" rel="noopener noreferrer" className="w-10 h-10 glass-effect rounded-full flex items-center justify-center border border-blue-500/20 hover:border-blue-400/40 hover:scale-110 transition-all">
                  <Linkedin className="w-5 h-5 text-blue-400" />
                </a>
                <a href="mailto:ayushnarayansharma@gmail.com" className="w-10 h-10 glass-effect rounded-full flex items-center justify-center border border-blue-500/20 hover:border-blue-400/40 hover:scale-110 transition-all">
                  <Mail className="w-5 h-5 text-blue-400" />
                </a>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-blue-500/20 text-center text-sm text-blue-200/70">
            <p>&copy; 2025 Walletrix. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
