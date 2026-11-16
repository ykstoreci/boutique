import { sql } from "drizzle-orm";
import type { Database } from "./client";

export const EMBEDDED_MIGRATION_STATEMENTS: string[] = [
  "CREATE TABLE \"admin_sessions\" (\n\t\"id\" text PRIMARY KEY NOT NULL,\n\t\"admin_user_id\" uuid NOT NULL,\n\t\"expires_at\" timestamp with time zone NOT NULL,\n\t\"user_agent\" text,\n\t\"ip\" text,\n\t\"created_at\" timestamp with time zone DEFAULT now() NOT NULL\n);",
  "CREATE TABLE \"admin_users\" (\n\t\"id\" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,\n\t\"email\" text NOT NULL,\n\t\"name\" text NOT NULL,\n\t\"password_hash\" text NOT NULL,\n\t\"last_login_at\" timestamp with time zone,\n\t\"created_at\" timestamp with time zone DEFAULT now() NOT NULL,\n\t\"updated_at\" timestamp with time zone DEFAULT now() NOT NULL\n);",
  "CREATE TABLE \"audit_logs\" (\n\t\"id\" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,\n\t\"admin_user_id\" uuid,\n\t\"action\" text NOT NULL,\n\t\"entity\" text NOT NULL,\n\t\"entity_id\" text,\n\t\"details\" jsonb,\n\t\"ip\" text,\n\t\"created_at\" timestamp with time zone DEFAULT now() NOT NULL\n);",
  "CREATE TABLE \"categories\" (\n\t\"id\" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,\n\t\"name\" text NOT NULL,\n\t\"slug\" text NOT NULL,\n\t\"description\" text DEFAULT '' NOT NULL,\n\t\"image_key\" text,\n\t\"position\" integer DEFAULT 0 NOT NULL,\n\t\"is_published\" boolean DEFAULT true NOT NULL,\n\t\"created_at\" timestamp with time zone DEFAULT now() NOT NULL,\n\t\"updated_at\" timestamp with time zone DEFAULT now() NOT NULL\n);",
  "CREATE TABLE \"customers\" (\n\t\"id\" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,\n\t\"name\" text NOT NULL,\n\t\"phone\" text NOT NULL,\n\t\"city\" text DEFAULT '' NOT NULL,\n\t\"notes\" text DEFAULT '' NOT NULL,\n\t\"created_at\" timestamp with time zone DEFAULT now() NOT NULL,\n\t\"updated_at\" timestamp with time zone DEFAULT now() NOT NULL\n);",
  "CREATE TABLE \"delivery_addresses\" (\n\t\"id\" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,\n\t\"customer_id\" uuid NOT NULL,\n\t\"mode\" text NOT NULL,\n\t\"commune\" text,\n\t\"district\" text,\n\t\"city\" text,\n\t\"details\" text,\n\t\"created_at\" timestamp with time zone DEFAULT now() NOT NULL\n);",
  "CREATE TABLE \"login_attempts\" (\n\t\"id\" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,\n\t\"key\" text NOT NULL,\n\t\"success\" boolean NOT NULL,\n\t\"created_at\" timestamp with time zone DEFAULT now() NOT NULL\n);",
  "CREATE TABLE \"notifications\" (\n\t\"id\" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,\n\t\"type\" text NOT NULL,\n\t\"title\" text NOT NULL,\n\t\"body\" text NOT NULL,\n\t\"url\" text,\n\t\"order_id\" uuid,\n\t\"product_id\" uuid,\n\t\"is_read\" boolean DEFAULT false NOT NULL,\n\t\"push_status\" text DEFAULT 'pending' NOT NULL,\n\t\"created_at\" timestamp with time zone DEFAULT now() NOT NULL\n);",
  "CREATE TABLE \"order_items\" (\n\t\"id\" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,\n\t\"order_id\" uuid NOT NULL,\n\t\"product_id\" uuid,\n\t\"variant_id\" uuid,\n\t\"product_name\" text NOT NULL,\n\t\"product_reference\" text,\n\t\"variant_name\" text,\n\t\"image_key\" text,\n\t\"unit_price\" integer NOT NULL,\n\t\"quantity\" integer NOT NULL,\n\t\"line_total\" integer NOT NULL,\n\t\"created_at\" timestamp with time zone DEFAULT now() NOT NULL,\n\tCONSTRAINT \"order_items_qty_pos\" CHECK (\"order_items\".\"quantity\" > 0)\n);",
  "CREATE TABLE \"order_status_history\" (\n\t\"id\" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,\n\t\"order_id\" uuid NOT NULL,\n\t\"kind\" text DEFAULT 'status' NOT NULL,\n\t\"from_value\" text,\n\t\"to_value\" text NOT NULL,\n\t\"note\" text,\n\t\"admin_user_id\" uuid,\n\t\"created_at\" timestamp with time zone DEFAULT now() NOT NULL\n);",
  "CREATE TABLE \"orders\" (\n\t\"id\" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,\n\t\"number\" text NOT NULL,\n\t\"access_token_hash\" text NOT NULL,\n\t\"idempotency_key\" text NOT NULL,\n\t\"customer_id\" uuid,\n\t\"delivery_address_id\" uuid,\n\t\"mode\" text NOT NULL,\n\t\"customer_name\" text NOT NULL,\n\t\"customer_phone\" text NOT NULL,\n\t\"commune\" text,\n\t\"district\" text,\n\t\"city\" text,\n\t\"address_details\" text,\n\t\"subtotal\" integer NOT NULL,\n\t\"fee\" integer,\n\t\"total\" integer NOT NULL,\n\t\"currency\" text NOT NULL,\n\t\"status\" text DEFAULT 'new' NOT NULL,\n\t\"payment_status\" text DEFAULT 'pending' NOT NULL,\n\t\"stock_reserved\" boolean DEFAULT false NOT NULL,\n\t\"whatsapp_message\" text NOT NULL,\n\t\"whatsapp_number\" text NOT NULL,\n\t\"admin_notes\" text DEFAULT '' NOT NULL,\n\t\"reminder_sent_at\" timestamp with time zone,\n\t\"ip\" text,\n\t\"created_at\" timestamp with time zone DEFAULT now() NOT NULL,\n\t\"updated_at\" timestamp with time zone DEFAULT now() NOT NULL,\n\tCONSTRAINT \"orders_amounts_pos\" CHECK (\"orders\".\"subtotal\" >= 0 AND \"orders\".\"total\" >= 0 AND (\"orders\".\"fee\" IS NULL OR \"orders\".\"fee\" >= 0))\n);",
  "CREATE TABLE \"pages\" (\n\t\"id\" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,\n\t\"slug\" text NOT NULL,\n\t\"title\" text NOT NULL,\n\t\"content\" text DEFAULT '' NOT NULL,\n\t\"is_published\" boolean DEFAULT false NOT NULL,\n\t\"is_system\" boolean DEFAULT false NOT NULL,\n\t\"show_in_footer\" boolean DEFAULT true NOT NULL,\n\t\"created_at\" timestamp with time zone DEFAULT now() NOT NULL,\n\t\"updated_at\" timestamp with time zone DEFAULT now() NOT NULL\n);",
  "CREATE TABLE \"product_images\" (\n\t\"id\" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,\n\t\"product_id\" uuid NOT NULL,\n\t\"storage_key\" text NOT NULL,\n\t\"width\" integer NOT NULL,\n\t\"height\" integer NOT NULL,\n\t\"alt\" text DEFAULT '' NOT NULL,\n\t\"position\" integer DEFAULT 0 NOT NULL,\n\t\"is_main\" boolean DEFAULT false NOT NULL,\n\t\"created_at\" timestamp with time zone DEFAULT now() NOT NULL\n);",
  "CREATE TABLE \"product_relations\" (\n\t\"product_id\" uuid NOT NULL,\n\t\"related_product_id\" uuid NOT NULL,\n\t\"position\" integer DEFAULT 0 NOT NULL,\n\tCONSTRAINT \"product_relations_product_id_related_product_id_pk\" PRIMARY KEY(\"product_id\",\"related_product_id\")\n);",
  "CREATE TABLE \"product_variants\" (\n\t\"id\" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,\n\t\"product_id\" uuid NOT NULL,\n\t\"name\" text NOT NULL,\n\t\"sku\" text,\n\t\"price\" integer,\n\t\"stock\" integer DEFAULT 0 NOT NULL,\n\t\"position\" integer DEFAULT 0 NOT NULL,\n\t\"is_active\" boolean DEFAULT true NOT NULL,\n\t\"created_at\" timestamp with time zone DEFAULT now() NOT NULL,\n\t\"updated_at\" timestamp with time zone DEFAULT now() NOT NULL,\n\tCONSTRAINT \"product_variants_stock_pos\" CHECK (\"product_variants\".\"stock\" >= 0),\n\tCONSTRAINT \"product_variants_price_pos\" CHECK (\"product_variants\".\"price\" IS NULL OR \"product_variants\".\"price\" >= 0)\n);",
  "CREATE TABLE \"products\" (\n\t\"id\" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,\n\t\"name\" text NOT NULL,\n\t\"slug\" text NOT NULL,\n\t\"reference\" text,\n\t\"description\" text DEFAULT '' NOT NULL,\n\t\"price\" integer NOT NULL,\n\t\"promo_price\" integer,\n\t\"category_id\" uuid,\n\t\"stock\" integer DEFAULT 0 NOT NULL,\n\t\"track_stock\" boolean DEFAULT true NOT NULL,\n\t\"specs\" jsonb DEFAULT '[]'::jsonb NOT NULL,\n\t\"status\" text DEFAULT 'draft' NOT NULL,\n\t\"is_featured\" boolean DEFAULT false NOT NULL,\n\t\"published_at\" timestamp with time zone,\n\t\"created_at\" timestamp with time zone DEFAULT now() NOT NULL,\n\t\"updated_at\" timestamp with time zone DEFAULT now() NOT NULL,\n\tCONSTRAINT \"products_price_pos\" CHECK (\"products\".\"price\" >= 0),\n\tCONSTRAINT \"products_promo_valid\" CHECK (\"products\".\"promo_price\" IS NULL OR (\"products\".\"promo_price\" >= 0 AND \"products\".\"promo_price\" < \"products\".\"price\")),\n\tCONSTRAINT \"products_stock_pos\" CHECK (\"products\".\"stock\" >= 0)\n);",
  "CREATE TABLE \"push_deliveries\" (\n\t\"id\" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,\n\t\"notification_id\" uuid,\n\t\"subscription_id\" uuid,\n\t\"success\" boolean NOT NULL,\n\t\"status_code\" integer,\n\t\"error\" text,\n\t\"created_at\" timestamp with time zone DEFAULT now() NOT NULL\n);",
  "CREATE TABLE \"push_subscriptions\" (\n\t\"id\" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,\n\t\"admin_user_id\" uuid NOT NULL,\n\t\"endpoint\" text NOT NULL,\n\t\"p256dh\" text NOT NULL,\n\t\"auth\" text NOT NULL,\n\t\"device_label\" text DEFAULT '' NOT NULL,\n\t\"user_agent\" text,\n\t\"is_active\" boolean DEFAULT true NOT NULL,\n\t\"failure_count\" integer DEFAULT 0 NOT NULL,\n\t\"last_error\" text,\n\t\"last_success_at\" timestamp with time zone,\n\t\"created_at\" timestamp with time zone DEFAULT now() NOT NULL,\n\t\"updated_at\" timestamp with time zone DEFAULT now() NOT NULL\n);",
  "CREATE TABLE \"rate_limits\" (\n\t\"id\" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,\n\t\"key\" text NOT NULL,\n\t\"created_at\" timestamp with time zone DEFAULT now() NOT NULL\n);",
  "CREATE TABLE \"shipping_zones\" (\n\t\"id\" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,\n\t\"type\" text NOT NULL,\n\t\"name\" text NOT NULL,\n\t\"fee\" integer,\n\t\"is_active\" boolean DEFAULT true NOT NULL,\n\t\"position\" integer DEFAULT 0 NOT NULL,\n\t\"created_at\" timestamp with time zone DEFAULT now() NOT NULL,\n\t\"updated_at\" timestamp with time zone DEFAULT now() NOT NULL,\n\tCONSTRAINT \"shipping_zones_fee_pos\" CHECK (\"shipping_zones\".\"fee\" IS NULL OR \"shipping_zones\".\"fee\" >= 0)\n);",
  "CREATE TABLE \"stock_movements\" (\n\t\"id\" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,\n\t\"product_id\" uuid,\n\t\"variant_id\" uuid,\n\t\"label\" text NOT NULL,\n\t\"delta\" integer NOT NULL,\n\t\"stock_after\" integer NOT NULL,\n\t\"reason\" text NOT NULL,\n\t\"order_id\" uuid,\n\t\"note\" text,\n\t\"admin_user_id\" uuid,\n\t\"created_at\" timestamp with time zone DEFAULT now() NOT NULL\n);",
  "CREATE TABLE \"store_settings\" (\n\t\"id\" integer PRIMARY KEY DEFAULT 1 NOT NULL,\n\t\"store_name\" text DEFAULT '' NOT NULL,\n\t\"tagline\" text DEFAULT '' NOT NULL,\n\t\"logo_key\" text,\n\t\"favicon_key\" text,\n\t\"phone\" text DEFAULT '' NOT NULL,\n\t\"whatsapp_number\" text DEFAULT '' NOT NULL,\n\t\"email\" text DEFAULT '' NOT NULL,\n\t\"address\" text DEFAULT '' NOT NULL,\n\t\"country\" text DEFAULT '' NOT NULL,\n\t\"currency\" text DEFAULT 'XOF' NOT NULL,\n\t\"timezone\" text DEFAULT 'Africa/Abidjan' NOT NULL,\n\t\"locale\" text DEFAULT 'fr-FR' NOT NULL,\n\t\"social_links\" jsonb DEFAULT '{}'::jsonb NOT NULL,\n\t\"default_delivery_fee\" integer,\n\t\"default_shipping_fee\" integer,\n\t\"delivery_enabled\" boolean DEFAULT true NOT NULL,\n\t\"shipping_enabled\" boolean DEFAULT true NOT NULL,\n\t\"orders_enabled\" boolean DEFAULT false NOT NULL,\n\t\"low_stock_threshold\" integer DEFAULT 3 NOT NULL,\n\t\"pending_reminder_hours\" integer DEFAULT 2 NOT NULL,\n\t\"delivery_info\" text DEFAULT '' NOT NULL,\n\t\"shipping_info\" text DEFAULT '' NOT NULL,\n\t\"updated_at\" timestamp with time zone DEFAULT now() NOT NULL,\n\tCONSTRAINT \"store_settings_singleton\" CHECK (\"store_settings\".\"id\" = 1)\n);",
  "CREATE TABLE \"theme_sections\" (\n\t\"id\" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,\n\t\"theme_id\" uuid NOT NULL,\n\t\"type\" text NOT NULL,\n\t\"position\" integer DEFAULT 0 NOT NULL,\n\t\"is_enabled\" boolean DEFAULT true NOT NULL,\n\t\"settings\" jsonb DEFAULT '{}'::jsonb NOT NULL,\n\t\"created_at\" timestamp with time zone DEFAULT now() NOT NULL,\n\t\"updated_at\" timestamp with time zone DEFAULT now() NOT NULL\n);",
  "CREATE TABLE \"theme_versions\" (\n\t\"id\" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,\n\t\"theme_id\" uuid NOT NULL,\n\t\"version\" integer NOT NULL,\n\t\"snapshot\" jsonb NOT NULL,\n\t\"note\" text DEFAULT '' NOT NULL,\n\t\"admin_user_id\" uuid,\n\t\"created_at\" timestamp with time zone DEFAULT now() NOT NULL\n);",
  "CREATE TABLE \"themes\" (\n\t\"id\" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,\n\t\"name\" text NOT NULL,\n\t\"is_active\" boolean DEFAULT true NOT NULL,\n\t\"draft_settings\" jsonb NOT NULL,\n\t\"draft_updated_at\" timestamp with time zone DEFAULT now() NOT NULL,\n\t\"published_version_id\" uuid,\n\t\"created_at\" timestamp with time zone DEFAULT now() NOT NULL\n);",
  "ALTER TABLE \"admin_sessions\" ADD CONSTRAINT \"admin_sessions_admin_user_id_admin_users_id_fk\" FOREIGN KEY (\"admin_user_id\") REFERENCES \"public\".\"admin_users\"(\"id\") ON DELETE cascade ON UPDATE no action;",
  "ALTER TABLE \"audit_logs\" ADD CONSTRAINT \"audit_logs_admin_user_id_admin_users_id_fk\" FOREIGN KEY (\"admin_user_id\") REFERENCES \"public\".\"admin_users\"(\"id\") ON DELETE set null ON UPDATE no action;",
  "ALTER TABLE \"delivery_addresses\" ADD CONSTRAINT \"delivery_addresses_customer_id_customers_id_fk\" FOREIGN KEY (\"customer_id\") REFERENCES \"public\".\"customers\"(\"id\") ON DELETE cascade ON UPDATE no action;",
  "ALTER TABLE \"notifications\" ADD CONSTRAINT \"notifications_order_id_orders_id_fk\" FOREIGN KEY (\"order_id\") REFERENCES \"public\".\"orders\"(\"id\") ON DELETE set null ON UPDATE no action;",
  "ALTER TABLE \"notifications\" ADD CONSTRAINT \"notifications_product_id_products_id_fk\" FOREIGN KEY (\"product_id\") REFERENCES \"public\".\"products\"(\"id\") ON DELETE set null ON UPDATE no action;",
  "ALTER TABLE \"order_items\" ADD CONSTRAINT \"order_items_order_id_orders_id_fk\" FOREIGN KEY (\"order_id\") REFERENCES \"public\".\"orders\"(\"id\") ON DELETE cascade ON UPDATE no action;",
  "ALTER TABLE \"order_items\" ADD CONSTRAINT \"order_items_product_id_products_id_fk\" FOREIGN KEY (\"product_id\") REFERENCES \"public\".\"products\"(\"id\") ON DELETE set null ON UPDATE no action;",
  "ALTER TABLE \"order_items\" ADD CONSTRAINT \"order_items_variant_id_product_variants_id_fk\" FOREIGN KEY (\"variant_id\") REFERENCES \"public\".\"product_variants\"(\"id\") ON DELETE set null ON UPDATE no action;",
  "ALTER TABLE \"order_status_history\" ADD CONSTRAINT \"order_status_history_order_id_orders_id_fk\" FOREIGN KEY (\"order_id\") REFERENCES \"public\".\"orders\"(\"id\") ON DELETE cascade ON UPDATE no action;",
  "ALTER TABLE \"order_status_history\" ADD CONSTRAINT \"order_status_history_admin_user_id_admin_users_id_fk\" FOREIGN KEY (\"admin_user_id\") REFERENCES \"public\".\"admin_users\"(\"id\") ON DELETE set null ON UPDATE no action;",
  "ALTER TABLE \"orders\" ADD CONSTRAINT \"orders_customer_id_customers_id_fk\" FOREIGN KEY (\"customer_id\") REFERENCES \"public\".\"customers\"(\"id\") ON DELETE set null ON UPDATE no action;",
  "ALTER TABLE \"orders\" ADD CONSTRAINT \"orders_delivery_address_id_delivery_addresses_id_fk\" FOREIGN KEY (\"delivery_address_id\") REFERENCES \"public\".\"delivery_addresses\"(\"id\") ON DELETE set null ON UPDATE no action;",
  "ALTER TABLE \"product_images\" ADD CONSTRAINT \"product_images_product_id_products_id_fk\" FOREIGN KEY (\"product_id\") REFERENCES \"public\".\"products\"(\"id\") ON DELETE cascade ON UPDATE no action;",
  "ALTER TABLE \"product_relations\" ADD CONSTRAINT \"product_relations_product_id_products_id_fk\" FOREIGN KEY (\"product_id\") REFERENCES \"public\".\"products\"(\"id\") ON DELETE cascade ON UPDATE no action;",
  "ALTER TABLE \"product_relations\" ADD CONSTRAINT \"product_relations_related_product_id_products_id_fk\" FOREIGN KEY (\"related_product_id\") REFERENCES \"public\".\"products\"(\"id\") ON DELETE cascade ON UPDATE no action;",
  "ALTER TABLE \"product_variants\" ADD CONSTRAINT \"product_variants_product_id_products_id_fk\" FOREIGN KEY (\"product_id\") REFERENCES \"public\".\"products\"(\"id\") ON DELETE cascade ON UPDATE no action;",
  "ALTER TABLE \"products\" ADD CONSTRAINT \"products_category_id_categories_id_fk\" FOREIGN KEY (\"category_id\") REFERENCES \"public\".\"categories\"(\"id\") ON DELETE set null ON UPDATE no action;",
  "ALTER TABLE \"push_deliveries\" ADD CONSTRAINT \"push_deliveries_notification_id_notifications_id_fk\" FOREIGN KEY (\"notification_id\") REFERENCES \"public\".\"notifications\"(\"id\") ON DELETE cascade ON UPDATE no action;",
  "ALTER TABLE \"push_deliveries\" ADD CONSTRAINT \"push_deliveries_subscription_id_push_subscriptions_id_fk\" FOREIGN KEY (\"subscription_id\") REFERENCES \"public\".\"push_subscriptions\"(\"id\") ON DELETE set null ON UPDATE no action;",
  "ALTER TABLE \"push_subscriptions\" ADD CONSTRAINT \"push_subscriptions_admin_user_id_admin_users_id_fk\" FOREIGN KEY (\"admin_user_id\") REFERENCES \"public\".\"admin_users\"(\"id\") ON DELETE cascade ON UPDATE no action;",
  "ALTER TABLE \"stock_movements\" ADD CONSTRAINT \"stock_movements_product_id_products_id_fk\" FOREIGN KEY (\"product_id\") REFERENCES \"public\".\"products\"(\"id\") ON DELETE cascade ON UPDATE no action;",
  "ALTER TABLE \"stock_movements\" ADD CONSTRAINT \"stock_movements_variant_id_product_variants_id_fk\" FOREIGN KEY (\"variant_id\") REFERENCES \"public\".\"product_variants\"(\"id\") ON DELETE set null ON UPDATE no action;",
  "ALTER TABLE \"stock_movements\" ADD CONSTRAINT \"stock_movements_order_id_orders_id_fk\" FOREIGN KEY (\"order_id\") REFERENCES \"public\".\"orders\"(\"id\") ON DELETE set null ON UPDATE no action;",
  "ALTER TABLE \"stock_movements\" ADD CONSTRAINT \"stock_movements_admin_user_id_admin_users_id_fk\" FOREIGN KEY (\"admin_user_id\") REFERENCES \"public\".\"admin_users\"(\"id\") ON DELETE set null ON UPDATE no action;",
  "ALTER TABLE \"theme_sections\" ADD CONSTRAINT \"theme_sections_theme_id_themes_id_fk\" FOREIGN KEY (\"theme_id\") REFERENCES \"public\".\"themes\"(\"id\") ON DELETE cascade ON UPDATE no action;",
  "ALTER TABLE \"theme_versions\" ADD CONSTRAINT \"theme_versions_theme_id_themes_id_fk\" FOREIGN KEY (\"theme_id\") REFERENCES \"public\".\"themes\"(\"id\") ON DELETE cascade ON UPDATE no action;",
  "ALTER TABLE \"theme_versions\" ADD CONSTRAINT \"theme_versions_admin_user_id_admin_users_id_fk\" FOREIGN KEY (\"admin_user_id\") REFERENCES \"public\".\"admin_users\"(\"id\") ON DELETE set null ON UPDATE no action;",
  "CREATE INDEX \"admin_sessions_user_idx\" ON \"admin_sessions\" USING btree (\"admin_user_id\");",
  "CREATE INDEX \"admin_sessions_exp_idx\" ON \"admin_sessions\" USING btree (\"expires_at\");",
  "CREATE UNIQUE INDEX \"admin_users_email_uq\" ON \"admin_users\" USING btree (lower(\"email\"));",
  "CREATE INDEX \"audit_logs_created_idx\" ON \"audit_logs\" USING btree (\"created_at\");",
  "CREATE UNIQUE INDEX \"categories_slug_uq\" ON \"categories\" USING btree (\"slug\");",
  "CREATE INDEX \"categories_position_idx\" ON \"categories\" USING btree (\"position\");",
  "CREATE UNIQUE INDEX \"customers_phone_uq\" ON \"customers\" USING btree (\"phone\");",
  "CREATE INDEX \"delivery_addresses_customer_idx\" ON \"delivery_addresses\" USING btree (\"customer_id\");",
  "CREATE INDEX \"login_attempts_key_idx\" ON \"login_attempts\" USING btree (\"key\",\"created_at\");",
  "CREATE INDEX \"notifications_created_idx\" ON \"notifications\" USING btree (\"created_at\");",
  "CREATE INDEX \"notifications_unread_idx\" ON \"notifications\" USING btree (\"is_read\");",
  "CREATE INDEX \"order_items_order_idx\" ON \"order_items\" USING btree (\"order_id\");",
  "CREATE INDEX \"order_items_product_idx\" ON \"order_items\" USING btree (\"product_id\");",
  "CREATE INDEX \"order_status_history_order_idx\" ON \"order_status_history\" USING btree (\"order_id\",\"created_at\");",
  "CREATE UNIQUE INDEX \"orders_number_uq\" ON \"orders\" USING btree (\"number\");",
  "CREATE UNIQUE INDEX \"orders_idempotency_uq\" ON \"orders\" USING btree (\"idempotency_key\");",
  "CREATE INDEX \"orders_created_idx\" ON \"orders\" USING btree (\"created_at\");",
  "CREATE INDEX \"orders_status_idx\" ON \"orders\" USING btree (\"status\",\"created_at\");",
  "CREATE INDEX \"orders_customer_idx\" ON \"orders\" USING btree (\"customer_id\");",
  "CREATE UNIQUE INDEX \"pages_slug_uq\" ON \"pages\" USING btree (\"slug\");",
  "CREATE INDEX \"product_images_product_idx\" ON \"product_images\" USING btree (\"product_id\",\"position\");",
  "CREATE UNIQUE INDEX \"product_images_main_uq\" ON \"product_images\" USING btree (\"product_id\") WHERE \"product_images\".\"is_main\";",
  "CREATE INDEX \"product_variants_product_idx\" ON \"product_variants\" USING btree (\"product_id\",\"position\");",
  "CREATE UNIQUE INDEX \"products_slug_uq\" ON \"products\" USING btree (\"slug\");",
  "CREATE UNIQUE INDEX \"products_reference_uq\" ON \"products\" USING btree (\"reference\") WHERE \"products\".\"reference\" IS NOT NULL;",
  "CREATE INDEX \"products_category_idx\" ON \"products\" USING btree (\"category_id\");",
  "CREATE INDEX \"products_status_idx\" ON \"products\" USING btree (\"status\",\"published_at\");",
  "CREATE INDEX \"push_deliveries_created_idx\" ON \"push_deliveries\" USING btree (\"created_at\");",
  "CREATE UNIQUE INDEX \"push_subscriptions_endpoint_uq\" ON \"push_subscriptions\" USING btree (\"endpoint\");",
  "CREATE INDEX \"rate_limits_key_idx\" ON \"rate_limits\" USING btree (\"key\",\"created_at\");",
  "CREATE UNIQUE INDEX \"shipping_zones_type_name_uq\" ON \"shipping_zones\" USING btree (\"type\",lower(\"name\"));",
  "CREATE INDEX \"stock_movements_product_idx\" ON \"stock_movements\" USING btree (\"product_id\",\"created_at\");",
  "CREATE INDEX \"stock_movements_created_idx\" ON \"stock_movements\" USING btree (\"created_at\");",
  "CREATE INDEX \"theme_sections_theme_idx\" ON \"theme_sections\" USING btree (\"theme_id\",\"position\");",
  "CREATE UNIQUE INDEX \"theme_versions_theme_version_uq\" ON \"theme_versions\" USING btree (\"theme_id\",\"version\");",
  "CREATE UNIQUE INDEX \"themes_active_uq\" ON \"themes\" USING btree (\"is_active\") WHERE \"themes\".\"is_active\";",
  "ALTER TABLE \"orders\" ADD COLUMN \"source\" text DEFAULT 'direct' NOT NULL;",
  "ALTER TABLE \"orders\" ADD COLUMN \"utm_source\" text;",
  "ALTER TABLE \"orders\" ADD COLUMN \"utm_medium\" text;",
  "ALTER TABLE \"orders\" ADD COLUMN \"utm_campaign\" text;",
  "ALTER TABLE \"orders\" ADD COLUMN \"referrer\" text;",
  "CREATE INDEX \"orders_source_idx\" ON \"orders\" USING btree (\"source\",\"created_at\");",
  "CREATE TABLE \"stock_arrivals\" (\n\t\"id\" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,\n\t\"reference\" text NOT NULL,\n\t\"arrival_date\" timestamp with time zone DEFAULT now() NOT NULL,\n\t\"supplier\" text DEFAULT '' NOT NULL,\n\t\"notes\" text DEFAULT '' NOT NULL,\n\t\"total_cost\" integer DEFAULT 0 NOT NULL,\n\t\"expected_revenue\" integer DEFAULT 0 NOT NULL,\n\t\"expected_profit\" integer DEFAULT 0 NOT NULL,\n\t\"created_at\" timestamp with time zone DEFAULT now() NOT NULL,\n\t\"updated_at\" timestamp with time zone DEFAULT now() NOT NULL\n);",
  "CREATE TABLE \"stock_arrival_items\" (\n\t\"id\" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,\n\t\"arrival_id\" uuid NOT NULL,\n\t\"product_id\" uuid,\n\t\"product_name\" text NOT NULL,\n\t\"quantity\" integer NOT NULL,\n\t\"sold_quantity\" integer DEFAULT 0 NOT NULL,\n\t\"purchase_price\" integer NOT NULL,\n\t\"selling_price\" integer NOT NULL,\n\t\"total_cost\" integer NOT NULL,\n\t\"expected_revenue\" integer NOT NULL,\n\t\"expected_profit\" integer NOT NULL,\n\t\"created_at\" timestamp with time zone DEFAULT now() NOT NULL\n);",
  "ALTER TABLE \"order_items\" ADD COLUMN \"unit_cost\" integer DEFAULT 0 NOT NULL;",
  "ALTER TABLE \"products\" ADD COLUMN \"purchase_price\" integer DEFAULT 0 NOT NULL;",
  "ALTER TABLE \"stock_arrival_items\" ADD CONSTRAINT \"stock_arrival_items_arrival_id_stock_arrivals_id_fk\" FOREIGN KEY (\"arrival_id\") REFERENCES \"public\".\"stock_arrivals\"(\"id\") ON DELETE cascade ON UPDATE no action;",
  "ALTER TABLE \"stock_arrival_items\" ADD CONSTRAINT \"stock_arrival_items_product_id_products_id_fk\" FOREIGN KEY (\"product_id\") REFERENCES \"public\".\"products\"(\"id\") ON DELETE set null ON UPDATE no action;",
  "CREATE INDEX \"stock_arrival_items_arrival_idx\" ON \"stock_arrival_items\" USING btree (\"arrival_id\");",
  "CREATE INDEX \"stock_arrival_items_product_idx\" ON \"stock_arrival_items\" USING btree (\"product_id\");",
  "CREATE INDEX \"stock_arrivals_date_idx\" ON \"stock_arrivals\" USING btree (\"arrival_date\");"
];

const ARRIVALS_DDL = [
  "CREATE TABLE IF NOT EXISTS \"stock_arrivals\" (\n\t\"id\" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,\n\t\"reference\" text NOT NULL,\n\t\"arrival_date\" timestamp with time zone DEFAULT now() NOT NULL,\n\t\"supplier\" text DEFAULT '' NOT NULL,\n\t\"notes\" text DEFAULT '' NOT NULL,\n\t\"total_cost\" integer DEFAULT 0 NOT NULL,\n\t\"expected_revenue\" integer DEFAULT 0 NOT NULL,\n\t\"expected_profit\" integer DEFAULT 0 NOT NULL,\n\t\"created_at\" timestamp with time zone DEFAULT now() NOT NULL,\n\t\"updated_at\" timestamp with time zone DEFAULT now() NOT NULL\n);",
  "CREATE TABLE IF NOT EXISTS \"stock_arrival_items\" (\n\t\"id\" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,\n\t\"arrival_id\" uuid NOT NULL,\n\t\"product_id\" uuid,\n\t\"product_name\" text NOT NULL,\n\t\"quantity\" integer NOT NULL,\n\t\"sold_quantity\" integer DEFAULT 0 NOT NULL,\n\t\"purchase_price\" integer NOT NULL,\n\t\"selling_price\" integer NOT NULL,\n\t\"total_cost\" integer NOT NULL,\n\t\"expected_revenue\" integer NOT NULL,\n\t\"expected_profit\" integer NOT NULL,\n\t\"created_at\" timestamp with time zone DEFAULT now() NOT NULL\n);",
  "ALTER TABLE \"order_items\" ADD COLUMN IF NOT EXISTS \"unit_cost\" integer DEFAULT 0 NOT NULL;",
  "ALTER TABLE \"products\" ADD COLUMN IF NOT EXISTS \"purchase_price\" integer DEFAULT 0 NOT NULL;",
  "CREATE INDEX IF NOT EXISTS \"stock_arrival_items_arrival_idx\" ON \"stock_arrival_items\" USING btree (\"arrival_id\");",
  "CREATE INDEX IF NOT EXISTS \"stock_arrival_items_product_idx\" ON \"stock_arrival_items\" USING btree (\"product_id\");",
  "CREATE INDEX IF NOT EXISTS \"stock_arrivals_date_idx\" ON \"stock_arrivals\" USING btree (\"arrival_date\");",
];

const globalForArrivals = globalThis as unknown as { __arrivalsSchemaReady?: boolean };

export async function ensureArrivalsSchema(db: Database): Promise<void> {
  if (globalForArrivals.__arrivalsSchemaReady) return;
  for (const stmt of ARRIVALS_DDL) {
    try {
      await db.execute(sql.raw(stmt));
    } catch {
      // ignorer si déjà existant
    }
  }
  globalForArrivals.__arrivalsSchemaReady = true;
}

export async function runEmbeddedMigrations(db: Database): Promise<void> {
  for (const stmt of EMBEDDED_MIGRATION_STATEMENTS) {
    try {
      await db.execute(sql.raw(stmt));
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      // 42P07: duplicate_table
      // 42710: duplicate_object
      // 42701: duplicate_column
      if (code === "42P07" || code === "42710" || code === "42701") {
        continue;
      }
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("already exists") || msg.includes("existe déjà") || msg.includes("duplicate")) {
        continue;
      }
      console.warn("Avertissement migration embedded :", msg);
    }
  }
}

