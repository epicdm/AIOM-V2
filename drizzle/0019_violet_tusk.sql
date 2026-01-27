CREATE TABLE "domain_events" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"handled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "autonomous_actions" ADD COLUMN "action_protocol" jsonb;--> statement-breakpoint
ALTER TABLE "autonomous_actions" ADD COLUMN "org_id" text DEFAULT 'default-org' NOT NULL;--> statement-breakpoint
ALTER TABLE "autonomous_actions" ADD COLUMN "idempotency_key" text;--> statement-breakpoint
ALTER TABLE "autonomous_actions" ADD COLUMN "expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "autonomous_actions" ADD COLUMN "risk_level" text;--> statement-breakpoint
ALTER TABLE "autonomous_actions" ADD COLUMN "safe_operation" text;--> statement-breakpoint
ALTER TABLE "autonomous_actions" ADD COLUMN "analysis_id" text;--> statement-breakpoint
ALTER TABLE "autonomous_actions" ADD CONSTRAINT "autonomous_actions_analysis_id_analysis_results_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."analysis_results"("id") ON DELETE set null ON UPDATE no action;