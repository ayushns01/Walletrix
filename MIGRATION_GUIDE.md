# Database Migration Guide

## Overview
This guide provides step-by-step instructions for migrating from the current complex schema to the new streamlined, industry-standard database design.

## Pre-Migration Checklist

### 1. Backup Current Database
```bash
# Create a complete backup
pg_dump -h localhost -U username -d walletrix_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Verify backup integrity
pg_restore --list backup_*.sql
```

### 2. Environment Preparation
```bash
# Stop the application
pm2 stop walletrix-backend

# Create migration environment
cp .env .env.backup
export NODE_ENV=migration
```

## Migration Strategy

### Phase 1: Schema Creation (Zero Downtime)
Create new tables alongside existing ones to test the migration process.

```sql
-- Step 1: Create new schema version
CREATE SCHEMA walletrix_v2;

-- Step 2: Set search path for new schema
SET search_path TO walletrix_v2, public;

-- Step 3: Apply new Prisma schema to v2 schema
-- Run: npx prisma db push --schema=./prisma/schema.prisma
```

### Phase 2: Data Migration Scripts

#### 2.1 User Migration
```sql
-- Migrate users with enhanced security fields
INSERT INTO walletrix_v2.users (
  id, email, password_hash, username, display_name, 
  email_verified, is_active, created_at, updated_at, last_login_at
)
SELECT 
  id, 
  email, 
  "passwordHash" as password_hash,
  NULL as username, -- Add username logic if needed
  "name" as display_name,
  true as email_verified, -- Assume existing users are verified
  "isActive" as is_active,
  "createdAt" as created_at,
  "updatedAt" as updated_at,
  "lastLogin" as last_login_at
FROM public.users
WHERE "isActive" = true;
```

#### 2.2 User Preferences Migration
```sql
-- Migrate user preferences with enhanced structure
INSERT INTO walletrix_v2.user_preferences (
  user_id, default_network, preferred_currency, theme, 
  language, timezone, notifications, updated_at
)
SELECT 
  "userId" as user_id,
  COALESCE("defaultNetwork", 'ethereum') as default_network,
  COALESCE("currency", 'USD') as preferred_currency,
  COALESCE("theme", 'dark') as theme,
  COALESCE("language", 'en') as language,
  COALESCE("timezone", 'UTC') as timezone,
  COALESCE("notifications", '{}') as notifications,
  "updatedAt" as updated_at
FROM public."UserPreferences" up
WHERE EXISTS (SELECT 1 FROM walletrix_v2.users u WHERE u.id = up."userId");
```

#### 2.3 Wallet Migration with Enhanced Security
```sql
-- Migrate wallets with proper encryption structure
INSERT INTO walletrix_v2.wallets (
  id, user_id, name, description, wallet_type,
  encrypted_private_keys, addresses, is_active,
  created_at, updated_at, last_accessed_at
)
SELECT 
  w.id,
  w."userId" as user_id,
  COALESCE(w."name", 'My Wallet') as name,
  w."description",
  'hd' as wallet_type, -- Assume HD wallets, adjust as needed
  w."encryptedData"::jsonb as encrypted_private_keys,
  w."addresses",
  w."isActive" as is_active,
  w."createdAt" as created_at,
  w."updatedAt" as updated_at,
  w."lastAccessed" as last_accessed_at
FROM public."Wallet" w
WHERE w."isActive" = true
  AND EXISTS (SELECT 1 FROM walletrix_v2.users u WHERE u.id = w."userId");
```

#### 2.4 Transaction Migration with Enhanced Precision
```sql
-- Migrate transactions with proper decimal handling
INSERT INTO walletrix_v2.transactions (
  id, wallet_id, network, tx_hash, block_number,
  from_address, to_address, amount, token_symbol, token_address,
  status, gas_used, gas_price, nonce, timestamp,
  is_incoming, usd_value_at_time, category, metadata,
  created_at, updated_at
)
SELECT 
  t.id,
  t."walletId" as wallet_id,
  t."network",
  t."txHash" as tx_hash,
  t."blockNumber" as block_number,
  t."fromAddress" as from_address,
  t."toAddress" as to_address,
  -- Convert string amounts to proper decimals
  CASE 
    WHEN t."amount" ~ '^[0-9]+\.?[0-9]*$' THEN t."amount"::decimal(36,18)
    ELSE 0::decimal(36,18)
  END as amount,
  COALESCE(t."tokenSymbol", 'ETH') as token_symbol,
  t."tokenAddress" as token_address,
  CASE 
    WHEN t."status" = 'success' THEN 'confirmed'
    WHEN t."status" = 'failed' THEN 'failed'
    ELSE 'pending'
  END as status,
  t."gasUsed" as gas_used,
  CASE 
    WHEN t."gasPrice" ~ '^[0-9]+$' THEN t."gasPrice"::decimal(36,0)
    ELSE NULL
  END as gas_price,
  t."nonce",
  t."timestamp",
  t."isIncoming" as is_incoming,
  t."usdValue" as usd_value_at_time,
  COALESCE(t."category", 'transfer') as category,
  t."metadata",
  t."createdAt" as created_at,
  t."updatedAt" as updated_at
FROM public."Transaction" t
WHERE EXISTS (SELECT 1 FROM walletrix_v2.wallets w WHERE w.id = t."walletId")
  AND t."txHash" IS NOT NULL
  AND t."txHash" != '';
```

This migration should be performed during maintenance windows with proper testing in staging environments first.