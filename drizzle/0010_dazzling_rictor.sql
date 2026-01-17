CREATE TABLE "audit_log" (
	"id" text PRIMARY KEY NOT NULL,
	"action" text NOT NULL,
	"category" text NOT NULL,
	"severity" text NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" text NOT NULL,
	"parent_resource_type" text,
	"parent_resource_id" text,
	"actor_id" text,
	"actor_type" text NOT NULL,
	"actor_name" text,
	"actor_email" text,
	"ip_address" text,
	"user_agent" text,
	"session_id" text,
	"request_id" text,
	"previous_state" text,
	"new_state" text,
	"changed_fields" text,
	"description" text,
	"metadata" text,
	"tags" text,
	"success" boolean NOT NULL,
	"error_details" text,
	"created_at" timestamp NOT NULL,
	"duration_ms" integer
);
--> statement-breakpoint
CREATE TABLE "task_reminder_log" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"task_id" integer NOT NULL,
	"task_name" text NOT NULL,
	"task_deadline" timestamp,
	"project_id" integer,
	"project_name" text,
	"reminder_type" text NOT NULL,
	"status" text NOT NULL,
	"escalation_level" integer NOT NULL,
	"escalated_to_user_id" text,
	"hours_overdue" integer,
	"scheduled_for" timestamp NOT NULL,
	"sent_at" timestamp,
	"push_message_id" text,
	"error_message" text,
	"retry_count" integer NOT NULL,
	"metadata" text,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_reminder_preference" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"is_enabled" boolean NOT NULL,
	"upcoming_reminder_hours" integer NOT NULL,
	"overdue_reminder_frequency" integer NOT NULL,
	"max_reminders_per_task" integer NOT NULL,
	"timezone" text NOT NULL,
	"quiet_hours" text,
	"working_days" text NOT NULL,
	"enable_escalation" boolean NOT NULL,
	"escalation_after_hours" integer NOT NULL,
	"supervisor_id" text,
	"delivery_method" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "task_reminder_preference_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "task_reminder_state" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"task_id" integer NOT NULL,
	"reminders_sent" integer NOT NULL,
	"last_reminder_at" timestamp,
	"last_reminder_type" text,
	"current_escalation_level" integer NOT NULL,
	"last_escalation_at" timestamp,
	"snoozed_until" timestamp,
	"is_muted" boolean NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_reminder_log" ADD CONSTRAINT "task_reminder_log_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_reminder_log" ADD CONSTRAINT "task_reminder_log_escalated_to_user_id_user_id_fk" FOREIGN KEY ("escalated_to_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_reminder_log" ADD CONSTRAINT "task_reminder_log_push_message_id_push_message_id_fk" FOREIGN KEY ("push_message_id") REFERENCES "public"."push_message"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_reminder_preference" ADD CONSTRAINT "task_reminder_preference_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_reminder_preference" ADD CONSTRAINT "task_reminder_preference_supervisor_id_user_id_fk" FOREIGN KEY ("supervisor_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_reminder_state" ADD CONSTRAINT "task_reminder_state_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_audit_log_action" ON "audit_log" USING btree ("action");--> statement-breakpoint
CREATE INDEX "idx_audit_log_category" ON "audit_log" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_audit_log_severity" ON "audit_log" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "idx_audit_log_resource" ON "audit_log" USING btree ("resource_type","resource_id");--> statement-breakpoint
CREATE INDEX "idx_audit_log_resource_type" ON "audit_log" USING btree ("resource_type");--> statement-breakpoint
CREATE INDEX "idx_audit_log_actor_id" ON "audit_log" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "idx_audit_log_actor_type" ON "audit_log" USING btree ("actor_type");--> statement-breakpoint
CREATE INDEX "idx_audit_log_created_at" ON "audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_audit_log_resource_created" ON "audit_log" USING btree ("resource_type","resource_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_audit_log_actor_created" ON "audit_log" USING btree ("actor_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_audit_log_category_created" ON "audit_log" USING btree ("category","created_at");--> statement-breakpoint
CREATE INDEX "idx_audit_log_success" ON "audit_log" USING btree ("success");--> statement-breakpoint
CREATE INDEX "idx_audit_log_ip_address" ON "audit_log" USING btree ("ip_address");--> statement-breakpoint
CREATE INDEX "idx_audit_log_session_id" ON "audit_log" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_task_reminder_log_user_id" ON "task_reminder_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_task_reminder_log_task_id" ON "task_reminder_log" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "idx_task_reminder_log_status" ON "task_reminder_log" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_task_reminder_log_type" ON "task_reminder_log" USING btree ("reminder_type");--> statement-breakpoint
CREATE INDEX "idx_task_reminder_log_scheduled_for" ON "task_reminder_log" USING btree ("scheduled_for");--> statement-breakpoint
CREATE INDEX "idx_task_reminder_log_user_task" ON "task_reminder_log" USING btree ("user_id","task_id");--> statement-breakpoint
CREATE INDEX "idx_task_reminder_log_escalation" ON "task_reminder_log" USING btree ("escalated_to_user_id");--> statement-breakpoint
CREATE INDEX "idx_task_reminder_pref_user_id" ON "task_reminder_preference" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_task_reminder_pref_enabled" ON "task_reminder_preference" USING btree ("is_enabled");--> statement-breakpoint
CREATE INDEX "idx_task_reminder_pref_supervisor_id" ON "task_reminder_preference" USING btree ("supervisor_id");--> statement-breakpoint
CREATE INDEX "idx_task_reminder_state_user_id" ON "task_reminder_state" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_task_reminder_state_task_id" ON "task_reminder_state" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "idx_task_reminder_state_user_task" ON "task_reminder_state" USING btree ("user_id","task_id");--> statement-breakpoint
CREATE INDEX "idx_task_reminder_state_snoozed" ON "task_reminder_state" USING btree ("snoozed_until");--> statement-breakpoint
CREATE INDEX "idx_task_reminder_state_muted" ON "task_reminder_state" USING btree ("is_muted");