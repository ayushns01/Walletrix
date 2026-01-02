# Database Migration Guide - Fix Production Errors

## Problem Summary

Your production database schema is **out of sync** with your Prisma schema. The errors show:

### Missing Tables:
- ❌ `multisig_wallets`
- ❌ `multisig_signers`
- ❌ `multisig_transactions`
- ❌ `multisig_signatures`
- ❌ `notifications`
- ❌ `bip85_child_wallets`

### Missing Columns:
- ❌ `users.password_hash_algorithm`
- ❌ `user_sessions.last_used_at`
- ❌ `transactions.tx_hash`

---

## Solution Options

### Option 1: Automatic Migration (Recommended for Development)

```bash
cd backend
npx prisma migrate dev --name add_multisig_and_notifications
```

This will:
- Generate a new migration
- Apply it to your database
- Update Prisma Client

### Option 2: Manual SQL Migration (Recommended for Production)

**Step 1:** Connect to your production database

Find your database connection details from Render.com dashboard.

**Step 2:** Run the migration script

```bash
# If you have psql installed locally:
psql $DATABASE_URL < backend/MIGRATION_FIX.sql

# OR upload and run via Render dashboard
```

**Step 3:** Regenerate Prisma Client on server

Add this to your Render.com build command:
```bash
npm install && npx prisma generate
```

### Option 3: Use Prisma DB Push (Quick but risky)

```bash
cd backend
npx prisma db push
```

⚠️ **Warning:** This bypasses migrations and can cause data loss. Only use in development.

---

## Step-by-Step: Apply Migration to Render.com

### Method 1: Using Render Shell

1. Go to Render.com Dashboard
2. Select your backend service
3. Click **Shell** tab
4. Run:
   ```bash
   cd backend
   npx prisma migrate deploy
   ```

### Method 2: Using Database Direct Access

1. Go to your database instance on Render
2. Click **Connect** → **External Connection**
3. Copy the connection string
4. Run locally:
   ```bash
   psql "your-connection-string-here" < backend/MIGRATION_FIX.sql
   ```

### Method 3: Add Migration to Deploy Process

Update your `package.json` build script:

```json
{
  "scripts": {
    "build": "npm install && npx prisma generate && npx prisma migrate deploy",
    "start": "node src/index.js"
  }
}
```

Then redeploy on Render.

---

## Fix Rate Limiting Error

The trust proxy error can be fixed:

**File:** `backend/src/index.js`

Find the rate limiter configuration and update:

```javascript
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    // Add this to fix the error:
    skip: (req) => {
        // Skip rate limiting for health checks
        return req.path === '/health';
    },
    // Or remove trust proxy validation:
    validate: {
        trustProxy: false
    }
});
```

---

## Verification Steps

After running the migration, verify:

```bash
# 1. Check tables exist
npx prisma db execute --stdin <<EOF
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
EOF

# 2. Check specific columns
npx prisma db execute --stdin <<EOF
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'password_hash_algorithm';
EOF
```

Or check via Render shell:
```bash
npx prisma studio
```

---

## If Migration Fails

### Rollback Plan:

1. **Backup first:**
   ```bash
   pg_dump $DATABASE_URL > backup.sql
   ```

2. **If tables already exist but schema is wrong:**
   ```sql
   DROP TABLE IF EXISTS multisig_signatures CASCADE;
   DROP TABLE IF EXISTS multisig_transactions CASCADE;
   DROP TABLE IF EXISTS multisig_signers CASCADE;
   DROP TABLE IF EXISTS multisig_wallets CASCADE;
   DROP TABLE IF EXISTS notifications CASCADE;
   DROP TABLE IF EXISTS bip85_child_wallets CASCADE;
   ```

3. **Then re-run migration**

---

## Quick Fix Command

For immediate production fix:

```bash
# 1. SSH into Render shell
# 2. Run:
cd /opt/render/project/src/backend
npx prisma migrate deploy
npx prisma generate
pm2 restart all
```

---

## Expected Result

After successful migration, you should see:

✅ Server starts without Prisma errors  
✅ Multi-sig wallet creation works  
✅ Notifications work  
✅ No "table does not exist" errors  
✅ No "column does not exist" errors

---

## Need Help?

If migration fails, check:
1. Database connection is working
2. User has CREATE/ALTER permissions
3. No conflicting table names
4. Prisma schema matches migration script

Run this to test connection:
```bash
npx prisma db execute --stdin <<< "SELECT NOW();"
```
