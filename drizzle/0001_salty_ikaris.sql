CREATE TABLE "briefing_version" (
	"id" text PRIMARY KEY NOT NULL,
	"briefing_id" text NOT NULL,
	"content" text NOT NULL,
	"version_number" integer NOT NULL,
	"reason" text,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "call_record" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"direction" text NOT NULL,
	"duration" integer NOT NULL,
	"call_timestamp" timestamp NOT NULL,
	"caller_id" text NOT NULL,
	"caller_name" text,
	"recipient_id" text,
	"recipient_name" text,
	"recording_url" text,
	"recording_duration" integer,
	"summary" text,
	"summary_generated_at" timestamp,
	"status" text NOT NULL,
	"external_call_id" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_briefing" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"content" text NOT NULL,
	"is_read" boolean NOT NULL,
	"read_at" timestamp,
	"version_number" integer NOT NULL,
	"status" text NOT NULL,
	"generated_at" timestamp NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expense_request" (
	"id" text PRIMARY KEY NOT NULL,
	"amount" text NOT NULL,
	"currency" text NOT NULL,
	"purpose" text NOT NULL,
	"description" text,
	"requester_id" text NOT NULL,
	"approver_id" text,
	"status" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"submitted_at" timestamp NOT NULL,
	"approved_at" timestamp,
	"rejected_at" timestamp,
	"disbursed_at" timestamp,
	"rejection_reason" text,
	"receipt_url" text
);
--> statement-breakpoint
ALTER TABLE "briefing_version" ADD CONSTRAINT "briefing_version_briefing_id_daily_briefing_id_fk" FOREIGN KEY ("briefing_id") REFERENCES "public"."daily_briefing"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_record" ADD CONSTRAINT "call_record_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_briefing" ADD CONSTRAINT "daily_briefing_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_request" ADD CONSTRAINT "expense_request_requester_id_user_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_request" ADD CONSTRAINT "expense_request_approver_id_user_id_fk" FOREIGN KEY ("approver_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_briefing_version_briefing_id" ON "briefing_version" USING btree ("briefing_id");--> statement-breakpoint
CREATE INDEX "idx_briefing_version_number" ON "briefing_version" USING btree ("briefing_id","version_number");--> statement-breakpoint
CREATE INDEX "idx_call_record_user_id" ON "call_record" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_call_record_call_timestamp" ON "call_record" USING btree ("call_timestamp");--> statement-breakpoint
CREATE INDEX "idx_call_record_direction" ON "call_record" USING btree ("direction");--> statement-breakpoint
CREATE INDEX "idx_call_record_status" ON "call_record" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_call_record_caller_id" ON "call_record" USING btree ("caller_id");--> statement-breakpoint
CREATE INDEX "idx_call_record_user_timestamp" ON "call_record" USING btree ("user_id","call_timestamp");--> statement-breakpoint
CREATE INDEX "idx_daily_briefing_user_id" ON "daily_briefing" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_daily_briefing_expires_at" ON "daily_briefing" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_daily_briefing_generated_at" ON "daily_briefing" USING btree ("generated_at");--> statement-breakpoint
CREATE INDEX "idx_daily_briefing_status" ON "daily_briefing" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_daily_briefing_user_generated" ON "daily_briefing" USING btree ("user_id","generated_at");--> statement-breakpoint
CREATE INDEX "idx_expense_request_requester_id" ON "expense_request" USING btree ("requester_id");--> statement-breakpoint
CREATE INDEX "idx_expense_request_approver_id" ON "expense_request" USING btree ("approver_id");--> statement-breakpoint
CREATE INDEX "idx_expense_request_status" ON "expense_request" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_expense_request_created_at" ON "expense_request" USING btree ("created_at");