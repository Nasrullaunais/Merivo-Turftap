CREATE TYPE "public"."plan_length_unit" AS ENUM('DAYS', 'MONTHS');--> statement-breakpoint
CREATE TABLE "membership_plans" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "membership_plans_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"tenant_id" bigint NOT NULL,
	"venue_id" bigint NOT NULL,
	"name" text NOT NULL,
	"length_count" integer NOT NULL,
	"length_unit" "plan_length_unit" NOT NULL,
	"price_amount" bigint NOT NULL,
	"price_currency" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "membership_plans_length_positive" CHECK ("membership_plans"."length_count" > 0)
);
--> statement-breakpoint
ALTER TABLE "membership_plans" ADD CONSTRAINT "membership_plans_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership_plans" ADD CONSTRAINT "membership_plans_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "membership_plans_tenant_idx" ON "membership_plans" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "membership_plans_venue_idx" ON "membership_plans" USING btree ("venue_id");--> statement-breakpoint
CREATE UNIQUE INDEX "membership_plans_venue_name_unique" ON "membership_plans" USING btree ("venue_id",lower("name")) WHERE "membership_plans"."active";