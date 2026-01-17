CREATE TABLE "task_auto_creation_rule" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_by" text NOT NULL,
	"trigger_type" text NOT NULL,
	"conditions" text,
	"task_template" text NOT NULL,
	"status" text NOT NULL,
	"schedule" text,
	"last_triggered_at" timestamp,
	"next_scheduled_at" timestamp,
	"cooldown_minutes" integer,
	"max_triggers_per_day" integer,
	"triggers_today" integer,
	"triggers_reset_at" timestamp,
	"priority" integer,
	"total_triggered" integer,
	"total_tasks_created" integer,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_rule_execution_log" (
	"id" text PRIMARY KEY NOT NULL,
	"rule_id" text NOT NULL,
	"trigger_data" text,
	"success" boolean NOT NULL,
	"task_created_id" text,
	"error_message" text,
	"executed_at" timestamp NOT NULL,
	"execution_duration_ms" integer
);
--> statement-breakpoint
ALTER TABLE "task_auto_creation_rule" ADD CONSTRAINT "task_auto_creation_rule_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_rule_execution_log" ADD CONSTRAINT "task_rule_execution_log_rule_id_task_auto_creation_rule_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."task_auto_creation_rule"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_task_auto_creation_rule_created_by" ON "task_auto_creation_rule" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "idx_task_auto_creation_rule_trigger_type" ON "task_auto_creation_rule" USING btree ("trigger_type");--> statement-breakpoint
CREATE INDEX "idx_task_auto_creation_rule_status" ON "task_auto_creation_rule" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_task_auto_creation_rule_next_scheduled" ON "task_auto_creation_rule" USING btree ("next_scheduled_at");--> statement-breakpoint
CREATE INDEX "idx_task_rule_execution_log_rule_id" ON "task_rule_execution_log" USING btree ("rule_id");--> statement-breakpoint
CREATE INDEX "idx_task_rule_execution_log_executed_at" ON "task_rule_execution_log" USING btree ("executed_at");--> statement-breakpoint
CREATE INDEX "idx_task_rule_execution_log_success" ON "task_rule_execution_log" USING btree ("success");