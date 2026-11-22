CREATE TYPE "public"."file_purpose" AS ENUM('PHOTO');--> statement-breakpoint
CREATE TABLE "files" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "files_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"tenant_id" bigint NOT NULL,
	"purpose" "file_purpose" NOT NULL,
	"key" text NOT NULL,
	"content_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "files_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "photos" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "photos_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"tenant_id" bigint NOT NULL,
	"venue_id" bigint,
	"resource_id" bigint,
	"file_id" bigint NOT NULL,
	"position" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "photos_one_owner" CHECK (num_nonnulls("photos"."venue_id", "photos"."resource_id") = 1)
);
--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photos" ADD CONSTRAINT "photos_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photos" ADD CONSTRAINT "photos_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photos" ADD CONSTRAINT "photos_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photos" ADD CONSTRAINT "photos_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "files_tenant_idx" ON "files" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "photos_tenant_idx" ON "photos" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "photos_venue_idx" ON "photos" USING btree ("venue_id");--> statement-breakpoint
CREATE INDEX "photos_resource_idx" ON "photos" USING btree ("resource_id");--> statement-breakpoint
CREATE UNIQUE INDEX "photos_file_unique" ON "photos" USING btree ("file_id");