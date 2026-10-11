ALTER TABLE "events" ADD COLUMN "currency" text DEFAULT 'MWK' NOT NULL;--> statement-breakpoint
ALTER TABLE "ticket_batches" ADD COLUMN "price_minor" integer;