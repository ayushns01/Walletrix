import { Toaster } from 'react-hot-toast'
import './globals.css'

export const metadata = {
  title: 'Walletrix - Your Crypto Wallet',
  description: 'Secure cryptocurrency wallet for managing your digital assets',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster position="top-right" />
      </body>
    </html>
  )
}
