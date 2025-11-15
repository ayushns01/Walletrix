#!/bin/bash

# Walletrix Database Setup Script
# This script creates the PostgreSQL database and user for Walletrix

set -e

echo "🚀 Walletrix Database Setup"
echo "================================"
echo ""

# Database configuration
DB_NAME="walletrix"
DB_USER="walletrix_user"
DB_PASSWORD="walletrix_password_2024"

echo "📋 Configuration:"
echo "  Database: $DB_NAME"
echo "  User: $DB_USER"
echo "  Password: $DB_PASSWORD"
echo ""

# Check if PostgreSQL is running
if ! psql -U postgres -c '\q' 2>/dev/null; then
    echo "❌ Error: PostgreSQL is not running or not accessible"
    echo "Please make sure PostgreSQL is installed and running"
    exit 1
fi

echo "✅ PostgreSQL is running"
echo ""

# Drop existing database if it exists (for clean setup)
echo "🗑️  Dropping existing database (if exists)..."
psql -U postgres -c "DROP DATABASE IF EXISTS $DB_NAME;" 2>/dev/null || true

# Drop existing user if exists
echo "🗑️  Dropping existing user (if exists)..."
psql -U postgres -c "DROP USER IF EXISTS $DB_USER;" 2>/dev/null || true

# Create user
echo "👤 Creating database user..."
psql -U postgres -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';"

# Create database
echo "🗄️  Creating database..."
psql -U postgres -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"

# Grant privileges
echo "🔑 Granting privileges..."
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"

# Connect to the new database and grant schema privileges
psql -U postgres -d $DB_NAME -c "GRANT ALL ON SCHEMA public TO $DB_USER;"
psql -U postgres -d $DB_NAME -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $DB_USER;"
psql -U postgres -d $DB_NAME -c "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO $DB_USER;"

echo ""
echo "✅ Database setup complete!"
echo ""
echo "📝 Connection details:"
echo "  Host: localhost"
echo "  Port: 5431"
echo "  Database: $DB_NAME"
echo "  User: $DB_USER"
echo "  Password: $DB_PASSWORD"
echo ""
echo "🔗 Connection string:"
echo "  postgresql://$DB_USER:$DB_PASSWORD@localhost:5431/$DB_NAME?schema=public"
echo ""
echo "Next steps:"
echo "  1. cd backend"
echo "  2. npx prisma generate"
echo "  3. npx prisma db push"
echo "  4. npm run dev"
echo ""
