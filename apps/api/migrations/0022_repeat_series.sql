CREATE TYPE "public"."repeat_series_status" AS ENUM('ACTIVE', 'CANCELLED');--> statement-breakpoint
CREATE TABLE "repeat_series" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "repeat_series_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"tenant_id" bigint NOT NULL,
	"venue_id" bigint NOT NULL,
	"resource_id" bigint NOT NULL,
	"customer_id" bigint NOT NULL,
	"first_date" date NOT NULL,
	"start_minute" integer NOT NULL,
	"slots" integer NOT NULL,
	"weeks" integer NOT NULL,
	"status" "repeat_series_status" NOT NULL,
	"cancel_reason" text,
	"series_payment_days_before" integer NOT NULL,
	"advance_percent" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "repeat_series_id" bigint;--> statement-breakpoint
ALTER TABLE "repeat_series" ADD CONSTRAINT "repeat_series_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repeat_series" ADD CONSTRAINT "repeat_series_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repeat_series" ADD CONSTRAINT "repeat_series_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repeat_series" ADD CONSTRAINT "repeat_series_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "repeat_series_tenant_idx" ON "repeat_series" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "repeat_series_venue_idx" ON "repeat_series" USING btree ("venue_id");--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_repeat_series_id_repeat_series_id_fk" FOREIGN KEY ("repeat_series_id") REFERENCES "public"."repeat_series"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bookings_repeat_series_idx" ON "bookings" USING btree ("repeat_series_id");