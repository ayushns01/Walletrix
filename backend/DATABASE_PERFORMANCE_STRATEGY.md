# Database Performance & Scaling Strategy

## Overview
This document outlines performance optimization strategies for the Walletrix database as it scales to millions of users and billions of transactions.

## Table Partitioning Strategy

### Transaction Table Partitioning
**Trigger Point**: When `transactions` table exceeds 10 million rows

#### Why Partition?
- Improve query performance on large datasets
- Enable faster data archival and deletion
- Reduce index size and maintenance overhead
- Allow parallel query execution across partitions

#### Partitioning Scheme: Time-Based (Range)
Partition by month using the `timestamp` column:

```sql
-- Enable declarative partitioning (PostgreSQL 10+)
-- Create new partitioned table
CREATE TABLE transactions_partitioned (
  id TEXT NOT NULL,
  wallet_id TEXT NOT NULL,
  network TEXT NOT NULL,
  tx_hash TEXT NOT NULL,
  block_number BIGINT,
  from_address TEXT NOT NULL,
  to_address TEXT NOT NULL,
  amount DECIMAL(36,18) NOT NULL,
  token_symbol TEXT NOT NULL DEFAULT 'ETH',
  token_address TEXT,
  token_decimals INTEGER NOT NULL DEFAULT 18,
  status TEXT NOT NULL DEFAULT 'pending',
  gas_used BIGINT,
  gas_price DECIMAL(36,0),
  nonce INTEGER,
  transaction_fee DECIMAL(36,18),
  timestamp TIMESTAMP(3) NOT NULL,
  is_incoming BOOLEAN NOT NULL,
  usd_value_at_time DECIMAL(15,2),
  category TEXT NOT NULL DEFAULT 'transfer',
  metadata JSONB,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(3) NOT NULL,
  PRIMARY KEY (id, timestamp)
) PARTITION BY RANGE (timestamp);

-- Create partitions for each month (example for 2025-2026)
CREATE TABLE transactions_2025_11 PARTITION OF transactions_partitioned
  FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');

CREATE TABLE transactions_2025_12 PARTITION OF transactions_partitioned
  FOR VALUES FROM ('2025-12-01') TO ('2026-01-01');

CREATE TABLE transactions_2026_01 PARTITION OF transactions_partitioned
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

-- Create indexes on each partition (automatically inherited)
CREATE INDEX idx_transactions_wallet_time ON transactions_partitioned (wallet_id, timestamp DESC);
CREATE INDEX idx_transactions_status ON transactions_partitioned (status);
CREATE INDEX idx_transactions_network ON transactions_partitioned (network);
CREATE UNIQUE INDEX idx_transactions_tx_hash ON transactions_partitioned (tx_hash, network);
```

#### Automated Partition Creation
Create a monthly cron job or database function to automatically create next month's partition:

```sql
-- Function to create next month's partition
CREATE OR REPLACE FUNCTION create_next_transaction_partition()
RETURNS void AS $$
DECLARE
  next_month DATE;
  following_month DATE;
  partition_name TEXT;
BEGIN
  -- Calculate next month
  next_month := DATE_TRUNC('month', CURRENT_DATE + INTERVAL '1 month');
  following_month := next_month + INTERVAL '1 month';
  partition_name := 'transactions_' || TO_CHAR(next_month, 'YYYY_MM');
  
  -- Create partition if it doesn't exist
  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS %I PARTITION OF transactions_partitioned
     FOR VALUES FROM (%L) TO (%L)',
    partition_name,
    next_month,
    following_month
  );
  
  RAISE NOTICE 'Created partition: %', partition_name;
END;
$$ LANGUAGE plpgsql;

-- Schedule via cron (pg_cron extension) to run on 1st of each month
SELECT cron.schedule('create-transaction-partition', '0 0 1 * *', 
  'SELECT create_next_transaction_partition()');
```

#### Migration Steps
1. **Create partitioned table** alongside existing table
2. **Copy data** in batches to avoid locking:
   ```sql
   INSERT INTO transactions_partitioned 
   SELECT * FROM transactions 
   WHERE timestamp >= '2025-01-01' AND timestamp < '2025-02-01';
   ```
3. **Verify data integrity** (row counts, checksums)
4. **Update application** to use new table (feature flag)
5. **Rename tables**:
   ```sql
   ALTER TABLE transactions RENAME TO transactions_old;
   ALTER TABLE transactions_partitioned RENAME TO transactions;
   ```
6. **Drop old table** after verification period

---

## Transaction Archive Strategy

### When to Archive
Archive transactions older than **2 years** (730 days)

### Why Archive?
- Reduce main database size by 60-80%
- Improve query performance on active data
- Maintain historical records for compliance
- Lower backup/restore times
- Reduce storage costs (use cheaper cold storage)

### Archive Table Design

```sql
-- Archive table with identical structure but fewer indexes
CREATE TABLE transactions_archive (
  id TEXT PRIMARY KEY,
  wallet_id TEXT NOT NULL,
  network TEXT NOT NULL,
  tx_hash TEXT NOT NULL,
  block_number BIGINT,
  from_address TEXT NOT NULL,
  to_address TEXT NOT NULL,
  amount DECIMAL(36,18) NOT NULL,
  token_symbol TEXT NOT NULL DEFAULT 'ETH',
  token_address TEXT,
  token_decimals INTEGER NOT NULL DEFAULT 18,
  status TEXT NOT NULL DEFAULT 'pending',
  gas_used BIGINT,
  gas_price DECIMAL(36,0),
  nonce INTEGER,
  transaction_fee DECIMAL(36,18),
  timestamp TIMESTAMP(3) NOT NULL,
  is_incoming BOOLEAN NOT NULL,
  usd_value_at_time DECIMAL(15,2),
  category TEXT NOT NULL DEFAULT 'transfer',
  metadata JSONB,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(3) NOT NULL,
  archived_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Minimal indexes for archive (read-only)
CREATE INDEX idx_archive_wallet_id ON transactions_archive (wallet_id);
CREATE INDEX idx_archive_timestamp ON transactions_archive (timestamp DESC);
CREATE INDEX idx_archive_tx_hash ON transactions_archive (tx_hash, network);
```

### Archive Process (Automated Job)

```javascript
// backend/src/jobs/transactionArchive.js
import prisma from '../lib/prisma.js';
import logger from '../services/loggerService.js';

class TransactionArchiveJob {
  constructor() {
    this.archiveThresholdDays = 730; // 2 years
    this.batchSize = 10000;
  }

  async archiveOldTransactions() {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.archiveThresholdDays);

    logger.info('Starting transaction archival', {
      cutoffDate: cutoffDate.toISOString(),
      thresholdDays: this.archiveThresholdDays
    });

    let totalArchived = 0;
    let hasMore = true;

    while (hasMore) {
      try {
        // Find old transactions in batches
        const oldTransactions = await prisma.$queryRaw`
          SELECT * FROM transactions 
          WHERE timestamp < ${cutoffDate}
          ORDER BY timestamp ASC
          LIMIT ${this.batchSize}
        `;

        if (oldTransactions.length === 0) {
          hasMore = false;
          break;
        }

        // Insert into archive table
        await prisma.$executeRaw`
          INSERT INTO transactions_archive 
          SELECT *, NOW() as archived_at 
          FROM transactions 
          WHERE id = ANY(${oldTransactions.map(t => t.id)})
          ON CONFLICT (id) DO NOTHING
        `;

        // Delete from main table
        await prisma.$executeRaw`
          DELETE FROM transactions 
          WHERE id = ANY(${oldTransactions.map(t => t.id)})
        `;

        totalArchived += oldTransactions.length;

        logger.info('Batch archived', {
          count: oldTransactions.length,
          totalArchived
        });

        // Small delay to avoid overwhelming database
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        logger.error('Archive batch failed', {
          error: error.message,
          totalArchived
        });
        throw error;
      }
    }

    logger.info('Transaction archival completed', {
      totalArchived,
      cutoffDate: cutoffDate.toISOString()
    });

    return { success: true, totalArchived };
  }

  // Retrieve archived transactions for user
  async getArchivedTransactions(walletId, limit = 50, offset = 0) {
    return prisma.$queryRaw`
      SELECT * FROM transactions_archive
      WHERE wallet_id = ${walletId}
      ORDER BY timestamp DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
  }
}

export default new TransactionArchiveJob();
```

### Archive Schedule
- **Frequency**: Monthly (1st of each month at 2 AM)
- **Duration**: ~2-4 hours for 10M transactions
- **Monitoring**: Track archived count, failures, duration

---

## Additional Performance Strategies

### 1. Connection Pooling
```javascript
// Prisma connection pool configuration
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  
  // Connection pool settings
  connection_limit = 100
  pool_timeout = 30
}
```

### 2. Query Optimization
- Use `SELECT` specific columns instead of `SELECT *`
- Add composite indexes for common query patterns
- Use `EXPLAIN ANALYZE` to identify slow queries
- Implement query result caching (Redis)

### 3. Read Replicas
When read load exceeds 80%:
- Create PostgreSQL read replicas
- Route `SELECT` queries to replicas
- Write operations stay on primary
- Use connection string routing: `DATABASE_READ_URL`

### 4. Database Maintenance
```sql
-- Weekly vacuum and analyze
VACUUM ANALYZE transactions;
VACUUM ANALYZE wallets;
VACUUM ANALYZE activity_logs;

-- Rebuild fragmented indexes
REINDEX TABLE transactions;
```

### 5. Monitoring Alerts
- Query execution time > 1 second
- Table size > 100 GB
- Connection pool exhaustion
- Replication lag > 5 seconds
- Archive job failures

---

## Implementation Timeline

| Milestone | Trigger | Action |
|-----------|---------|--------|
| **Phase 1** | 1M transactions | Enable query monitoring |
| **Phase 2** | 5M transactions | Implement read replicas |
| **Phase 3** | 10M transactions | Implement table partitioning |
| **Phase 4** | 15M transactions | Start monthly archival |
| **Phase 5** | 50M transactions | Move archives to cold storage |

---

## Testing Strategy

### Load Testing
```bash
# Generate 10M test transactions
node scripts/generateTestData.js --transactions 10000000

# Benchmark query performance
pgbench -c 10 -j 2 -t 10000 walletrix
```

### Partition Testing
1. Create test partition for specific month
2. Insert 1M records
3. Benchmark query speed (partitioned vs non-partitioned)
4. Verify partition pruning with `EXPLAIN`

### Archive Testing
1. Run archive job on test data
2. Verify data integrity (checksums)
3. Test retrieval from archive
4. Measure performance improvement on main table

---

## Rollback Plan

### Partition Rollback
```sql
-- Detach partition
ALTER TABLE transactions_partitioned DETACH PARTITION transactions_2025_11;

-- Convert back to regular table
ALTER TABLE transactions_2025_11 NO INHERIT transactions_partitioned;
```

### Archive Rollback
```sql
-- Restore archived data
INSERT INTO transactions 
SELECT * FROM transactions_archive 
WHERE timestamp >= '2024-01-01';
```

---

## Estimated Impact

### Storage Savings
- **Before**: 500 GB (all transactions)
- **After Partitioning**: 500 GB (same, but faster queries)
- **After Archival**: 150 GB (active) + 350 GB (archive)

### Query Performance
- **Current**: 2-5 seconds for wallet transactions
- **With Partitioning**: 0.2-0.5 seconds (10x faster)
- **With Archival**: 0.1-0.2 seconds (25x faster)

### Cost Savings
- **Archive Storage**: 70% cheaper (cold storage)
- **Backup Time**: 60% reduction
- **Database Instance**: Downgrade by 1-2 tiers

---

## References
- [PostgreSQL Table Partitioning](https://www.postgresql.org/docs/current/ddl-partitioning.html)
- [Prisma Performance Best Practices](https://www.prisma.io/docs/guides/performance-and-optimization)
- [Database Indexing Strategies](https://use-the-index-luke.com/)
