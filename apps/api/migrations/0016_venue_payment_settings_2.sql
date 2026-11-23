ALTER TABLE "venues" ALTER COLUMN "payment_time_limit_minutes" SET DEFAULT 20;--> statement-breakpoint
ALTER TABLE "venues" ADD COLUMN "pay_at_venue" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "venues" ADD COLUMN "series_payment_days_before" integer DEFAULT 2 NOT NULL;