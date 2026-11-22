CREATE TYPE "public"."resource_type" AS ENUM('FUTSAL_COURT', 'TABLE_TENNIS_TABLE', 'POOL_TABLE');--> statement-breakpoint
CREATE TABLE "resources" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "resources_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"tenant_id" bigint NOT NULL,
	"venue_id" bigint NOT NULL,
	"name" text NOT NULL,
	"type" "resource_type" NOT NULL,
	"slot_minutes" integer NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "resources" ADD CONSTRAINT "resources_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resources" ADD CONSTRAINT "resources_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "resources_tenant_idx" ON "resources" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "resources_venue_idx" ON "resources" USING btree ("venue_id");--> statement-breakpoint
CREATE UNIQUE INDEX "resources_venue_name_unique" ON "resources" USING btree ("venue_id",lower("name")) WHERE "resources"."active";