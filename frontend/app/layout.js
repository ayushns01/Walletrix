'use client'

import { Toaster } from 'react-hot-toast'
import { Space_Grotesk, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { WalletProvider } from '@/contexts/DatabaseWalletContext'
import ErrorBoundary from '@/components/ErrorBoundary'
import { ClerkProvider } from '@clerk/nextjs'

const displayFont = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-display',
  display: 'swap',
})

const monoFont = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
  display: 'swap',
})

export default function RootLayout({ children }) {
  return (
    <ClerkProvider
      appearance={{
        baseTheme: 'dark',
        variables: {
          colorPrimary: '#67d1ef',
          colorBackground: '#04050a',
          colorInputBackground: 'rgba(8, 11, 19, 0.72)',
          colorInputText: '#edf2fb',
          colorText: '#edf2fb',
          colorTextSecondary: '#76829a',
          colorDanger: '#fb7185',
          colorSuccess: '#34d399',
          colorWarning: '#fbbf24',
          borderRadius: '0.75rem',
          fontFamily: 'inherit',
        },
        elements: {
          rootBox: 'font-sans',
          modalBackdrop: 'backdrop-blur-lg bg-black/70',
          modalContent: 'animate-in fade-in zoom-in-95 duration-200',
          card: 'bg-wx-surface border border-wx-line shadow-wx-panel rounded-wx',
          formButtonPrimary:
            'bg-wx-accent hover:shadow-wx-glow-lg text-wx-bg shadow-wx-glow transition-all duration-300 font-semibold py-3 rounded-full',
          headerTitle: 'text-wx-ink font-bold text-2xl',
          headerSubtitle: 'text-wx-dim text-base',
          socialButtonsBlockButton:
            'border border-wx-line-strong bg-wx-surface hover:border-wx-accent hover:bg-wx-accent-soft transition-all duration-300 text-wx-ink font-medium py-3',
          socialButtonsBlockButtonText: 'font-semibold text-wx-ink text-base',
          socialButtonsProviderIcon__apple: 'brightness-0 invert',
          socialButtonsProviderIcon__google: '',
          socialButtonsIconButton:
            'border border-wx-line-strong bg-wx-surface hover:border-wx-accent hover:bg-wx-accent-soft transition-all duration-300',
          dividerLine: 'bg-wx-line',
          dividerText: 'text-wx-dim font-medium',
          formFieldLabel: 'text-wx-ink font-semibold mb-1',
          formFieldInput:
            'border border-wx-line-strong focus:border-wx-accent focus:ring-2 focus:ring-wx-accent bg-wx-surface text-wx-ink placeholder:text-wx-dim py-3 rounded-wx-sm',
          footerActionLink: 'text-wx-accent hover:text-wx-ink font-semibold underline-offset-2',
          identityPreviewText: 'text-wx-ink',
          identityPreviewEditButton: 'text-wx-accent hover:text-wx-ink font-medium',
          formFieldAction: 'text-wx-accent hover:text-wx-ink font-medium',
          alertText: 'text-wx-ink',
          formFieldInputShowPasswordButton: 'text-wx-dim hover:text-wx-accent',
          otpCodeFieldInput: 'border border-wx-line-strong bg-wx-surface text-wx-ink text-xl font-bold',
          userButtonPopoverCard: 'bg-wx-surface border border-wx-line shadow-xl',
          userButtonPopoverActionButton: 'hover:bg-wx-accent-soft text-wx-ink',
          userButtonPopoverActionButtonText: 'text-wx-ink font-medium',
          userButtonPopoverFooter: 'border-t border-wx-line',
          userButtonAvatarBox: 'ring-2 ring-wx-accent',
        },
      }}
    >
      <html lang="en" className={`${displayFont.variable} ${monoFont.variable}`}>
        <head>
          <title>Walletrix - Your Secure Multi-Chain Crypto Wallet</title>
          <meta name="description" content="Manage Bitcoin, Ethereum, and multiple blockchain assets with Walletrix - a secure, non-custodial cryptocurrency wallet" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
          <link rel="alternate icon" href="/favicon.ico" />
        </head>
        <body className="min-h-screen font-sans">
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
                    background: 'rgba(8, 11, 19, 0.92)',
                    color: '#edf2fb',
                    border: '1px solid rgba(150, 175, 225, 0.26)',
                  },
                  success: {
                    iconTheme: {
                      primary: '#34d399',
                      secondary: '#04050a',
                    },
                  },
                  error: {
                    iconTheme: {
                      primary: '#fb7185',
                      secondary: '#04050a',
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
