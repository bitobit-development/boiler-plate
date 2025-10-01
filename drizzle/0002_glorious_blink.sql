CREATE TYPE "public"."admin_role" AS ENUM('super_admin', 'admin', 'viewer');--> statement-breakpoint
CREATE TYPE "public"."audit_action" AS ENUM('create', 'read', 'update', 'delete', 'login', 'logout', 'export', 'import', 'approve', 'reject');--> statement-breakpoint
CREATE TYPE "public"."session_status" AS ENUM('active', 'expired', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."subscriber_status" AS ENUM('pending', 'active', 'suspended', 'deleted');--> statement-breakpoint
CREATE TABLE "admin_action_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_user_id" uuid NOT NULL,
	"action_type" varchar(100) NOT NULL,
	"action_category" varchar(50) NOT NULL,
	"action_description" text NOT NULL,
	"target_type" varchar(50),
	"target_id" uuid,
	"target_name" varchar(255),
	"is_success" boolean DEFAULT true NOT NULL,
	"error_message" text,
	"duration" integer,
	"ip_address" varchar(45) NOT NULL,
	"session_id" uuid,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(50) NOT NULL,
	"description" text,
	"permissions" jsonb NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "admin_roles_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "admin_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_user_id" uuid NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text,
	"token_hash" varchar(64) NOT NULL,
	"status" "session_status" DEFAULT 'active' NOT NULL,
	"user_agent" text,
	"ip_address" varchar(45) NOT NULL,
	"ip_location" jsonb,
	"device_id" varchar(100),
	"device_type" varchar(50),
	"browser_name" varchar(50),
	"os_name" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"last_activity_at" timestamp DEFAULT now() NOT NULL,
	"revoked_at" timestamp,
	"revoked_by" uuid,
	"revoked_reason" text,
	CONSTRAINT "admin_sessions_access_token_unique" UNIQUE("access_token"),
	CONSTRAINT "admin_sessions_refresh_token_unique" UNIQUE("refresh_token"),
	CONSTRAINT "admin_sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "admin_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"username" varchar(100) NOT NULL,
	"password_hash" text NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"phone_number" varchar(20),
	"role" "admin_role" DEFAULT 'viewer' NOT NULL,
	"permissions" jsonb DEFAULT '[]'::jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_super_admin" boolean DEFAULT false NOT NULL,
	"must_change_password" boolean DEFAULT false NOT NULL,
	"last_password_change" timestamp,
	"two_factor_enabled" boolean DEFAULT false NOT NULL,
	"two_factor_secret" text,
	"backup_codes" jsonb,
	"last_login_at" timestamp,
	"last_login_ip" varchar(45),
	"login_attempts" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp,
	"terms_accepted_at" timestamp,
	"privacy_accepted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	CONSTRAINT "admin_users_email_unique" UNIQUE("email"),
	CONSTRAINT "admin_users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_user_id" uuid,
	"admin_email" varchar(255) NOT NULL,
	"admin_role" varchar(50) NOT NULL,
	"action" "audit_action" NOT NULL,
	"entity_type" varchar(50) NOT NULL,
	"entity_id" uuid,
	"entity_name" varchar(255),
	"description" text NOT NULL,
	"changes" jsonb,
	"metadata" jsonb,
	"ip_address" varchar(45) NOT NULL,
	"user_agent" text,
	"session_id" uuid,
	"request_id" varchar(100),
	"risk_level" integer DEFAULT 0 NOT NULL,
	"is_compliance" boolean DEFAULT false NOT NULL,
	"is_security" boolean DEFAULT false NOT NULL,
	"is_success" boolean DEFAULT true NOT NULL,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "data_change_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"table_name" varchar(100) NOT NULL,
	"record_id" uuid NOT NULL,
	"operation" varchar(20) NOT NULL,
	"changed_by" uuid,
	"changed_by_email" varchar(255),
	"old_values" jsonb,
	"new_values" jsonb,
	"changed_fields" jsonb,
	"change_reason" text,
	"change_context" varchar(100),
	"session_id" uuid,
	"request_id" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "security_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_type" varchar(100) NOT NULL,
	"severity" varchar(20) NOT NULL,
	"admin_user_id" uuid,
	"ip_address" varchar(45) NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"details" jsonb,
	"action_taken" text,
	"resolved" boolean DEFAULT false NOT NULL,
	"resolved_at" timestamp,
	"resolved_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriber_analytics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" date NOT NULL,
	"hour" integer,
	"total_signups" integer DEFAULT 0 NOT NULL,
	"verified_signups" integer DEFAULT 0 NOT NULL,
	"unique_visitors" integer DEFAULT 0 NOT NULL,
	"conversion_rate" integer DEFAULT 0 NOT NULL,
	"by_source" jsonb DEFAULT '{}'::jsonb,
	"by_country" jsonb DEFAULT '{}'::jsonb,
	"by_device" jsonb DEFAULT '{}'::jsonb,
	"by_campaign" jsonb DEFAULT '{}'::jsonb,
	"avg_time_to_verify" integer,
	"bounce_rate" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_status" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_name" varchar(100) NOT NULL,
	"status" varchar(20) NOT NULL,
	"uptime" integer,
	"response_time" integer,
	"error_rate" integer,
	"throughput" integer,
	"health_score" integer DEFAULT 100 NOT NULL,
	"last_check_at" timestamp NOT NULL,
	"last_error_at" timestamp,
	"last_error_message" text,
	"alert_level" varchar(20),
	"alert_message" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "subscribers" ADD COLUMN "email_verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "subscribers" ADD COLUMN "mobile_verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "subscribers" ADD COLUMN "status" "subscriber_status" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "subscribers" ADD COLUMN "source" varchar(100);--> statement-breakpoint
ALTER TABLE "subscribers" ADD COLUMN "campaign" varchar(100);--> statement-breakpoint
ALTER TABLE "subscribers" ADD COLUMN "referrer" text;--> statement-breakpoint
ALTER TABLE "subscribers" ADD COLUMN "utm_source" varchar(100);--> statement-breakpoint
ALTER TABLE "subscribers" ADD COLUMN "utm_medium" varchar(100);--> statement-breakpoint
ALTER TABLE "subscribers" ADD COLUMN "utm_campaign" varchar(100);--> statement-breakpoint
ALTER TABLE "subscribers" ADD COLUMN "registration_ip" varchar(45);--> statement-breakpoint
ALTER TABLE "subscribers" ADD COLUMN "country" varchar(2);--> statement-breakpoint
ALTER TABLE "subscribers" ADD COLUMN "region" varchar(100);--> statement-breakpoint
ALTER TABLE "subscribers" ADD COLUMN "city" varchar(100);--> statement-breakpoint
ALTER TABLE "subscribers" ADD COLUMN "last_activity_at" timestamp;--> statement-breakpoint
ALTER TABLE "subscribers" ADD COLUMN "engagement_score" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "subscribers" ADD COLUMN "consent_marketing" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "subscribers" ADD COLUMN "consent_data_processing" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "subscribers" ADD COLUMN "consent_terms" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "subscribers" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "subscribers" ADD COLUMN "tags" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "subscribers" ADD COLUMN "custom_fields" jsonb;--> statement-breakpoint
ALTER TABLE "subscribers" ADD COLUMN "verified_at" timestamp;--> statement-breakpoint
ALTER TABLE "subscribers" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "admin_action_history" ADD CONSTRAINT "admin_action_history_admin_user_id_admin_users_id_fk" FOREIGN KEY ("admin_user_id") REFERENCES "public"."admin_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_sessions" ADD CONSTRAINT "admin_sessions_admin_user_id_admin_users_id_fk" FOREIGN KEY ("admin_user_id") REFERENCES "public"."admin_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_admin_user_id_admin_users_id_fk" FOREIGN KEY ("admin_user_id") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_change_history" ADD CONSTRAINT "data_change_history_changed_by_admin_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_events" ADD CONSTRAINT "security_events_admin_user_id_admin_users_id_fk" FOREIGN KEY ("admin_user_id") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_action_history_user_idx" ON "admin_action_history" USING btree ("admin_user_id");--> statement-breakpoint
CREATE INDEX "admin_action_history_type_idx" ON "admin_action_history" USING btree ("action_type");--> statement-breakpoint
CREATE INDEX "admin_action_history_created_at_idx" ON "admin_action_history" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "admin_action_history_target_idx" ON "admin_action_history" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE UNIQUE INDEX "admin_roles_name_idx" ON "admin_roles" USING btree ("name");--> statement-breakpoint
CREATE INDEX "admin_roles_priority_idx" ON "admin_roles" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "admin_sessions_user_idx" ON "admin_sessions" USING btree ("admin_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "admin_sessions_token_hash_idx" ON "admin_sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "admin_sessions_status_idx" ON "admin_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "admin_sessions_expires_idx" ON "admin_sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "admin_sessions_ip_idx" ON "admin_sessions" USING btree ("ip_address");--> statement-breakpoint
CREATE INDEX "admin_users_email_idx" ON "admin_users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "admin_users_role_idx" ON "admin_users" USING btree ("role");--> statement-breakpoint
CREATE INDEX "admin_users_active_idx" ON "admin_users" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "admin_users_last_login_idx" ON "admin_users" USING btree ("last_login_at");--> statement-breakpoint
CREATE INDEX "audit_logs_admin_user_idx" ON "audit_logs" USING btree ("admin_user_id");--> statement-breakpoint
CREATE INDEX "audit_logs_action_idx" ON "audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "audit_logs_entity_idx" ON "audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_compliance_idx" ON "audit_logs" USING btree ("is_compliance");--> statement-breakpoint
CREATE INDEX "audit_logs_security_idx" ON "audit_logs" USING btree ("is_security");--> statement-breakpoint
CREATE INDEX "audit_logs_risk_level_idx" ON "audit_logs" USING btree ("risk_level");--> statement-breakpoint
CREATE INDEX "data_change_table_record_idx" ON "data_change_history" USING btree ("table_name","record_id");--> statement-breakpoint
CREATE INDEX "data_change_changed_by_idx" ON "data_change_history" USING btree ("changed_by");--> statement-breakpoint
CREATE INDEX "data_change_created_at_idx" ON "data_change_history" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "data_change_operation_idx" ON "data_change_history" USING btree ("operation");--> statement-breakpoint
CREATE INDEX "security_events_type_idx" ON "security_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "security_events_severity_idx" ON "security_events" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "security_events_created_at_idx" ON "security_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "security_events_resolved_idx" ON "security_events" USING btree ("resolved");--> statement-breakpoint
CREATE INDEX "subscriber_analytics_date_idx" ON "subscriber_analytics" USING btree ("date");--> statement-breakpoint
CREATE INDEX "subscriber_analytics_date_hour_idx" ON "subscriber_analytics" USING btree ("date","hour");--> statement-breakpoint
CREATE INDEX "system_status_service_idx" ON "system_status" USING btree ("service_name");--> statement-breakpoint
CREATE INDEX "system_status_status_idx" ON "system_status" USING btree ("status");--> statement-breakpoint
CREATE INDEX "system_status_alert_idx" ON "system_status" USING btree ("alert_level");--> statement-breakpoint
CREATE UNIQUE INDEX "subscribers_email_idx" ON "subscribers" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "subscribers_mobile_idx" ON "subscribers" USING btree ("mobile");--> statement-breakpoint
CREATE INDEX "subscribers_status_idx" ON "subscribers" USING btree ("status");--> statement-breakpoint
CREATE INDEX "subscribers_created_at_idx" ON "subscribers" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "subscribers_source_idx" ON "subscribers" USING btree ("source");--> statement-breakpoint
CREATE INDEX "subscribers_country_idx" ON "subscribers" USING btree ("country");