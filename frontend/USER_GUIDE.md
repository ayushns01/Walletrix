# Walletrix Frontend - User Guide

## 🎉 Frontend Complete!

The Walletrix frontend is now fully functional with a beautiful, user-friendly interface for managing your cryptocurrency wallet.

---

## 🚀 Quick Start

### 1. Start Backend Server
```powershell
cd D:\Walletrix\backend
npm start
```
Backend will run on: **http://localhost:3001**

### 2. Start Frontend Server
```powershell
cd D:\Walletrix\frontend
npm run dev
```
Frontend will run on: **http://localhost:3000** (or 3002 if 3000 is busy)

### 3. Open in Browser
Navigate to **http://localhost:3000** (or the port shown in terminal)

---

## ✨ Features

### 🔐 Wallet Management
- **Create New Wallet**: Generate a new HD wallet with 12-word recovery phrase
- **Import Wallet**: Restore wallet from existing recovery phrase
- **Password Protection**: Encrypt wallet with strong password
- **Lock/Unlock**: Secure your wallet when not in use

### 💰 Portfolio Dashboard
- **Total Balance**: See your entire portfolio value in USD
- **Multi-Asset Support**: View ETH, BTC, and popular ERC-20 tokens
- **Real-Time Prices**: Live cryptocurrency prices from CoinGecko
- **Balance Overview**: Detailed balance for each asset

### 📤 Send Transactions
- **Send ETH**: Transfer Ethereum to any address
- **Send BTC**: Transfer Bitcoin to any address  
- **Send Tokens**: Transfer ERC-20 tokens (USDT, USDC, DAI, etc.)
- **Gas Estimation**: See estimated transaction fees
- **Address Validation**: Automatic validation before sending

### 📥 Receive Funds
- **QR Codes**: Generate QR codes for easy receiving
- **Address Display**: Show your ETH and BTC addresses
- **Copy Address**: One-click copy to clipboard
- **Download QR**: Save QR code as image

### 📊 Transaction History
- **View Transactions**: See recent ETH and BTC transactions
- **Transaction Details**: View amounts, dates, and types
- **Send/Receive Indicators**: Clear visual indicators

### ⚙️ Settings
- **Lock Wallet**: Secure your wallet instantly
- **Delete Wallet**: Remove wallet (with confirmation)
- **Refresh Data**: Manual data refresh option

---

## 📱 User Interface

### Welcome Screen
- Clean, modern design
- Two main actions: Create or Import
- Clear instructions and warnings

### Create Wallet Flow
1. **Set Password**: Enter strong password (min 8 characters)
2. **View Recovery Phrase**: Display 12-word mnemonic
3. **Confirm Backup**: Checkbox confirmation required
4. **Complete**: Wallet created and ready to use

### Import Wallet Flow
1. **Enter Recovery Phrase**: Input 12 words
2. **Set Password**: Create new password for encryption
3. **Import**: Wallet restored with all addresses

### Main Dashboard
- **Header**: Logo, wallet name, settings, lock button
- **Quick Actions**: Send and Receive buttons
- **Portfolio Card**: Total value with 24h change
- **Addresses Card**: ETH and BTC addresses with copy
- **Assets List**: All coins and tokens with balances
- **Transactions**: Recent transaction history

### Send Modal
- **Asset Selection**: Auto-populated with selected asset
- **Recipient Input**: Address field with validation
- **Amount Input**: With "Max" button
- **USD Value**: Real-time conversion
- **Gas/Fee Display**: Network fee estimation
- **Password Required**: Extra security layer
- **Confirmation**: Warning before sending

### Receive Modal
- **QR Code**: Large, scannable QR code
- **Address Display**: Full address shown
- **Copy Button**: One-click copy
- **Download QR**: Save as PNG
- **Warning**: Reminder to only accept correct asset

---

## 🎨 Design Features

### Color Scheme
- **Primary**: Purple (`#9333ea`)
- **Background**: Dark gradient (gray-900 to purple-900)
- **Cards**: Translucent gray with blur effect
- **Accents**: Pink gradients for highlights

### Components
- **Rounded Corners**: Modern 2xl border radius
- **Backdrop Blur**: Glass-morphism effect
- **Smooth Transitions**: Hover and click animations
- **Responsive**: Works on all screen sizes
- **Icons**: Lucide React icon library

### User Experience
- **Toast Notifications**: Real-time feedback
- **Loading States**: Clear loading indicators
- **Error Handling**: User-friendly error messages
- **Confirmation Dialogs**: Prevent accidental actions
- **Auto-refresh**: Data updates automatically

---

## 🔧 Technical Stack

### Framework & Libraries
```json
{
  "next": "^14.0.4",              // React framework
  "react": "^18.2.0",             // UI library
  "react-dom": "^18.2.0",         // React DOM
  "tailwindcss": "^3.3.6",        // Styling
  "ethers": "^6.9.0",             // Ethereum library
  "bitcoinjs-lib": "^6.1.5",      // Bitcoin library
  "bip39": "^3.1.0",              // Mnemonic generation
  "crypto-js": "^4.2.0",          // Encryption
  "qrcode": "^1.5.3",             // QR code generation
  "axios": "^1.6.2",              // HTTP client
  "react-hot-toast": "^2.4.1",    // Notifications
  "lucide-react": "^0.294.0"      // Icons
}
```

### Project Structure
```
frontend/
├── app/
│   ├── globals.css           # Global styles
│   ├── layout.js             # Root layout with providers
│   └── page.js               # Main application page
├── components/
│   ├── CreateWallet.js       # Wallet creation flow
│   ├── ImportWallet.js       # Wallet import flow
│   ├── UnlockWallet.js       # Password unlock screen
│   ├── Dashboard.js          # Main dashboard
│   ├── SendModal.js          # Send transaction modal
│   └── ReceiveModal.js       # Receive funds modal
├── contexts/
│   └── WalletContext.js      # Global wallet state
├── lib/
│   └── api.js                # API client
├── .env.local                # Environment variables
├── jsconfig.json             # Path aliases
├── tailwind.config.js        # Tailwind configuration
├── postcss.config.js         # PostCSS configuration
└── package.json              # Dependencies
```

---

## 🔐 Security Features

### Password Encryption
- All sensitive data encrypted with AES-256
- Password never stored, only used for encryption/decryption
- Wallet locked by default after restart

### Private Key Protection
- Private keys never displayed in UI
- Keys encrypted at rest in localStorage
- Keys only decrypted when needed for transactions
- Password required for every transaction

### Address Validation
- All addresses validated before transactions
- Network-specific validation (ETH/BTC)
- Prevents sending to invalid addresses

### User Warnings
- Recovery phrase backup confirmation
- Transaction confirmation dialogs
- Irreversible action warnings
- Clear security notices

---

## 📝 Usage Guide

### Creating Your First Wallet

1. **Launch Application**
   - Open http://localhost:3000

2. **Click "Create New Wallet"**

3. **Set Strong Password**
   - Minimum 8 characters
   - Mix of letters, numbers, symbols
   - Remember this password!

4. **Save Recovery Phrase**
   - Write down all 12 words IN ORDER
   - Store in safe place (not digital!)
   - This phrase can restore your wallet

5. **Confirm and Complete**
   - Check the confirmation box
   - Click "Complete Setup"

### Sending Your First Transaction

1. **Unlock Wallet** (if locked)

2. **Click "Send" Button**

3. **Select Asset** (or use quick action)

4. **Enter Details**
   - Recipient address
   - Amount to send
   - Your password

5. **Review and Confirm**
   - Check all details carefully
   - Click "Send"

6. **Wait for Confirmation**
   - Transaction sent to network
   - View in transaction history

### Receiving Funds

1. **Click "Receive" Button**

2. **Select Asset** (ETH or BTC)

3. **Share Address**
   - Show QR code to sender
   - OR copy address
   - OR download QR image

4. **Wait for Transaction**
   - Funds will appear in dashboard
   - Transaction shows in history

---

## 🐛 Troubleshooting

### Frontend Won't Start
```powershell
# Clear node_modules and reinstall
cd D:\Walletrix\frontend
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install
npm run dev
```

### Backend Connection Failed
- Ensure backend is running on port 3001
- Check .env.local has correct API URL
- Verify no firewall blocking connections

### Wallet Won't Unlock
- Verify you're using the correct password
- If forgotten, must restore from recovery phrase
- Click "Restore from recovery phrase"

### Transaction Fails
- Ensure sufficient balance
- Check network fees
- Verify recipient address is valid
- Confirm password is correct

### Data Not Loading
- Click refresh button in dashboard
- Check backend server is running
- Verify internet connection for price data
- Check browser console for errors

---

## 🎯 Next Steps

### Recommended Enhancements

1. **Multi-Account Support**
   - Derive multiple accounts from same seed
   - Switch between accounts
   - Label accounts

2. **Token Management**
   - Add custom tokens
   - Hide zero-balance tokens
   - Token search and filter

3. **Transaction History**
   - Detailed transaction viewer
   - Export transaction history
   - Filter by date/type

4. **Price Charts**
   - Historical price charts
   - Portfolio value over time
   - Profit/loss tracking

5. **Security Enhancements**
   - Biometric authentication
   - Session timeout
   - Transaction limits

6. **Additional Features**
   - Address book
   - Transaction notes
   - Multiple currencies (EUR, GBP, etc.)
   - Dark/Light theme toggle

---

## 🎨 Customization

### Change Theme Colors
Edit `tailwind.config.js`:
```javascript
theme: {
  extend: {
    colors: {
      primary: '#your-color',
      // Add custom colors
    },
  },
}
```

### Modify API URL
Edit `.env.local`:
```
NEXT_PUBLIC_API_URL=http://your-backend-url/api/v1
```

### Add Custom Tokens
Edit `contexts/WalletContext.js` to include custom token addresses

---

## 📚 API Integration

The frontend integrates with all backend endpoints:

- ✅ Wallet generation and import
- ✅ Balance queries (ETH, BTC, Tokens)
- ✅ Transaction sending
- ✅ Price data fetching
- ✅ Address validation
- ✅ Gas/fee estimation
- ✅ Transaction history

All API calls are handled through `lib/api.js` with proper error handling and toast notifications.

---

## 🎊 Conclusion

Your Walletrix application is now **FULLY FUNCTIONAL** with:

- ✅ Beautiful, modern UI
- ✅ Complete wallet management
- ✅ Multi-asset support (ETH, BTC, Tokens)
- ✅ Send/Receive functionality
- ✅ Real-time price data
- ✅ Secure encryption
- ✅ Transaction history
- ✅ QR code generation
- ✅ Responsive design

The application is ready for use! Start managing your cryptocurrency portfolio with Walletrix.

---

**Built with ❤️ using Next.js, React, and Tailwind CSS**

**Backend:** Node.js + Express + Ethers.js + Bitcoin.js
**Frontend:** Next.js + React + Tailwind CSS
**Total:** 33 API Endpoints + Complete UI

**Ready to use! 🚀**
