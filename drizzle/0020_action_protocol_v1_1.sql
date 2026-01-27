-- Action Protocol v1.1 Migration
-- Adds outreach_state table for anti-spam and updates autonomous_actions for v1.1 support

-- Outreach state tracking (prevents duplicate communications)
CREATE TABLE "outreach_state" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"partner_id" text NOT NULL,
	"context_type" text NOT NULL,
	"context_id" text NOT NULL,
	"last_sent_at" timestamp,
	"next_allowed_at" timestamp,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"sequence_state" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	UNIQUE("org_id", "partner_id", "context_type", "context_id")
);
--> statement-breakpoint

-- Add index for efficient queries
CREATE INDEX "outreach_state_org_partner_idx" ON "outreach_state" ("org_id", "partner_id");
--> statement-breakpoint
CREATE INDEX "outreach_state_next_allowed_idx" ON "outreach_state" ("next_allowed_at") WHERE "next_allowed_at" IS NOT NULL;
--> statement-breakpoint

-- Update autonomous_actions to support Action Protocol v1.1
ALTER TABLE "autonomous_actions" ADD COLUMN "action_protocol" jsonb;
--> statement-breakpoint
ALTER TABLE "autonomous_actions" ADD COLUMN "org_id" text DEFAULT 'default-org' NOT NULL;
--> statement-breakpoint
ALTER TABLE "autonomous_actions" ADD COLUMN "idempotency_key" text;
--> statement-breakpoint
ALTER TABLE "autonomous_actions" ADD COLUMN "expires_at" timestamp;
--> statement-breakpoint
ALTER TABLE "autonomous_actions" ADD COLUMN "risk_level" text;
--> statement-breakpoint
ALTER TABLE "autonomous_actions" ADD COLUMN "safe_operation" text;
--> statement-breakpoint
ALTER TABLE "autonomous_actions" ADD COLUMN "analysis_id" text;
--> statement-breakpoint

-- Add index for idempotency checks
CREATE UNIQUE INDEX "autonomous_actions_idempotency_idx" ON "autonomous_actions" ("idempotency_key") WHERE "idempotency_key" IS NOT NULL;
--> statement-breakpoint
CREATE INDEX "autonomous_actions_org_status_idx" ON "autonomous_actions" ("org_id", "status");
--> statement-breakpoint
CREATE INDEX "autonomous_actions_expires_at_idx" ON "autonomous_actions" ("expires_at") WHERE "expires_at" IS NOT NULL;
--> statement-breakpoint

-- Add foreign key for analysis_id
ALTER TABLE "autonomous_actions" ADD CONSTRAINT "autonomous_actions_analysis_id_analysis_results_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."analysis_results"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint

-- Domain events table (optional for MVP, but included for future scalability)
CREATE TABLE "domain_events" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"handled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "domain_events_handled_idx" ON "domain_events" ("handled") WHERE "handled" = false;
--> statement-breakpoint
CREATE INDEX "domain_events_type_idx" ON "domain_events" ("type");
