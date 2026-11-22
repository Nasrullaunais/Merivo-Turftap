-- Two Price Rules for one resource may not share a weekday and overlapping hours (VEN-05).
CREATE EXTENSION IF NOT EXISTS btree_gist;--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS intarray;--> statement-breakpoint
ALTER TABLE "price_rules" ADD CONSTRAINT "price_rules_no_overlap" EXCLUDE USING gist (
	"resource_id" WITH =,
	"weekdays" gist__int_ops WITH &&,
	int4range("start_minute", "end_minute") WITH &&
);
