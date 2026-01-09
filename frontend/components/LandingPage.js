'use client'

import { useState, useEffect } from 'react'
import {
  Wallet, Shield, Zap, Globe, ChevronRight, Check,
  Bitcoin, Coins, Lock, Smartphone, TrendingUp, Users,
  Github, Twitter, Mail, ArrowRight, Menu, X, Loader2, Key
} from 'lucide-react'
import { SignInButton, UserButton, useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'

export default function LandingPage({ onGetStarted }) {
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
      title: 'Advanced Security',
      description: 'Your keys, your crypto. Full control with industry-leading encryption standards.'
    },
    {
      icon: Zap,
      title: 'Lightning Fast',
      description: 'Instant transactions and real-time balance updates across all networks.'
    },
    {
      icon: Globe,
      title: 'Multi-Chain Support',
      description: 'Bitcoin, Ethereum, Polygon, BSC, and more. One wallet for all your assets.'
    },
    {
      icon: Smartphone,
      title: 'Mobile Optimized',
      description: 'Seamless experience across desktop, tablet, and mobile devices.'
    },
    {
      icon: TrendingUp,
      title: 'Live Market Data',
      description: 'Real-time price tracking and portfolio analytics at your fingertips.'
    },
    {
      icon: Lock,
      title: 'Self-Custody',
      description: 'Non-custodial design means you always maintain complete control.'
    }
  ]

  const networks = [
    { name: 'Bitcoin', color: 'from-orange-500 to-orange-600', logo: 'https://cryptologos.cc/logos/bitcoin-btc-logo.svg' },
    { name: 'Ethereum', color: 'from-blue-500 to-blue-600', logo: 'https://cryptologos.cc/logos/ethereum-eth-logo.svg' },
    { name: 'Solana', color: 'from-purple-400 to-pink-500', logo: 'https://cryptologos.cc/logos/solana-sol-logo.svg' },
    { name: 'Polygon', color: 'from-purple-500 to-purple-600', logo: 'https://cryptologos.cc/logos/polygon-matic-logo.svg' },
    { name: 'Arbitrum', color: 'from-cyan-500 to-cyan-600', logo: 'https://cryptologos.cc/logos/arbitrum-arb-logo.svg' },
    { name: 'Avalanche', color: 'from-red-500 to-red-600', logo: 'https://cryptologos.cc/logos/avalanche-avax-logo.svg' }
  ]

  const stats = [
    { value: '10+', label: 'Networks Supported' },
    { value: '100%', label: 'Self-Custody' },
    { value: '<1s', label: 'Transaction Speed' },
    { value: '24/7', label: 'Access Anytime' }
  ]

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden relative" style={{ position: 'relative', zIndex: 0 }}>
      {/* Animated Background - Deep Space */}
      <div className="animated-bg">
        {/* Distant Stars Layer */}
        <div className="stars">
          {[...Array(150)].map((_, i) => {
            const duration = 40 + (i * 0.33) % 50;
            const delay = -(i * 0.27) % 40;
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
            const duration = 30 + (i * 0.97) % 40;
            const delay = -(i * 0.73) % 30;
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
                  <div className="absolute inset-2 border-2 border-blue-400/40 rounded transform rotate-45 group-hover:rotate-[50deg] transition-all duration-500" />
                  <div className="absolute inset-1 border border-cyan-400/20 rounded-lg transform -rotate-45 group-hover:-rotate-[50deg] transition-all duration-500" />
                </div>

                {/* Network nodes */}
                <div className="absolute top-0 left-1/2 w-1.5 h-1.5 bg-blue-400 rounded-full -translate-x-1/2 group-hover:bg-cyan-400 transition-colors" />
                <div className="absolute bottom-0 left-1/2 w-1.5 h-1.5 bg-blue-400 rounded-full -translate-x-1/2 group-hover:bg-cyan-400 transition-colors" />
                <div className="absolute left-0 top-1/2 w-1.5 h-1.5 bg-cyan-400 rounded-full -translate-y-1/2 group-hover:bg-blue-400 transition-colors" />
                <div className="absolute right-0 top-1/2 w-1.5 h-1.5 bg-cyan-400 rounded-full -translate-y-1/2 group-hover:bg-blue-400 transition-colors" />

                {/* Central wallet icon */}
                <div className="relative z-10 flex items-center justify-center h-full">
                  <Wallet className="w-6 h-6 text-blue-300 group-hover:text-cyan-300 transition-all duration-300 drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]" />
                </div>

                {/* Rotating glow */}
                <div className="absolute inset-0 blur-xl bg-gradient-to-r from-blue-400/20 via-cyan-400/20 to-blue-400/20 animate-spin" style={{ animationDuration: '8s' }} />
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
      <section className="pt-32 pb-20 px-4 relative" style={{ zIndex: 10 }}>
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16 animate-fade-in">
            <div className="inline-block mb-6 px-4 py-2 bg-blue-500/10 border border-blue-500/30 rounded-full hover-lift">
              <span className="text-blue-300 text-sm font-medium">🚀 Secure. Simple. Powerful.</span>
            </div>

            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight slide-in-left">
              <span className="gradient-text">Your Gateway to</span>
              <br />
              <span className="text-white">Decentralized Finance</span>
            </h1>

            <p className="text-xl text-blue-100/70 mb-10 max-w-2xl mx-auto leading-relaxed slide-in-right" style={{ animationDelay: '0.2s' }}>
              Manage your crypto assets with confidence. Walletrix provides enterprise-grade security
              with an intuitive interface designed for everyone.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16 animate-scale-in" style={{ animationDelay: '0.4s' }}>
              {!isLoaded ? (
                <button
                  disabled
                  className="group px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl font-bold text-lg flex items-center gap-3 shadow-2xl shadow-blue-500/50 opacity-60 cursor-not-allowed"
                >
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Loading...
                </button>
              ) : isSignedIn ? (
                <button
                  onClick={onGetStarted}
                  className="group px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 rounded-xl font-bold text-lg transition-all duration-300 flex items-center gap-3 shadow-2xl shadow-blue-500/50 hover:scale-105 hover:-translate-y-1"
                >
                  Open Your Wallet
                  <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              ) : (
                <SignInButton mode="modal" forceRedirectUrl="/">
                  <button className="group px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 rounded-xl font-bold text-lg transition-all duration-300 flex items-center gap-3 shadow-2xl shadow-blue-500/50 hover:scale-105 hover:-translate-y-1">
                    Create Free Wallet
                    <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                </SignInButton>
              )}

              <a
                href="#features"
                className="px-8 py-4 bg-white/5 hover:bg-white/10 border border-blue-500/30 hover:border-blue-400/50 rounded-xl font-bold text-lg transition-all duration-300"
              >
                Learn More
              </a>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
              {stats.map((stat, i) => (
                <div key={i} className="glass-effect rounded-xl p-6 border border-blue-500/20 hover:border-blue-400/40 transition-all duration-300 hover:scale-110 hover:-translate-y-2 animate-fade-in hover-lift" style={{ animationDelay: `${0.6 + i * 0.1}s` }}>
                  <div className="text-3xl md:text-4xl font-bold gradient-text mb-2">{stat.value}</div>
                  <div className="text-blue-200/70 text-sm">{stat.label}</div>
                </div>
              ))}
            </div>
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
              Built with cutting-edge technology and designed for the modern crypto user
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <div
                key={i}
                className="group glass-effect rounded-2xl p-8 border border-blue-500/20 hover:border-blue-400/40 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/20 card-hover animate-scale-in"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className="mb-6 relative inline-block">
                  <feature.icon className="w-12 h-12 text-blue-400 group-hover:text-blue-300 transition-all duration-300 group-hover:scale-110 group-hover:rotate-6" />
                  <div className="absolute inset-0 blur-xl bg-blue-400/20 group-hover:bg-blue-400/40 transition-all" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-blue-50">{feature.title}</h3>
                <p className="text-blue-200/70 leading-relaxed">{feature.description}</p>
              </div>
            ))}
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

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
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
              { value: '256-bit', label: 'AES-GCM Encryption', sublabel: 'Military-grade' },
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

            {/* Zero-Knowledge Proofs */}
            <div className="glass-effect rounded-2xl p-8 border border-blue-500/20 hover:border-blue-400/40 transition-all duration-300 hover:scale-[1.02] group">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                  <Lock className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Zero-Knowledge Proofs</h3>
                  <span className="text-xs text-emerald-400 font-medium">Groth16 zk-SNARKs</span>
                </div>
              </div>
              <p className="text-blue-200/80 text-sm leading-relaxed">
                Prove you have sufficient balance without revealing the amount. Privacy-preserving cryptography for the modern age.
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
                <a href="#" className="w-10 h-10 glass-effect rounded-full flex items-center justify-center border border-blue-500/20 hover:border-blue-400/40 transition-all">
                  <Github className="w-5 h-5 text-blue-400" />
                </a>
                <a href="#" className="w-10 h-10 glass-effect rounded-full flex items-center justify-center border border-blue-500/20 hover:border-blue-400/40 transition-all">
                  <Twitter className="w-5 h-5 text-blue-400" />
                </a>
                <a href="#" className="w-10 h-10 glass-effect rounded-full flex items-center justify-center border border-blue-500/20 hover:border-blue-400/40 transition-all">
                  <Mail className="w-5 h-5 text-blue-400" />
                </a>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-blue-500/20 text-center text-sm text-blue-200/70">
            <p>&copy; 2025 Walletrix. All rights reserved. Built with ❤️ for the crypto community.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
