# Walletrix Backend API Testing

## Base URL
```
http://localhost:3001/api/v1
```

## Wallet Endpoints

### 1. Generate New Wallet
**POST** `/wallet/generate`

**Response:**
```json
{
  "success": true,
  "message": "Wallet generated successfully",
  "data": {
    "mnemonic": "word1 word2 ... word12",
    "ethereum": {
      "address": "0x...",
      "privateKey": "0x..."
    },
    "bitcoin": {
      "address": "1...",
      "privateKey": "..."
    }
  },
  "warning": "Store your mnemonic phrase securely. Never share it with anyone."
}
```

### 2. Import Wallet from Mnemonic
**POST** `/wallet/import/mnemonic`

**Body:**
```json
{
  "mnemonic": "your twelve word mnemonic phrase goes here like this example"
}
```

### 3. Import Ethereum Wallet from Private Key
**POST** `/wallet/import/private-key`

**Body:**
```json
{
  "privateKey": "0x..."
}
```

### 4. Derive Multiple Accounts
**POST** `/wallet/derive-accounts`

**Body:**
```json
{
  "mnemonic": "your twelve word mnemonic phrase",
  "count": 5
}
```

### 5. Validate Address
**GET** `/wallet/validate/:network/:address`

**Example:**
- `/wallet/validate/ethereum/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0`
- `/wallet/validate/bitcoin/1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa`

### 6. Encrypt Data
**POST** `/wallet/encrypt`

**Body:**
```json
{
  "data": "sensitive data to encrypt",
  "password": "your-secure-password"
}
```

### 7. Decrypt Data
**POST** `/wallet/decrypt`

**Body:**
```json
{
  "encryptedData": "encrypted string",
  "password": "your-secure-password"
}
```

## Testing with PowerShell

### Generate New Wallet
```powershell
Invoke-RestMethod -Uri "http://localhost:3001/api/v1/wallet/generate" -Method POST | ConvertTo-Json -Depth 10
```

### Validate Ethereum Address
```powershell
Invoke-RestMethod -Uri "http://localhost:3001/api/v1/wallet/validate/ethereum/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0" -Method GET | ConvertTo-Json
```

### Health Check
```powershell
Invoke-RestMethod -Uri "http://localhost:3001/health" -Method GET | ConvertTo-Json
```

## Testing with cURL

### Generate New Wallet
```bash
curl -X POST http://localhost:3001/api/v1/wallet/generate
```

### Import from Mnemonic
```bash
curl -X POST http://localhost:3001/api/v1/wallet/import/mnemonic \
  -H "Content-Type: application/json" \
  -d '{"mnemonic":"your twelve word phrase here"}'
```

### Encrypt Data
```bash
curl -X POST http://localhost:3001/api/v1/wallet/encrypt \
  -H "Content-Type: application/json" \
  -d '{"data":"my secret key", "password":"strongpassword123"}'
```
