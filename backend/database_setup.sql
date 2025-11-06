-- PostgreSQL Database Schema for Walletrix
-- Run this manually in your PostgreSQL database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    avatar VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_login TIMESTAMP
);

-- User preferences table
CREATE TABLE user_preferences (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    default_network VARCHAR(50) DEFAULT 'ethereum-mainnet',
    currency VARCHAR(3) DEFAULT 'USD',
    theme VARCHAR(20) DEFAULT 'dark',
    notifications JSONB DEFAULT '{}',
    language VARCHAR(10) DEFAULT 'en',
    timezone VARCHAR(50) DEFAULT 'UTC',
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Wallets table
CREATE TABLE wallets (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) DEFAULT 'My Wallet',
    description TEXT,
    encrypted_data TEXT NOT NULL,
    addresses JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_accessed TIMESTAMP DEFAULT NOW()
);

-- Transactions table
CREATE TABLE transactions (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id TEXT NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    network VARCHAR(50) NOT NULL,
    tx_hash VARCHAR(66) UNIQUE NOT NULL,
    from_address VARCHAR(42) NOT NULL,
    to_address VARCHAR(42) NOT NULL,
    amount TEXT NOT NULL,
    token_symbol VARCHAR(10) DEFAULT 'ETH',
    token_address VARCHAR(42),
    status VARCHAR(20) NOT NULL,
    block_number BIGINT,
    gas_used BIGINT,
    gas_price TEXT,
    nonce INTEGER,
    timestamp TIMESTAMP NOT NULL,
    is_incoming BOOLEAN NOT NULL,
    usd_value DECIMAL(18,2),
    category VARCHAR(50),
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Portfolio snapshots table
CREATE TABLE portfolio_snapshots (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id TEXT NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    network VARCHAR(50) NOT NULL,
    total_value_usd DECIMAL(18,2) NOT NULL,
    balances JSONB NOT NULL,
    token_prices JSONB NOT NULL,
    snapshot_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(wallet_id, network, snapshot_date)
);

-- Watched tokens table
CREATE TABLE watched_tokens (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id TEXT NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    network VARCHAR(50) NOT NULL,
    token_address VARCHAR(42) NOT NULL,
    token_symbol VARCHAR(10) NOT NULL,
    token_name VARCHAR(100) NOT NULL,
    decimals INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true,
    added_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(wallet_id, network, token_address)
);

-- Price cache table
CREATE TABLE price_cache (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    coin_id VARCHAR(50) UNIQUE NOT NULL,
    symbol VARCHAR(10) NOT NULL,
    name VARCHAR(100) NOT NULL,
    current_price DECIMAL(18,8) NOT NULL,
    market_cap DECIMAL(20,2),
    volume_24h DECIMAL(20,2),
    change_24h DECIMAL(10,4),
    change_7d DECIMAL(10,4),
    last_updated TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

-- API usage table
CREATE TABLE api_usage (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    endpoint VARCHAR(200) NOT NULL,
    method VARCHAR(10) NOT NULL,
    user_id TEXT,
    wallet_id TEXT,
    network VARCHAR(50),
    response_time INTEGER NOT NULL,
    status INTEGER NOT NULL,
    timestamp TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_wallets_user_id ON wallets(user_id);
CREATE INDEX idx_transactions_wallet_id_timestamp ON transactions(wallet_id, timestamp);
CREATE INDEX idx_transactions_tx_hash ON transactions(tx_hash);
CREATE INDEX idx_transactions_network ON transactions(network);
CREATE INDEX idx_portfolio_snapshots_wallet_id_date ON portfolio_snapshots(wallet_id, snapshot_date);
CREATE INDEX idx_api_usage_endpoint_timestamp ON api_usage(endpoint, timestamp);
CREATE INDEX idx_api_usage_user_id_timestamp ON api_usage(user_id, timestamp);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wallets_updated_at BEFORE UPDATE ON wallets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();