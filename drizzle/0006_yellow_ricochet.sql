CREATE TYPE "public"."order_status" AS ENUM('draft', 'confirmed', 'fulfilled', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."order_type" AS ENUM('pos', 'online', 'phone');--> statement-breakpoint
CREATE TYPE "public"."otp_override_reason" AS ENUM('sms_delivery_failure', 'network_issues', 'customer_phone_issues', 'international_number', 'elderly_assistance', 'disability_accommodation', 'technical_error', 'manager_approval');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('cash', 'card', 'eft', 'voucher');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'completed', 'refunded', 'cancelled');--> statement-breakpoint
ALTER TYPE "public"."admin_role" ADD VALUE 'shop_user';--> statement-breakpoint
CREATE TABLE "kiosk_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shop_user_id" uuid NOT NULL,
	"kiosk_id" varchar(100) NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"ended_at" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_activity_at" timestamp DEFAULT now() NOT NULL,
	"device_fingerprint" varchar(255),
	"ip_address" varchar(45) NOT NULL,
	"user_agent" text,
	"browser_name" varchar(50),
	"os_name" varchar(50),
	"device_type" varchar(50),
	"orders_processed" integer DEFAULT 0 NOT NULL,
	"total_sales" integer DEFAULT 0 NOT NULL,
	"average_order_value" integer DEFAULT 0,
	"otp_overrides_count" integer DEFAULT 0 NOT NULL,
	"suspicious_activity" boolean DEFAULT false NOT NULL,
	"suspicious_activity_notes" text,
	"terminated_by" uuid,
	"termination_reason" text,
	"location_name" varchar(255),
	"location_code" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_number" varchar(50) NOT NULL,
	"order_type" "order_type" DEFAULT 'pos' NOT NULL,
	"subscriber_id" uuid,
	"customer_name" varchar(255),
	"customer_mobile" varchar(20),
	"shop_user_id" uuid NOT NULL,
	"shop_user_name" varchar(255) NOT NULL,
	"kiosk_id" varchar(100),
	"items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"subtotal" integer DEFAULT 0 NOT NULL,
	"tax" integer DEFAULT 0 NOT NULL,
	"discount" integer DEFAULT 0 NOT NULL,
	"total" integer DEFAULT 0 NOT NULL,
	"payment_method" "payment_method",
	"payment_status" "payment_status" DEFAULT 'pending' NOT NULL,
	"payment_reference" varchar(100),
	"status" "order_status" DEFAULT 'draft' NOT NULL,
	"notes" text,
	"customer_notes" text,
	"was_otp_overridden" boolean DEFAULT false NOT NULL,
	"override_reason" varchar(100),
	"override_explanation" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"cancelled_at" timestamp,
	"metadata" jsonb,
	CONSTRAINT "orders_order_number_unique" UNIQUE("order_number")
);
--> statement-breakpoint
CREATE TABLE "otp_override_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subscriber_id" uuid NOT NULL,
	"shop_user_id" uuid NOT NULL,
	"order_id" uuid,
	"reason" "otp_override_reason" NOT NULL,
	"explanation" text NOT NULL,
	"was_successful" boolean DEFAULT true NOT NULL,
	"ip_address" varchar(45) NOT NULL,
	"kiosk_id" varchar(100),
	"user_agent" text,
	"device_fingerprint" varchar(255),
	"session_id" uuid,
	"risk_score" integer DEFAULT 0,
	"flagged_for_review" boolean DEFAULT false NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp,
	"review_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "kiosk_sessions" ADD CONSTRAINT "kiosk_sessions_shop_user_id_admin_users_id_fk" FOREIGN KEY ("shop_user_id") REFERENCES "public"."admin_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kiosk_sessions" ADD CONSTRAINT "kiosk_sessions_terminated_by_admin_users_id_fk" FOREIGN KEY ("terminated_by") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_subscriber_id_subscribers_id_fk" FOREIGN KEY ("subscriber_id") REFERENCES "public"."subscribers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_shop_user_id_admin_users_id_fk" FOREIGN KEY ("shop_user_id") REFERENCES "public"."admin_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "otp_override_logs" ADD CONSTRAINT "otp_override_logs_subscriber_id_subscribers_id_fk" FOREIGN KEY ("subscriber_id") REFERENCES "public"."subscribers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "otp_override_logs" ADD CONSTRAINT "otp_override_logs_shop_user_id_admin_users_id_fk" FOREIGN KEY ("shop_user_id") REFERENCES "public"."admin_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "otp_override_logs" ADD CONSTRAINT "otp_override_logs_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "otp_override_logs" ADD CONSTRAINT "otp_override_logs_reviewed_by_admin_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "kiosk_sessions_shop_user_idx" ON "kiosk_sessions" USING btree ("shop_user_id");--> statement-breakpoint
CREATE INDEX "kiosk_sessions_kiosk_idx" ON "kiosk_sessions" USING btree ("kiosk_id");--> statement-breakpoint
CREATE INDEX "kiosk_sessions_active_idx" ON "kiosk_sessions" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "kiosk_sessions_started_at_idx" ON "kiosk_sessions" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "kiosk_sessions_last_activity_idx" ON "kiosk_sessions" USING btree ("last_activity_at");--> statement-breakpoint
CREATE INDEX "kiosk_sessions_active_kiosk_idx" ON "kiosk_sessions" USING btree ("kiosk_id","is_active");--> statement-breakpoint
CREATE INDEX "kiosk_sessions_shop_user_active_idx" ON "kiosk_sessions" USING btree ("shop_user_id","is_active");--> statement-breakpoint
CREATE INDEX "kiosk_sessions_kiosk_started_idx" ON "kiosk_sessions" USING btree ("kiosk_id","started_at");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_order_number_idx" ON "orders" USING btree ("order_number");--> statement-breakpoint
CREATE INDEX "orders_subscriber_idx" ON "orders" USING btree ("subscriber_id");--> statement-breakpoint
CREATE INDEX "orders_shop_user_idx" ON "orders" USING btree ("shop_user_id");--> statement-breakpoint
CREATE INDEX "orders_kiosk_idx" ON "orders" USING btree ("kiosk_id");--> statement-breakpoint
CREATE INDEX "orders_status_idx" ON "orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "orders_payment_status_idx" ON "orders" USING btree ("payment_status");--> statement-breakpoint
CREATE INDEX "orders_created_at_idx" ON "orders" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "orders_completed_at_idx" ON "orders" USING btree ("completed_at");--> statement-breakpoint
CREATE INDEX "orders_shop_user_status_idx" ON "orders" USING btree ("shop_user_id","status");--> statement-breakpoint
CREATE INDEX "orders_kiosk_created_idx" ON "orders" USING btree ("kiosk_id","created_at");--> statement-breakpoint
CREATE INDEX "orders_subscriber_created_idx" ON "orders" USING btree ("subscriber_id","created_at");--> statement-breakpoint
CREATE INDEX "otp_override_logs_subscriber_idx" ON "otp_override_logs" USING btree ("subscriber_id");--> statement-breakpoint
CREATE INDEX "otp_override_logs_shop_user_idx" ON "otp_override_logs" USING btree ("shop_user_id");--> statement-breakpoint
CREATE INDEX "otp_override_logs_order_idx" ON "otp_override_logs" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "otp_override_logs_reason_idx" ON "otp_override_logs" USING btree ("reason");--> statement-breakpoint
CREATE INDEX "otp_override_logs_created_at_idx" ON "otp_override_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "otp_override_logs_flagged_idx" ON "otp_override_logs" USING btree ("flagged_for_review");--> statement-breakpoint
CREATE INDEX "otp_override_logs_shop_user_reason_idx" ON "otp_override_logs" USING btree ("shop_user_id","reason");--> statement-breakpoint
CREATE INDEX "otp_override_logs_subscriber_created_idx" ON "otp_override_logs" USING btree ("subscriber_id","created_at");