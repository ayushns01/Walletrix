# Quick Fix Instructions for Production Deployment

## Critical Errors Found:

1. ❌ **Database schema out of sync** - Missing tables and columns
2. ⚠️ **Rate limiter trust proxy error** - Already fixed in code
3. ℹ️ **Nodemailer error** - Non-critical, won't affect multi-sig

---

## IMMEDIATE FIX - Run These Commands:

### Step 1: Create Initial Migration

On your **local machine**:

```bash
cd backend
npx prisma migrate dev --name initial_production_sync --create-only
```

This creates a migration file without applying it.

### Step 2: Deploy to Render

**Option A: Via Render Dashboard**

1. Go to https://dashboard.render.com
2. Select your backend service
3. Go to **Shell** tab
4. Run:
   ```bash
   cd backend
   npx prisma migrate deploy
   ```

**Option B: Update Build Command (Recommended)**

1. Go to your Render service settings
2. Update **Build Command** to:
   ```bash
   npm run build
   ```
3. Click **Save**
4. Trigger manual deploy

### Step 3: Verify Fix

After deployment, check logs. You should NOT see:
- ❌ `The table public.multisig_wallets does not exist`
- ❌ `The column users.password_hash_algorithm does not exist`

You SHOULD see:
- ✅ `Server started`
- ✅ `Your service is live`

---

## Alternative: Direct SQL Fix (Faster)

If migrations don't work, run SQL directly:

### Get Database Connection String

1. In Render Dashboard → Your Database
2. Click **Connect** → Copy **External Connection String**

### Apply Migration

```bash
psql "your-connection-string-here" < backend/MIGRATION_FIX.sql
```

Or via Render Shell:
```bash
cat backend/MIGRATION_FIX.sql | psql $DATABASE_URL
```

---

## Test Multi-Sig Creation

After fix, test from your frontend:

1. Go to https://walletrix.vercel.app
2. Try to create a multi-sig wallet
3. Should work without errors

---

## If You See "Migration Conflict"

Run this to reset migration state:

```bash
# In Render Shell
cd backend
npx prisma migrate resolve --applied 0_init
npx prisma migrate deploy
```

---

## Rate Limiter Fix (Already Applied)

The trust proxy error is fixed in the code. After redeployment, you won't see:
```
ValidationError: The Express 'trust proxy' setting is true...
```

---

## Rollback Plan (If Something Breaks)

```bash
# Backup current database first
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# If migration fails, restore:
psql $DATABASE_URL < backup_TIMESTAMP.sql
```

---

## Expected Timeline

- **Migration creation:** 30 seconds
- **Deploy to Render:** 2-3 minutes
- **Database migration:** 10-20 seconds
- **Total:** ~5 minutes

---

## Need Help?

Check migration status:
```bash
npx prisma migrate status
```

Check database connection:
```bash
npx prisma db execute --stdin <<< "SELECT NOW();"
```

List all tables:
```bash
npx prisma db execute --stdin <<< "SELECT table_name FROM information_schema.tables WHERE table_schema='public';"
```
