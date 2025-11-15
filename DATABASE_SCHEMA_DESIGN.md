# Streamlined Database Schema Design

## Overview
This document outlines a revised, streamlined database schema for the Walletrix cryptocurrency wallet application, following industry best practices for security, performance, and scalability.

## Core Design Principles

### 1. Security-First Approach
- Sensitive data (private keys, mnemonics) stored encrypted
- Separate sensitive data into dedicated secure tables
- Audit trails for all critical operations
- Session management for authentication

### 2. Performance Optimization
- Strategic indexing on frequently queried columns
- Proper data types for cryptocurrency precision
- Efficient foreign key relationships
- Pagination-friendly design

### 3. Scalability & Normalization
- 3NF normalization to reduce redundancy
- Separate concerns (users, wallets, transactions)
- Extensible design for new blockchain networks
- Future-proof for additional features

## Essential Tables Design

### Core Tables (Must-Have)

#### 1. Users
**Purpose**: User authentication and basic profile information
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  username VARCHAR(50) UNIQUE,
  display_name VARCHAR(100),
  email_verified BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  two_factor_enabled BOOLEAN DEFAULT FALSE,
  two_factor_secret VARCHAR(255), -- Encrypted TOTP secret
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ,
  
  CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_active ON users(is_active);
```

#### 2. User_Sessions
**Purpose**: Secure session management and refresh tokens
```sql
CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_token VARCHAR(255) UNIQUE NOT NULL,
  refresh_token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  is_active BOOLEAN DEFAULT TRUE
);

-- Indexes
CREATE INDEX idx_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_sessions_refresh ON user_sessions(refresh_token);
CREATE INDEX idx_sessions_expires ON user_sessions(expires_at);
```

#### 3. Wallets
**Purpose**: Wallet metadata and encrypted sensitive data
```sql
CREATE TABLE wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL DEFAULT 'My Wallet',
  description TEXT,
  wallet_type VARCHAR(20) NOT NULL DEFAULT 'hd', -- 'hd', 'imported', 'hardware'
  encrypted_mnemonic TEXT, -- Only for HD wallets
  encrypted_private_keys JSONB NOT NULL, -- Network-specific encrypted keys
  addresses JSONB NOT NULL, -- {"ethereum": "0x...", "bitcoin": "bc1..."}
  derivation_path VARCHAR(50), -- HD wallet derivation path
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_wallet_type CHECK (wallet_type IN ('hd', 'imported', 'hardware'))
);

-- Indexes
CREATE INDEX idx_wallets_user_id ON wallets(user_id);
CREATE INDEX idx_wallets_active ON wallets(is_active);
CREATE INDEX idx_wallets_type ON wallets(wallet_type);
```

#### 4. Transactions
**Purpose**: Transaction history and analytics
```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  network VARCHAR(30) NOT NULL,
  tx_hash VARCHAR(255) NOT NULL,
  block_number BIGINT,
  from_address VARCHAR(255) NOT NULL,
  to_address VARCHAR(255) NOT NULL,
  amount NUMERIC(36, 18) NOT NULL, -- High precision for crypto amounts
  token_symbol VARCHAR(20) NOT NULL DEFAULT 'ETH',
  token_address VARCHAR(255),
  token_decimals INTEGER DEFAULT 18,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  gas_used BIGINT,
  gas_price NUMERIC(36, 0), -- Wei precision
  nonce INTEGER,
  transaction_fee NUMERIC(36, 18),
  timestamp TIMESTAMPTZ NOT NULL,
  is_incoming BOOLEAN NOT NULL,
  usd_value_at_time NUMERIC(15, 2),
  category VARCHAR(30) DEFAULT 'transfer',
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_status CHECK (status IN ('pending', 'confirmed', 'failed', 'dropped')),
  CONSTRAINT valid_category CHECK (category IN ('transfer', 'swap', 'defi', 'nft', 'contract'))
);

-- Indexes (Critical for Performance)
CREATE UNIQUE INDEX idx_transactions_hash_network ON transactions(tx_hash, network);
CREATE INDEX idx_transactions_wallet_id ON transactions(wallet_id);
CREATE INDEX idx_transactions_wallet_timestamp ON transactions(wallet_id, timestamp DESC);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_network ON transactions(network);
CREATE INDEX idx_transactions_token ON transactions(token_symbol);
CREATE INDEX idx_transactions_category ON transactions(category);
CREATE INDEX idx_transactions_amount ON transactions(amount);
```

### Supporting Tables (Important)

#### 5. User_Preferences
**Purpose**: User-specific settings and configurations
```sql
CREATE TABLE user_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  default_network VARCHAR(30) DEFAULT 'ethereum',
  preferred_currency VARCHAR(5) DEFAULT 'USD',
  theme VARCHAR(20) DEFAULT 'dark',
  language VARCHAR(10) DEFAULT 'en',
  timezone VARCHAR(50) DEFAULT 'UTC',
  notifications JSONB DEFAULT '{}',
  privacy_settings JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_currency CHECK (preferred_currency IN ('USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD'))
);
```

#### 6. Activity_Logs
**Purpose**: Audit trail for security and compliance
```sql
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL,
  resource_type VARCHAR(30),
  resource_id UUID,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  success BOOLEAN NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_action CHECK (action IN ('login', 'logout', 'wallet_create', 'wallet_delete', 
    'transaction_send', 'settings_update', 'password_change', '2fa_enable', '2fa_disable'))
);

-- Indexes
CREATE INDEX idx_activity_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_timestamp ON activity_logs(timestamp DESC);
CREATE INDEX idx_activity_action ON activity_logs(action);
```

### Optional Tables (Enhancement)

#### 7. Address_Book
**Purpose**: Saved addresses for frequent transactions
```sql
CREATE TABLE address_book (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  address VARCHAR(255) NOT NULL,
  network VARCHAR(30) NOT NULL,
  notes TEXT,
  is_favorite BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, address, network)
);

-- Indexes
CREATE INDEX idx_address_book_user ON address_book(user_id);
CREATE INDEX idx_address_book_network ON address_book(network);
```

#### 8. Price_Cache
**Purpose**: Cached price data for performance
```sql
CREATE TABLE price_cache (
  symbol VARCHAR(20) PRIMARY KEY,
  name VARCHAR(100),
  price_usd NUMERIC(15, 8) NOT NULL,
  market_cap NUMERIC(20, 2),
  volume_24h NUMERIC(20, 2),
  change_24h NUMERIC(10, 4),
  change_7d NUMERIC(10, 4),
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT positive_price CHECK (price_usd > 0)
);

-- Indexes
CREATE INDEX idx_price_cache_updated ON price_cache(last_updated);
```

## Data Storage Guidelines

### 1. Encryption Strategy
- **Sensitive Data**: All private keys and mnemonics must be encrypted at rest
- **Encryption Algorithm**: AES-256-GCM
- **Key Management**: Use environment variables for encryption keys
- **Field-Level**: Encrypt before storing, decrypt when retrieving

### 2. Numeric Precision
- **Cryptocurrency Amounts**: Use NUMERIC(36, 18) for maximum precision
- **USD Values**: Use NUMERIC(15, 2) for financial calculations
- **Gas Values**: Use BIGINT for wei amounts, NUMERIC for ether amounts

### 3. JSON Storage
- **Addresses**: Store as JSONB for efficient querying
- **Metadata**: Use JSONB for flexible schema evolution
- **Preferences**: Store complex settings as structured JSON

### 4. Indexing Strategy
- **Primary Access Patterns**: wallet_id + timestamp for transaction queries
- **Search Patterns**: tx_hash, network, status for lookups
- **Composite Indexes**: Multi-column indexes for complex queries
- **Partial Indexes**: For filtered queries (is_active = true)

## Security Considerations

### 1. Data Protection
```sql
-- Row Level Security Example
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY wallet_access_policy ON wallets
  FOR ALL TO wallet_user
  USING (user_id = current_setting('app.current_user_id')::UUID);
```

### 2. Audit Triggers
```sql
-- Automatic audit logging
CREATE OR REPLACE FUNCTION audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO activity_logs(user_id, action, resource_type, resource_id, details, timestamp)
    VALUES (OLD.user_id, TG_OP, TG_TABLE_NAME, OLD.id, row_to_json(OLD), NOW());
    RETURN OLD;
  ELSE
    INSERT INTO activity_logs(user_id, action, resource_type, resource_id, details, timestamp)
    VALUES (NEW.user_id, TG_OP, TG_TABLE_NAME, NEW.id, row_to_json(NEW), NOW());
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;
```

### 3. Connection Security
- Use SSL/TLS for all database connections
- Implement connection pooling with proper limits
- Regular credential rotation

## Performance Optimization

### 1. Query Patterns
```sql
-- Efficient transaction history query
SELECT t.*, w.name as wallet_name
FROM transactions t
JOIN wallets w ON t.wallet_id = w.id
WHERE t.wallet_id = $1
  AND t.timestamp >= $2
  AND t.timestamp <= $3
ORDER BY t.timestamp DESC
LIMIT $4 OFFSET $5;
```

### 2. Partitioning Strategy (Future)
```sql
-- Partition transactions by month for large datasets
CREATE TABLE transactions (
  -- columns
) PARTITION BY RANGE (timestamp);

CREATE TABLE transactions_2024_01 PARTITION OF transactions
FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
```

### 3. Maintenance
- Regular VACUUM and ANALYZE operations
- Monitor slow query log
- Index usage analysis
- Connection pool monitoring

## Migration Strategy

### Phase 1: Core Tables
1. Create new streamlined tables
2. Migrate essential data (users, wallets)
3. Implement encryption for sensitive data

### Phase 2: Transaction Migration
1. Batch migrate transaction data
2. Implement new indexing strategy
3. Verify data integrity

### Phase 3: Enhancement Tables
1. Add audit logging
2. Implement address book
3. Optimize price caching

### Phase 4: Cleanup
1. Remove unused tables
2. Optimize indexes
3. Performance testing

This streamlined schema reduces complexity while maintaining all essential functionality, with a focus on security, performance, and scalability.