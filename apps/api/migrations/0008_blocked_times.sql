CREATE TABLE "blocked_times" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "blocked_times_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"tenant_id" bigint NOT NULL,
	"resource_id" bigint NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "blocked_times" ADD CONSTRAINT "blocked_times_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blocked_times" ADD CONSTRAINT "blocked_times_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "blocked_times_tenant_idx" ON "blocked_times" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "blocked_times_resource_idx" ON "blocked_times" USING btree ("resource_id");