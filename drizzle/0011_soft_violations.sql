CREATE TABLE "call_disposition" (
	"id" text PRIMARY KEY NOT NULL,
	"call_record_id" text NOT NULL,
	"user_id" text NOT NULL,
	"disposition" text NOT NULL,
	"notes" text,
	"customer_sentiment" text,
	"follow_up_date" timestamp,
	"follow_up_reason" text,
	"escalation_reason" text,
	"escalation_priority" text,
	"escalated_to" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "call_recording" (
	"id" text PRIMARY KEY NOT NULL,
	"call_record_id" text NOT NULL,
	"user_id" text NOT NULL,
	"fusionpbx_recording_id" text,
	"fusionpbx_call_uuid" text,
	"storage_provider" text NOT NULL,
	"storage_key" text NOT NULL,
	"storage_bucket" text,
	"original_filename" text,
	"file_size" integer,
	"file_format" text,
	"duration_seconds" integer,
	"sample_rate" integer,
	"channels" integer,
	"is_encrypted" boolean NOT NULL,
	"encryption_algorithm" text,
	"encryption_key_id" text,
	"encryption_iv" text,
	"content_hash" text,
	"status" text NOT NULL,
	"processing_started_at" timestamp,
	"processing_completed_at" timestamp,
	"error_message" text,
	"retry_count" integer NOT NULL,
	"retention_policy_id" text,
	"retention_days" integer NOT NULL,
	"expires_at" timestamp NOT NULL,
	"deletion_scheduled_at" timestamp,
	"deleted_at" timestamp,
	"metadata" text,
	"tags" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "call_recording_access_log" (
	"id" text PRIMARY KEY NOT NULL,
	"recording_id" text NOT NULL,
	"user_id" text,
	"access_type" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"success" boolean NOT NULL,
	"error_message" text,
	"accessed_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "call_recording_encryption_key" (
	"id" text PRIMARY KEY NOT NULL,
	"key_version" integer NOT NULL,
	"encrypted_key" text NOT NULL,
	"key_hash" text NOT NULL,
	"is_active" boolean NOT NULL,
	"is_primary" boolean NOT NULL,
	"rotated_at" timestamp,
	"rotated_by" text,
	"created_at" timestamp NOT NULL,
	"expires_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "call_recording_retention_policy" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"retention_days" integer NOT NULL,
	"auto_delete" boolean NOT NULL,
	"archive_before_delete" boolean NOT NULL,
	"conditions" text,
	"priority" integer NOT NULL,
	"is_default" boolean NOT NULL,
	"is_active" boolean NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "call_summary" (
	"id" text PRIMARY KEY NOT NULL,
	"call_record_id" text NOT NULL,
	"user_id" text NOT NULL,
	"summary" text NOT NULL,
	"key_points" text,
	"action_items" text,
	"sentiment" text,
	"sentiment_score" real,
	"sentiment_details" text,
	"transcription" text,
	"status" text NOT NULL,
	"model" text,
	"tokens_used" integer,
	"generation_time_ms" integer,
	"error_message" text,
	"source_type" text,
	"recording_url" text,
	"notes_used" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "call_task" (
	"id" text PRIMARY KEY NOT NULL,
	"call_record_id" text NOT NULL,
	"call_disposition_id" text,
	"user_id" text NOT NULL,
	"assigned_to" text,
	"title" text NOT NULL,
	"description" text,
	"priority" text NOT NULL,
	"status" text NOT NULL,
	"due_date" timestamp,
	"completed_at" timestamp,
	"completed_by" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feature_flag" (
	"id" text PRIMARY KEY NOT NULL,
	"flag_name" text NOT NULL,
	"description" text,
	"enabled" boolean NOT NULL,
	"rollout_percentage" integer NOT NULL,
	"rollout_strategy" text NOT NULL,
	"metadata" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "feature_flag_flag_name_unique" UNIQUE("flag_name")
);
--> statement-breakpoint
CREATE TABLE "feature_flag_role_target" (
	"id" text PRIMARY KEY NOT NULL,
	"feature_flag_id" text NOT NULL,
	"role" text NOT NULL,
	"enabled" boolean NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feature_flag_user_target" (
	"id" text PRIMARY KEY NOT NULL,
	"feature_flag_id" text NOT NULL,
	"user_id" text NOT NULL,
	"enabled" boolean NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kyc_document" (
	"id" text PRIMARY KEY NOT NULL,
	"kyc_verification_id" text NOT NULL,
	"user_id" text NOT NULL,
	"document_type" text NOT NULL,
	"status" text NOT NULL,
	"file_name" text NOT NULL,
	"file_url" text NOT NULL,
	"file_size" integer,
	"mime_type" text,
	"file_hash" text,
	"document_number" text,
	"issuing_country" text,
	"issuing_authority" text,
	"issue_date" text,
	"expiry_date" text,
	"extracted_data" text,
	"verified_at" timestamp,
	"verified_by_id" text,
	"rejected_at" timestamp,
	"rejected_by_id" text,
	"rejection_reason" text,
	"external_check_id" text,
	"external_check_result" text,
	"is_front_side" boolean,
	"is_back_side" boolean,
	"requires_manual_review" boolean,
	"uploaded_at" timestamp NOT NULL,
	"upload_ip_address" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kyc_tier_config" (
	"id" text PRIMARY KEY NOT NULL,
	"tier_level" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"required_documents" text NOT NULL,
	"daily_transaction_limit" text,
	"weekly_transaction_limit" text,
	"monthly_transaction_limit" text,
	"single_transaction_limit" text,
	"annual_transaction_limit" text,
	"can_withdraw" boolean NOT NULL,
	"can_deposit" boolean NOT NULL,
	"can_transfer" boolean NOT NULL,
	"can_trade" boolean NOT NULL,
	"requires_phone_verification" boolean NOT NULL,
	"requires_email_verification" boolean NOT NULL,
	"requires_address_verification" boolean NOT NULL,
	"requires_manual_review" boolean NOT NULL,
	"validity_days" integer,
	"priority" integer NOT NULL,
	"is_active" boolean NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "kyc_tier_config_tier_level_unique" UNIQUE("tier_level")
);
--> statement-breakpoint
CREATE TABLE "kyc_verification" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"status" text NOT NULL,
	"tier_level" text NOT NULL,
	"first_name" text,
	"last_name" text,
	"middle_name" text,
	"date_of_birth" text,
	"nationality" text,
	"country_of_residence" text,
	"address_line_1" text,
	"address_line_2" text,
	"city" text,
	"state_province" text,
	"postal_code" text,
	"country" text,
	"phone_number" text,
	"phone_verified" boolean NOT NULL,
	"tax_id" text,
	"tax_id_type" text,
	"tax_id_country" text,
	"documents" text,
	"daily_transaction_limit" text,
	"weekly_transaction_limit" text,
	"monthly_transaction_limit" text,
	"single_transaction_limit" text,
	"annual_transaction_limit" text,
	"daily_transaction_total" text NOT NULL,
	"weekly_transaction_total" text NOT NULL,
	"monthly_transaction_total" text NOT NULL,
	"annual_transaction_total" text NOT NULL,
	"last_limit_reset_date" timestamp,
	"risk_score" integer,
	"risk_level" text,
	"risk_factors" text,
	"external_verification_id" text,
	"external_provider" text,
	"external_verification_data" text,
	"submitted_at" timestamp,
	"review_started_at" timestamp,
	"approved_at" timestamp,
	"rejected_at" timestamp,
	"expires_at" timestamp,
	"suspended_at" timestamp,
	"reviewed_by_id" text,
	"approved_by_id" text,
	"rejected_by_id" text,
	"rejection_reason" text,
	"rejection_details" text,
	"internal_notes" text,
	"review_notes" text,
	"last_activity_at" timestamp,
	"last_status_change_at" timestamp,
	"previous_status" text,
	"submission_ip_address" text,
	"submission_device_id" text,
	"submission_user_agent" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "kyc_verification_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "kyc_verification_history" (
	"id" text PRIMARY KEY NOT NULL,
	"kyc_verification_id" text NOT NULL,
	"action" text NOT NULL,
	"action_by_id" text,
	"action_by_role" text,
	"previous_status" text,
	"new_status" text,
	"previous_tier" text,
	"new_tier" text,
	"details" text,
	"comments" text,
	"document_id" text,
	"document_type" text,
	"ip_address" text,
	"user_agent" text,
	"action_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "unified_inbox_thread" ADD COLUMN "priority_score" real;--> statement-breakpoint
ALTER TABLE "unified_inbox_thread" ADD COLUMN "priority_level" text;--> statement-breakpoint
ALTER TABLE "unified_inbox_thread" ADD COLUMN "priority_factors" jsonb;--> statement-breakpoint
ALTER TABLE "unified_inbox_thread" ADD COLUMN "priority_reason" text;--> statement-breakpoint
ALTER TABLE "unified_inbox_thread" ADD COLUMN "scored_at" timestamp;--> statement-breakpoint
ALTER TABLE "unified_inbox_thread" ADD COLUMN "is_high_priority" boolean NOT NULL;--> statement-breakpoint
ALTER TABLE "call_disposition" ADD CONSTRAINT "call_disposition_call_record_id_call_record_id_fk" FOREIGN KEY ("call_record_id") REFERENCES "public"."call_record"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_disposition" ADD CONSTRAINT "call_disposition_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_recording" ADD CONSTRAINT "call_recording_call_record_id_call_record_id_fk" FOREIGN KEY ("call_record_id") REFERENCES "public"."call_record"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_recording" ADD CONSTRAINT "call_recording_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_recording" ADD CONSTRAINT "call_recording_encryption_key_id_call_recording_encryption_key_id_fk" FOREIGN KEY ("encryption_key_id") REFERENCES "public"."call_recording_encryption_key"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_recording" ADD CONSTRAINT "call_recording_retention_policy_id_call_recording_retention_policy_id_fk" FOREIGN KEY ("retention_policy_id") REFERENCES "public"."call_recording_retention_policy"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_recording_access_log" ADD CONSTRAINT "call_recording_access_log_recording_id_call_recording_id_fk" FOREIGN KEY ("recording_id") REFERENCES "public"."call_recording"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_recording_access_log" ADD CONSTRAINT "call_recording_access_log_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_summary" ADD CONSTRAINT "call_summary_call_record_id_call_record_id_fk" FOREIGN KEY ("call_record_id") REFERENCES "public"."call_record"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_summary" ADD CONSTRAINT "call_summary_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_task" ADD CONSTRAINT "call_task_call_record_id_call_record_id_fk" FOREIGN KEY ("call_record_id") REFERENCES "public"."call_record"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_task" ADD CONSTRAINT "call_task_call_disposition_id_call_disposition_id_fk" FOREIGN KEY ("call_disposition_id") REFERENCES "public"."call_disposition"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_task" ADD CONSTRAINT "call_task_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_task" ADD CONSTRAINT "call_task_assigned_to_user_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_task" ADD CONSTRAINT "call_task_completed_by_user_id_fk" FOREIGN KEY ("completed_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feature_flag_role_target" ADD CONSTRAINT "feature_flag_role_target_feature_flag_id_feature_flag_id_fk" FOREIGN KEY ("feature_flag_id") REFERENCES "public"."feature_flag"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feature_flag_user_target" ADD CONSTRAINT "feature_flag_user_target_feature_flag_id_feature_flag_id_fk" FOREIGN KEY ("feature_flag_id") REFERENCES "public"."feature_flag"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feature_flag_user_target" ADD CONSTRAINT "feature_flag_user_target_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kyc_document" ADD CONSTRAINT "kyc_document_kyc_verification_id_kyc_verification_id_fk" FOREIGN KEY ("kyc_verification_id") REFERENCES "public"."kyc_verification"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kyc_document" ADD CONSTRAINT "kyc_document_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kyc_document" ADD CONSTRAINT "kyc_document_verified_by_id_user_id_fk" FOREIGN KEY ("verified_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kyc_document" ADD CONSTRAINT "kyc_document_rejected_by_id_user_id_fk" FOREIGN KEY ("rejected_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kyc_verification" ADD CONSTRAINT "kyc_verification_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kyc_verification" ADD CONSTRAINT "kyc_verification_reviewed_by_id_user_id_fk" FOREIGN KEY ("reviewed_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kyc_verification" ADD CONSTRAINT "kyc_verification_approved_by_id_user_id_fk" FOREIGN KEY ("approved_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kyc_verification" ADD CONSTRAINT "kyc_verification_rejected_by_id_user_id_fk" FOREIGN KEY ("rejected_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kyc_verification_history" ADD CONSTRAINT "kyc_verification_history_kyc_verification_id_kyc_verification_id_fk" FOREIGN KEY ("kyc_verification_id") REFERENCES "public"."kyc_verification"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kyc_verification_history" ADD CONSTRAINT "kyc_verification_history_action_by_id_user_id_fk" FOREIGN KEY ("action_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_call_disposition_call_record_id" ON "call_disposition" USING btree ("call_record_id");--> statement-breakpoint
CREATE INDEX "idx_call_disposition_user_id" ON "call_disposition" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_call_disposition_disposition" ON "call_disposition" USING btree ("disposition");--> statement-breakpoint
CREATE INDEX "idx_call_disposition_follow_up_date" ON "call_disposition" USING btree ("follow_up_date");--> statement-breakpoint
CREATE INDEX "idx_call_recording_call_record_id" ON "call_recording" USING btree ("call_record_id");--> statement-breakpoint
CREATE INDEX "idx_call_recording_user_id" ON "call_recording" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_call_recording_status" ON "call_recording" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_call_recording_expires_at" ON "call_recording" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_call_recording_fusionpbx_call_uuid" ON "call_recording" USING btree ("fusionpbx_call_uuid");--> statement-breakpoint
CREATE INDEX "idx_call_recording_storage_key" ON "call_recording" USING btree ("storage_key");--> statement-breakpoint
CREATE INDEX "idx_call_recording_created_at" ON "call_recording" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_call_recording_retention_policy" ON "call_recording" USING btree ("retention_policy_id");--> statement-breakpoint
CREATE INDEX "idx_call_recording_deletion_scheduled" ON "call_recording" USING btree ("deletion_scheduled_at");--> statement-breakpoint
CREATE INDEX "idx_call_recording_user_status" ON "call_recording" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "idx_access_log_recording_id" ON "call_recording_access_log" USING btree ("recording_id");--> statement-breakpoint
CREATE INDEX "idx_access_log_user_id" ON "call_recording_access_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_access_log_accessed_at" ON "call_recording_access_log" USING btree ("accessed_at");--> statement-breakpoint
CREATE INDEX "idx_access_log_access_type" ON "call_recording_access_log" USING btree ("access_type");--> statement-breakpoint
CREATE INDEX "idx_encryption_key_active" ON "call_recording_encryption_key" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_encryption_key_primary" ON "call_recording_encryption_key" USING btree ("is_primary");--> statement-breakpoint
CREATE INDEX "idx_encryption_key_version" ON "call_recording_encryption_key" USING btree ("key_version");--> statement-breakpoint
CREATE INDEX "idx_retention_policy_active" ON "call_recording_retention_policy" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_retention_policy_default" ON "call_recording_retention_policy" USING btree ("is_default");--> statement-breakpoint
CREATE INDEX "idx_retention_policy_priority" ON "call_recording_retention_policy" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "idx_call_summary_call_record_id" ON "call_summary" USING btree ("call_record_id");--> statement-breakpoint
CREATE INDEX "idx_call_summary_user_id" ON "call_summary" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_call_summary_status" ON "call_summary" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_call_summary_sentiment" ON "call_summary" USING btree ("sentiment");--> statement-breakpoint
CREATE INDEX "idx_call_summary_created_at" ON "call_summary" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_call_summary_user_created" ON "call_summary" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_call_task_call_record_id" ON "call_task" USING btree ("call_record_id");--> statement-breakpoint
CREATE INDEX "idx_call_task_user_id" ON "call_task" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_call_task_assigned_to" ON "call_task" USING btree ("assigned_to");--> statement-breakpoint
CREATE INDEX "idx_call_task_status" ON "call_task" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_call_task_priority" ON "call_task" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "idx_call_task_due_date" ON "call_task" USING btree ("due_date");--> statement-breakpoint
CREATE INDEX "idx_feature_flag_flag_name" ON "feature_flag" USING btree ("flag_name");--> statement-breakpoint
CREATE INDEX "idx_feature_flag_enabled" ON "feature_flag" USING btree ("enabled");--> statement-breakpoint
CREATE INDEX "idx_feature_flag_rollout_strategy" ON "feature_flag" USING btree ("rollout_strategy");--> statement-breakpoint
CREATE INDEX "idx_feature_flag_role_target_flag_id" ON "feature_flag_role_target" USING btree ("feature_flag_id");--> statement-breakpoint
CREATE INDEX "idx_feature_flag_role_target_role" ON "feature_flag_role_target" USING btree ("role");--> statement-breakpoint
CREATE INDEX "idx_feature_flag_role_target_flag_role" ON "feature_flag_role_target" USING btree ("feature_flag_id","role");--> statement-breakpoint
CREATE INDEX "idx_feature_flag_user_target_flag_id" ON "feature_flag_user_target" USING btree ("feature_flag_id");--> statement-breakpoint
CREATE INDEX "idx_feature_flag_user_target_user_id" ON "feature_flag_user_target" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_feature_flag_user_target_flag_user" ON "feature_flag_user_target" USING btree ("feature_flag_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_kyc_document_verification_id" ON "kyc_document" USING btree ("kyc_verification_id");--> statement-breakpoint
CREATE INDEX "idx_kyc_document_user_id" ON "kyc_document" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_kyc_document_type" ON "kyc_document" USING btree ("document_type");--> statement-breakpoint
CREATE INDEX "idx_kyc_document_status" ON "kyc_document" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_kyc_document_uploaded_at" ON "kyc_document" USING btree ("uploaded_at");--> statement-breakpoint
CREATE INDEX "idx_kyc_document_verified_at" ON "kyc_document" USING btree ("verified_at");--> statement-breakpoint
CREATE INDEX "idx_kyc_tier_config_tier_level" ON "kyc_tier_config" USING btree ("tier_level");--> statement-breakpoint
CREATE INDEX "idx_kyc_tier_config_is_active" ON "kyc_tier_config" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_kyc_tier_config_priority" ON "kyc_tier_config" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "idx_kyc_verification_user_id" ON "kyc_verification" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_kyc_verification_status" ON "kyc_verification" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_kyc_verification_tier_level" ON "kyc_verification" USING btree ("tier_level");--> statement-breakpoint
CREATE INDEX "idx_kyc_verification_submitted_at" ON "kyc_verification" USING btree ("submitted_at");--> statement-breakpoint
CREATE INDEX "idx_kyc_verification_approved_at" ON "kyc_verification" USING btree ("approved_at");--> statement-breakpoint
CREATE INDEX "idx_kyc_verification_expires_at" ON "kyc_verification" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_kyc_verification_reviewed_by" ON "kyc_verification" USING btree ("reviewed_by_id");--> statement-breakpoint
CREATE INDEX "idx_kyc_verification_risk_level" ON "kyc_verification" USING btree ("risk_level");--> statement-breakpoint
CREATE INDEX "idx_kyc_verification_external_id" ON "kyc_verification" USING btree ("external_verification_id");--> statement-breakpoint
CREATE INDEX "idx_kyc_verification_created_at" ON "kyc_verification" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_kyc_verification_history_verification_id" ON "kyc_verification_history" USING btree ("kyc_verification_id");--> statement-breakpoint
CREATE INDEX "idx_kyc_verification_history_action" ON "kyc_verification_history" USING btree ("action");--> statement-breakpoint
CREATE INDEX "idx_kyc_verification_history_action_by" ON "kyc_verification_history" USING btree ("action_by_id");--> statement-breakpoint
CREATE INDEX "idx_kyc_verification_history_action_at" ON "kyc_verification_history" USING btree ("action_at");--> statement-breakpoint
CREATE INDEX "idx_unified_inbox_thread_priority" ON "unified_inbox_thread" USING btree ("user_id","priority_score");--> statement-breakpoint
CREATE INDEX "idx_unified_inbox_thread_high_priority" ON "unified_inbox_thread" USING btree ("user_id","is_high_priority");