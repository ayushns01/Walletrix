# Walletrix Security Practices

A comprehensive overview of the security measures implemented in the Walletrix cryptocurrency wallet platform.

---

## 🔐 Cryptography & Key Management

### Argon2id Password Hashing
**File**: `backend/src/services/argon2Service.js`

Winner of the Password Hashing Competition (PHC) 2015. Recommended by OWASP and NIST.

| Parameter | Value | Purpose |
|-----------|-------|---------|
| **Algorithm** | Argon2id | Combines data-independent and data-dependent modes |
| **Memory Cost** | 64 MB | Resistant to GPU/ASIC attacks |
| **Time Cost** | 3 iterations | Increases computation time |
| **Parallelism** | 4 threads | Optimal for server-side hashing |
| **Hash Length** | 256-bit | Cryptographically secure output |
| **Salt Length** | 128-bit | Auto-generated unique salt per password |

**Features**:
- Automatic migration from bcrypt hashes
- Rehash detection for security upgrades
- Algorithm auto-detection for backward compatibility

---

### AES-256-GCM Encryption
**File**: `backend/src/services/walletService.js`

Industry-standard authenticated encryption for wallet data.

| Parameter | Value |
|-----------|-------|
| **Algorithm** | AES-256-GCM |
| **Key Derivation** | PBKDF2-SHA256 |
| **Iterations** | 600,000 (OWASP 2024 standard) |
| **IV Length** | 128-bit |
| **Key Length** | 256-bit |
| **Auth Tag** | 128-bit |

**Features**:
- Authenticated encryption (tamper detection)
- Unique IV per encryption operation
- OWASP-compliant key derivation

---

### Shamir's Secret Sharing
**File**: `backend/src/services/shamirSecretService.js`

Implements (k, n)-threshold secret sharing for mnemonic recovery.

**How It Works**:
1. Split mnemonic into N shares (e.g., 5 shares)
2. Require K shares to recover (e.g., 3-of-5)
3. Distribute shares to trusted guardians
4. Even if K-1 shares are compromised, secret remains secure

**Methods**:
- `splitSecret()` - Split mnemonic into threshold shares
- `recoverSecret()` - Reconstruct from sufficient shares
- `createSocialRecovery()` - Set up guardian-based recovery
- `validateShare()` - Verify share format
- `assessSecurity()` - Evaluate threshold security level

---

### BIP-85 Deterministic Entropy
**File**: `backend/src/services/bip85Service.js`

Derive unlimited independent child wallets from a single master seed.

**Derivation Path**: `m/83696968'/39'/0'/{language}'/0'/{words}'/index'`

**Features**:
- Single backup for unlimited wallets
- Hierarchical wallet structure (personal, business, savings)
- Standards-compliant (Bitcoin Improvement Proposal 85)
- Deterministic validation

**Use Cases**:
- Separate wallets for different purposes
- Corporate wallet management
- Inheritance planning

---

### Privacy Commitments (Poseidon Hash)
**File**: `backend/src/services/privacyCommitmentService.js`

Implements hash-based privacy commitments for balance verification.

**Technology Stack**:
- **Hash Function**: Poseidon (optimized for cryptographic circuits)
- **Commitments**: Hash-based commitments with blinding factors

> **Note**: This is a simplified implementation using Poseidon hash commitments.
> It is NOT a full zk-SNARK implementation. No Circom circuits or Groth16 proofs are used.

**Current Features**:
- Hash-based balance commitments
- Pedersen-style commitments with blinding factors
- Privacy-preserving amount hiding

**Methods**:
- `proveBalanceAboveThreshold()` - Generate hash-based balance commitment
- `verifyBalanceProof()` - Verify commitment
- `createPedersenCommitment()` - Hide transaction amounts
- `hashPoseidon()` - Poseidon hashing

---

### Stealth Addresses
**File**: `backend/src/services/stealthAddressService.js`

Monero-style privacy for Ethereum using proper ECDH key exchange.

**Protocol**:
1. Recipient publishes meta-address (scan key + spend key)
2. Sender generates ephemeral key pair
3. Sender computes shared secret via ECDH (secp256k1 point multiplication)
4. Sender derives one-time stealth address
5. Recipient scans blockchain to detect payments

**Implementation**:
- **Library**: @noble/secp256k1 for proper elliptic curve operations
- **Curve**: secp256k1
- **Key Exchange**: ECDH via scalar multiplication
- One-time addresses per payment
- Blockchain scanning for payment detection
- Private key derivation for spending

---

## � Multi-Signature Wallets
**File**: `backend/src/services/multiSigService.js`

Enterprise-grade M-of-N signature schemes.

### Bitcoin Multi-Sig
| Type | Description |
|------|-------------|
| **P2SH** | Pay-to-Script-Hash (legacy) |
| **P2WSH** | Pay-to-Witness-Script-Hash (SegWit) |
| **HD Multisig** | BIP-48 compliant derivation |

### Ethereum Multi-Sig
- **Gnosis Safe** integration
- CREATE2 deterministic address prediction
- Threshold signature validation

### Recommended Configurations
| Signers | Threshold | Use Case |
|---------|-----------|----------|
| 2 | 2-of-2 | Joint accounts |
| 3 | 2-of-3 | Standard corporate |
| 5 | 3-of-5 | High-security institutional |

---

## 🔑 Authentication & Authorization

### Clerk Authentication
**File**: `backend/src/middleware/clerkAuth.js`

Enterprise authentication provider integration.

**Features**:
- JWT token verification via Clerk SDK
- Automatic database user sync
- Profile picture and display name sync
- Multi-provider support (Google, email)

### JWT Token System
**File**: `backend/src/services/sessionService.js`

| Token Type | Expiration | Purpose |
|------------|------------|---------|
| Access Token | 15 minutes | API authentication |
| Refresh Token | 7 days | Token renewal |

**Security Features**:
- Token rotation on refresh
- Session blacklisting for immediate invalidation
- Maximum 5 concurrent sessions per user
- IP and user-agent tracking
- Hourly expired token cleanup

### Two-Factor Authentication (2FA)
**File**: `backend/src/services/twoFactorService.js`

| Method | Implementation |
|--------|----------------|
| **TOTP** | Speakeasy library, 6-digit codes, 30s window |
| **SMS** | Verification code delivery (infrastructure ready) |
| **Email** | OTP via email (infrastructure ready) |
| **Backup Codes** | 10 one-time recovery codes |

**Features**:
- QR code generation for authenticator apps
- Backup code warning notifications
- Multi-method support

---

## 🛡️ API Security

### Rate Limiting
**File**: `backend/src/middleware/rateLimiters.js`

12 specialized rate limiters:

| Limiter | Window | Max Requests | Purpose |
|---------|--------|--------------|---------|
| **auth** | 15 min | 5 | Brute-force prevention |
| **walletGeneration** | 1 hour | 50 (prod) | Wallet creation |
| **transaction** | 1 min | 10 | Transaction spam |
| **blockchainQuery** | 1 min | 120 (prod) | Balance/TX queries |
| **priceData** | 1 min | 100 | Price API calls |
| **tokenQuery** | 1 min | 60 | Token info requests |
| **databaseWallet** | 1 min | 30 (prod) | Wallet CRUD |
| **global** | 15 min | 100 (prod) | Fallback limit |
| **perUser** | 24 hours | 10,000 | Daily user quota |
| **strict** | 1 hour | 3 | Sensitive operations |
| **backup** | 1 hour | 5 | Backup exports |
| **sensitive** | 24 hours | 2 | Mnemonic exports |

### Security Headers
**File**: `backend/src/middleware/securityHeadersMiddleware.js`

| Header | Value | Protection |
|--------|-------|------------|
| X-Frame-Options | DENY | Clickjacking |
| X-Content-Type-Options | nosniff | MIME sniffing |
| X-XSS-Protection | 1; mode=block | XSS (legacy) |
| Referrer-Policy | strict-origin-when-cross-origin | Referrer leakage |
| Permissions-Policy | geolocation=(), camera=(), etc. | Feature restriction |
| Cross-Origin-Opener-Policy | same-origin | Cross-origin attacks |
| Cross-Origin-Embedder-Policy | require-corp | Resource isolation |
| Cross-Origin-Resource-Policy | same-origin | Resource leakage |
| Expect-CT | max-age=86400, enforce | Certificate transparency |
| Strict-Transport-Security | max-age=31536000 | HTTPS enforcement |

### Content Security Policy
```
default-src 'self'
script-src 'self' 'unsafe-inline'
style-src 'self' 'unsafe-inline'
img-src 'self' data: https:
connect-src 'self' https://api.coingecko.com https://*.etherscan.io
frame-ancestors 'none'
object-src 'none'
```

---

## ✅ Input Validation
**File**: `backend/src/middleware/validation.js`

Comprehensive validation using express-validator (481 lines).

### Custom Validators
- `isValidEthereumAddress()` - Ethereum address format
- `isValidBitcoinAddress()` - Bitcoin address format (mainnet/testnet)
- `isValidNetworkAddress()` - Multi-chain address validation
- `isValidAmount()` - Transaction amount validation
- `isValidMnemonic()` - 12/24 word mnemonic validation
- `isValidPrivateKey()` - Private key format validation

### Validation Rules
- **Authentication**: Email normalization, password strength (min 8 chars)
- **Wallet**: Mnemonic validation, address validation per network
- **Transactions**: Amount limits, gas price validation, nonce checks
- **Tokens**: Token address validation, balance array limits (1-50)
- **2FA**: 6-digit TOTP validation, backup code format

---

## 🔒 Transaction Security
**File**: `backend/src/services/transactionSecurityService.js`

### Pre-Transaction Validation
- Address format validation (Ethereum, Bitcoin)
- Balance verification (including gas fees)
- Amount sanity checks

### Risk Assessment
- **Address Reputation**: Check against known scam database
- **Address Poisoning Detection**: Identify similar addresses
- **Anomaly Detection**: Flag unusual transaction amounts
- **Recipient History**: Check if previously transacted

### Transaction Simulation
- Simulate transaction before broadcasting
- Estimate gas costs
- Predict success/failure

---

## �️ HD Wallet Security
**File**: `backend/src/services/walletService.js`

### Standards Compliance
- **BIP-39**: Mnemonic phrase generation (12/24 words)
- **BIP-32**: HD key derivation
- **BIP-44**: Multi-account hierarchy
- **BIP-48**: Multi-sig derivation paths

### Key Generation
- Cryptographically secure random entropy
- Mnemonic strength validation (128-256 bits)
- Password strength validation with scoring

### Supported Networks
- Ethereum (+ all EVM chains)
- Bitcoin (mainnet/testnet)
- Solana
- Polygon, Arbitrum, Optimism, BSC, Avalanche, Base

---

## 📊 Monitoring & Logging

### Winston Logger
**File**: `backend/src/services/loggerService.js`

- Structured JSON logs
- Daily log rotation
- Security event tracking
- Error tracing with stack traces

### Activity Logging
**File**: `backend/src/services/activityLogService.js`

- Wallet operations audit trail
- Login/logout tracking
- Transaction history
- IP address logging

---

## 📈 Security Metrics

| Metric | Value |
|--------|-------|
| **Password Hash Time** | ~300-500ms |
| **Encryption Standard** | AES-256-GCM |
| **Key Derivation Iterations** | 600,000 (PBKDF2) |
| **Memory Cost (Argon2)** | 64 MB |
| **Max Concurrent Sessions** | 5 per user |
| **Auth Rate Limit** | 5 attempts/15min |
| **Sensitive Op Limit** | 2/day |
| **Validation Rules** | 481 lines |
| **Security Services** | 8 dedicated services |
| **Rate Limiters** | 12 specialized limiters |

---

## 🔜 Security Roadmap

- [ ] Complete SMS 2FA integration
- [ ] Email 2FA implementation
- [ ] Hardware wallet support (Ledger, Trezor)
- [ ] MEV protection (Flashbots)
- [ ] Quantum-resistant signatures (CRYSTALS-Dilithium)
- [ ] Smart contract vulnerability scanner

---

*Last Updated: January 2026*
