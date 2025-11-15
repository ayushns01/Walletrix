'use client'

import { Toaster } from 'react-hot-toast'
import './globals.css'
import { WalletProvider } from '@/contexts/DatabaseWalletContext'
import ErrorBoundary from '@/components/ErrorBoundary'

export default function RootLayout({ children }) {
  return (
    <html lang="en">
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
  )
}
