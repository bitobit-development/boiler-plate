# Database Performance Optimization

## Overview
This document describes the database index optimization implemented for the subscribers table to address slow query performance (5-10 seconds) on Neon PostgreSQL.

## Problem Statement
- **Current Issue**: Queries taking 5-10 seconds despite Redis caching
- **Root Cause**: Missing database indexes on frequently queried columns
- **Database**: Neon PostgreSQL (remote, high latency)
- **Table Size**: Growing subscriber base requiring efficient indexing

## Solution: Strategic Index Implementation

### Migration File
- **Location**: `/Users/haim/Projects/boiler-plate/drizzle/0003_optimize_subscriber_indexes.sql`
- **Type**: PostgreSQL index creation with CONCURRENTLY option (non-blocking)

## Index Strategy

### 1. Single-Column Indexes
```sql
-- Status filtering (most common filter)
idx_subscribers_status

-- Temporal queries (BRIN for time-series efficiency)
idx_subscribers_created_at_brin

-- Recent data optimization (last 30 days)
idx_subscribers_created_at_recent
```

### 2. Composite Indexes for Query Patterns
```sql
-- Primary pattern: status + created_at DESC
idx_subscribers_status_created_desc

-- Date range with status filtering
idx_subscribers_date_range_status
```

### 3. Text Search Optimization (Trigram)
```sql
-- Individual field searches
idx_subscribers_email_trgm
idx_subscribers_name_trgm
idx_subscribers_surname_trgm
idx_subscribers_mobile_trgm

-- Combined full-text search
idx_subscribers_search_combined
```

### 4. Specialized Partial Indexes
```sql
-- Pending registrations
idx_subscribers_pending_action

-- Active verified users
idx_subscribers_active_verified

-- Recent changes (7 days)
idx_subscribers_recent_changes
```

### 5. JSON/JSONB Indexes
```sql
-- Tags array searching
idx_subscribers_tags

-- Custom fields queries
idx_subscribers_custom_fields
```

## Expected Performance Improvements

### Query Pattern Optimizations

| Query Type | Before | After (Expected) | Improvement |
|------------|--------|------------------|-------------|
| Status filter + pagination | 5-10s | 200-500ms | 10-50x |
| Text search (ILIKE) | 3-8s | 100-300ms | 10-40x |
| Date range queries | 4-7s | 300-600ms | 7-23x |
| Combined filters | 8-12s | 400-800ms | 10-30x |

### Index Benefits
1. **BRIN Index**: 95% smaller than B-tree for time-series data
2. **Trigram (GIN)**: Enables fast partial text matching
3. **Partial Indexes**: Smaller index size, faster scans for specific conditions
4. **Composite Indexes**: Single index scan for multiple conditions

## Implementation Instructions

### Method 1: Using Migration Script (Recommended)
```bash
cd /Users/haim/Projects/boiler-plate
./scripts/apply-index-migration.sh
# Choose option 1, 2, or 3
```

### Method 2: Manual Drizzle Commands
```bash
# Push schema changes
npm run db:push

# OR run migrations
npx drizzle-kit migrate
```

### Method 3: Direct SQL Execution
```bash
psql $DATABASE_URL_UNPOOLED -f drizzle/0003_optimize_subscriber_indexes.sql
```

## Verification Steps

### 1. Check Index Creation
```sql
-- List all indexes on subscribers table
\di *subscribers*

-- Or query pg_indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'subscribers';
```

### 2. Analyze Query Performance
```sql
-- Check query plan before
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM subscribers
WHERE status = 'pending'
ORDER BY created_at DESC
LIMIT 20;

-- Should show index scan instead of sequential scan
```

### 3. Monitor Real Performance
```javascript
// Add timing to your API routes
console.time('registration-query');
const results = await db.select()...
console.timeEnd('registration-query');
```

## Rollback Procedure

If indexes cause issues, rollback using:

```sql
-- Run the rollback section from migration file
DROP INDEX IF EXISTS idx_subscribers_status;
DROP INDEX IF EXISTS idx_subscribers_created_at_brin;
-- ... (all other DROP statements from migration file)

-- Recreate original indexes
CREATE INDEX subscribers_status_idx ON subscribers (status);
CREATE INDEX subscribers_created_at_idx ON subscribers (created_at);
```

## Maintenance Recommendations

### Weekly Tasks
1. **Update Statistics**: `ANALYZE subscribers;`
2. **Check Index Usage**: Monitor pg_stat_user_indexes
3. **Review Slow Queries**: Check pg_stat_statements

### Monthly Tasks
1. **Index Bloat Check**: Monitor index size growth
2. **Reindex if Needed**: `REINDEX INDEX CONCURRENTLY index_name;`
3. **Review Query Patterns**: Adjust indexes based on actual usage

### Performance Monitoring Queries
```sql
-- Index usage statistics
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
WHERE tablename = 'subscribers'
ORDER BY idx_scan DESC;

-- Table size and bloat
SELECT
    pg_size_pretty(pg_total_relation_size('subscribers')) as total_size,
    pg_size_pretty(pg_relation_size('subscribers')) as table_size,
    pg_size_pretty(pg_indexes_size('subscribers')) as indexes_size;
```

## Architecture Decisions

### Why These Indexes?

1. **Status + CreatedAt Composite**: Matches the most common query pattern exactly
2. **Trigram over Standard B-tree**: Enables partial matching without full-text search complexity
3. **BRIN for Timestamps**: Ideal for append-only time-series data
4. **Partial Indexes**: Reduces index size for specific query patterns
5. **CONCURRENTLY Option**: Prevents table locks during index creation

### Trade-offs

| Aspect | Benefit | Cost |
|--------|---------|------|
| Query Speed | 5-50x faster reads | 10-20% slower writes |
| Storage | Better query planning | ~200MB additional storage |
| Maintenance | Automated optimization | Periodic ANALYZE needed |
| Flexibility | Supports various patterns | Index bloat over time |

## Related Documentation
- Database Schema: `/Users/haim/Projects/boiler-plate/src/lib/db/schema.ts`
- API Routes: `/Users/haim/Projects/boiler-plate/src/app/api/admin/registrations/route.ts`
- Drizzle Config: `/Users/haim/Projects/boiler-plate/drizzle.config.ts`

## Support
For issues or questions:
1. Check index usage with monitoring queries
2. Review PostgreSQL logs for slow queries
3. Consider adding pg_stat_statements extension for detailed analysis