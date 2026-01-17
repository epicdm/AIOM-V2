CREATE TABLE "dead_letter_queue" (
	"id" text PRIMARY KEY NOT NULL,
	"original_job_id" text NOT NULL,
	"type" text NOT NULL,
	"name" text NOT NULL,
	"payload" text NOT NULL,
	"failed_at" timestamp NOT NULL,
	"failure_reason" text NOT NULL,
	"total_attempts" integer NOT NULL,
	"execution_history" text,
	"resolved_at" timestamp,
	"resolved_by" text,
	"resolution" text,
	"user_id" text,
	"reference_id" text,
	"reference_type" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_execution_log" (
	"id" text PRIMARY KEY NOT NULL,
	"job_id" text NOT NULL,
	"worker_id" text NOT NULL,
	"attempt_number" integer NOT NULL,
	"status" text NOT NULL,
	"started_at" timestamp NOT NULL,
	"completed_at" timestamp NOT NULL,
	"duration" integer NOT NULL,
	"result" text,
	"error" text,
	"error_stack" text,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_queue" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"name" text NOT NULL,
	"payload" text NOT NULL,
	"priority" text NOT NULL,
	"scheduled_for" timestamp,
	"status" text NOT NULL,
	"max_retries" integer NOT NULL,
	"retry_count" integer NOT NULL,
	"retry_delay" integer NOT NULL,
	"locked_by" text,
	"locked_at" timestamp,
	"processing_timeout" integer NOT NULL,
	"result" text,
	"last_error" text,
	"error_stack" text,
	"progress" integer NOT NULL,
	"progress_message" text,
	"user_id" text,
	"reference_id" text,
	"reference_type" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "job_execution_log" ADD CONSTRAINT "job_execution_log_job_id_job_queue_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."job_queue"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_queue" ADD CONSTRAINT "job_queue_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_dead_letter_queue_type" ON "dead_letter_queue" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_dead_letter_queue_failed_at" ON "dead_letter_queue" USING btree ("failed_at");--> statement-breakpoint
CREATE INDEX "idx_dead_letter_queue_resolved_at" ON "dead_letter_queue" USING btree ("resolved_at");--> statement-breakpoint
CREATE INDEX "idx_dead_letter_queue_user_id" ON "dead_letter_queue" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_dead_letter_queue_reference" ON "dead_letter_queue" USING btree ("reference_type","reference_id");--> statement-breakpoint
CREATE INDEX "idx_job_execution_log_job_id" ON "job_execution_log" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "idx_job_execution_log_worker_id" ON "job_execution_log" USING btree ("worker_id");--> statement-breakpoint
CREATE INDEX "idx_job_execution_log_status" ON "job_execution_log" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_job_execution_log_created_at" ON "job_execution_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_job_execution_log_started_at" ON "job_execution_log" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "idx_job_queue_type" ON "job_queue" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_job_queue_status" ON "job_queue" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_job_queue_user_id" ON "job_queue" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_job_queue_priority" ON "job_queue" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "idx_job_queue_scheduled_for" ON "job_queue" USING btree ("scheduled_for");--> statement-breakpoint
CREATE INDEX "idx_job_queue_status_priority" ON "job_queue" USING btree ("status","priority");--> statement-breakpoint
CREATE INDEX "idx_job_queue_locked_by" ON "job_queue" USING btree ("locked_by");--> statement-breakpoint
CREATE INDEX "idx_job_queue_locked_at" ON "job_queue" USING btree ("locked_at");--> statement-breakpoint
CREATE INDEX "idx_job_queue_pending" ON "job_queue" USING btree ("status","priority","scheduled_for");--> statement-breakpoint
CREATE INDEX "idx_job_queue_reference" ON "job_queue" USING btree ("reference_type","reference_id");--> statement-breakpoint
CREATE INDEX "idx_job_queue_created_at" ON "job_queue" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_job_queue_completed_at" ON "job_queue" USING btree ("completed_at");