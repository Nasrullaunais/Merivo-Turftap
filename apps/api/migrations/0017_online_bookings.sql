-- Existing bookings take their resource's venue before the column becomes required.
ALTER TABLE "bookings" ADD COLUMN "venue_id" bigint;--> statement-breakpoint
UPDATE "bookings" SET "venue_id" = "resources"."venue_id" FROM "resources" WHERE "resources"."id" = "bookings"."resource_id";--> statement-breakpoint
ALTER TABLE "bookings" ALTER COLUMN "venue_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bookings_venue_starts_at_idx" ON "bookings" USING btree ("venue_id","starts_at");--> statement-breakpoint
CREATE UNIQUE INDEX "bookings_one_awaiting_payment" ON "bookings" USING btree ("tenant_id","customer_id") WHERE "bookings"."status" = 'AWAITING_PAYMENT';