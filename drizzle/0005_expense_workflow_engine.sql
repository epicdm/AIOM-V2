CREATE TABLE "expense_workflow_event" (
	"id" text PRIMARY KEY NOT NULL,
	"workflow_instance_id" text NOT NULL,
	"voucher_id" text NOT NULL,
	"event_type" text NOT NULL,
	"from_state" text,
	"to_state" text,
	"triggered_by_id" text,
	"event_data" text,
	"comments" text,
	"notifications_sent" text,
	"ip_address" text,
	"user_agent" text,
	"occurred_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expense_workflow_instance" (
	"id" text PRIMARY KEY NOT NULL,
	"voucher_id" text NOT NULL,
	"current_state" text NOT NULL,
	"previous_state" text,
	"state_entered_at" timestamp NOT NULL,
	"workflow_config" text,
	"current_assignee_id" text,
	"escalation_level" integer NOT NULL,
	"escalated_at" timestamp,
	"escalation_reason" text,
	"due_date" timestamp,
	"sla_breached" boolean NOT NULL,
	"sla_durations" text,
	"retry_count" integer NOT NULL,
	"last_retry_at" timestamp,
	"last_error" text,
	"is_completed" boolean NOT NULL,
	"completed_at" timestamp,
	"completion_result" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expense_workflow_notification_queue" (
	"id" text PRIMARY KEY NOT NULL,
	"workflow_instance_id" text NOT NULL,
	"voucher_id" text NOT NULL,
	"recipient_id" text NOT NULL,
	"notification_type" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"action_url" text,
	"priority" text NOT NULL,
	"scheduled_for" timestamp NOT NULL,
	"status" text NOT NULL,
	"sent_at" timestamp,
	"delivered_at" timestamp,
	"failed_at" timestamp,
	"error_message" text,
	"retry_count" integer NOT NULL,
	"max_retries" integer NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "odoo_channel" (
	"id" text PRIMARY KEY NOT NULL,
	"odoo_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"channel_type" text NOT NULL,
	"member_count" integer NOT NULL,
	"unread_count" integer NOT NULL,
	"is_member" boolean NOT NULL,
	"image" text,
	"sync_status" text NOT NULL,
	"last_synced_at" timestamp NOT NULL,
	"last_message_odoo_id" integer,
	"sync_error" text,
	"odoo_created_at" timestamp,
	"odoo_updated_at" timestamp,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "odoo_channel_odoo_id_unique" UNIQUE("odoo_id")
);
--> statement-breakpoint
CREATE TABLE "odoo_discuss_subscription" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"is_active" boolean NOT NULL,
	"last_polling_id" integer NOT NULL,
	"polling_interval" integer NOT NULL,
	"last_poll_at" timestamp,
	"last_notification_at" timestamp,
	"error_count" integer NOT NULL,
	"last_error" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "odoo_message" (
	"id" text PRIMARY KEY NOT NULL,
	"odoo_id" integer NOT NULL,
	"channel_id" text NOT NULL,
	"body" text NOT NULL,
	"message_type" text NOT NULL,
	"author_odoo_id" integer,
	"author_name" text,
	"author_email" text,
	"is_starred" boolean NOT NULL,
	"has_attachments" boolean NOT NULL,
	"attachment_count" integer NOT NULL,
	"attachments" text,
	"odoo_created_at" timestamp,
	"created_at" timestamp NOT NULL,
	CONSTRAINT "odoo_message_odoo_id_unique" UNIQUE("odoo_id")
);
--> statement-breakpoint
CREATE TABLE "prompt_template" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"category" text NOT NULL,
	"status" text NOT NULL,
	"version" text NOT NULL,
	"system_prompt" text NOT NULL,
	"user_prompt_prefix" text,
	"user_prompt_suffix" text,
	"variables" text NOT NULL,
	"caching" text NOT NULL,
	"recommended_model" text,
	"recommended_temperature" text,
	"recommended_max_tokens" integer,
	"token_estimate" text,
	"tags" text,
	"author" text,
	"is_built_in" boolean NOT NULL,
	"user_id" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prompt_template_usage" (
	"id" text PRIMARY KEY NOT NULL,
	"template_id" text NOT NULL,
	"user_id" text NOT NULL,
	"input_tokens" integer NOT NULL,
	"output_tokens" integer NOT NULL,
	"cache_read_tokens" integer,
	"cache_creation_tokens" integer,
	"response_time_ms" integer NOT NULL,
	"model" text NOT NULL,
	"success" boolean NOT NULL,
	"error_message" text,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "expense_workflow_event" ADD CONSTRAINT "expense_workflow_event_workflow_instance_id_expense_workflow_instance_id_fk" FOREIGN KEY ("workflow_instance_id") REFERENCES "public"."expense_workflow_instance"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_workflow_event" ADD CONSTRAINT "expense_workflow_event_voucher_id_expense_voucher_id_fk" FOREIGN KEY ("voucher_id") REFERENCES "public"."expense_voucher"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_workflow_event" ADD CONSTRAINT "expense_workflow_event_triggered_by_id_user_id_fk" FOREIGN KEY ("triggered_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_workflow_instance" ADD CONSTRAINT "expense_workflow_instance_voucher_id_expense_voucher_id_fk" FOREIGN KEY ("voucher_id") REFERENCES "public"."expense_voucher"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_workflow_instance" ADD CONSTRAINT "expense_workflow_instance_current_assignee_id_user_id_fk" FOREIGN KEY ("current_assignee_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_workflow_notification_queue" ADD CONSTRAINT "expense_workflow_notification_queue_workflow_instance_id_expense_workflow_instance_id_fk" FOREIGN KEY ("workflow_instance_id") REFERENCES "public"."expense_workflow_instance"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_workflow_notification_queue" ADD CONSTRAINT "expense_workflow_notification_queue_voucher_id_expense_voucher_id_fk" FOREIGN KEY ("voucher_id") REFERENCES "public"."expense_voucher"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_workflow_notification_queue" ADD CONSTRAINT "expense_workflow_notification_queue_recipient_id_user_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "odoo_channel" ADD CONSTRAINT "odoo_channel_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "odoo_discuss_subscription" ADD CONSTRAINT "odoo_discuss_subscription_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "odoo_message" ADD CONSTRAINT "odoo_message_channel_id_odoo_channel_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."odoo_channel"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prompt_template" ADD CONSTRAINT "prompt_template_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prompt_template_usage" ADD CONSTRAINT "prompt_template_usage_template_id_prompt_template_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."prompt_template"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prompt_template_usage" ADD CONSTRAINT "prompt_template_usage_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_expense_workflow_event_instance_id" ON "expense_workflow_event" USING btree ("workflow_instance_id");--> statement-breakpoint
CREATE INDEX "idx_expense_workflow_event_voucher_id" ON "expense_workflow_event" USING btree ("voucher_id");--> statement-breakpoint
CREATE INDEX "idx_expense_workflow_event_type" ON "expense_workflow_event" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "idx_expense_workflow_event_occurred_at" ON "expense_workflow_event" USING btree ("occurred_at");--> statement-breakpoint
CREATE INDEX "idx_expense_workflow_event_triggered_by" ON "expense_workflow_event" USING btree ("triggered_by_id");--> statement-breakpoint
CREATE INDEX "idx_expense_workflow_instance_voucher_id" ON "expense_workflow_instance" USING btree ("voucher_id");--> statement-breakpoint
CREATE INDEX "idx_expense_workflow_instance_current_state" ON "expense_workflow_instance" USING btree ("current_state");--> statement-breakpoint
CREATE INDEX "idx_expense_workflow_instance_assignee" ON "expense_workflow_instance" USING btree ("current_assignee_id");--> statement-breakpoint
CREATE INDEX "idx_expense_workflow_instance_is_completed" ON "expense_workflow_instance" USING btree ("is_completed");--> statement-breakpoint
CREATE INDEX "idx_expense_workflow_instance_due_date" ON "expense_workflow_instance" USING btree ("due_date");--> statement-breakpoint
CREATE INDEX "idx_expense_workflow_notification_queue_instance" ON "expense_workflow_notification_queue" USING btree ("workflow_instance_id");--> statement-breakpoint
CREATE INDEX "idx_expense_workflow_notification_queue_recipient" ON "expense_workflow_notification_queue" USING btree ("recipient_id");--> statement-breakpoint
CREATE INDEX "idx_expense_workflow_notification_queue_status" ON "expense_workflow_notification_queue" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_expense_workflow_notification_queue_scheduled" ON "expense_workflow_notification_queue" USING btree ("scheduled_for");--> statement-breakpoint
CREATE INDEX "idx_odoo_channel_user_id" ON "odoo_channel" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_odoo_channel_odoo_id" ON "odoo_channel" USING btree ("odoo_id");--> statement-breakpoint
CREATE INDEX "idx_odoo_channel_sync_status" ON "odoo_channel" USING btree ("sync_status");--> statement-breakpoint
CREATE INDEX "idx_odoo_channel_user_odoo" ON "odoo_channel" USING btree ("user_id","odoo_id");--> statement-breakpoint
CREATE INDEX "idx_odoo_channel_updated_at" ON "odoo_channel" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "idx_odoo_discuss_subscription_user_id" ON "odoo_discuss_subscription" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_odoo_discuss_subscription_active" ON "odoo_discuss_subscription" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_odoo_message_channel_id" ON "odoo_message" USING btree ("channel_id");--> statement-breakpoint
CREATE INDEX "idx_odoo_message_odoo_id" ON "odoo_message" USING btree ("odoo_id");--> statement-breakpoint
CREATE INDEX "idx_odoo_message_author_odoo_id" ON "odoo_message" USING btree ("author_odoo_id");--> statement-breakpoint
CREATE INDEX "idx_odoo_message_created_at" ON "odoo_message" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_odoo_message_channel_created" ON "odoo_message" USING btree ("channel_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_prompt_template_user_id" ON "prompt_template" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_prompt_template_category" ON "prompt_template" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_prompt_template_status" ON "prompt_template" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_prompt_template_is_built_in" ON "prompt_template" USING btree ("is_built_in");--> statement-breakpoint
CREATE INDEX "idx_prompt_template_created_at" ON "prompt_template" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_prompt_template_usage_template_id" ON "prompt_template_usage" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "idx_prompt_template_usage_user_id" ON "prompt_template_usage" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_prompt_template_usage_created_at" ON "prompt_template_usage" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_prompt_template_usage_success" ON "prompt_template_usage" USING btree ("success");--> statement-breakpoint
CREATE INDEX "idx_prompt_template_usage_user_template" ON "prompt_template_usage" USING btree ("user_id","template_id");