ALTER TYPE "public"."order_status" ADD VALUE 'pending' BEFORE 'draft';--> statement-breakpoint
CREATE TABLE "carts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subscriber_id" uuid NOT NULL,
	"items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	CONSTRAINT "carts_subscriber_id_unique" UNIQUE("subscriber_id")
);
--> statement-breakpoint
CREATE TABLE "member_pricing" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"member_price" integer NOT NULL,
	"discount_percentage" numeric(5, 2),
	"discount_amount" integer,
	"membership_tier" "membership_tier" DEFAULT 'basic' NOT NULL,
	"min_quantity" integer DEFAULT 1 NOT NULL,
	"max_quantity" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"valid_from" timestamp DEFAULT now() NOT NULL,
	"valid_until" timestamp,
	"priority" integer DEFAULT 0 NOT NULL,
	"notes" varchar(500),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
ALTER TABLE "otp_override_logs" ALTER COLUMN "shop_user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "carts" ADD CONSTRAINT "carts_subscriber_id_subscribers_id_fk" FOREIGN KEY ("subscriber_id") REFERENCES "public"."subscribers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_pricing" ADD CONSTRAINT "member_pricing_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_pricing" ADD CONSTRAINT "member_pricing_created_by_admin_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_pricing" ADD CONSTRAINT "member_pricing_updated_by_admin_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "carts_subscriber_idx" ON "carts" USING btree ("subscriber_id");--> statement-breakpoint
CREATE INDEX "carts_expires_at_idx" ON "carts" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "carts_subscriber_expires_idx" ON "carts" USING btree ("subscriber_id","expires_at");--> statement-breakpoint
CREATE INDEX "member_pricing_product_idx" ON "member_pricing" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "member_pricing_tier_idx" ON "member_pricing" USING btree ("membership_tier");--> statement-breakpoint
CREATE INDEX "member_pricing_active_idx" ON "member_pricing" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "member_pricing_validity_idx" ON "member_pricing" USING btree ("valid_from","valid_until");--> statement-breakpoint
CREATE INDEX "member_pricing_priority_idx" ON "member_pricing" USING btree ("priority");--> statement-breakpoint
CREATE UNIQUE INDEX "member_pricing_unique_idx" ON "member_pricing" USING btree ("product_id","membership_tier","min_quantity");--> statement-breakpoint
CREATE INDEX "orders_expires_at_idx" ON "orders" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "orders_status_expires_idx" ON "orders" USING btree ("status","expires_at");--> statement-breakpoint
CREATE INDEX "orders_subscriber_status_idx" ON "orders" USING btree ("subscriber_id","status");