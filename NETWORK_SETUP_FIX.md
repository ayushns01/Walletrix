# Network Support - Quick Setup Guide

## Issue Fixed
The application was getting 400 errors when fetching data because:
1. Backend `.env` file was missing RPC endpoints
2. Parameter name mismatch in tokenController
3. Frontend wasn't handling errors gracefully

## Changes Made

### Backend Changes
1. ✅ Created `.env` file with RPC endpoints
2. ✅ Fixed tokenController parameter name (`walletAddress` → `address`)
3. ✅ Added `.env.example` for reference

### Frontend Changes
1. ✅ Added better error handling in WalletContext
2. ✅ Gracefully handle missing data (set to empty arrays/objects)
3. ✅ Fixed null checks for API responses

## How to Fix

### Step 1: Restart Backend Server

**Stop the current backend process**, then restart it:

```powershell
cd D:\Walletrix\backend
npm start
```

The backend will now load the `.env` file with proper RPC endpoints.

### Step 2: Refresh Frontend

Hard refresh your browser:
- Press **Ctrl + Shift + R**
- Or **Ctrl + F5**
- Or F12 → Right-click refresh → "Empty Cache and Hard Reload"

### Step 3: Test

1. The network selector should now work without errors
2. Balances will show (may be 0 if new wallet)
3. No more 400 errors in console

## Optional: Add API Keys for Better Performance

For production or heavy testing, get free API keys:

### 1. Etherscan API (for transaction history)
- Visit: https://etherscan.io/apis
- Sign up for free account
- Get API key
- Add to `.env`: `ETHERSCAN_API_KEY=your_key_here`

### 2. Infura or Alchemy (for reliable RPC)
- Visit: https://infura.io or https://alchemy.com
- Sign up for free account
- Create a project
- Get API key
- Update RPC endpoints in `.env`:

**For Infura:**
```env
ETHEREUM_MAINNET_RPC=https://mainnet.infura.io/v3/YOUR_KEY
ETHEREUM_SEPOLIA_RPC=https://sepolia.infura.io/v3/YOUR_KEY
```

**For Alchemy:**
```env
ETHEREUM_MAINNET_RPC=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY
ETHEREUM_SEPOLIA_RPC=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
```

### 3. Restart Backend After Adding Keys

```powershell
# Stop backend (Ctrl+C)
npm start
```

## Current Network Support

### ✅ Fully Supported (with public RPCs)
- Ethereum Mainnet
- Sepolia Testnet  
- Goerli Testnet (being phased out)
- Bitcoin Mainnet
- Bitcoin Testnet

### ⚠️ Limited Features Without API Keys
- Transaction history requires Etherscan API
- Rate limits on public RPCs (5-10 requests/second)
- Some features may timeout under heavy load

### 🚀 Recommended for Production
- Infura or Alchemy for Ethereum RPCs (free tier: 100k-300k req/month)
- Etherscan for transaction history (free tier: 5 calls/second)
- BlockCypher for Bitcoin (free tier: 200 req/hour)

## Troubleshooting

### Still Getting 400 Errors?
1. Make sure backend restarted properly
2. Check backend console for error messages
3. Verify `.env` file exists in `backend/` folder
4. Try clearing browser cache completely

### Balances Not Loading?
1. Make sure you have an unlocked wallet
2. Check if address has any balance (use block explorer)
3. Public RPCs may be slow - wait 5-10 seconds
4. Consider adding Infura/Alchemy API key

### Transactions Not Showing?
1. Add ETHERSCAN_API_KEY to `.env`
2. Restart backend
3. Make sure address has transaction history

## Testing with Testnets

### Get Free Test Coins

**Sepolia ETH:**
- https://sepoliafaucet.com
- https://faucet.sepolia.dev
- https://sepolia-faucet.pk910.de

**Goerli ETH:**
- https://goerlifaucet.com
- https://faucet.goerli.mudit.blog

**Bitcoin Testnet:**
- https://testnet-faucet.mempool.co
- https://coinfaucet.eu/en/btc-testnet

### Steps to Test
1. Switch to Sepolia network in dropdown
2. Copy your Ethereum address
3. Visit a faucet and request test ETH
4. Wait 1-2 minutes for transaction to confirm
5. Refresh balance in app

---

**Once backend is restarted, the application should work smoothly!** 🎉
