-- Migration: Make shop_user_id nullable in otp_override_logs
-- This allows OTP overrides without a logged-in shop user
-- The teller's name will be captured in the explanation field instead

BEGIN;

-- Make shop_user_id nullable
ALTER TABLE otp_override_logs
ALTER COLUMN shop_user_id DROP NOT NULL;

COMMIT;
