CREATE TABLE "receipt_readings" (
	"payment_id" bigint PRIMARY KEY NOT NULL,
	"tenant_id" bigint NOT NULL,
	"unreadable" boolean NOT NULL,
	"amount" bigint,
	"currency" text,
	"paid_on" date,
	"bank" text,
	"reference" text,
	"amount_matches" boolean,
	"date_recent" boolean,
	"reference_new" boolean,
	"duplicate_of" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "receipt_readings" ADD CONSTRAINT "receipt_readings_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipt_readings" ADD CONSTRAINT "receipt_readings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipt_readings" ADD CONSTRAINT "receipt_readings_duplicate_of_payments_id_fk" FOREIGN KEY ("duplicate_of") REFERENCES "public"."payments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "receipt_readings_tenant_reference_idx" ON "receipt_readings" USING btree ("tenant_id","reference");