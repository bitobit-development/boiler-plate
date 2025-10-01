-- Migration: Optimize Subscriber Table Indexes for Performance
-- Target: 5-10x query performance improvement
-- Focus: Most common query patterns from admin dashboard

-- ============================================
-- REMOVE REDUNDANT INDEXES
-- ============================================
-- Drop existing basic indexes that will be replaced with optimized versions
DROP INDEX IF EXISTS "subscribers_status_idx";
DROP INDEX IF EXISTS "subscribers_created_at_idx";

-- ============================================
-- SINGLE-COLUMN INDEXES
-- ============================================

-- 1. Status index with proper sorting for filtering
-- Most queries filter by status (pending, active, suspended)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_subscribers_status"
ON "subscribers" ("status")
WHERE "status" IS NOT NULL;

-- 2. Created at index for temporal sorting and range queries
-- Using BRIN index for time-series data (more efficient for append-only patterns)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_subscribers_created_at_brin"
ON "subscribers" USING BRIN ("created_at");

-- Also create B-tree for recent data queries (last 30 days)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_subscribers_created_at_recent"
ON "subscribers" ("created_at" DESC)
WHERE "created_at" > (CURRENT_DATE - INTERVAL '30 days');

-- ============================================
-- COMPOSITE INDEXES FOR COMMON QUERY PATTERNS
-- ============================================

-- 3. Primary query pattern: status + created_at DESC for paginated listings
-- This is THE most common query pattern in the admin dashboard
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_subscribers_status_created_desc"
ON "subscribers" ("status", "created_at" DESC)
WHERE "deleted_at" IS NULL;

-- 4. Date range queries with status (for analytics and exports)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_subscribers_date_range_status"
ON "subscribers" ("created_at", "status")
WHERE "deleted_at" IS NULL;

-- ============================================
-- TEXT SEARCH OPTIMIZATION
-- ============================================

-- 5. Enable trigram extension for similarity search (if not exists)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 6. GIN indexes for ILIKE text searches on commonly searched fields
-- These dramatically speed up partial text matching

CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_subscribers_email_trgm"
ON "subscribers" USING GIN ("email" gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_subscribers_name_trgm"
ON "subscribers" USING GIN ("name" gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_subscribers_surname_trgm"
ON "subscribers" USING GIN ("surname" gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_subscribers_mobile_trgm"
ON "subscribers" USING GIN ("mobile" gin_trgm_ops);

-- 7. Combined text search index for full-text search capability
-- This enables efficient multi-field searches
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_subscribers_search_combined"
ON "subscribers" USING GIN (
  (COALESCE("email", '') || ' ' ||
   COALESCE("name", '') || ' ' ||
   COALESCE("surname", '') || ' ' ||
   COALESCE("mobile", '')) gin_trgm_ops
);

-- ============================================
-- SPECIALIZED INDEXES
-- ============================================

-- 8. Verification status indexes for filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_subscribers_verification_status"
ON "subscribers" ("email_verified", "mobile_verified", "age_verified")
WHERE "status" = 'pending';

-- 9. Source and campaign tracking for analytics
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_subscribers_source"
ON "subscribers" ("source")
WHERE "source" IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_subscribers_campaign"
ON "subscribers" ("campaign")
WHERE "campaign" IS NOT NULL;

-- 10. Country index for geographical analytics
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_subscribers_country"
ON "subscribers" ("country")
WHERE "country" IS NOT NULL;

-- 11. Soft delete support
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_subscribers_not_deleted"
ON "subscribers" ("id")
WHERE "deleted_at" IS NULL;

-- 12. Updated at index for change tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_subscribers_updated_at"
ON "subscribers" ("updated_at" DESC)
WHERE "updated_at" > "created_at";

-- ============================================
-- PARTIAL INDEXES FOR SPECIFIC QUERIES
-- ============================================

-- 13. Pending registrations requiring action
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_subscribers_pending_action"
ON "subscribers" ("created_at" DESC, "id")
WHERE "status" = 'pending'
  AND "deleted_at" IS NULL;

-- 14. Active verified users
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_subscribers_active_verified"
ON "subscribers" ("email", "mobile")
WHERE "status" = 'active'
  AND "email_verified" = true
  AND "mobile_verified" = true
  AND "deleted_at" IS NULL;

-- 15. Recently modified records (for audit trail)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_subscribers_recent_changes"
ON "subscribers" ("updated_at" DESC, "id")
WHERE "updated_at" > (CURRENT_TIMESTAMP - INTERVAL '7 days');

-- ============================================
-- JSON/JSONB INDEXES
-- ============================================

-- 16. Tags array for filtering by tags
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_subscribers_tags"
ON "subscribers" USING GIN ("tags")
WHERE "tags" IS NOT NULL AND "tags" != '[]'::jsonb;

-- 17. Custom fields for dynamic queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_subscribers_custom_fields"
ON "subscribers" USING GIN ("custom_fields")
WHERE "custom_fields" IS NOT NULL AND "custom_fields" != '{}'::jsonb;

-- ============================================
-- PERFORMANCE STATISTICS UPDATE
-- ============================================

-- Analyze the table to update statistics for query planner
ANALYZE "subscribers";

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON INDEX "idx_subscribers_status_created_desc" IS 'Primary index for paginated admin dashboard queries';
COMMENT ON INDEX "idx_subscribers_search_combined" IS 'Full-text search across email, name, surname, and mobile';
COMMENT ON INDEX "idx_subscribers_created_at_brin" IS 'BRIN index for efficient time-range scans on large datasets';
COMMENT ON INDEX "idx_subscribers_created_at_recent" IS 'B-tree index optimized for recent data queries (last 30 days)';
COMMENT ON INDEX "idx_subscribers_pending_action" IS 'Optimized for admin dashboard pending registrations view';

-- ============================================
-- ROLLBACK SCRIPT (saved as comment)
-- ============================================
/*
-- To rollback this migration, run:

DROP INDEX IF EXISTS "idx_subscribers_status";
DROP INDEX IF EXISTS "idx_subscribers_created_at_brin";
DROP INDEX IF EXISTS "idx_subscribers_created_at_recent";
DROP INDEX IF EXISTS "idx_subscribers_status_created_desc";
DROP INDEX IF EXISTS "idx_subscribers_date_range_status";
DROP INDEX IF EXISTS "idx_subscribers_email_trgm";
DROP INDEX IF EXISTS "idx_subscribers_name_trgm";
DROP INDEX IF EXISTS "idx_subscribers_surname_trgm";
DROP INDEX IF EXISTS "idx_subscribers_mobile_trgm";
DROP INDEX IF EXISTS "idx_subscribers_search_combined";
DROP INDEX IF EXISTS "idx_subscribers_verification_status";
DROP INDEX IF EXISTS "idx_subscribers_source";
DROP INDEX IF EXISTS "idx_subscribers_campaign";
DROP INDEX IF EXISTS "idx_subscribers_country";
DROP INDEX IF EXISTS "idx_subscribers_not_deleted";
DROP INDEX IF EXISTS "idx_subscribers_updated_at";
DROP INDEX IF EXISTS "idx_subscribers_pending_action";
DROP INDEX IF EXISTS "idx_subscribers_active_verified";
DROP INDEX IF EXISTS "idx_subscribers_recent_changes";
DROP INDEX IF EXISTS "idx_subscribers_tags";
DROP INDEX IF EXISTS "idx_subscribers_custom_fields";

-- Recreate original simple indexes
CREATE INDEX "subscribers_status_idx" ON "subscribers" ("status");
CREATE INDEX "subscribers_created_at_idx" ON "subscribers" ("created_at");

-- Note: pg_trgm extension is not removed as it may be used elsewhere
*/