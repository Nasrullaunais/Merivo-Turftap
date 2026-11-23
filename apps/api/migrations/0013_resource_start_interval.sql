-- Slots are 15, 30 or 60 minutes, and bookings start every Start Interval (VEN-04, D-20).
-- Rows that don't fit are moved to the nearest allowed value, so the checks can be added.
ALTER TABLE "resources" ADD COLUMN "start_interval_minutes" integer DEFAULT 30 NOT NULL;--> statement-breakpoint
UPDATE "resources" SET "slot_minutes" = CASE
	WHEN "slot_minutes" < 23 THEN 15
	WHEN "slot_minutes" < 45 THEN 30
	ELSE 60
END WHERE "slot_minutes" NOT IN (15, 30, 60);--> statement-breakpoint
UPDATE "resources" SET "start_interval_minutes" = 15 WHERE "slot_minutes" = 15 OR EXISTS (
	SELECT 1 FROM "price_rules"
	WHERE "price_rules"."resource_id" = "resources"."id"
		AND ("price_rules"."start_minute" % 30 <> 0 OR "price_rules"."end_minute" % 30 <> 0)
);--> statement-breakpoint
ALTER TABLE "resources" ADD CONSTRAINT "resources_slot_minutes_allowed" CHECK ("resources"."slot_minutes" IN (15, 30, 60));--> statement-breakpoint
ALTER TABLE "resources" ADD CONSTRAINT "resources_start_interval_allowed" CHECK ("resources"."start_interval_minutes" IN (15, 30, 60) AND "resources"."start_interval_minutes" <= "resources"."slot_minutes");
