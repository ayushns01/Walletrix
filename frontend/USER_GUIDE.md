# Walletrix Frontend User Guide

This guide reflects the current frontend behavior of Walletrix.

## Running the Frontend

From the repo root:

```bash
npm run dev
```

Or run the frontend only:

```bash
cd frontend
npm run dev
```

The app runs on `http://localhost:3000` by default.

## Main User Flows

### 1. Landing and Sign-In

Users begin on the landing page and can either continue in guest mode or sign in with Clerk-backed authentication. Signed-in users get account-linked wallet persistence, while guest mode remains local to the device.

### 2. Wallet Creation or Import

The app supports:

- generating a new wallet
- importing a wallet from a recovery phrase
- encrypting wallet payload data with a user password before storage

For signed-in users, the encrypted wallet payload is persisted through the backend. For guest users, it stays local in browser storage.

### 3. Dashboard and Wallet Switching

After unlock, the dashboard loads balances, token data, prices, and wallet actions. Signed-in users can manage multiple wallets under one account and switch between them from the frontend.

### 4. Send and Receive

The current polished send flow is strongest for EVM networks and Solana. Bitcoin address and balance support is present, but Bitcoin transfer flow is not yet fully complete in the frontend.

### 5. Telegram Bot Integration

The frontend includes Telegram integration for:

- generating one-time Telegram link codes
- checking whether a Telegram account is linked
- showing the dedicated bot wallet address
- unlinking Telegram
- managing the Telegram address list from Settings

When Telegram is linked, the frontend can also prefill a transfer to fund the Telegram bot wallet from the active account wallet.

## Current Pages and Components

The main user-facing frontend areas include:

- landing page
- wallet creation and import flows
- unlock flow
- dashboard
- send and receive modals
- wallet selector
- settings
- Telegram link page
- notifications page

## Important Notes

- The frontend expects the backend API at `NEXT_PUBLIC_API_URL` or `http://localhost:3001`
- A stale `.next` dev cache can cause missing chunk errors during development; clearing `frontend/.next` usually resolves this
- `npm run lint` now depends on the local ESLint config in `frontend/.eslintrc.json`
