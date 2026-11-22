CREATE TABLE "staff_venues" (
	"tenant_id" bigint NOT NULL,
	"staff_id" bigint NOT NULL,
	"venue_id" bigint NOT NULL,
	CONSTRAINT "staff_venues_pk" PRIMARY KEY("staff_id","venue_id")
);
--> statement-breakpoint
ALTER TABLE "staff" ADD COLUMN "all_venues" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "staff_venues" ADD CONSTRAINT "staff_venues_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_venues" ADD CONSTRAINT "staff_venues_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_venues" ADD CONSTRAINT "staff_venues_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "staff_venues_tenant_idx" ON "staff_venues" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "staff_venues_venue_idx" ON "staff_venues" USING btree ("venue_id");--> statement-breakpoint
ALTER TABLE "staff" ADD CONSTRAINT "staff_owner_all_venues" CHECK ("staff"."role" <> 'OWNER' OR "staff"."all_venues");