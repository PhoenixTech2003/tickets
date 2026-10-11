CREATE TYPE "public"."scan_result" AS ENUM('accepted', 'already_used', 'wrong_entrance', 'invalid', 'voided', 'event_disabled', 'entrance_disabled');--> statement-breakpoint
CREATE TABLE "entrances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"disabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_organizers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"user_name" text NOT NULL,
	"user_email" text NOT NULL,
	"is_owner" boolean DEFAULT false NOT NULL,
	"invited_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_scanners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"entrance_id" uuid,
	"user_id" text NOT NULL,
	"user_name" text NOT NULL,
	"user_email" text NOT NULL,
	"disabled" boolean DEFAULT false NOT NULL,
	"added_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"venue" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone,
	"disabled" boolean DEFAULT false NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scans" (
	"id" uuid PRIMARY KEY NOT NULL,
	"event_id" uuid NOT NULL,
	"ticket_id" uuid,
	"entrance_id" uuid,
	"code" text NOT NULL,
	"scanner_id" text NOT NULL,
	"scanner_name" text NOT NULL,
	"result" "scan_result" NOT NULL,
	"client_result" "scan_result",
	"scanned_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ticket_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"entrance_id" uuid,
	"label" text,
	"quantity" integer NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tickets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"batch_id" uuid NOT NULL,
	"entrance_id" uuid,
	"code" text NOT NULL,
	"voided" boolean DEFAULT false NOT NULL,
	"redeemed_at" timestamp with time zone,
	"redeemed_by" text,
	"redeemed_entrance_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "entrances" ADD CONSTRAINT "entrances_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_organizers" ADD CONSTRAINT "event_organizers_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_scanners" ADD CONSTRAINT "event_scanners_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_scanners" ADD CONSTRAINT "event_scanners_entrance_id_entrances_id_fk" FOREIGN KEY ("entrance_id") REFERENCES "public"."entrances"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scans" ADD CONSTRAINT "scans_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scans" ADD CONSTRAINT "scans_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scans" ADD CONSTRAINT "scans_entrance_id_entrances_id_fk" FOREIGN KEY ("entrance_id") REFERENCES "public"."entrances"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_batches" ADD CONSTRAINT "ticket_batches_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_batches" ADD CONSTRAINT "ticket_batches_entrance_id_entrances_id_fk" FOREIGN KEY ("entrance_id") REFERENCES "public"."entrances"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_batch_id_ticket_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."ticket_batches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_entrance_id_entrances_id_fk" FOREIGN KEY ("entrance_id") REFERENCES "public"."entrances"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "entrances_event_idx" ON "entrances" USING btree ("event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "event_organizers_event_user_uq" ON "event_organizers" USING btree ("event_id","user_id");--> statement-breakpoint
CREATE INDEX "event_organizers_user_idx" ON "event_organizers" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "event_scanners_event_user_uq" ON "event_scanners" USING btree ("event_id","user_id");--> statement-breakpoint
CREATE INDEX "event_scanners_user_idx" ON "event_scanners" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "scans_event_idx" ON "scans" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "scans_ticket_idx" ON "scans" USING btree ("ticket_id");--> statement-breakpoint
CREATE INDEX "ticket_batches_event_idx" ON "ticket_batches" USING btree ("event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tickets_code_uq" ON "tickets" USING btree ("code");--> statement-breakpoint
CREATE INDEX "tickets_event_idx" ON "tickets" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "tickets_batch_idx" ON "tickets" USING btree ("batch_id");