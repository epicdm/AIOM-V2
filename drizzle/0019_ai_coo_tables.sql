-- AI COO Tables Migration
-- Only creates the new AI COO tables

CREATE TABLE "ai_coo_usage" (
	"id" text PRIMARY KEY NOT NULL,
	"feature" text NOT NULL,
	"tokens_used" integer NOT NULL,
	"cost" numeric(10, 6) NOT NULL,
	"duration_ms" integer NOT NULL,
	"success" boolean NOT NULL,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "alert_rules" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"rule_type" text NOT NULL,
	"condition" jsonb,
	"enabled" boolean DEFAULT true NOT NULL,
	"notification_channels" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "alerts" (
	"id" text PRIMARY KEY NOT NULL,
	"analysis_result_id" text,
	"type" text NOT NULL,
	"priority" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"data" jsonb,
	"status" text DEFAULT 'new' NOT NULL,
	"acknowledged_by" text,
	"acknowledged_at" timestamp,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "analysis_results" (
	"id" text PRIMARY KEY NOT NULL,
	"job_id" text NOT NULL,
	"run_at" timestamp DEFAULT now() NOT NULL,
	"status" text NOT NULL,
	"insights" jsonb,
	"metrics" jsonb,
	"alerts_generated" integer DEFAULT 0 NOT NULL,
	"duration_ms" integer NOT NULL,
	"cost" numeric(10, 6),
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "autonomous_actions" (
	"id" text PRIMARY KEY NOT NULL,
	"action_type" text NOT NULL,
	"target_system" text NOT NULL,
	"target_id" text,
	"description" text NOT NULL,
	"parameters" jsonb,
	"decision_reasoning" text,
	"requires_approval" boolean DEFAULT true NOT NULL,
	"approved_by" text,
	"approved_at" timestamp,
	"executed_at" timestamp,
	"status" text DEFAULT 'pending' NOT NULL,
	"result" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_briefings" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"date" timestamp NOT NULL,
	"content" text NOT NULL,
	"insights_count" integer DEFAULT 0 NOT NULL,
	"alerts_count" integer DEFAULT 0 NOT NULL,
	"recommendations_count" integer DEFAULT 0 NOT NULL,
	"delivered_at" timestamp,
	"delivery_method" text,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "monitoring_jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"schedule" text NOT NULL,
	"analyzer_type" text NOT NULL,
	"config" jsonb,
	"enabled" boolean DEFAULT true NOT NULL,
	"last_run_at" timestamp,
	"next_run_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "alert_rules" ADD CONSTRAINT "alert_rules_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_analysis_result_id_analysis_results_id_fk" FOREIGN KEY ("analysis_result_id") REFERENCES "public"."analysis_results"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_acknowledged_by_user_id_fk" FOREIGN KEY ("acknowledged_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "analysis_results" ADD CONSTRAINT "analysis_results_job_id_monitoring_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."monitoring_jobs"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "autonomous_actions" ADD CONSTRAINT "autonomous_actions_approved_by_user_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "daily_briefings" ADD CONSTRAINT "daily_briefings_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
