-- ============================================
-- WALLETRIX DATABASE MIGRATION FIX V2
-- Matches Prisma schema exactly
-- Date: 2026-01-02
-- ============================================

-- 1. Add missing columns to existing tables (based on Prisma schema)
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash_algorithm VARCHAR(20) DEFAULT 'bcrypt';

ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMP DEFAULT NOW();
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS tx_hash VARCHAR(255);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS token_symbol VARCHAR(50) DEFAULT 'ETH';
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS token_decimals INTEGER DEFAULT 18;

-- 2. Create BIP-85 Child Wallets table
CREATE TABLE IF NOT EXISTS bip85_child_wallets (
    id TEXT PRIMARY KEY,
    parent_wallet_id TEXT NOT NULL,
    child_index INTEGER NOT NULL,
    word_count INTEGER NOT NULL,
    derivation_path TEXT NOT NULL,
    encrypted_mnemonic TEXT NOT NULL,
    addresses JSONB NOT NULL,
    label TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. Create Multi-Sig Wallet table (matches Prisma MultiSigWallet model)
CREATE TABLE IF NOT EXISTS multisig_wallets (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    network TEXT NOT NULL,
    wallet_type TEXT NOT NULL,
    address TEXT NOT NULL,
    required_signatures INTEGER NOT NULL,
    total_signers INTEGER NOT NULL,
    redeem_script TEXT,
    configuration JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW (matches Prisma MultiSigSigner model)
CREATE TABLE IF NOT EXISTS multisig_signers (
    id TEXT PRIMARY KEY,
    multisig_wallet_id TEXT NOT NULL,
    user_id TEXT,
    public_key TEXT NOT NULL,
    address TEXT NOT NULL,
    label TEXT,
    "order"ess TEXT NOT NULL,
    signer_name TEXT,
    public_key TEXT,
    order_index INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
 (matches Prisma MultiSigTransaction model)
CREATE TABLE IF NOT EXISTS multisig_transactions (
    id TEXT PRIMARY KEY,
    multisig_wallet_id TEXT NOT NULL,
    to_address TEXT NOT NULL,
    amount DECIMAL(36, 18) NOT NULL,
    token_symbol TEXT DEFAULT 'ETH',
    data TEXT,
    status TEXT DEFAULT 'pending',
    required_signatures INTEGER NOT NULL,
    current_signatures INTEGER DEFAULT 0,
    tx_hash TEXTn_hash TEXT,
    data JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    executed_at TIMESTAMP
);
 (matches Prisma MultiSigSignature model)
CREATE TABLE IF NOT EXISTS multisig_signatures (
    id TEXT PRIMARY KEY,
    multisig_transaction_id TEXT NOT NULL,
    signer_id TEXT NOT NULL,
    signature TEXT NOT NULL,
    signture TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
 (matches Prisma Notification model)
CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    is_read BOOLEAN DEFAULT false,
    action_url TEXT
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 8. Create indexes for BIP-85
CREATE INDEX IF NOT EXISTS idx_bip85_parent ON bip85_child_wallets(parent_wallet_id);
CREATE INDEX IF NOT EXISTS idx_bip85_active ON bip85_child_wallets(is_active);

-- 9. Create indexes for Multi-Sig Wallets
CREATE INDEX IF NOT EXISTS idx_multisig_user ON multisig_wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_multisig_address ON multisig_wallets(address);

-- 9b. Add unique constraint for multisig_signers
CREATE UNIQUE INDEX IF NOT EXISTS multisig_signers_multisig_wallet_id_public_key_key ON multisig_signers(multisig_wallet_id, public_key);
CREATE INDEX IF NOT EXISTS idx_multisig_active ON multisig_wallets(is_active);

-- 10. Create indexes for Multi-Sig Signers
CREATE INDEX IF NOT EXISTS idx_signer_wallet ON multisig_signers(multisig_wallet_id);

-- 11. Create indexes for Multi-Sig Transactions
CREATE INDEX IF NOT EXISTS idx_multisig_tx_wallet ON multisig_transactions(multisig_wallet_i

-- 12b. Add unique constraint for multisig_signatures
CREATE UNIQUE INDEX IF NOT EXISTS multisig_signatures_multisig_transaction_id_signer_id_key ON multisig_signatures(multisig_transaction_id, signer_id);d);
CREATE INDEX IF NOT EXISTS idx_multisig_tx_status ON multisig_transactions(status);

-- 12. Create indexes for Multi-Sig Signatures
CREATE INDEX IF NOT EXISTS idx_signature_tx ON multisig_signatures(multisig_transaction_id);

-- 13. Create indexes for Notifications
CREATE INDEX IF NOT EXISTS idx_notification_user_read ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notification_created ON notifications(created_at);

-- 14. Add foreign key constraints (separate from table creation to handle existing data)
ALTER TABLE bip85_child_wallets DROP CONSTRAINT IF EXISTS fk_parent_wallet;
ALTER TABLE bip85_child_wallets ADD CONSTRAINT fk_parent_wallet 
    FOREIGN KEY (parent_wallet_id) REFERENCES wallets(id) ON DELETE CASCADE;

ALTER TABLE bip85_child_wallets DROP CONSTRAINT IF EXISTS unique_parent_child;
ALTER TABLE bip85_child_wallets ADD CONSTRAINT unique_parent_child 
    UNIQUE (parent_wallet_id, child_index);

ALTER TABLE multisig_signers DROP CONSTRAINT IF EXISTS fk_multisig_wallet;
ALTER TABLE multisig_signers ADD CONSTRAINT fk_multisig_wallet 
    FOREIGN KEY (multisig_wallet_id) REFERENCES multisig_wallets(id) ON DELETE CASCADE;

ALTER TABLE multisig_transactions DROP CONSTRAINT IF EXISTS fk_multisig_wallet_tx;
ALTER TABLE multisig_transactions ADD CONSTRAINT fk_multisig_wallet_tx 
    FOREIGN KEY (multisig_wallet_id) REFERENCES multisig_wallets(id) ON DELETE CASCADE;

ALTER TABLE multisig_signatures DROP CONSTRAINT IF EXISTS fk_multisig_tx;
ALTER TABLE multisig_signatures ADD CONSTRAINT fk_multisig_tx 
    FOREIGN KEY (multisig_transaction_id) REFERENCES multisig_transactions(id) ON DELETE CASCADE;
