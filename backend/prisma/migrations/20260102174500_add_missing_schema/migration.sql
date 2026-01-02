-- ============================================
-- WALLETRIX DATABASE MIGRATION FIX
-- Adds missing columns and tables to production database
-- Date: 2026-01-02
-- ============================================

-- 1. Fix User table - Add missing column
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS password_hash_algorithm VARCHAR(20) DEFAULT 'bcrypt';

-- 2. Fix UserSession table - Add missing column
ALTER TABLE user_sessions 
ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMP DEFAULT NOW();

-- 3. Fix Transaction table - Add missing column
-- Check if column exists before adding to avoid errors
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transactions' AND column_name = 'tx_hash'
    ) THEN
        ALTER TABLE transactions ADD COLUMN tx_hash VARCHAR(255);
    END IF;
END $$;

-- 4. Create BIP-85 Child Wallets table
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
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT fk_parent_wallet FOREIGN KEY (parent_wallet_id) 
        REFERENCES wallets(id) ON DELETE CASCADE,
    CONSTRAINT unique_parent_child UNIQUE (parent_wallet_id, child_index)
);

CREATE INDEX IF NOT EXISTS idx_bip85_parent ON bip85_child_wallets(parent_wallet_id);
CREATE INDEX IF NOT EXISTS idx_bip85_active ON bip85_child_wallets(is_active);

-- 5. Create Multi-Sig Wallet table
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
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT fk_multisig_user FOREIGN KEY (user_id) 
        REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_multisig_user ON multisig_wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_multisig_address ON multisig_wallets(address);
CREATE INDEX IF NOT EXISTS idx_multisig_active ON multisig_wallets(is_active);

-- 6. Create Multi-Sig Signers table
CREATE TABLE IF NOT EXISTS multisig_signers (
    id TEXT PRIMARY KEY,
    multisig_wallet_id TEXT NOT NULL,
    user_id TEXT,
    public_key TEXT NOT NULL,
    address TEXT NOT NULL,
    label TEXT,
    "order" INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT fk_signer_wallet FOREIGN KEY (multisig_wallet_id) 
        REFERENCES multisig_wallets(id) ON DELETE CASCADE,
    CONSTRAINT unique_wallet_pubkey UNIQUE (multisig_wallet_id, public_key)
);

CREATE INDEX IF NOT EXISTS idx_signer_wallet ON multisig_signers(multisig_wallet_id);

-- 7. Create Multi-Sig Transactions table
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
    tx_hash TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    executed_at TIMESTAMP,
    
    CONSTRAINT fk_multisig_tx_wallet FOREIGN KEY (multisig_wallet_id) 
        REFERENCES multisig_wallets(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_multisig_tx_wallet ON multisig_transactions(multisig_wallet_id);
CREATE INDEX IF NOT EXISTS idx_multisig_tx_status ON multisig_transactions(status);

-- 8. Create Multi-Sig Signatures table
CREATE TABLE IF NOT EXISTS multisig_signatures (
    id TEXT PRIMARY KEY,
    multisig_transaction_id TEXT NOT NULL,
    signer_id TEXT NOT NULL,
    signature TEXT NOT NULL,
    signed_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT fk_signature_tx FOREIGN KEY (multisig_transaction_id) 
        REFERENCES multisig_transactions(id) ON DELETE CASCADE,
    CONSTRAINT unique_tx_signer UNIQUE (multisig_transaction_id, signer_id)
);

CREATE INDEX IF NOT EXISTS idx_signature_tx ON multisig_signatures(multisig_transaction_id);

-- 9. Create Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    is_read BOOLEAN DEFAULT false,
    action_url TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT fk_notification_user FOREIGN KEY (user_id) 
        REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_notification_user_read ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notification_created ON notifications(created_at);

-- 10. Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables that need them
DROP TRIGGER IF EXISTS update_bip85_updated_at ON bip85_child_wallets;
CREATE TRIGGER update_bip85_updated_at 
    BEFORE UPDATE ON bip85_child_wallets 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_multisig_updated_at ON multisig_wallets;
CREATE TRIGGER update_multisig_updated_at 
    BEFORE UPDATE ON multisig_wallets 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- VERIFICATION QUERIES
-- Run these to verify migration success:
-- ============================================

-- Check if all tables exist
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' 
-- ORDER BY table_name;

-- Check if all columns exist in users table
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'users';

-- Check if all columns exist in user_sessions table
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'user_sessions';

-- Check if all columns exist in transactions table
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'transactions';
