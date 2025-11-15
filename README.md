# Walletrix 🔐

A fully independent cryptocurrency wallet application built with modern web technologies. Walletrix enables users to securely manage their crypto assets across multiple blockchain networks with a beautiful, user-friendly interface.

**Current Status:** ⚠️ Development Version (~60% Complete)  
**⚠️ Important:** Transaction sending functionality is under development. Currently supports wallet viewing and balance tracking only.

## 🚀 Implemented Features

### ✅ Core Wallet Features
- **Multi-Network Support**: Ethereum, Bitcoin, Polygon, Arbitrum, Optimism, BSC, Avalanche, Base (16+ networks)
- **HD Wallet Generation**: BIP39/BIP44 compliant with 12-word recovery phrases
- **Wallet Import**: Import from mnemonic phrases or private keys
- **Secure Key Management**: AES-256 encrypted storage of private keys
- **Balance Tracking**: Real-time balance queries for ETH, BTC, and ERC-20 tokens
- **Transaction History**: View transaction history with detailed information
- **QR Code Support**: Generate QR codes for receiving payments
- **Multi-Wallet Support**: Manage multiple wallets with database sync

### ✅ User Account System
- **Email/Password Authentication**: JWT-based user accounts
- **Multi-Device Sync**: Store encrypted wallets in PostgreSQL database
- **User Preferences**: Customizable theme, currency, and language settings
- **Wallet Management**: Create, import, and switch between multiple wallets

### ✅ Token & Price Features
- **ERC-20 Token Support**: View balances for USDT, USDC, DAI, LINK, UNI, WBTC, and more
- **Real-Time Prices**: Integrated with CoinGecko API for live price data
- **Portfolio Tracking**: Total portfolio value calculation in USD
- **24h Price Changes**: Track price movements with visual indicators
- **Market Data**: View market cap, volume, and trending coins

### ✅ Network Support
- **Ethereum Networks**: Mainnet, Sepolia, Goerli, Holesky testnets
- **Layer 2 Solutions**: Polygon, Arbitrum, Optimism, Base
- **Other EVM Chains**: BSC, Avalanche C-Chain
- **Bitcoin**: Mainnet and Testnet support
- **Easy Network Switching**: Dropdown selector with persistent selection

### ✅ Security Features
- **Client-Side Encryption**: AES-256 encryption for sensitive data
- **Password Hashing**: bcrypt with 12 salt rounds
- **JWT Authentication**: Secure token-based authentication
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **CORS Protection**: Configured for secure cross-origin requests
- **Input Validation**: Express-validator for API input sanitization

## ⚠️ In Development

### 🔨 Features Under Development
- **Transaction Sending**: ETH, BTC, and token transfers (API ready, UI integration pending)
- **Solana Integration**: Partial implementation (service exists, not fully integrated)
- **Gas Optimization**: EIP-1559 transaction support
- **Batch Transactions**: Multiple transaction queueing

### 📋 Planned Features
- **Two-Factor Authentication (2FA)**: TOTP-based 2FA for enhanced security
- **Password Recovery**: Email-based password reset system
- **Email Verification**: Verify user email addresses
- **Session Management**: View and manage active sessions
- **Hardware Wallet Support**: Ledger and Trezor integration
- **NFT Support**: View and transfer ERC-721/ERC-1155 tokens
- **WalletConnect**: Connect to dApps
- **DEX Integration**: Built-in token swaps
- **Address Book**: Save frequently used addresses
- **Transaction Notes**: Add labels and notes to transactions

## 🛠️ Tech Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **React 18** - Modern UI library
- **Tailwind CSS** - Utility-first CSS framework
- **React Context API** - State management
- **Axios** - HTTP client for API requests
- **Lucide React** - Icon library
- **React Hot Toast** - Toast notifications
- **QRCode** - QR code generation

### Backend
- **Node.js 18+** - Server runtime
- **Express.js** - Web application framework
- **Prisma** - Database ORM with type safety
- **PostgreSQL** - Primary database for user accounts and wallets
- **JWT** - JSON Web Tokens for authentication
- **bcryptjs** - Password hashing

### Blockchain & Crypto
- **ethers.js v6.15.0** - Ethereum and EVM chain interactions
- **bitcoinjs-lib v6.1.7** - Bitcoin transaction library
- **@solana/web3.js** - Solana integration (partial)
- **bip39** - Mnemonic phrase generation (BIP39)
- **bip32** - HD wallet derivation (BIP44)
- **crypto-js** - AES-256 encryption for wallet data
- **qrcode** - QR code generation

### External APIs
- **CoinGecko API** - Cryptocurrency prices and market data
- **Etherscan V2 API** - Ethereum transaction history (multi-chain)
- **BlockCypher API** - Bitcoin blockchain data
- **Public RPC Nodes** - Blockchain queries (Ethereum, Polygon, etc.)

### Development Tools
- **Docker & Docker Compose** - Containerization
- **Nodemon** - Backend hot reload
- **Prisma Studio** - Database GUI
- **ESLint** - Code linting

## 📁 Project Structure

```
Walletrix/
├── backend/                    # Node.js Express API (Port 3001)
│   ├── src/
│   │   ├── controllers/       # API endpoint handlers (5 controllers)
│   │   │   ├── blockchainController.js
│   │   │   ├── priceController.js
│   │   │   ├── tokenController.js
│   │   │   ├── transactionController.js
│   │   │   └── walletController.js
│   │   ├── services/          # Business logic (6 services)
│   │   │   ├── authService.js
│   │   │   ├── bitcoinService.js
│   │   │   ├── ethereumService.js
│   │   │   ├── priceService.js
│   │   │   ├── tokenService.js
│   │   │   └── walletService.js
│   │   ├── routes/            # API routes (7 route files)
│   │   │   ├── authRoutes.js
│   │   │   ├── blockchainRoutes.js
│   │   │   ├── databaseWalletRoutes.js
│   │   │   ├── priceRoutes.js
│   │   │   ├── tokenRoutes.js
│   │   │   ├── transactionRoutes.js
│   │   │   └── walletRoutes.js
│   │   ├── middleware/        # Express middleware
│   │   │   └── auth.js        # JWT authentication
│   │   ├── lib/
│   │   │   └── prisma.js      # Prisma client
│   │   └── index.js           # Express server entry point
│   ├── prisma/
│   │   └── schema.prisma      # Database schema (9 models)
│   └── package.json
│
├── frontend/                   # Next.js Application (Port 3000)
│   ├── app/
│   │   ├── layout.js          # Root layout with providers
│   │   ├── page.js            # Main dashboard page
│   │   └── globals.css        # Global styles + animations
│   ├── components/            # React components (13 components)
│   │   ├── Dashboard.js       # Main portfolio dashboard
│   │   ├── CreateWallet.js    # Wallet creation wizard
│   │   ├── ImportWallet.js    # Import from mnemonic
│   │   ├── UnlockWallet.js    # Password unlock screen
│   │   ├── SendModal.js       # Send transaction modal
│   │   ├── ReceiveModal.js    # Receive with QR codes
│   │   ├── AuthModal.js       # Login/Register modal
│   │   ├── NetworkSelector.js # Multi-network dropdown
│   │   ├── WalletSelector.js  # Switch between wallets
│   │   ├── AccountDetails.js  # View private keys
│   │   ├── TransactionDetailsModal.js
│   │   ├── AllTransactionsModal.js
│   │   └── DebugTools.js
│   ├── contexts/
│   │   ├── WalletContext.js   # Legacy localStorage wallet
│   │   └── DatabaseWalletContext.js  # Auth + DB wallets
│   ├── lib/
│   │   ├── api.js             # API client wrapper
│   │   └── utils.js           # Utility functions
│   └── package.json
│
├── docker-compose.yml          # Multi-service Docker setup
├── DATABASE_SETUP_GUIDE.md    # Database setup instructions
├── NETWORK_SUPPORT.md         # Network configuration guide
├── PROJECT_COMPLETE.md        # Feature overview
├── TASK1_INCOMPLETE_FEATURES_REPORT.md  # Gap analysis
├── TASK2_SECURITY_ANALYSIS_REPORT.md    # Security audit
└── TASK3_AUTHENTICATION_IMPLEMENTATION_REPORT.md
```

## 📡 API Endpoints (33 Total)

### Authentication (6 endpoints)
- `POST /api/v1/auth/register` - Create new account
- `POST /api/v1/auth/login` - User login
- `GET /api/v1/auth/profile` - Get user profile
- `POST /api/v1/auth/verify-token` - Verify JWT token
- `PUT /api/v1/auth/change-password` - Change password
- `PUT /api/v1/auth/preferences` - Update preferences

### Wallet Management (7 endpoints)
- `POST /api/v1/wallet/generate` - Generate HD wallet
- `POST /api/v1/wallet/import/mnemonic` - Import from mnemonic
- `POST /api/v1/wallet/import/private-key` - Import Ethereum key
- `POST /api/v1/wallet/derive-accounts` - Derive multiple accounts
- `GET /api/v1/wallet/validate/:network/:address` - Validate address
- `POST /api/v1/wallet/encrypt` - Encrypt wallet data
- `POST /api/v1/wallet/decrypt` - Decrypt wallet data

### Blockchain Queries (7 endpoints)
- `GET /api/v1/blockchain/ethereum/balance/:address` - ETH balance
- `GET /api/v1/blockchain/bitcoin/balance/:address` - BTC balance
- `GET /api/v1/blockchain/ethereum/transactions/:address` - ETH history
- `GET /api/v1/blockchain/bitcoin/transactions/:address` - BTC history
- `GET /api/v1/blockchain/ethereum/gas-price` - Current gas prices
- `GET /api/v1/blockchain/bitcoin/fee-estimate` - BTC fee estimates
- `GET /api/v1/blockchain/transaction/:network/:txHash` - TX details

### Token Operations (5 endpoints)
- `GET /api/v1/tokens/info/:tokenAddress` - ERC-20 token info
- `GET /api/v1/tokens/balance/:tokenAddress/:address` - Token balance
- `POST /api/v1/tokens/balances/multiple` - Batch token balances
- `GET /api/v1/tokens/balances/popular/:address` - Popular tokens
- `GET /api/v1/tokens/popular` - List of popular tokens

### Price Data (8 endpoints)
- `GET /api/v1/prices/:coinId` - Single coin price
- `POST /api/v1/prices/multiple` - Batch prices
- `GET /api/v1/prices/list/popular` - Popular coin prices
- `GET /api/v1/prices/coin/:coinId` - Detailed coin data
- `GET /api/v1/prices/chart/:coinId` - Price chart data
- `GET /api/v1/prices/search/query` - Search coins
- `GET /api/v1/prices/list/trending` - Trending coins
- `GET /api/v1/prices/list/top` - Top coins by market cap

## 🚀 Getting Started

### Prerequisites

- **Node.js** v18.0.0 or higher
- **npm** v8.0.0 or higher
- **PostgreSQL** v14 or higher (for user accounts)
- **Git** for cloning the repository

### Quick Start (Development)

1. **Clone the repository**
   ```bash
   git clone https://github.com/ayushns01/Walletrix.git
   cd Walletrix
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   
   # Create .env file (see Backend Environment Variables below)
   # Then generate Prisma client and setup database
   npx prisma generate
   npx prisma db push
   
   # Start backend server
   npm run dev
   # Backend runs on http://localhost:3001
   ```

3. **Frontend Setup** (in a new terminal)
   ```bash
   cd frontend
   npm install
   
   # Create .env.local file (see Frontend Environment Variables below)
   
   # Start frontend development server
   npm run dev
   # Frontend runs on http://localhost:3000
   ```

4. **Open your browser**
   ```
   Navigate to http://localhost:3000
   ```

### Backend Environment Variables

Create `backend/.env` file:

```env
# Database (Required)
DATABASE_URL="postgresql://postgres:password@localhost:5432/walletrix"

# JWT Secret (Required - use a strong random string)
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"

# API Configuration
API_PORT=3001
NODE_ENV=development
FRONTEND_URL="http://localhost:3000"

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Ethereum RPC Endpoints (Optional - public nodes used by default)
ETHEREUM_MAINNET_RPC="https://ethereum.publicnode.com"
ETHEREUM_SEPOLIA_RPC="https://ethereum-sepolia.publicnode.com"
ETHEREUM_GOERLI_RPC="https://ethereum-goerli.publicnode.com"

# Layer 2 RPC Endpoints (Optional)
POLYGON_MAINNET_RPC="https://polygon-rpc.com"
ARBITRUM_ONE_RPC="https://arb1.arbitrum.io/rpc"
OPTIMISM_MAINNET_RPC="https://mainnet.optimism.io"
BSC_MAINNET_RPC="https://bsc-dataseed.binance.org"
AVALANCHE_MAINNET_RPC="https://api.avax.network/ext/bc/C/rpc"
BASE_MAINNET_RPC="https://mainnet.base.org"

# External API Keys (Optional but recommended)
ETHERSCAN_API_KEY="your_etherscan_api_key"
BLOCKCYPHER_API_KEY="your_blockcypher_api_key"
COINGECKO_API_KEY="your_coingecko_api_key"
```

**Get Free API Keys:**
- **Etherscan**: https://etherscan.io/apis (Required for transaction history)
- **Infura/Alchemy**: For better RPC reliability (Optional)
- **CoinGecko**: For price data (Optional, has free tier)

### Frontend Environment Variables

Create `frontend/.env.local` file:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
```

### Database Setup

#### Option 1: Local PostgreSQL

1. Install PostgreSQL 14+
2. Create database:
   ```bash
   createdb walletrix
   ```
3. Update `DATABASE_URL` in `backend/.env`
4. Run Prisma commands:
   ```bash
   cd backend
   npx prisma generate
   npx prisma db push
   ```

#### Option 2: Docker

```bash
# Start PostgreSQL in Docker
docker run --name walletrix-postgres \
  -e POSTGRES_DB=walletrix \
  -e POSTGRES_PASSWORD=password \
  -p 5432:5432 \
  -d postgres:15-alpine

# Update DATABASE_URL in backend/.env
DATABASE_URL="postgresql://postgres:password@localhost:5432/walletrix"

# Run Prisma setup
cd backend
npx prisma generate
npx prisma db push
```

## 🔧 Development

### Available Scripts

#### Backend (from `backend/` directory)
```bash
npm run dev      # Start development server with nodemon (hot reload)
npm start        # Start production server
```

#### Frontend (from `frontend/` directory)
```bash
npm run dev      # Start Next.js development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

### Testing the Application

1. **Create a Wallet**
   - Click "Create New Wallet"
   - Set a strong password (min 8 characters)
   - **IMPORTANT**: Save your 12-word recovery phrase securely
   - Confirm the setup

2. **View Your Balances**
   - Dashboard shows balances for all networks
   - Switch networks using the dropdown in top-right
   - Click refresh to update balances

3. **Test with Testnets**
   - Switch to Sepolia or Goerli testnet
   - Get free testnet ETH from faucets:
     - Sepolia: https://sepoliafaucet.com
     - Goerli: https://goerlifaucet.com
   - View your testnet balance

4. **Import Existing Wallet**
   - Click "Import Existing Wallet"
   - Enter your 12 or 24-word recovery phrase
   - Set a password
   - Access your existing funds

### API Testing

Test API endpoints using curl:

```bash
# Health check
curl http://localhost:3001/health

# Generate wallet
curl -X POST http://localhost:3001/api/v1/wallet/generate \
  -H "Content-Type: application/json"

# Get Ethereum balance
curl http://localhost:3001/api/v1/blockchain/ethereum/balance/0xYourAddress

# Get popular token prices
curl http://localhost:3001/api/v1/prices/list/popular
```

Or use the interactive API documentation:
```
http://localhost:3001/api/v1
```

## 🐳 Docker Support

Run the entire application stack with Docker Compose:

```bash
# Build and start all services (PostgreSQL + Backend + Frontend)
docker-compose up --build

# Start in detached mode
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Stop and remove volumes (clean slate)
docker-compose down -v
```

**Services included:**
- PostgreSQL database (port 5432)
- Redis cache (port 6379) 
- Backend API (port 3001)
- Frontend app (port 3000)

**Note**: Docker setup is configured but may require adjustments. Local development is recommended for now.

## 💾 Database Schema

**9 Prisma Models:**

1. **User** - User accounts and authentication
2. **UserPreferences** - User settings (theme, currency, language)
3. **Wallet** - Encrypted wallet data with addresses
4. **Transaction** - Transaction history cache
5. **PortfolioSnapshot** - Historical portfolio values
6. **WatchedToken** - User's watched ERC-20 tokens
7. **PriceCache** - Cached cryptocurrency prices
8. **ApiUsage** - API usage analytics

**View Schema:**
```bash
cd backend
npx prisma studio  # Opens GUI at http://localhost:5555
```

## 🔒 Security

### Current Security Measures ✅
- **AES-256 Encryption**: Wallet data encrypted with user password
- **bcrypt Password Hashing**: 12 salt rounds for user passwords
- **JWT Authentication**: Token-based API authentication (7-day expiration)
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **CORS Protection**: Configured for secure cross-origin requests
- **Helmet.js**: Security headers for Express
- **Input Validation**: Express-validator on all inputs
- **Environment Variables**: Sensitive data stored in .env files

### Security Best Practices for Users

⚠️ **CRITICAL: Backup Your Recovery Phrase**
- Your 12-word recovery phrase is the ONLY way to recover your wallet
- Write it down on paper and store securely
- Never share it with anyone
- Never store it digitally (no screenshots, no cloud storage)
- Keep multiple backups in different secure locations

⚠️ **Password Security**
- Use a strong, unique password (minimum 8 characters)
- Don't reuse passwords from other services
- Consider using a password manager

⚠️ **Test First**
- Always test with small amounts first
- Use testnets for development and testing
- Verify addresses carefully before transactions

⚠️ **Development Version Warning**
- This is a development version (~60% complete)
- **NOT recommended for storing large amounts**
- Transaction sending is under development
- Security audit not yet performed

### Known Security Gaps 🚨

The following security features are planned for implementation:

- ❌ **No Two-Factor Authentication (2FA)** - Single-factor authentication only
- ❌ **No Password Recovery** - Lost passwords cannot be reset
- ❌ **No Email Verification** - Email addresses not verified
- ❌ **No Session Management** - Cannot view/revoke active sessions
- ❌ **localStorage Token Storage** - Vulnerable to XSS (planned: httpOnly cookies)
- ❌ **No Refresh Token Mechanism** - Long-lived tokens (7 days)
- ❌ **No Account Lockout** - No protection against brute force
- ❌ **No Security Event Logging** - Login attempts not tracked

**Recommendation**: For production use, implement security enhancements from `TASK2_SECURITY_ANALYSIS_REPORT.md`

## 📚 Documentation

Comprehensive documentation is available in the repository:

- **[PROJECT_COMPLETE.md](PROJECT_COMPLETE.md)** - Complete feature overview and usage guide
- **[NETWORK_SUPPORT.md](NETWORK_SUPPORT.md)** - Multi-network configuration and setup
- **[DATABASE_SETUP_GUIDE.md](DATABASE_SETUP_GUIDE.md)** - Database setup instructions
- **[TASK1_INCOMPLETE_FEATURES_REPORT.md](TASK1_INCOMPLETE_FEATURES_REPORT.md)** - Detailed gap analysis (662 lines)
- **[TASK2_SECURITY_ANALYSIS_REPORT.md](TASK2_SECURITY_ANALYSIS_REPORT.md)** - Comprehensive security audit (1783 lines)
- **[TASK3_AUTHENTICATION_IMPLEMENTATION_REPORT.md](TASK3_AUTHENTICATION_IMPLEMENTATION_REPORT.md)** - Authentication system analysis
- **[backend/IMPLEMENTATION_COMPLETE.md](backend/IMPLEMENTATION_COMPLETE.md)** - Complete API reference
- **[frontend/USER_GUIDE.md](frontend/USER_GUIDE.md)** - User manual

## 🗺️ Roadmap

### Phase 1: Critical Features (Current Focus)
- [x] Multi-network support (Ethereum, Bitcoin, Layer 2s)
- [x] Wallet generation and import
- [x] Balance tracking and portfolio view
- [x] User authentication system
- [x] Database integration
- [ ] **Transaction sending** (In Progress)
- [ ] Complete Solana integration
- [ ] Hardware wallet support

### Phase 2: Security Enhancements (Next)
- [ ] Two-Factor Authentication (2FA/TOTP)
- [ ] Password recovery system
- [ ] Email verification
- [ ] Session management dashboard
- [ ] httpOnly cookie token storage
- [ ] Refresh token mechanism
- [ ] Account lockout protection
- [ ] Security event logging

### Phase 3: Advanced Features
- [ ] NFT support (ERC-721/ERC-1155)
- [ ] WalletConnect integration
- [ ] DEX integration (token swaps)
- [ ] Address book
- [ ] Transaction notes and labels
- [ ] CSV/PDF export
- [ ] Tax reporting
- [ ] Multi-signature wallets

### Phase 4: Platform Expansion
- [ ] Mobile application (React Native)
- [ ] Browser extension (Chrome/Firefox)
- [ ] DeFi protocol integrations
- [ ] Cross-chain bridges
- [ ] Advanced analytics
- [ ] Social recovery

## 📊 Project Status

**Overall Completion: ~60%**

| Component | Status | Completion |
|-----------|--------|------------|
| Wallet Generation | ✅ Complete | 100% |
| Multi-Network Support | ✅ Complete | 90% |
| Balance Tracking | ✅ Complete | 85% |
| User Authentication | ⚠️ Basic | 30% |
| Transaction History | ✅ Complete | 80% |
| Transaction Sending | 🔨 In Progress | 20% |
| Token Support | ✅ Complete | 80% |
| Price Data | ✅ Complete | 85% |
| Security Features | ⚠️ Basic | 45% |
| UI/UX | ✅ Complete | 85% |

**Production Ready:** ❌ Not Yet (Estimated 8-12 weeks for production)

## 🤝 Contributing

Contributions are welcome! Here's how to get started:

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make your changes**
   - Follow existing code style
   - Add comments for complex logic
   - Update documentation if needed
4. **Test your changes**
   - Ensure backend and frontend still work
   - Test with different networks
5. **Commit your changes**
   ```bash
   git commit -m 'Add: Brief description of your feature'
   ```
6. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```
7. **Open a Pull Request**
   - Describe what you changed and why
   - Reference any related issues

### Development Guidelines

- **Code Style**: Follow the existing patterns in the codebase
- **Comments**: Add comments for complex blockchain interactions
- **Error Handling**: Always handle errors gracefully with user-friendly messages
- **Security**: Never log or expose private keys or sensitive data
- **Testing**: Test with testnets before mainnet
- **Documentation**: Update README and relevant docs for new features

### Priority Areas for Contribution

1. **Transaction Sending Implementation** - High priority!
2. **Security Enhancements** - 2FA, password recovery, session management
3. **Complete Solana Integration** - Finish partial implementation
4. **Hardware Wallet Support** - Ledger/Trezor integration
5. **NFT Viewing** - Display ERC-721/ERC-1155 tokens
6. **WalletConnect** - Enable dApp connections
7. **Test Coverage** - Add unit and integration tests

## 🐛 Known Issues

- Transaction sending UI exists but not fully integrated
- Solana service implemented but not connected to frontend
- Etherscan API rate limits may affect transaction history
- Docker setup needs environment variable configuration
- No automated tests yet

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

**Blockchain Libraries:**
- [ethers.js](https://docs.ethers.io/) - Ethereum and EVM chains
- [bitcoinjs-lib](https://github.com/bitcoinjs/bitcoinjs-lib) - Bitcoin transactions
- [Solana Web3.js](https://solana-labs.github.io/solana-web3.js/) - Solana integration

**Frameworks & Tools:**
- [Next.js](https://nextjs.org/) - React framework
- [Prisma](https://www.prisma.io/) - Database ORM
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [CoinGecko API](https://www.coingecko.com/api) - Price data

**Inspiration:**
- [MetaMask](https://metamask.io/) - Wallet UX inspiration
- [Trust Wallet](https://trustwallet.com/) - Multi-chain support
- [Phantom](https://phantom.app/) - Modern UI design

## 📞 Support & Contact

**For Issues:**
- 🐛 [Create an issue on GitHub](https://github.com/ayushns01/Walletrix/issues)
- 📖 Check the documentation in this repository
- 🔍 Search existing issues before creating new ones

**Repository:**
- 🌐 GitHub: [https://github.com/ayushns01/Walletrix](https://github.com/ayushns01/Walletrix)
- 👤 Author: [@ayushns01](https://github.com/ayushns01)

## 📢 Important Disclaimers

⚠️ **CRITICAL WARNINGS:**

1. **Development Status**: This is a development version (~60% complete) and NOT ready for production use with real funds.

2. **Security Audit**: This application has NOT undergone a professional security audit. Use at your own risk.

3. **No Liability**: The developers are NOT responsible for any loss of funds due to bugs, security vulnerabilities, user error, or any other reason.

4. **Backup Responsibility**: YOU are solely responsible for backing up your recovery phrases and passwords. Lost recovery phrases cannot be recovered.

5. **Test First**: ALWAYS test with small amounts and testnets before using real funds.

6. **Open Source**: This is an open-source educational project. Review the code yourself before trusting it with any cryptocurrency.

7. **Regulatory Compliance**: Ensure you comply with local regulations regarding cryptocurrency use and wallet services in your jurisdiction.

---

## 🎓 Educational Purpose

This project is primarily for **educational and development purposes**. It demonstrates:
- Full-stack cryptocurrency wallet architecture
- Multi-blockchain integration
- Secure key management
- Modern React/Next.js development
- RESTful API design
- Database integration with Prisma

**Perfect for:**
- Learning blockchain development
- Understanding wallet architecture
- Portfolio projects
- Building on top of (with proper security enhancements)

**Not recommended for:**
- Production use without security audit
- Managing large cryptocurrency amounts
- Mission-critical applications
- Users who cannot accept the risk

---

**Built with ❤️ by developers, for developers**

**Last Updated:** November 12, 2025  
**Version:** 0.6.0-alpha (Development)

---

*Always remember: Not your keys, not your crypto. Keep your recovery phrase safe!* 🔐