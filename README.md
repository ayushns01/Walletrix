# Walletrix 🔐

A fully independent cryptocurrency wallet application built with modern web technologies. Walletrix enables users to securely manage their crypto assets, make transactions, and interact with blockchain networks - just like MetaMask, but with enhanced features and user experience.

## 🚀 Features

### Core Wallet Features
- **Multi-Currency Support**: Bitcoin, Ethereum, and major altcoins
- **Secure Key Management**: Local encrypted storage of private keys
- **Transaction Management**: Send, receive, and track cryptocurrency transactions
- **Address Book**: Store and manage frequently used addresses
- **Transaction History**: Complete history with detailed information
- **QR Code Support**: Easy address sharing and payment requests

### Advanced Features
- **DeFi Integration**: Connect to decentralized exchanges and protocols
- **NFT Support**: View, manage, and transfer NFTs
- **Hardware Wallet Support**: Integration with Ledger and Trezor
- **Multi-Network Support**: Mainnet, Testnet, and custom RPC endpoints
- **Backup & Recovery**: Mnemonic phrase backup and wallet restoration
- **Portfolio Tracking**: Real-time portfolio value and analytics

### Security Features
- **Client-Side Encryption**: All sensitive data encrypted locally
- **PIN/Biometric Lock**: Secure app access
- **Transaction Signing**: Local transaction signing for maximum security
- **Phishing Protection**: Built-in protection against malicious websites
- **Auto-Lock**: Automatic wallet locking after inactivity

## 🛠️ Tech Stack

### Frontend
- **React 18** - Modern UI framework
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **React Router** - Client-side routing
- **React Query** - Data fetching and caching
- **Zustand** - State management
- **React Hook Form** - Form handling

### Backend
- **Node.js** - Server runtime
- **Express.js** - Web application framework
- **TypeScript** - Type-safe backend development
- **Prisma** - Database ORM
- **PostgreSQL** - Primary database
- **Redis** - Caching and sessions

### Blockchain & Crypto
- **ethers.js** - Ethereum interaction library
- **bitcoinjs-lib** - Bitcoin transaction library
- **web3.js** - Alternative Ethereum library
- **bip39** - Mnemonic phrase generation
- **crypto-js** - Cryptographic functions
- **qrcode** - QR code generation

### Development Tools
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Jest** - Testing framework
- **Cypress** - End-to-end testing
- **Husky** - Git hooks
- **Docker** - Containerization

## 📁 Project Structure

```
Walletrix/
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/          # Application pages
│   │   ├── hooks/          # Custom React hooks
│   │   ├── store/          # State management
│   │   ├── utils/          # Utility functions
│   │   ├── types/          # TypeScript types
│   │   └── styles/         # Global styles
│   ├── public/             # Static assets
│   └── package.json
├── backend/                  # Node.js backend API
│   ├── src/
│   │   ├── controllers/    # API controllers
│   │   ├── services/       # Business logic
│   │   ├── models/         # Database models
│   │   ├── middleware/     # Express middleware
│   │   ├── utils/          # Utility functions
│   │   └── types/          # TypeScript types
│   └── package.json
├── shared/                   # Shared code between frontend and backend
│   ├── types/              # Shared TypeScript types
│   └── utils/              # Shared utilities
├── docs/                     # Documentation
├── scripts/                  # Build and deployment scripts
├── docker-compose.yml        # Docker configuration
├── .env.example             # Environment variables template
├── .gitignore              # Git ignore rules
└── README.md               # This file
```

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **PostgreSQL** (v14 or higher)
- **Redis** (optional, for caching)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/walletrix.git
   cd walletrix
   ```

2. **Install dependencies**
   ```bash
   # Install root dependencies
   npm install

   # Install frontend dependencies
   cd frontend
   npm install

   # Install backend dependencies
   cd ../backend
   npm install
   ```

3. **Environment Setup**
   ```bash
   # Copy environment template
   cp .env.example .env
   
   # Edit .env file with your configuration
   nano .env
   ```

4. **Database Setup**
   ```bash
   # Navigate to backend
   cd backend
   
   # Run database migrations
   npx prisma migrate dev
   
   # Generate Prisma client
   npx prisma generate
   ```

5. **Start Development Servers**
   ```bash
   # Start backend (from backend directory)
   npm run dev
   
   # Start frontend (from frontend directory)
   cd ../frontend
   npm run dev
   ```

### Environment Variables

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/walletrix"

# Redis (optional)
REDIS_URL="redis://localhost:6379"

# JWT Secret
JWT_SECRET="your-super-secret-jwt-key"

# API Configuration
API_PORT=3001
FRONTEND_URL="http://localhost:3000"

# Blockchain RPC URLs
ETHEREUM_RPC_URL="https://mainnet.infura.io/v3/your-project-id"
BITCOIN_RPC_URL="https://bitcoin-rpc-endpoint.com"

# External APIs
COINGECKO_API_KEY="your-coingecko-api-key"
```

## 🔧 Development

### Available Scripts

#### Frontend
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run test` - Run unit tests
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript checks

#### Backend
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm run start` - Start production server
- `npm run test` - Run unit tests
- `npm run db:migrate` - Run database migrations
- `npm run db:reset` - Reset database

### Testing

```bash
# Run frontend tests
cd frontend
npm run test

# Run backend tests
cd backend
npm run test

# Run end-to-end tests
npm run test:e2e
```

## 🐳 Docker Support

Run the entire application with Docker:

```bash
# Build and start all services
docker-compose up --build

# Start in detached mode
docker-compose up -d

# Stop all services
docker-compose down
```

## 🔒 Security Considerations

- **Private Keys**: Never store private keys in plaintext
- **Encryption**: All sensitive data is encrypted using AES-256
- **HTTPS**: Always use HTTPS in production
- **Input Validation**: All inputs are validated and sanitized
- **Rate Limiting**: API endpoints are rate-limited
- **CORS**: Proper CORS configuration for security

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Write unit tests for new features
- Update documentation for API changes
- Follow the existing code style
- Run linting before committing

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [ethers.js](https://docs.ethers.io/) - Ethereum library
- [React](https://reactjs.org/) - UI framework
- [Node.js](https://nodejs.org/) - Runtime environment
- [MetaMask](https://metamask.io/) - Inspiration for wallet functionality

## 📞 Support

For support and questions:

- Create an issue on GitHub
- Join our Discord community
- Email: support@walletrix.dev

## 🗺️ Roadmap

- [ ] Multi-signature wallet support
- [ ] Mobile application (React Native)
- [ ] Browser extension
- [ ] Advanced DeFi integrations
- [ ] Cross-chain bridge support
- [ ] DAO governance features

---

**Disclaimer**: This is a cryptocurrency wallet application. Always backup your seed phrases and private keys. The developers are not responsible for any loss of funds due to user error or security breaches.