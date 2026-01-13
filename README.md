# 🔐 Walletrix

**Enterprise-Grade Multi-Chain Cryptocurrency Wallet**

*Non-custodial • Self-custody • Industry-standard security*

---

## 🎯 What is Walletrix?


Walletrix is a **production-ready cryptocurrency wallet** built with modern web technologies. It demonstrates advanced blockchain engineering, enterprise security practices, and full-stack development expertise.

**Live Demo**: [walletrix.vercel.app](https://walletrix.vercel.app) | **Backend**: Deployed on Render | **Frontend**: Deployed on Vercel    

---

## ⭐ Key Features

### 🔗 Multi-Chain Support
| Network | Type | Status |
|---------|------|--------|
| Bitcoin | Mainnet + Testnet | ✅ |
| Ethereum | Mainnet + Testnets | ✅ |
| Polygon | Layer 2 | ✅ |
| Solana | Non-EVM | ✅ |

### 💼 Wallet Features
- **HD Wallet Generation** — BIP-39/44/48/85 compliant
- **Multi-Signature Wallets** — Bitcoin P2WSH + Ethereum Gnosis Safe
- **Shamir's Secret Sharing** — 3-of-5 social recovery
- **BIP-85 Child Derivation** — Unlimited wallets from single seed
- **ERC-20 Token Support** — USDT, USDC, DAI, LINK, UNI, WBTC + custom

### 📊 Dashboard & Analytics
- Real-time balance tracking
- Live price data (CoinGecko integration)
- Transaction history with filtering
- Portfolio analytics
- 24h price change indicators

---

## 🛡️ Security Highlights

> *"Industry-standard security with advanced cryptographic implementations"*

### Cryptography
| Feature | Implementation | Standard |
|---------|---------------|----------|
| **Password Hashing** | Argon2id (64MB, 3 iterations) | PHC Winner 2015 |
| **Wallet Encryption** | AES-256-GCM | Military-grade |
| **Key Derivation** | PBKDF2-SHA256 (600K iterations) | OWASP 2024 |
| **Secret Sharing** | Shamir's (k-of-n threshold) | Cryptographic |
| **Privacy Proofs** | Groth16 zk-SNARKs | Zero-Knowledge |

### Authentication & Sessions
- JWT tokens with 15-min access / 7-day refresh rotation
- Maximum 5 concurrent sessions per user
- TOTP 2FA with backup codes
- Session blacklisting for immediate invalidation

### API Security
- **12 specialized rate limiters** (auth: 5/15min, sensitive: 2/day)
- **15+ security headers** (CSP, HSTS, X-Frame-Options)
- Input validation with express-validator
- CORS protection with whitelist

### Transaction Security
- Pre-transaction simulation
- Address reputation checking
- Anomaly detection (unusual amounts)
- Address poisoning detection

---

## 🛠️ Tech Stack

### Frontend
```
Next.js 14 (App Router) • React 18 • Tailwind CSS • Clerk Auth
Ethers.js v6 • bitcoinjs-lib • Lucide React • React Hot Toast
```

### Backend
```
Node.js 18+ • Express.js • Prisma ORM • PostgreSQL
JWT • Argon2 • Winston Logger • Helmet.js
```

### Blockchain
```
ethers.js v6 • bitcoinjs-lib v6 • @solana/web3.js
bip39 • bip32 • shamirs-secret-sharing • snarkjs
```

### DevOps
```
Docker • Vercel • Render • GitHub Actions
```

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (Next.js 14)                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Dashboard   │  │ Auth (Clerk)│  │ Wallet Management   │  │
│  │ • Balances  │  │ • Login     │  │ • HD Generation     │  │
│  │ • Prices    │  │ • OAuth     │  │ • Import/Export     │  │
│  │ • History   │  │ • Sessions  │  │ • Multi-Sig         │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND (Node.js/Express)                │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Security Layer                                        │   │
│  │ • Rate Limiting (12 limiters) • JWT Validation       │   │
│  │ • Security Headers (15+)      • Input Validation     │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Wallet Svc  │  │ Auth Svc    │  │ Blockchain Svc      │  │
│  │ • Argon2id  │  │ • Sessions  │  │ • ETH/BTC/Polygon   │  │
│  │ • AES-256   │  │ • 2FA       │  │ • Token Queries     │  │
│  │ • Shamir    │  │ • JWT       │  │ • Gas Estimation    │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      DATA LAYER                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ PostgreSQL  │  │ Prisma ORM  │  │ External APIs       │  │
│  │ • 15 Models │  │ • Type-safe │  │ • CoinGecko         │  │
│  │ • 30+ Index │  │ • Migrations│  │ • Etherscan         │  │
│  │ • Relations │  │ • Studio    │  │ • BlockCypher       │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- npm/yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/ayushns01/Walletrix.git
cd Walletrix

# Backend setup
cd backend
npm install
cp .env.example .env  # Configure your environment
npx prisma generate
npx prisma db push
npm run dev

# Frontend setup (new terminal)
cd frontend
npm install
npm run dev
```

**Backend**: http://localhost:3001  
**Frontend**: http://localhost:3000

---

## 📁 Project Structure

```
Walletrix/
├── frontend/                 # Next.js 14 Application
│   ├── app/                  # App Router pages
│   ├── components/           # React components (21)
│   └── contexts/             # State management
│
├── backend/                  # Node.js API Server
│   ├── src/
│   │   ├── controllers/      # API handlers (12)
│   │   ├── services/         # Business logic (23)
│   │   ├── middleware/       # Security (8)
│   │   └── routes/           # API routes (13)
│   └── prisma/               # Database schema (15 models)
│
├── docs/                     # Documentation
│   ├── SECURITY_PRACTICES.md
│   └── DATABASE_ARCHITECTURE.md
└── docker-compose.yml        # Container orchestration
```

---

## 📊 Database Schema

**15 Prisma Models** • **30+ Indexes** • **6 Enums**

| Model | Description |
|-------|-------------|
| `User` | Authentication + Clerk integration |
| `Wallet` | HD/Imported wallet storage |
| `Transaction` | High-precision Decimal(36,18) |
| `MultiSigWallet` | M-of-N configuration |
| `BIP85ChildWallet` | Derived child wallets |
| `Notification` | Real-time notifications |
| `ActivityLog` | Security audit trail |
| `ScamAddress` | Known malicious addresses |

See [DATABASE_ARCHITECTURE.md](docs/DATABASE_ARCHITECTURE.md) for full documentation.

---

## 🔒 Security Documentation

See [SECURITY_PRACTICES.md](docs/SECURITY_PRACTICES.md) for comprehensive security documentation covering:

- Argon2id password hashing (PHC winner)
- AES-256-GCM encryption
- Shamir's Secret Sharing
- Zero-Knowledge Proofs (zk-SNARKs)
- Multi-signature wallets
- Rate limiting strategies
- Security headers

---

## 📈 API Overview

**40+ RESTful Endpoints** organized by domain:

| Domain | Endpoints | Description |
|--------|-----------|-------------|
| `/auth` | 6 | Authentication, sessions, 2FA |
| `/wallet` | 8 | Generate, import, encrypt, backup |
| `/blockchain` | 8 | Balances, transactions, gas |
| `/tokens` | 5 | ERC-20 queries, batch operations |
| `/prices` | 8 | Real-time market data |
| `/multisig` | 6 | Multi-signature operations |

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---