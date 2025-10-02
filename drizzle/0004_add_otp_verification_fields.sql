-- ============================================
-- Migration: Add OTP Verification Fields
-- Description: Adds fields for SMS OTP verification to subscribers table
-- Date: 2025-01-02
-- Purpose: Support mobile number verification through SMS OTP
-- ============================================

-- Add OTP verification columns
ALTER TABLE "subscribers" ADD COLUMN "otp_code" varchar(255);  -- Encrypted 6-digit OTP code
--> statement-breakpoint
ALTER TABLE "subscribers" ADD COLUMN "otp_expires_at" timestamp;  -- OTP expiration timestamp
--> statement-breakpoint
ALTER TABLE "subscribers" ADD COLUMN "otp_attempts" integer DEFAULT 0 NOT NULL;  -- Failed verification attempts counter
--> statement-breakpoint
ALTER TABLE "subscribers" ADD COLUMN "otp_last_sent_at" timestamp;  -- Last OTP send timestamp for rate limiting
--> statement-breakpoint

-- ============================================
-- INDEXES FOR OTP QUERIES
-- ============================================

-- Index for finding expired OTPs (cleanup operations)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "subscribers_otp_expires_at_idx"
ON "subscribers" USING btree ("otp_expires_at")
WHERE "otp_expires_at" IS NOT NULL;
--> statement-breakpoint

-- Index for rate limiting checks (finding recent OTP sends)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "subscribers_otp_last_sent_at_idx"
ON "subscribers" USING btree ("otp_last_sent_at")
WHERE "otp_last_sent_at" IS NOT NULL;
--> statement-breakpoint

-- Partial index for pending OTP verifications (active OTP sessions)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_subscribers_pending_otp"
ON "subscribers" ("id", "otp_expires_at")
WHERE "status" = 'pending'
  AND "otp_code" IS NOT NULL
  AND "otp_expires_at" IS NOT NULL
  AND "mobile_verified" = false;
--> statement-breakpoint

-- ============================================
-- COLUMN COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON COLUMN "subscribers"."otp_code" IS 'Encrypted 6-digit OTP code for mobile verification';
COMMENT ON COLUMN "subscribers"."otp_expires_at" IS 'Timestamp when the OTP expires (typically 10 minutes after generation)';
COMMENT ON COLUMN "subscribers"."otp_attempts" IS 'Counter for failed OTP verification attempts (max 3 attempts)';
COMMENT ON COLUMN "subscribers"."otp_last_sent_at" IS 'Timestamp of last OTP send for rate limiting (60 second cooldown)';

-- ============================================
-- ROLLBACK SCRIPT (saved as comment)
-- ============================================
/*
-- To rollback this migration, run:

DROP INDEX IF EXISTS "idx_subscribers_pending_otp";
DROP INDEX IF EXISTS "subscribers_otp_last_sent_at_idx";
DROP INDEX IF EXISTS "subscribers_otp_expires_at_idx";

ALTER TABLE "subscribers" DROP COLUMN IF EXISTS "otp_last_sent_at";
ALTER TABLE "subscribers" DROP COLUMN IF EXISTS "otp_attempts";
ALTER TABLE "subscribers" DROP COLUMN IF EXISTS "otp_expires_at";
ALTER TABLE "subscribers" DROP COLUMN IF EXISTS "otp_code";
*/