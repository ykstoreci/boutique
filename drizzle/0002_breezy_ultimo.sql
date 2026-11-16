CREATE TABLE "stock_arrival_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"arrival_id" uuid NOT NULL,
	"product_id" uuid,
	"product_name" text NOT NULL,
	"quantity" integer NOT NULL,
	"sold_quantity" integer DEFAULT 0 NOT NULL,
	"purchase_price" integer NOT NULL,
	"selling_price" integer NOT NULL,
	"total_cost" integer NOT NULL,
	"expected_revenue" integer NOT NULL,
	"expected_profit" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_arrivals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" text NOT NULL,
	"arrival_date" timestamp with time zone DEFAULT now() NOT NULL,
	"supplier" text DEFAULT '' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"total_cost" integer DEFAULT 0 NOT NULL,
	"expected_revenue" integer DEFAULT 0 NOT NULL,
	"expected_profit" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "unit_cost" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "purchase_price" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "stock_arrival_items" ADD CONSTRAINT "stock_arrival_items_arrival_id_stock_arrivals_id_fk" FOREIGN KEY ("arrival_id") REFERENCES "public"."stock_arrivals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_arrival_items" ADD CONSTRAINT "stock_arrival_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "stock_arrival_items_arrival_idx" ON "stock_arrival_items" USING btree ("arrival_id");--> statement-breakpoint
CREATE INDEX "stock_arrival_items_product_idx" ON "stock_arrival_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "stock_arrivals_date_idx" ON "stock_arrivals" USING btree ("arrival_date");