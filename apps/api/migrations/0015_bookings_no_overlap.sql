-- Two holding bookings for one resource may not overlap (BKG-02). Back-to-back bookings are fine.
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_no_overlap" EXCLUDE USING gist (
	"resource_id" WITH =,
	tstzrange("starts_at", "ends_at") WITH &&
) WHERE ("status" IN ('AWAITING_PAYMENT', 'AWAITING_CHECK', 'CONFIRMED'));--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_ends_after_start" CHECK ("ends_at" > "starts_at");
