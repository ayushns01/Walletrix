# Walletrix — Implementation Plan

> Security improvements and feature roadmap

---

## ✅ Completed Security Fixes

### 1.1 ✅ Fixed Cryptographic RNG
**File:** `backend/src/services/multiSigService.js`

Changed from `Math.random()` to `crypto.randomBytes()` for cryptographically secure salt generation.

---

### 1.2 ✅ Fixed Misleading zk-SNARK Claims
**File:** `backend/src/services/privacyCommitmentService.js`

- Renamed service to `PrivacyCommitmentService`
- Removed unused `groth16` import from snarkjs
- Updated documentation to honestly describe hash-based commitments
- Removed false "Groth16" and "zk-SNARK" claims from README and docs

---

### 1.3 ✅ Fixed Private Key Exposure in API Responses
**File:** `backend/src/controllers/walletController.js`

- Removed private keys from all API responses
- Wallet generation now only returns addresses
- Private key derivation happens client-side from mnemonic

---

### 1.4 ✅ Fixed Stealth Address ECDH Implementation
**File:** `backend/src/services/stealthAddressService.js`

- Replaced fake ECDH (hash concatenation) with real elliptic curve operations
- Now uses `@noble/secp256k1` for proper point multiplication
- Implements actual ECC point addition for stealth address derivation
- Updated to version 2.0.0

---

## 🔜 Future Improvements (Roadmap)

---

## Phase 2: Medium Priority Fixes (Day 2-3)
**Time Estimate: 2-3 hours**

### 2.1 Fix Test Import Paths
**Files:** `backend/tests/services/*.test.js`

**Current (Broken):**
```javascript
import walletService from '../walletService.js';
```

**Fixed:**
```javascript
import walletService from '../../src/services/walletService.js';
```

**Apply to all files in `backend/tests/services/`:**
- `walletService.test.js`
- `privacyCommitmentService.test.js`
- `shamirSecretService.test.js`
- `stealthAddressService.test.js`
- `argon2Service.test.js`
- `authService.test.js`

---

### 2.2 Achieve Passing Test Coverage

**Step 1:** Fix imports (above)

**Step 2:** Run tests and fix failures
```bash
cd backend
npm test -- --coverage
```

**Step 3:** Target minimum 50% coverage on critical services:
- `walletService.js` — Key generation, import
- `argon2Service.js` — Password hashing
- `ethereumService.js` — Balance queries
- `transactionSecurityService.js` — Validation logic

**Step 4:** Update `jest.config.js` with coverage thresholds:
```javascript
coverageThreshold: {
    global: {
        branches: 40,
        functions: 50,
        lines: 50,
        statements: 50,
    },
},
```

---

### 2.3 Implement Basic Stealth Address Scanning
**File:** `backend/src/services/stealthAddressService.js`

**Add new method:**
```javascript
/**
 * Scan blockchain for payments to stealth addresses
 * @param {string} scanPrivateKey - Recipient's scan private key
 * @param {string} spendPublicKey - Recipient's spend public key
 * @param {Array<Object>} announcements - Array of {ephemeralPubKey, stealthAddress}
 * @returns {Array<Object>} Detected payments with derived spending keys
 */
async scanForPayments(scanPrivateKey, spendPublicKey, announcements) {
    const detectedPayments = [];
    
    for (const announcement of announcements) {
        try {
            // Compute shared secret
            const sharedSecret = this._computeSharedSecret(
                scanPrivateKey, 
                announcement.ephemeralPubKey
            );
            
            // Derive expected stealth address
            const expectedAddress = this._deriveStealthAddress(
                spendPublicKey, 
                sharedSecret
            );
            
            // Check if announcement matches
            if (expectedAddress.toLowerCase() === announcement.stealthAddress.toLowerCase()) {
                // Derive spending key
                const spendingKey = this._deriveSpendingKey(
                    spendPrivateKey,  // Would need to be passed
                    sharedSecret
                );
                
                detectedPayments.push({
                    stealthAddress: announcement.stealthAddress,
                    ephemeralPubKey: announcement.ephemeralPubKey,
                    // In production: check balance, return spending key securely
                });
            }
        } catch (error) {
            // Continue scanning other announcements
            console.error('Scan error:', error.message);
        }
    }
    
    return detectedPayments;
}
```

---

## Phase 3: Low Priority Enhancements (Day 4-7)
**Time Estimate: 4-8 hours**

### 3.1 Deploy Simple Contract to Sepolia
**New File:** `contracts/SimpleWallet.sol`

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract SimpleWallet {
    address public owner;
    
    event Deposit(address indexed from, uint256 amount);
    event Withdrawal(address indexed to, uint256 amount);
    
    constructor() {
        owner = msg.sender;
    }
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    receive() external payable {
        emit Deposit(msg.sender, msg.value);
    }
    
    function withdraw(uint256 amount) external onlyOwner {
        require(address(this).balance >= amount, "Insufficient balance");
        payable(owner).transfer(amount);
        emit Withdrawal(owner, amount);
    }
    
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
```

**Deployment Steps:**
```bash
# Install Hardhat
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox

# Initialize
npx hardhat init

# Deploy to Sepolia
npx hardhat run scripts/deploy.js --network sepolia

# Verify on Etherscan
npx hardhat verify --network sepolia <CONTRACT_ADDRESS>
```

**Add to README:**
```markdown
## Deployed Contracts

| Network | Contract | Address | Verified |
|---------|----------|---------|----------|
| Sepolia | SimpleWallet | `0x...` | [Etherscan](link) |
```

---

### 3.2 Integrate Gnosis Safe SDK (Replace Mock)
**File:** `backend/src/services/multiSigService.js`

```bash
npm install @safe-global/safe-core-sdk @safe-global/safe-ethers-lib
```

```javascript
import Safe from '@safe-global/safe-core-sdk';
import EthersAdapter from '@safe-global/safe-ethers-lib';

async createRealGnosisSafe(owners, threshold, signer) {
    const ethAdapter = new EthersAdapter({ ethers, signerOrProvider: signer });
    
    const safeFactory = await SafeFactory.create({ ethAdapter });
    
    const safeAccountConfig = {
        owners,
        threshold,
    };
    
    const safeSdk = await safeFactory.deploySafe({ safeAccountConfig });
    const safeAddress = await safeSdk.getAddress();
    
    return {
        address: safeAddress,
        type: 'gnosis-safe',
        owners,
        threshold,
        deployed: true,
    };
}
```

---

### 3.3 Update README — Remove "Enterprise-Grade" Claim

**Current:**
```markdown
# 🔐 Walletrix
**Enterprise-Grade Multi-Chain Cryptocurrency Wallet**
```

**Updated:**
```markdown
# 🔐 Walletrix
**Multi-Chain Cryptocurrency Wallet**

*A full-stack wallet implementation demonstrating HD key derivation, multi-signature schemes, and blockchain transaction handling.*
```

---

## Checklist

### Phase 1 — Critical ✅
- [x] Fix `Math.random()` → `crypto.randomBytes()`
- [x] Rename zkProofService → privacyCommitmentService (honest naming)
- [x] Remove private keys from API responses
- [x] Fix stealth address ECDH with real ECC operations

### Phase 2 — Medium 🔄
- [ ] Fix all test import paths
- [ ] Achieve 50%+ test coverage
- [ ] Add basic stealth address scanning

### Phase 3 — Low 📋
- [ ] Deploy SimpleWallet to Sepolia
- [ ] Add verified contract address to README
- [ ] Integrate real Gnosis Safe SDK (optional)
- [ ] Update README claims to be accurate

---

## Post-Implementation Verification

```bash
# Run all tests
cd backend && npm test -- --coverage

# Check for security issues
npm audit

# Verify no secrets in code
grep -r "privateKey\|secret" --include="*.js" | grep -v node_modules | grep -v test
```

---

## Impact on Interview Readiness

| Phase | Completion | Interview Impact |
|-------|------------|------------------|
| Phase 1 | Required | Eliminates red flags that would cause rejection |
| Phase 2 | Recommended | Shows professional testing practices |
| Phase 3 | Optional | Differentiates from other candidates |

**Minimum viable: Complete Phase 1 before submitting applications.**
