CREATE TYPE "public"."membership_tier" AS ENUM('basic', 'premium', 'vip', 'founding');--> statement-breakpoint
CREATE TYPE "public"."product_status" AS ENUM('draft', 'active', 'archived', 'out_of_stock');--> statement-breakpoint
CREATE TYPE "public"."product_type" AS ENUM('pre_roll', 'dab', 'edible', 'vape', 'flower', 'concentrate', 'accessory');--> statement-breakpoint
CREATE TABLE "inventory_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"movement_type" varchar(50) NOT NULL,
	"quantity" integer NOT NULL,
	"previous_quantity" integer NOT NULL,
	"new_quantity" integer NOT NULL,
	"reason" text,
	"reference_type" varchar(50),
	"reference_id" uuid,
	"batch_number" varchar(100),
	"expiry_date" timestamp,
	"performed_by" uuid,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "price_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"product_name" varchar(255) NOT NULL,
	"product_sku" varchar(100),
	"old_price" integer NOT NULL,
	"new_price" integer NOT NULL,
	"price_difference" integer NOT NULL,
	"percentage_change" numeric(5, 2),
	"old_cost_price" integer,
	"new_cost_price" integer,
	"reason" text,
	"change_type" varchar(50),
	"promotion_id" uuid,
	"batch_id" uuid,
	"batch_note" text,
	"requires_approval" boolean DEFAULT false NOT NULL,
	"approved_by" uuid,
	"approved_at" timestamp,
	"approval_note" text,
	"changed_by" uuid NOT NULL,
	"changed_by_name" varchar(255) NOT NULL,
	"changed_by_role" varchar(50),
	"ip_address" varchar(45),
	"user_agent" text,
	"session_id" uuid,
	"effective_from" timestamp DEFAULT now() NOT NULL,
	"effective_until" timestamp,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_attributes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"attribute_key" varchar(100) NOT NULL,
	"attribute_value" text NOT NULL,
	"attribute_type" varchar(50),
	"display_order" integer DEFAULT 0,
	"is_visible" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"description" text,
	"parent_id" uuid,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"depth" integer DEFAULT 0 NOT NULL,
	"image_url" text,
	"icon_name" varchar(50),
	"color" varchar(7),
	"is_active" boolean DEFAULT true NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"meta_title" varchar(255),
	"meta_description" text,
	"product_count" integer DEFAULT 0 NOT NULL,
	"view_count" integer DEFAULT 0 NOT NULL,
	"custom_fields" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	CONSTRAINT "product_categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"description" text,
	"short_description" varchar(500),
	"category_id" uuid NOT NULL,
	"sku" varchar(100),
	"barcode" varchar(100),
	"product_type" "product_type" NOT NULL,
	"price" integer NOT NULL,
	"compare_price" integer,
	"cost_price" integer,
	"variant_of" uuid,
	"variant_label" varchar(100),
	"sort_variant_order" integer DEFAULT 0,
	"quantity" integer DEFAULT 0 NOT NULL,
	"reserved_quantity" integer DEFAULT 0 NOT NULL,
	"track_quantity" boolean DEFAULT true NOT NULL,
	"allow_backorder" boolean DEFAULT false NOT NULL,
	"low_stock_threshold" integer DEFAULT 5,
	"status" "product_status" DEFAULT 'draft' NOT NULL,
	"is_visible" boolean DEFAULT true NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"is_new" boolean DEFAULT false NOT NULL,
	"weight" varchar(50),
	"potency" varchar(50),
	"strain" varchar(100),
	"thc_content" numeric(5, 2),
	"cbd_content" numeric(5, 2),
	"terpenes" jsonb,
	"effects" jsonb,
	"flavor_profile" jsonb,
	"image_url" text,
	"images" jsonb DEFAULT '[]'::jsonb,
	"meta_title" varchar(255),
	"meta_description" text,
	"keywords" jsonb DEFAULT '[]'::jsonb,
	"requires_membership" boolean DEFAULT true NOT NULL,
	"membership_tiers" jsonb DEFAULT '["basic"]'::jsonb,
	"supplier" varchar(255),
	"supplier_sku" varchar(100),
	"view_count" integer DEFAULT 0 NOT NULL,
	"purchase_count" integer DEFAULT 0 NOT NULL,
	"rating" numeric(3, 2),
	"review_count" integer DEFAULT 0 NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"custom_fields" jsonb,
	"age_restricted" boolean DEFAULT true NOT NULL,
	"compliance_notes" text,
	"lab_test_results" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"published_at" timestamp,
	"archived_at" timestamp,
	"created_by" uuid,
	"updated_by" uuid,
	CONSTRAINT "products_slug_unique" UNIQUE("slug"),
	CONSTRAINT "products_sku_unique" UNIQUE("sku")
);
--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_performed_by_admin_users_id_fk" FOREIGN KEY ("performed_by") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_history" ADD CONSTRAINT "price_history_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_history" ADD CONSTRAINT "price_history_approved_by_admin_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_history" ADD CONSTRAINT "price_history_changed_by_admin_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_attributes" ADD CONSTRAINT "product_attributes_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_parent_id_product_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."product_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_created_by_admin_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_updated_by_admin_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_product_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."product_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_created_by_admin_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_updated_by_admin_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "inventory_movements_product_idx" ON "inventory_movements" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "inventory_movements_type_idx" ON "inventory_movements" USING btree ("movement_type");--> statement-breakpoint
CREATE INDEX "inventory_movements_created_at_idx" ON "inventory_movements" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "inventory_movements_reference_idx" ON "inventory_movements" USING btree ("reference_type","reference_id");--> statement-breakpoint
CREATE INDEX "price_history_product_idx" ON "price_history" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "price_history_changed_by_idx" ON "price_history" USING btree ("changed_by");--> statement-breakpoint
CREATE INDEX "price_history_created_at_idx" ON "price_history" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "price_history_batch_idx" ON "price_history" USING btree ("batch_id");--> statement-breakpoint
CREATE INDEX "price_history_change_type_idx" ON "price_history" USING btree ("change_type");--> statement-breakpoint
CREATE INDEX "price_history_effective_from_idx" ON "price_history" USING btree ("effective_from");--> statement-breakpoint
CREATE INDEX "product_attributes_product_idx" ON "product_attributes" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "product_attributes_key_idx" ON "product_attributes" USING btree ("attribute_key");--> statement-breakpoint
CREATE UNIQUE INDEX "product_attributes_product_key_idx" ON "product_attributes" USING btree ("product_id","attribute_key");--> statement-breakpoint
CREATE UNIQUE INDEX "product_categories_slug_idx" ON "product_categories" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "product_categories_parent_idx" ON "product_categories" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "product_categories_sort_order_idx" ON "product_categories" USING btree ("sort_order");--> statement-breakpoint
CREATE INDEX "product_categories_active_idx" ON "product_categories" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "product_categories_featured_idx" ON "product_categories" USING btree ("is_featured");--> statement-breakpoint
CREATE UNIQUE INDEX "products_slug_idx" ON "products" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "products_sku_idx" ON "products" USING btree ("sku");--> statement-breakpoint
CREATE INDEX "products_category_idx" ON "products" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "products_status_idx" ON "products" USING btree ("status");--> statement-breakpoint
CREATE INDEX "products_visible_idx" ON "products" USING btree ("is_visible","status");--> statement-breakpoint
CREATE INDEX "products_featured_idx" ON "products" USING btree ("is_featured");--> statement-breakpoint
CREATE INDEX "products_price_idx" ON "products" USING btree ("price");--> statement-breakpoint
CREATE INDEX "products_quantity_idx" ON "products" USING btree ("quantity");--> statement-breakpoint
CREATE INDEX "products_type_idx" ON "products" USING btree ("product_type");--> statement-breakpoint
CREATE INDEX "products_variant_of_idx" ON "products" USING btree ("variant_of");--> statement-breakpoint
CREATE INDEX "products_created_at_idx" ON "products" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "products_published_at_idx" ON "products" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX "products_active_idx" ON "products" USING btree ("status","is_visible","published_at");--> statement-breakpoint
CREATE INDEX "products_category_active_idx" ON "products" USING btree ("category_id","status","is_visible");