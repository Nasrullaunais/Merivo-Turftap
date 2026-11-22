-- Two Blocked Times for one resource may not overlap (VEN-07). Back-to-back blocks are fine.
ALTER TABLE "blocked_times" ADD CONSTRAINT "blocked_times_no_overlap" EXCLUDE USING gist (
	"resource_id" WITH =,
	tstzrange("starts_at", "ends_at") WITH &&
);--> statement-breakpoint
ALTER TABLE "blocked_times" ADD CONSTRAINT "blocked_times_ends_after_start" CHECK ("ends_at" > "starts_at");
