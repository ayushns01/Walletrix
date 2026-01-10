'use client'

import { Toaster } from 'react-hot-toast'
import './globals.css'
import { WalletProvider } from '@/contexts/DatabaseWalletContext'
import ErrorBoundary from '@/components/ErrorBoundary'
import { ClerkProvider } from '@clerk/nextjs'

export default function RootLayout({ children }) {
  return (
    <ClerkProvider
      appearance={{
        baseTheme: 'dark',
        variables: {
          colorPrimary: '#3b82f6',
          colorBackground: '#0f172a',
          colorInputBackground: '#1e293b',
          colorInputText: '#f1f5f9',
          colorText: '#f8fafc',
          colorTextSecondary: '#93c5fd',
          colorDanger: '#f43f5e',
          colorSuccess: '#22c55e',
          colorWarning: '#eab308',
          borderRadius: '0.75rem',
          fontFamily: 'inherit',
        },
        elements: {
          rootBox: 'font-sans',
          modalBackdrop: 'backdrop-blur-lg bg-black/70',
          modalContent: 'animate-in fade-in zoom-in-95 duration-200',
          card: 'bg-gradient-to-b from-slate-800 to-slate-900 border border-blue-400/40 shadow-2xl shadow-blue-600/30 rounded-2xl',
          formButtonPrimary:
            'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 shadow-lg shadow-blue-500/40 transition-all duration-300 font-semibold text-white py-3',
          headerTitle: 'text-white font-bold text-2xl',
          headerSubtitle: 'text-slate-300 text-base',
          socialButtonsBlockButton:
            'border-2 border-slate-500 bg-slate-700/60 hover:border-blue-400 hover:bg-slate-600/80 transition-all duration-300 text-white font-medium py-3',
          socialButtonsBlockButtonText: 'font-semibold text-white text-base',
          socialButtonsProviderIcon__apple: 'brightness-0 invert',
          socialButtonsProviderIcon__google: '',
          socialButtonsIconButton:
            'border-2 border-slate-500 bg-slate-700/60 hover:border-blue-400 hover:bg-slate-600/80 transition-all duration-300',
          dividerLine: 'bg-slate-600',
          dividerText: 'text-slate-400 font-medium',
          formFieldLabel: 'text-slate-200 font-semibold mb-1',
          formFieldInput:
            'border-2 border-slate-500 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/30 bg-slate-700/80 text-white placeholder:text-slate-400 py-3 rounded-lg',
          footerActionLink: 'text-blue-400 hover:text-blue-300 font-semibold underline-offset-2',
          identityPreviewText: 'text-slate-200',
          identityPreviewEditButton: 'text-blue-400 hover:text-blue-300 font-medium',
          formFieldAction: 'text-blue-400 hover:text-blue-300 font-medium',
          alertText: 'text-slate-200',
          formFieldInputShowPasswordButton: 'text-slate-400 hover:text-blue-400',
          otpCodeFieldInput: 'border-2 border-slate-500 bg-slate-700/80 text-white text-xl font-bold',
          userButtonPopoverCard: 'bg-slate-800 border border-blue-400/30 shadow-xl',
          userButtonPopoverActionButton: 'hover:bg-blue-500/20 text-slate-200',
          userButtonPopoverActionButtonText: 'text-slate-200 font-medium',
          userButtonPopoverFooter: 'border-t border-slate-600',
          userButtonAvatarBox: 'ring-2 ring-blue-400/50',
        },
      }}
    >
      <html lang="en">
        <head>
          <title>Walletrix - Your Secure Multi-Chain Crypto Wallet</title>
          <meta name="description" content="Manage Bitcoin, Ethereum, and multiple blockchain assets with Walletrix - a secure, non-custodial cryptocurrency wallet" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
          <link rel="alternate icon" href="/favicon.ico" />
        </head>
        <body className="min-h-screen">
          <ErrorBoundary>
            <WalletProvider>
              <div className="min-h-screen relative">
                {children}
              </div>
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 4000,
                  style: {
                    background: '#1f2937',
                    color: '#fff',
                    border: '1px solid #374151',
                  },
                  success: {
                    iconTheme: {
                      primary: '#a855f7',
                      secondary: '#fff',
                    },
                  },
                  error: {
                    iconTheme: {
                      primary: '#ef4444',
                      secondary: '#fff',
                    },
                  },
                }}
              />
            </WalletProvider>
          </ErrorBoundary>
        </body>
      </html>
    </ClerkProvider>
  )
}
