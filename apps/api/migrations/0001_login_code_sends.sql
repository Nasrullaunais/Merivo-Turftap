CREATE TYPE "public"."login_code_channel" AS ENUM('WHATSAPP', 'SMS');--> statement-breakpoint
CREATE TABLE "login_code_sends" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "login_code_sends_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"phone" text NOT NULL,
	"channel" "login_code_channel" NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "login_code_sends_phone_sent_at_idx" ON "login_code_sends" USING btree ("phone","sent_at");