CREATE TYPE "public"."membership_status" AS ENUM('AWAITING_PAYMENT', 'AWAITING_CHECK', 'ACTIVE', 'EXPIRED', 'CANCELLED', 'ENDED');--> statement-breakpoint
CREATE TABLE "memberships" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "memberships_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"tenant_id" bigint NOT NULL,
	"venue_id" bigint NOT NULL,
	"plan_id" bigint NOT NULL,
	"customer_id" bigint NOT NULL,
	"starts_on" date NOT NULL,
	"ends_on" date NOT NULL,
	"status" "membership_status" NOT NULL,
	"price_amount" bigint NOT NULL,
	"price_currency" text NOT NULL,
	"amount_due" bigint NOT NULL,
	"expires_at" timestamp with time zone,
	"cancel_reason" text,
	"created_by" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "memberships_ends_on_or_after_start" CHECK ("memberships"."ends_on" >= "memberships"."starts_on")
);
--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "membership_id" bigint;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_plan_id_membership_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."membership_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "memberships_tenant_idx" ON "memberships" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "memberships_venue_starts_on_idx" ON "memberships" USING btree ("venue_id","starts_on");--> statement-breakpoint
CREATE INDEX "memberships_customer_idx" ON "memberships" USING btree ("customer_id");--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_membership_id_memberships_id_fk" FOREIGN KEY ("membership_id") REFERENCES "public"."memberships"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "payments_membership_idx" ON "payments" USING btree ("membership_id");--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_for_one_thing" CHECK (num_nonnulls("payments"."booking_id", "payments"."membership_id") = 1);--> statement-breakpoint
-- MEM-04: one customer may not hold the same plan twice on one day. A renewal starts the day after.
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_no_overlap" EXCLUDE USING gist (
	"customer_id" WITH =,
	"plan_id" WITH =,
	daterange("starts_on", "ends_on", '[]') WITH &&
) WHERE ("status" IN ('AWAITING_PAYMENT', 'AWAITING_CHECK', 'ACTIVE'));
