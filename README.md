# Walletrix

Walletrix is a custom-built Web3 wallet platform that combines multi-wallet account management, encrypted wallet storage, blockchain balance and transaction services, and a Telegram-based conversational assistant.

The current implementation is strongest in two areas:

- the core wallet experience for account-linked wallet creation, import, switching, dashboard access, and balance tracking
- the Telegram assistant for account linking, bot-wallet funding, recipient aliases, transfer drafting, confirmation flow, transaction history, transaction status lookup, notifications, and stealth receive-address issuance

## Current Scope

### Wallet Platform

- Multi-wallet account management with Clerk-backed sign-in
- Wallet generation and mnemonic import for Ethereum, Bitcoin, and Solana addresses
- Password-based encrypted wallet storage using AES-256-GCM with PBKDF2-SHA256
- Unified dashboard with balances, token views, price lookups, notifications, and settings
- Smart-vault and smart-account scaffolding for ERC-4337 style flows

### Telegram Assistant

- Telegram account linking with one-time link codes
- Dedicated Telegram bot wallet per linked user
- Natural-language balance checks and transfer drafting
- Multi-turn confirmation flow with persisted conversation state
- Saved recipients / address list integration
- Recent transfer and transaction-status lookup
- Wallet funding and low-balance notifications for the bot wallet
- Stealth receive-address generation linked to a selected wallet context

## Network Support

| Network | Address / Balance | Send Flow |
| --- | --- | --- |
| Ethereum / supported EVM chains | Yes | Yes |
| Solana | Yes | Yes |
| Bitcoin | Yes | Partial, no complete frontend send flow yet |

## Architecture

### Frontend

- Next.js 14 (App Router)
- React + Tailwind CSS
- Clerk for account authentication
- Context-driven wallet state, auto-locking, network selection, and dashboard flows

### Backend

- Node.js + Express
- Prisma ORM with PostgreSQL
- Wallet generation/import services for Ethereum, Bitcoin, and Solana
- Blockchain, token, price, auth, notification, and Telegram route groups

### Database

The Prisma schema currently persists user accounts, grouped wallet rows, Telegram linking records, dedicated Telegram bot wallets, saved recipients, conversation sessions, stealth wallet profiles, stealth address issues, smart accounts, guardians, user operations, transactions, and activity logs.

## Security Notes

- Wallet material is encrypted before persistence with AES-256-GCM and PBKDF2-SHA256
- Passwords are hashed with Argon2id
- Telegram bot private keys are stored separately from user wallet data and encrypted with a server-side signing key
- Security headers, rate limiting, request monitoring, and validation middleware are enabled in the backend

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- PostgreSQL database reachable through `backend/.env`

### Install

```bash
npm install
cd frontend && npm install
cd ../backend && npm install
```

### Configure

- Set frontend environment variables in `frontend/.env.local`
- Set backend environment variables in `backend/.env`
- Generate Prisma client and sync schema:

```bash
cd backend
npx prisma generate
npx prisma db push
```

### Run

From the repo root:

```bash
npm run dev
```

Or run each side separately:

```bash
cd backend && npm run dev
cd frontend && npm run dev
```

Default local URLs:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:3001`

## Useful Scripts

From the repo root:

```bash
npm run dev
npm run build
npm run test
npm run lint
```

Backend only:

```bash
cd backend
npm test
npm run test:coverage
npm run db:generate
npm run db:push
```

Frontend only:

```bash
cd frontend
npm run dev
npm run build
npm run lint
```

## Documentation

- [Security Practices](/Users/ayushns01/Desktop/Repositories/Walletrix/docs/SECURITY_PRACTICES.md)
- [Database Architecture](/Users/ayushns01/Desktop/Repositories/Walletrix/docs/DATABASE_ARCHITECTURE.md)
- [Telegram Bot Internals](/Users/ayushns01/Desktop/Repositories/Walletrix/documentation/TELEGRAM_BOT_INTERNALS.md)
- [Telegram Restart Guide](/Users/ayushns01/Desktop/Repositories/Walletrix/documentation/RESTART_GUIDE.md)
- [Minor Project Synopsis](/Users/ayushns01/Desktop/Repositories/Walletrix/documentation/MINOR_PROJECT_SYNOPSIS.md)
- [References](/Users/ayushns01/Desktop/Repositories/Walletrix/documentation/REFERENCES.md)

## Repo Structure

```text
Walletrix/
├── frontend/        Next.js application
├── backend/         Express API + Prisma schema
├── contracts/       Foundry smart-contract workspace
├── docs/            Technical architecture and security docs
└── documentation/   Project, Telegram, and report-oriented docs
```

## Current Caveats

- Bitcoin support is not fully symmetric with EVM and Solana send flows yet.
- The Telegram bot currently executes from a dedicated bot EOA, not from the user's primary wallet.
- Stealth receive-address issuance is implemented, but claim/sweep lifecycle is still future work.
- Smart-vault and multisig modules are present in the codebase, but the main polished user flow today is the wallet + Telegram assistant path.
