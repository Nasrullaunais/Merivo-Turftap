ALTER TABLE "venues" ADD COLUMN "bank_account" jsonb;--> statement-breakpoint
ALTER TABLE "venues" ADD COLUMN "advance_percent" integer DEFAULT 100 NOT NULL;--> statement-breakpoint
ALTER TABLE "venues" ADD COLUMN "payment_time_limit_minutes" integer DEFAULT 30 NOT NULL;--> statement-breakpoint
ALTER TABLE "venues" ADD COLUMN "cancellation_cut_off_hours" integer DEFAULT 6 NOT NULL;