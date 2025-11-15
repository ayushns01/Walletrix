# Database Migration Guide

This guide explains how to manage database migrations for the Walletrix application using Prisma.

## Table of Contents

1. [Overview](#overview)
2. [Initial Setup](#initial-setup)
3. [Development Workflow](#development-workflow)
4. [Production Deployment](#production-deployment)
5. [Common Tasks](#common-tasks)
6. [Troubleshooting](#troubleshooting)

---

## Overview

Walletrix uses **Prisma** as its ORM and migration tool. Prisma provides a robust migration system that:

- Tracks database schema changes
- Supports rollback mechanisms
- Generates type-safe database client
- Handles both development and production workflows

### Key Files

- `prisma/schema.prisma` - Database schema definition
- `prisma/migrations/` - Migration history (auto-generated)
- `prisma/seed.js` - Database seeding script

---

## Initial Setup

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Database

Ensure your `.env` file has the correct database URL:

```bash
DATABASE_URL="postgresql://username:password@localhost:5432/walletrix"
```

### 3. Generate Prisma Client

```bash
npm run db:generate
```

This generates the Prisma Client based on your schema.

### 4. Create Initial Migration

For a fresh database:

```bash
npm run db:migrate:dev
```

This will:
- Create the database if it doesn't exist
- Apply all migrations
- Generate the Prisma Client

For an existing database, use:

```bash
npm run db:push
```

This will sync the schema without creating a migration.

### 5. Seed the Database (Optional)

```bash
npm run db:seed
```

This populates the database with:
- Supported networks (Ethereum, Polygon, Arbitrum, etc.)
- Popular tokens (USDC, USDT, DAI, etc.)
- Test user (development only)

---

## Development Workflow

### Making Schema Changes

1. **Edit `prisma/schema.prisma`**

   Example - Adding a new field:
   ```prisma
   model User {
     id        String   @id @default(uuid())
     email     String   @unique
     password  String
     isVerified Boolean @default(false)
     // New field
     phoneNumber String?
     createdAt DateTime @default(now())
     updatedAt DateTime @updatedAt
   }
   ```

2. **Create a migration**

   ```bash
   npm run db:migrate:dev
   ```

   Prisma will prompt you to name the migration (e.g., "add_phone_number").

3. **Review the migration**

   Check `prisma/migrations/` for the generated SQL.

4. **Test locally**

   Restart your server and verify changes work as expected.

### Prototyping (Schema Push)

For rapid prototyping without creating migrations:

```bash
npm run db:push
```

⚠️ **Warning**: This is for development only. Don't use in production!

---

## Production Deployment

### Pre-Deployment Checklist

- [ ] All migrations tested locally
- [ ] Database backup created
- [ ] Migration files committed to repository
- [ ] Environment variables configured

### Deployment Steps

1. **Pull latest code**

   ```bash
   git pull origin main
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Run migrations**

   ```bash
   npm run db:migrate:deploy
   ```

   This applies pending migrations without prompting for names.

4. **Verify migration status**

   ```bash
   npm run db:migrate:status
   ```

5. **Start application**

   ```bash
   npm start
   ```

### CI/CD Integration

Add to your deployment pipeline:

```yaml
# Example GitHub Actions
- name: Run database migrations
  run: |
    cd backend
    npm install
    npm run db:migrate:deploy
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

---

## Common Tasks

### View Current Migration Status

```bash
npm run db:migrate:status
```

Output shows:
- Applied migrations ✅
- Pending migrations ⏳
- Failed migrations ❌

### Open Prisma Studio (Database GUI)

```bash
npm run db:studio
```

Opens a browser-based database viewer at `http://localhost:5555`

### Reset Database (Development Only)

⚠️ **Warning**: This deletes ALL data!

```bash
npm run db:migrate:reset
```

This will:
1. Drop the database
2. Create a new database
3. Apply all migrations
4. Run the seed script

### Pull Schema from Existing Database

If you have an existing database and want to generate a Prisma schema:

```bash
npm run db:pull
```

### Create Migration from Schema Changes

```bash
npm run db:migrate:dev --name descriptive_name
```

Example names:
- `add_user_avatar`
- `create_notification_table`
- `add_wallet_index`

### Revert Last Migration (Manual)

Prisma doesn't have automatic rollback. To revert:

1. Identify the migration to revert:
   ```bash
   ls prisma/migrations/
   ```

2. Manually create a new migration that undoes changes:
   ```bash
   npm run db:migrate:dev --name revert_previous_change
   ```

3. Write the reverse SQL in the migration file.

---

## Troubleshooting

### Migration Failed

**Symptom**: Migration fails partway through

**Solution**:
1. Check error message for details
2. Fix the schema issue
3. Mark migration as rolled back:
   ```bash
   npm run db:migrate:resolve --rolled-back <migration_name>
   ```
4. Try again

### Out of Sync Errors

**Symptom**: "Database schema is not in sync with migrations"

**Solution**:
```bash
# Development
npm run db:migrate:reset

# Production (careful!)
npm run db:migrate:deploy
```

### Cannot Connect to Database

**Symptom**: "Can't reach database server"

**Solutions**:
- Verify `DATABASE_URL` in `.env`
- Check database server is running
- Verify firewall/network settings
- Test connection: `psql $DATABASE_URL`

### Prisma Client Out of Date

**Symptom**: Type errors or missing fields

**Solution**:
```bash
npm run db:generate
```

### Seeding Fails

**Symptom**: `npm run db:seed` errors

**Solutions**:
- Ensure migrations are applied first
- Check for unique constraint violations
- Review seed.js for errors
- Run with debug: `DEBUG=* npm run db:seed`

---

## Best Practices

### Development

1. **Always create migrations** - Don't use `db:push` long-term
2. **Name migrations descriptively** - Future you will thank present you
3. **Test migrations locally** - Before deploying
4. **Commit migration files** - Essential for team collaboration
5. **Review generated SQL** - Ensure it matches your intent

### Production

1. **Backup before migrating** - Always, no exceptions
2. **Test on staging first** - Catch issues early
3. **Plan downtime** - For major migrations
4. **Monitor after deployment** - Watch for errors
5. **Have rollback plan** - Know how to revert

### Schema Design

1. **Use UUIDs for IDs** - Better for distributed systems
2. **Add indexes** - For frequently queried fields
3. **Use relations wisely** - Avoid circular dependencies
4. **Set default values** - For non-nullable fields
5. **Document complex fields** - Use `/// comments`

---

## Migration Workflow Diagram

```
Development:
  Edit Schema → db:migrate:dev → Test → Commit
       ↓              ↓
   schema.prisma   migrations/

Production:
  Pull Code → db:migrate:deploy → Verify → Deploy App
                    ↓
              Auto-applies migrations
```

---

## Emergency Procedures

### Production Database Corruption

1. **Stop the application immediately**
2. **Restore from latest backup**
3. **Investigate root cause**
4. **Apply fixes**
5. **Test thoroughly**
6. **Redeploy**

### Lost Migration Files

1. **Do NOT delete migrations folder**
2. **Recover from git history**
3. **If impossible, use `db:pull` then recreate migrations**

---

## Support

For issues:
1. Check [Prisma Documentation](https://www.prisma.io/docs)
2. Review error messages carefully
3. Check `prisma/migrations/` for failed migrations
4. Contact team for assistance

---

**Last Updated**: November 2024  
**Prisma Version**: 6.19.0
