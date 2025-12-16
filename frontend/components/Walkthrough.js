'use client'

import { useState, useEffect } from 'react'
import { X, ArrowRight, ArrowLeft, Sparkles, Wallet, Send, Download, RefreshCw, Settings, Lock, Network } from 'lucide-react'

export default function Walkthrough({ isOpen, onClose }) {
  const [currentStep, setCurrentStep] = useState(0)

  const steps = [
    {
      title: "Welcome to Walletrix! 🎉",
      description: "Your multi-chain crypto wallet is ready! Let's take a quick tour to help you get started.",
      icon: Sparkles,
      highlight: null,
      position: "center"
    },
    {
      title: "Your Wallet Address",
      description: "This is your unique wallet address. Click on it to copy and share it with others to receive crypto. Each network has its own address.",
      icon: Wallet,
      highlight: "wallet-address",
      position: "top"
    },
    {
      title: "Network Selector",
      description: "Switch between different blockchain networks (Ethereum, Bitcoin, Solana, Polygon). Your wallet supports multiple chains!",
      icon: Network,
      highlight: "network-selector",
      position: "top"
    },
    {
      title: "Your Balance & Portfolio",
      description: "See your total portfolio value here. It automatically calculates the value of all your assets across different networks.",
      icon: Wallet,
      highlight: "portfolio",
      position: "top"
    },
    {
      title: "Send Crypto",
      description: "Click here to send cryptocurrency to other addresses. Always double-check the recipient address before sending!",
      icon: Send,
      highlight: "send-button",
      position: "bottom"
    },
    {
      title: "Receive Crypto",
      description: "Click here to view your QR code and address to receive crypto from others. Share this with anyone who wants to send you funds.",
      icon: Download,
      highlight: "receive-button",
      position: "bottom"
    },
    {
      title: "Refresh Data",
      description: "Click here to manually refresh your balance and transaction data. This is useful after making transactions.",
      icon: RefreshCw,
      highlight: "refresh-button",
      position: "bottom"
    },
    {
      title: "Auto-Lock Security",
      description: "Your wallet will automatically lock after 30 seconds of inactivity for security. You can change this in Settings. Click the lock icon anytime to manually lock your wallet.",
      icon: Lock,
      highlight: "lock-button",
      position: "top"
    },
    {
      title: "Settings",
      description: "Access wallet settings, security options, export your wallet backup, and manage your account here.",
      icon: Settings,
      highlight: "settings-button",
      position: "top"
    },
    {
      title: "Important Security Tips! 🔐",
      description: "• Never share your recovery phrase or password with anyone\n• Always verify recipient addresses before sending\n• Enable auto-lock in Settings\n• Backup your recovery phrase in a safe place\n• Use strong, unique passwords",
      icon: Lock,
      highlight: null,
      position: "center"
    },
    {
      title: "You're All Set! 🚀",
      description: "You're ready to use Walletrix! Start by receiving some crypto or exploring the different networks. Need help? Check Settings > About & Support.",
      icon: Sparkles,
      highlight: null,
      position: "center"
    }
  ]

  const currentStepData = steps[currentStep]

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      handleComplete()
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleComplete = () => {
    // Mark as shown for this session
    sessionStorage.setItem('walletrix_walkthrough_shown', 'true')
    onClose()
  }

  const handleSkip = () => {
    // Mark as shown for this session
    sessionStorage.setItem('walletrix_walkthrough_shown', 'true')
    onClose()
  }

  useEffect(() => {
    if (isOpen && currentStepData.highlight) {
      const element = document.querySelector(`[data-tour="${currentStepData.highlight}"]`)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
        element.classList.add('tour-highlight')
        
        // Update spotlight position
        const updateSpotlight = () => {
          const rect = element.getBoundingClientRect()
          const x = ((rect.left + rect.width / 2) / window.innerWidth) * 100
          const y = ((rect.top + rect.height / 2) / window.innerHeight) * 100
          document.documentElement.style.setProperty('--spotlight-x', `${x}%`)
          document.documentElement.style.setProperty('--spotlight-y', `${y}%`)
        }
        
        updateSpotlight()
        window.addEventListener('resize', updateSpotlight)
        window.addEventListener('scroll', updateSpotlight)
        
        return () => {
          element.classList.remove('tour-highlight')
          window.removeEventListener('resize', updateSpotlight)
          window.removeEventListener('scroll', updateSpotlight)
        }
      }
    }
  }, [currentStep, isOpen, currentStepData.highlight])

  if (!isOpen) return null

  const Icon = currentStepData.icon

  return (
    <>
      {/* Overlay - Very light, mostly transparent to see highlighted elements clearly */}
      <div className="fixed inset-0 bg-black/30" style={{ zIndex: 9996 }} />
      
      {/* Walkthrough Modal - Positioned to not cover highlighted elements */}
      <div 
        className={`fixed ${
          currentStepData.position === 'center' 
            ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2' 
            : currentStepData.position === 'top'
            ? 'bottom-4 left-1/2 -translate-x-1/2'     // At bottom when highlighting top elements
            : 'bottom-4 left-1/2 -translate-x-1/2'     // Also at bottom when highlighting bottom elements (like send/receive)
        } w-full max-w-md px-4 animate-scale-in`}
        style={{ zIndex: 10000 }}
      >
        <div className="glass-effect rounded-2xl p-4 border border-blue-500/40 shadow-2xl shadow-blue-500/30 backdrop-blur-xl bg-gray-900/95">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500/30 to-purple-600/30 rounded-lg flex items-center justify-center border border-blue-500/40">
                <Icon className="w-5 h-5 text-blue-300" />
              </div>
              <div>
                <h3 className="text-base font-bold text-blue-100">{currentStepData.title}</h3>
                <p className="text-xs text-blue-400">Step {currentStep + 1} of {steps.length}</p>
              </div>
            </div>
            <button
              onClick={handleSkip}
              className="p-1.5 hover:bg-red-500/20 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-blue-300" />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-1.5 bg-blue-900/40 rounded-full mb-4 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300 rounded-full"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
          </div>

          {/* Content */}
          <div className="mb-4">
            <p className="text-blue-200 text-sm whitespace-pre-line leading-relaxed">
              {currentStepData.description}
            </p>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all text-sm ${
                currentStep === 0
                  ? 'opacity-50 cursor-not-allowed bg-gray-700'
                  : 'bg-blue-900/30 hover:bg-blue-800/40 text-blue-100'
              }`}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </button>

            <div className="flex gap-1.5">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${
                    index === currentStep
                      ? 'bg-blue-400 w-4'
                      : index < currentStep
                      ? 'bg-blue-500'
                      : 'bg-blue-900'
                  }`}
                />
              ))}
            </div>

            <button
              onClick={handleNext}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold rounded-lg transition-all text-sm"
            >
              {currentStep === steps.length - 1 ? 'Done' : 'Next'}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Skip Button */}
          {currentStep < steps.length - 1 && (
            <button
              onClick={handleSkip}
              className="w-full mt-3 text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              Skip tutorial
            </button>
          )}
        </div>
      </div>

      {/* Highlight Spotlight Effect */}
      {currentStepData.highlight && (
        <>
          <style jsx global>{`
            [data-tour="${currentStepData.highlight}"] {
              position: relative !important;
              z-index: 9998 !important;
              animation: pulse-highlight 2s ease-in-out infinite;
              border-radius: 12px;
              backdrop-filter: brightness(2.2) contrast(1.4) saturate(1.3) !important;
              transform: scale(1.02) !important;
              transition: transform 0.3s ease !important;
            }
            
            [data-tour="${currentStepData.highlight}"]::before {
              content: '';
              position: absolute;
              inset: -12px;
              border: 4px solid rgb(59, 130, 246);
              border-radius: 20px;
              pointer-events: none;
              animation: border-glow 2s ease-in-out infinite;
              z-index: 9999;
              box-shadow: 0 0 30px rgba(59, 130, 246, 0.8),
                         inset 0 0 20px rgba(59, 130, 246, 0.3);
            }
            
            [data-tour="${currentStepData.highlight}"]::after {
              content: '';
              position: absolute;
              inset: -30px;
              background: radial-gradient(ellipse at center, rgba(59, 130, 246, 0.5) 0%, rgba(59, 130, 246, 0.3) 40%, rgba(59, 130, 246, 0.15) 70%, transparent 100%);
              border-radius: 18px;
              pointer-events: none;
              z-index: -1;
              animation: glow-pulse 2s ease-in-out infinite;
            }
            
            @keyframes pulse-highlight {
              0%, 100% {
                box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.9),
                           0 0 40px rgba(59, 130, 246, 0.7),
                           0 0 60px rgba(96, 165, 250, 0.5),
                           inset 0 0 30px rgba(59, 130, 246, 0.3);
              }
              50% {
                box-shadow: 0 0 0 20px rgba(59, 130, 246, 0),
                           0 0 60px rgba(59, 130, 246, 1),
                           0 0 80px rgba(96, 165, 250, 0.8),
                           inset 0 0 40px rgba(59, 130, 246, 0.5);
              }
            }
            
            @keyframes border-glow {
              0%, 100% {
                opacity: 1;
                filter: drop-shadow(0 0 12px rgba(59, 130, 246, 1)) 
                       drop-shadow(0 0 20px rgba(96, 165, 250, 0.8));
              }
              50% {
                opacity: 0.8;
                filter: drop-shadow(0 0 20px rgba(59, 130, 246, 1.5)) 
                       drop-shadow(0 0 30px rgba(96, 165, 250, 1));
              }
            }
            
            @keyframes glow-pulse {
              0%, 100% {
                opacity: 0.6;
                transform: scale(1);
              }
              50% {
                opacity: 1;
                transform: scale(1.1);
              }
            }
          `}</style>
          
          {/* Spotlight mask - larger bright area to cover entire component evenly */}
          <div 
            className="fixed inset-0 pointer-events-none"
            style={{ 
              zIndex: 9997,
              background: 'radial-gradient(circle at var(--spotlight-x, 50%) var(--spotlight-y, 50%), transparent 350px, rgba(0, 0, 0, 0.7) 600px, rgba(0, 0, 0, 0.85) 800px)'
            }}
          />
          
          {/* Animated pointer - subtle and non-intrusive */}
          <div 
            className="fixed pointer-events-none"
            style={{
              zIndex: 9999,
              left: 'var(--spotlight-x, 50%)',
              top: 'calc(var(--spotlight-y, 50%) - 80px)',
              transform: 'translate(-50%, 0)',
            }}
          >
            <div className="animate-bounce opacity-70">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-blue-400 drop-shadow-lg">
                <path d="M12 5L12 19M12 19L7 14M12 19L17 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
        </>
      )}
    </>
  )
}
