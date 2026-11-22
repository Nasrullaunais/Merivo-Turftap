CREATE TABLE "price_rules" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "price_rules_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"tenant_id" bigint NOT NULL,
	"resource_id" bigint NOT NULL,
	"weekdays" integer[] NOT NULL,
	"start_minute" integer NOT NULL,
	"end_minute" integer NOT NULL,
	"price_amount" bigint NOT NULL,
	"price_currency" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- Resources added before prices existed get LKR 0; the defaults are dropped straight after.
ALTER TABLE "resources" ADD COLUMN "price_amount" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "resources" ADD COLUMN "price_currency" text DEFAULT 'LKR' NOT NULL;--> statement-breakpoint
ALTER TABLE "resources" ALTER COLUMN "price_amount" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "resources" ALTER COLUMN "price_currency" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "price_rules" ADD CONSTRAINT "price_rules_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_rules" ADD CONSTRAINT "price_rules_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "price_rules_tenant_idx" ON "price_rules" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "price_rules_resource_idx" ON "price_rules" USING btree ("resource_id");