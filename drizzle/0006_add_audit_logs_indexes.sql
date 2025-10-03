-- Migration: Add Audit Logs Performance Indexes
-- Target: Improve activity feed query performance
-- Focus: Most common query patterns for audit logs and activity feed

-- ============================================
-- COMPOSITE INDEXES FOR ACTIVITY FEED
-- ============================================

-- 1. Primary query pattern: created_at DESC for activity feed
-- This is used by the dashboard activity feed
CREATE INDEX IF NOT EXISTS "idx_audit_logs_created_desc"
ON "audit_logs" ("created_at" DESC);

-- 2. Filter by admin user with time sorting
CREATE INDEX IF NOT EXISTS "idx_audit_logs_admin_created"
ON "audit_logs" ("admin_user_id", "created_at" DESC)
WHERE "admin_user_id" IS NOT NULL;

-- 3. Filter by entity type with time sorting
CREATE INDEX IF NOT EXISTS "idx_audit_logs_entity_created"
ON "audit_logs" ("entity_type", "created_at" DESC)
WHERE "entity_type" IS NOT NULL;

-- 4. Composite index for filtered queries
CREATE INDEX IF NOT EXISTS "idx_audit_logs_entity_admin_created"
ON "audit_logs" ("entity_type", "admin_user_id", "created_at" DESC)
WHERE "entity_type" IS NOT NULL AND "admin_user_id" IS NOT NULL;

-- 5. Success/failure filtering with time
CREATE INDEX IF NOT EXISTS "idx_audit_logs_success_created"
ON "audit_logs" ("is_success", "created_at" DESC);

-- ============================================
-- SPECIALIZED INDEXES
-- ============================================

-- 6. Entity tracking (for entity-specific audit trails)
CREATE INDEX IF NOT EXISTS "idx_audit_logs_entity_id"
ON "audit_logs" ("entity_id", "created_at" DESC)
WHERE "entity_id" IS NOT NULL;

-- 7. Action type filtering
CREATE INDEX IF NOT EXISTS "idx_audit_logs_action"
ON "audit_logs" ("action", "created_at" DESC)
WHERE "action" IS NOT NULL;

-- 8. Recent activity - optimized for common queries (removed time predicate due to immutability requirement)
CREATE INDEX IF NOT EXISTS "idx_audit_logs_recent"
ON "audit_logs" ("created_at" DESC, "entity_type", "action");

-- ============================================
-- ADMIN USER JOIN OPTIMIZATION
-- ============================================

-- 9. Optimize admin user lookups (used in activity feed joins)
CREATE INDEX IF NOT EXISTS "idx_admin_users_id_active"
ON "admin_users" ("id")
WHERE "is_active" = true;

-- ============================================
-- ANALYZE FOR QUERY PLANNER
-- ============================================

ANALYZE "audit_logs";
ANALYZE "admin_users";

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON INDEX "idx_audit_logs_created_desc" IS 'Primary index for activity feed sorted by time';
COMMENT ON INDEX "idx_audit_logs_admin_created" IS 'Filter activity by admin user with time sorting';
COMMENT ON INDEX "idx_audit_logs_entity_created" IS 'Filter activity by entity type with time sorting';
COMMENT ON INDEX "idx_audit_logs_recent" IS 'Optimized index for recent activity queries';
