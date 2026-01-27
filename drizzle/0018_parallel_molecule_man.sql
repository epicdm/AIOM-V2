CREATE TABLE "capacity_alert" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"severity" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"user_id" text,
	"team_id" text,
	"current_value" real,
	"threshold_value" real,
	"acknowledged" boolean NOT NULL,
	"acknowledged_by_id" text,
	"acknowledged_at" timestamp,
	"resolved_at" timestamp,
	"created_at" timestamp NOT NULL,
	"expires_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "community_post" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text,
	"content" text NOT NULL,
	"category" text NOT NULL,
	"is_pinned" boolean NOT NULL,
	"is_question" boolean NOT NULL,
	"user_id" text NOT NULL,
	"tenant_id" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "demo_activity_log" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"action" text NOT NULL,
	"resource_type" text,
	"resource_id" text,
	"metadata" jsonb,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "demo_data_snapshot" (
	"id" text PRIMARY KEY NOT NULL,
	"snapshot_name" text NOT NULL,
	"description" text,
	"data_content" jsonb NOT NULL,
	"data_type" text NOT NULL,
	"version" integer NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"is_active" boolean NOT NULL
);
--> statement-breakpoint
CREATE TABLE "demo_session" (
	"id" text PRIMARY KEY NOT NULL,
	"demo_user_email" text NOT NULL,
	"demo_user_name" text NOT NULL,
	"demo_user_role" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp NOT NULL,
	"last_accessed_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"actions_count" integer NOT NULL,
	CONSTRAINT "demo_session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "heart" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"song_id" text NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "post_attachment" (
	"id" text PRIMARY KEY NOT NULL,
	"post_id" text,
	"comment_id" text,
	"file_name" text NOT NULL,
	"file_url" text NOT NULL,
	"file_type" text NOT NULL,
	"file_size" integer,
	"position" integer NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "post_comment" (
	"id" text PRIMARY KEY NOT NULL,
	"post_id" text NOT NULL,
	"user_id" text NOT NULL,
	"content" text NOT NULL,
	"parent_comment_id" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "post_reaction" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"post_id" text,
	"comment_id" text,
	"reaction_type" text NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_conversation_link" (
	"id" text PRIMARY KEY NOT NULL,
	"conversation_id" text NOT NULL,
	"external_task_id" text NOT NULL,
	"external_project_id" text,
	"task_source" text NOT NULL,
	"linked_by_id" text NOT NULL,
	"link_reason" text,
	"status" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_suggestion" (
	"id" text PRIMARY KEY NOT NULL,
	"conversation_id" text NOT NULL,
	"suggested_task_id" text,
	"suggested_project_id" text,
	"suggestion_reason" text NOT NULL,
	"confidence_score" real,
	"relevance_keywords" text,
	"task_title" text,
	"task_description" text,
	"task_priority" text,
	"task_deadline" timestamp,
	"status" text NOT NULL,
	"reviewed_by_id" text,
	"reviewed_at" timestamp,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_thread" (
	"id" text PRIMARY KEY NOT NULL,
	"external_task_id" text NOT NULL,
	"external_project_id" text,
	"task_source" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"created_by_id" text NOT NULL,
	"status" text NOT NULL,
	"closed_by_id" text,
	"closed_at" timestamp,
	"closed_reason" text,
	"task_title" text,
	"task_deadline" timestamp,
	"participant_count" integer,
	"message_count" integer,
	"last_activity_at" timestamp NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_thread_message" (
	"id" text PRIMARY KEY NOT NULL,
	"thread_id" text NOT NULL,
	"sender_id" text NOT NULL,
	"content" text NOT NULL,
	"original_message_id" text,
	"is_system_message" boolean NOT NULL,
	"read_by" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_thread_participant" (
	"id" text PRIMARY KEY NOT NULL,
	"thread_id" text NOT NULL,
	"user_id" text NOT NULL,
	"joined_at" timestamp NOT NULL,
	"last_read_at" timestamp,
	"is_muted" boolean NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_assignment" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"assignment_type" text NOT NULL,
	"reference_id" text,
	"reference_source" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"priority" text NOT NULL,
	"estimated_hours" real,
	"actual_hours" real,
	"start_date" timestamp,
	"due_date" timestamp,
	"completed_at" timestamp,
	"status" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_capacity_snapshot" (
	"id" text PRIMARY KEY NOT NULL,
	"snapshot_date" timestamp NOT NULL,
	"total_members" integer NOT NULL,
	"available_members" integer NOT NULL,
	"overloaded_members" integer NOT NULL,
	"underutilized_members" integer NOT NULL,
	"average_utilization" real NOT NULL,
	"total_capacity_hours" real NOT NULL,
	"used_capacity_hours" real NOT NULL,
	"available_capacity_hours" real NOT NULL,
	"total_open_assignments" integer NOT NULL,
	"assignments_at_risk" integer NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_member_capacity" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"max_weekly_hours" real NOT NULL,
	"max_concurrent_tasks" integer NOT NULL,
	"max_active_projects" integer NOT NULL,
	"current_tasks" integer NOT NULL,
	"current_projects" integer NOT NULL,
	"current_weekly_hours" real NOT NULL,
	"current_utilization" real NOT NULL,
	"status" text NOT NULL,
	"status_note" text,
	"status_updated_at" timestamp NOT NULL,
	"available_from" timestamp,
	"available_until" timestamp,
	"timezone" text NOT NULL,
	"skills" text,
	"specializations" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenant" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"domain" text,
	"logo_url" text,
	"settings" jsonb,
	"is_active" boolean NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "tenant_slug_unique" UNIQUE("slug"),
	CONSTRAINT "tenant_domain_unique" UNIQUE("domain")
);
--> statement-breakpoint
CREATE TABLE "tenant_member" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text NOT NULL,
	"is_default" boolean NOT NULL,
	"joined_at" timestamp NOT NULL,
	"invited_by" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflow_approval" (
	"id" text PRIMARY KEY NOT NULL,
	"instance_id" text NOT NULL,
	"step_execution_id" text NOT NULL,
	"approver_id" text NOT NULL,
	"status" text NOT NULL,
	"decision" text,
	"comments" text,
	"decided_at" timestamp,
	"due_at" timestamp,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflow_definition" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_by" text NOT NULL,
	"status" text NOT NULL,
	"trigger_type" text NOT NULL,
	"trigger_config" text,
	"steps" text NOT NULL,
	"variables" text,
	"max_concurrent_instances" integer NOT NULL,
	"timeout_minutes" integer NOT NULL,
	"retry_on_failure" boolean NOT NULL,
	"max_retries" integer NOT NULL,
	"tags" text,
	"version" integer NOT NULL,
	"is_latest" boolean NOT NULL,
	"previous_version_id" text,
	"total_executions" integer NOT NULL,
	"successful_executions" integer NOT NULL,
	"failed_executions" integer NOT NULL,
	"last_executed_at" timestamp,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflow_event_log" (
	"id" text PRIMARY KEY NOT NULL,
	"instance_id" text NOT NULL,
	"step_execution_id" text,
	"event_type" text NOT NULL,
	"event_data" text,
	"actor_id" text,
	"actor_type" text NOT NULL,
	"occurred_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflow_instance" (
	"id" text PRIMARY KEY NOT NULL,
	"definition_id" text NOT NULL,
	"status" text NOT NULL,
	"triggered_by" text,
	"trigger_data" text,
	"current_step_index" integer NOT NULL,
	"current_step_id" text,
	"context" text,
	"output" text,
	"error_message" text,
	"error_details" text,
	"retry_count" integer NOT NULL,
	"last_retry_at" timestamp,
	"started_at" timestamp,
	"completed_at" timestamp,
	"paused_at" timestamp,
	"due_at" timestamp,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflow_scheduled_run" (
	"id" text PRIMARY KEY NOT NULL,
	"definition_id" text NOT NULL,
	"cron_expression" text,
	"scheduled_for" timestamp NOT NULL,
	"is_active" boolean NOT NULL,
	"last_run_at" timestamp,
	"last_run_instance_id" text,
	"next_run_at" timestamp,
	"trigger_data" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflow_step_execution" (
	"id" text PRIMARY KEY NOT NULL,
	"instance_id" text NOT NULL,
	"step_id" text NOT NULL,
	"step_index" integer NOT NULL,
	"step_type" text NOT NULL,
	"step_name" text,
	"status" text NOT NULL,
	"input" text,
	"output" text,
	"error_message" text,
	"error_details" text,
	"retry_count" integer NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp,
	"execution_duration_ms" integer,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
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
ALTER TABLE "capacity_alert" ADD CONSTRAINT "capacity_alert_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capacity_alert" ADD CONSTRAINT "capacity_alert_acknowledged_by_id_user_id_fk" FOREIGN KEY ("acknowledged_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_post" ADD CONSTRAINT "community_post_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_post" ADD CONSTRAINT "community_post_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "demo_activity_log" ADD CONSTRAINT "demo_activity_log_session_id_demo_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."demo_session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "heart" ADD CONSTRAINT "heart_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_comment" ADD CONSTRAINT "post_comment_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_reaction" ADD CONSTRAINT "post_reaction_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_conversation_link" ADD CONSTRAINT "task_conversation_link_conversation_id_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_conversation_link" ADD CONSTRAINT "task_conversation_link_linked_by_id_user_id_fk" FOREIGN KEY ("linked_by_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_suggestion" ADD CONSTRAINT "task_suggestion_conversation_id_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_suggestion" ADD CONSTRAINT "task_suggestion_reviewed_by_id_user_id_fk" FOREIGN KEY ("reviewed_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_thread" ADD CONSTRAINT "task_thread_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_thread" ADD CONSTRAINT "task_thread_closed_by_id_user_id_fk" FOREIGN KEY ("closed_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_thread_message" ADD CONSTRAINT "task_thread_message_thread_id_task_thread_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."task_thread"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_thread_message" ADD CONSTRAINT "task_thread_message_sender_id_user_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_thread_message" ADD CONSTRAINT "task_thread_message_original_message_id_message_id_fk" FOREIGN KEY ("original_message_id") REFERENCES "public"."message"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_thread_participant" ADD CONSTRAINT "task_thread_participant_thread_id_task_thread_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."task_thread"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_thread_participant" ADD CONSTRAINT "task_thread_participant_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_assignment" ADD CONSTRAINT "team_assignment_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_member_capacity" ADD CONSTRAINT "team_member_capacity_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_member" ADD CONSTRAINT "tenant_member_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_member" ADD CONSTRAINT "tenant_member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_member" ADD CONSTRAINT "tenant_member_invited_by_user_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_approval" ADD CONSTRAINT "workflow_approval_instance_id_workflow_instance_id_fk" FOREIGN KEY ("instance_id") REFERENCES "public"."workflow_instance"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_approval" ADD CONSTRAINT "workflow_approval_step_execution_id_workflow_step_execution_id_fk" FOREIGN KEY ("step_execution_id") REFERENCES "public"."workflow_step_execution"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_approval" ADD CONSTRAINT "workflow_approval_approver_id_user_id_fk" FOREIGN KEY ("approver_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_definition" ADD CONSTRAINT "workflow_definition_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_event_log" ADD CONSTRAINT "workflow_event_log_instance_id_workflow_instance_id_fk" FOREIGN KEY ("instance_id") REFERENCES "public"."workflow_instance"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_event_log" ADD CONSTRAINT "workflow_event_log_step_execution_id_workflow_step_execution_id_fk" FOREIGN KEY ("step_execution_id") REFERENCES "public"."workflow_step_execution"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_event_log" ADD CONSTRAINT "workflow_event_log_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_instance" ADD CONSTRAINT "workflow_instance_definition_id_workflow_definition_id_fk" FOREIGN KEY ("definition_id") REFERENCES "public"."workflow_definition"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_instance" ADD CONSTRAINT "workflow_instance_triggered_by_user_id_fk" FOREIGN KEY ("triggered_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_scheduled_run" ADD CONSTRAINT "workflow_scheduled_run_definition_id_workflow_definition_id_fk" FOREIGN KEY ("definition_id") REFERENCES "public"."workflow_definition"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_scheduled_run" ADD CONSTRAINT "workflow_scheduled_run_last_run_instance_id_workflow_instance_id_fk" FOREIGN KEY ("last_run_instance_id") REFERENCES "public"."workflow_instance"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_step_execution" ADD CONSTRAINT "workflow_step_execution_instance_id_workflow_instance_id_fk" FOREIGN KEY ("instance_id") REFERENCES "public"."workflow_instance"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alert_rules" ADD CONSTRAINT "alert_rules_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_analysis_result_id_analysis_results_id_fk" FOREIGN KEY ("analysis_result_id") REFERENCES "public"."analysis_results"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_acknowledged_by_user_id_fk" FOREIGN KEY ("acknowledged_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analysis_results" ADD CONSTRAINT "analysis_results_job_id_monitoring_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."monitoring_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "autonomous_actions" ADD CONSTRAINT "autonomous_actions_approved_by_user_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_briefings" ADD CONSTRAINT "daily_briefings_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_capacity_alert_type" ON "capacity_alert" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_capacity_alert_severity" ON "capacity_alert" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "idx_capacity_alert_user_id" ON "capacity_alert" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_capacity_alert_acknowledged" ON "capacity_alert" USING btree ("acknowledged");--> statement-breakpoint
CREATE INDEX "idx_capacity_alert_created_at" ON "capacity_alert" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_community_post_user_id" ON "community_post" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_community_post_category" ON "community_post" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_community_post_created_at" ON "community_post" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_community_post_tenant_id" ON "community_post" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_demo_activity_session" ON "demo_activity_log" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_demo_activity_action" ON "demo_activity_log" USING btree ("action");--> statement-breakpoint
CREATE INDEX "idx_demo_activity_created" ON "demo_activity_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_demo_data_snapshot_name" ON "demo_data_snapshot" USING btree ("snapshot_name");--> statement-breakpoint
CREATE INDEX "idx_demo_data_snapshot_type" ON "demo_data_snapshot" USING btree ("data_type");--> statement-breakpoint
CREATE INDEX "idx_demo_data_snapshot_active" ON "demo_data_snapshot" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_demo_session_token" ON "demo_session" USING btree ("token");--> statement-breakpoint
CREATE INDEX "idx_demo_session_email" ON "demo_session" USING btree ("demo_user_email");--> statement-breakpoint
CREATE INDEX "idx_demo_session_expires" ON "demo_session" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_heart_user_id" ON "heart" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_heart_song_id" ON "heart" USING btree ("song_id");--> statement-breakpoint
CREATE INDEX "idx_post_attachment_post_id" ON "post_attachment" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "idx_post_attachment_comment_id" ON "post_attachment" USING btree ("comment_id");--> statement-breakpoint
CREATE INDEX "idx_post_comment_post_id" ON "post_comment" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "idx_post_comment_user_id" ON "post_comment" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_post_comment_parent_id" ON "post_comment" USING btree ("parent_comment_id");--> statement-breakpoint
CREATE INDEX "idx_post_reaction_user_id" ON "post_reaction" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_post_reaction_post_id" ON "post_reaction" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "idx_post_reaction_comment_id" ON "post_reaction" USING btree ("comment_id");--> statement-breakpoint
CREATE INDEX "idx_task_conv_link_conversation_id" ON "task_conversation_link" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "idx_task_conv_link_external_task_id" ON "task_conversation_link" USING btree ("external_task_id");--> statement-breakpoint
CREATE INDEX "idx_task_conv_link_external_project_id" ON "task_conversation_link" USING btree ("external_project_id");--> statement-breakpoint
CREATE INDEX "idx_task_conv_link_linked_by_id" ON "task_conversation_link" USING btree ("linked_by_id");--> statement-breakpoint
CREATE INDEX "idx_task_conv_link_status" ON "task_conversation_link" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_task_conv_link_created_at" ON "task_conversation_link" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_task_suggestion_conversation_id" ON "task_suggestion" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "idx_task_suggestion_suggested_task_id" ON "task_suggestion" USING btree ("suggested_task_id");--> statement-breakpoint
CREATE INDEX "idx_task_suggestion_status" ON "task_suggestion" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_task_suggestion_confidence_score" ON "task_suggestion" USING btree ("confidence_score");--> statement-breakpoint
CREATE INDEX "idx_task_suggestion_created_at" ON "task_suggestion" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_task_thread_external_task_id" ON "task_thread" USING btree ("external_task_id");--> statement-breakpoint
CREATE INDEX "idx_task_thread_external_project_id" ON "task_thread" USING btree ("external_project_id");--> statement-breakpoint
CREATE INDEX "idx_task_thread_created_by_id" ON "task_thread" USING btree ("created_by_id");--> statement-breakpoint
CREATE INDEX "idx_task_thread_status" ON "task_thread" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_task_thread_last_activity_at" ON "task_thread" USING btree ("last_activity_at");--> statement-breakpoint
CREATE INDEX "idx_task_thread_created_at" ON "task_thread" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_task_thread_message_thread_id" ON "task_thread_message" USING btree ("thread_id");--> statement-breakpoint
CREATE INDEX "idx_task_thread_message_sender_id" ON "task_thread_message" USING btree ("sender_id");--> statement-breakpoint
CREATE INDEX "idx_task_thread_message_created_at" ON "task_thread_message" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_task_thread_message_thread_created" ON "task_thread_message" USING btree ("thread_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_task_thread_participant_thread_id" ON "task_thread_participant" USING btree ("thread_id");--> statement-breakpoint
CREATE INDEX "idx_task_thread_participant_user_id" ON "task_thread_participant" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_task_thread_participant_thread_user" ON "task_thread_participant" USING btree ("thread_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_team_assignment_user_id" ON "team_assignment" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_team_assignment_status" ON "team_assignment" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_team_assignment_type" ON "team_assignment" USING btree ("assignment_type");--> statement-breakpoint
CREATE INDEX "idx_team_assignment_due_date" ON "team_assignment" USING btree ("due_date");--> statement-breakpoint
CREATE INDEX "idx_team_assignment_user_status" ON "team_assignment" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "idx_team_capacity_snapshot_date" ON "team_capacity_snapshot" USING btree ("snapshot_date");--> statement-breakpoint
CREATE INDEX "idx_team_capacity_snapshot_created_at" ON "team_capacity_snapshot" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_team_member_capacity_user_id" ON "team_member_capacity" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_team_member_capacity_status" ON "team_member_capacity" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_team_member_capacity_utilization" ON "team_member_capacity" USING btree ("current_utilization");--> statement-breakpoint
CREATE INDEX "idx_tenant_slug" ON "tenant" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_tenant_is_active" ON "tenant" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_tenant_member_tenant_id" ON "tenant_member" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_tenant_member_user_id" ON "tenant_member" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_tenant_member_role" ON "tenant_member" USING btree ("role");--> statement-breakpoint
CREATE INDEX "idx_tenant_member_is_default" ON "tenant_member" USING btree ("user_id","is_default");--> statement-breakpoint
CREATE INDEX "idx_workflow_approval_instance_id" ON "workflow_approval" USING btree ("instance_id");--> statement-breakpoint
CREATE INDEX "idx_workflow_approval_step_execution_id" ON "workflow_approval" USING btree ("step_execution_id");--> statement-breakpoint
CREATE INDEX "idx_workflow_approval_approver_id" ON "workflow_approval" USING btree ("approver_id");--> statement-breakpoint
CREATE INDEX "idx_workflow_approval_status" ON "workflow_approval" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_workflow_approval_due_at" ON "workflow_approval" USING btree ("due_at");--> statement-breakpoint
CREATE INDEX "idx_workflow_definition_created_by" ON "workflow_definition" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "idx_workflow_definition_status" ON "workflow_definition" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_workflow_definition_trigger_type" ON "workflow_definition" USING btree ("trigger_type");--> statement-breakpoint
CREATE INDEX "idx_workflow_definition_is_latest" ON "workflow_definition" USING btree ("is_latest");--> statement-breakpoint
CREATE INDEX "idx_workflow_definition_name" ON "workflow_definition" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_workflow_event_log_instance_id" ON "workflow_event_log" USING btree ("instance_id");--> statement-breakpoint
CREATE INDEX "idx_workflow_event_log_step_execution_id" ON "workflow_event_log" USING btree ("step_execution_id");--> statement-breakpoint
CREATE INDEX "idx_workflow_event_log_event_type" ON "workflow_event_log" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "idx_workflow_event_log_occurred_at" ON "workflow_event_log" USING btree ("occurred_at");--> statement-breakpoint
CREATE INDEX "idx_workflow_instance_definition_id" ON "workflow_instance" USING btree ("definition_id");--> statement-breakpoint
CREATE INDEX "idx_workflow_instance_status" ON "workflow_instance" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_workflow_instance_triggered_by" ON "workflow_instance" USING btree ("triggered_by");--> statement-breakpoint
CREATE INDEX "idx_workflow_instance_started_at" ON "workflow_instance" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "idx_workflow_instance_current_step" ON "workflow_instance" USING btree ("current_step_index");--> statement-breakpoint
CREATE INDEX "idx_workflow_scheduled_run_definition_id" ON "workflow_scheduled_run" USING btree ("definition_id");--> statement-breakpoint
CREATE INDEX "idx_workflow_scheduled_run_scheduled_for" ON "workflow_scheduled_run" USING btree ("scheduled_for");--> statement-breakpoint
CREATE INDEX "idx_workflow_scheduled_run_is_active" ON "workflow_scheduled_run" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_workflow_scheduled_run_next_run_at" ON "workflow_scheduled_run" USING btree ("next_run_at");--> statement-breakpoint
CREATE INDEX "idx_workflow_step_execution_instance_id" ON "workflow_step_execution" USING btree ("instance_id");--> statement-breakpoint
CREATE INDEX "idx_workflow_step_execution_step_id" ON "workflow_step_execution" USING btree ("step_id");--> statement-breakpoint
CREATE INDEX "idx_workflow_step_execution_status" ON "workflow_step_execution" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_workflow_step_execution_step_type" ON "workflow_step_execution" USING btree ("step_type");