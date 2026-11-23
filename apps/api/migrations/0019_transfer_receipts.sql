ALTER TYPE "public"."file_purpose" ADD VALUE 'RECEIPT';--> statement-breakpoint
ALTER TABLE "files" ADD COLUMN "sha256" text;--> statement-breakpoint
ALTER TABLE "files" ADD COLUMN "customer_id" bigint;--> statement-breakpoint
ALTER TABLE "files" ADD COLUMN "created_by" bigint;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "file_id" bigint;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "files_tenant_sha256_idx" ON "files" USING btree ("tenant_id","sha256");--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_file_unique" UNIQUE("file_id");