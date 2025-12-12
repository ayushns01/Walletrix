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
          colorBackground: '#0a1628',
          colorInputBackground: '#1e293b',
          colorInputText: '#e0f2fe',
          colorText: '#e0f2fe',
          colorTextSecondary: '#93c5fd',
          colorDanger: '#ef4444',
          colorSuccess: '#10b981',
          colorWarning: '#f59e0b',
          borderRadius: '0.75rem',
        },
        elements: {
          formButtonPrimary: 
            'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 shadow-lg shadow-blue-500/30 transition-all duration-300',
          card: 'glass-effect border border-blue-500/30 shadow-2xl shadow-blue-500/20',
          headerTitle: 'gradient-text',
          headerSubtitle: 'text-blue-300',
          socialButtonsBlockButton: 
            'border-2 border-white/60 bg-white/10 hover:border-white/80 hover:bg-white/20 transition-all duration-300 text-white !important',
          socialButtonsBlockButtonText: 'font-medium text-white',
          socialButtonsProviderIcon__apple: 'brightness-0 invert',
          socialButtonsIconButton: 
            'border-2 border-white/60 bg-white/10 hover:border-white/80 hover:bg-white/20 transition-all duration-300',
          socialButtonsIconButton__apple: 
            'border-2 border-white/60 bg-white/10 hover:border-white/80 hover:bg-white/20',
          socialButtonsIconButton__microsoft: 
            'border-2 border-white/60 bg-white/10 hover:border-white/80 hover:bg-white/20',
          formFieldInput: 
            'border-blue-500/30 focus:border-blue-400/60 bg-blue-900/20 text-blue-100',
          footerActionLink: 'text-blue-400 hover:text-blue-300',
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
        <body>
          <ErrorBoundary>
            <WalletProvider>
              {children}
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
