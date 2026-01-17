-- FusionPBX Call Recording Service Schema
-- Provides metadata tracking for encrypted call recordings with retention policy enforcement

-- Recording status enum-like values: pending, processing, encrypted, stored, failed, expired, deleted

CREATE TABLE "call_recording" (
	"id" text PRIMARY KEY NOT NULL,
	"call_record_id" text NOT NULL,
	"user_id" text NOT NULL,

	-- FusionPBX reference
	"fusionpbx_recording_id" text,
	"fusionpbx_call_uuid" text,

	-- Storage information
	"storage_provider" text NOT NULL, -- r2, s3, gcs, azure
	"storage_key" text NOT NULL,
	"storage_bucket" text,
	"original_filename" text,
	"file_size" bigint,
	"file_format" text, -- wav, mp3, ogg
	"duration_seconds" integer,
	"sample_rate" integer,
	"channels" integer,

	-- Encryption information
	"is_encrypted" boolean DEFAULT true NOT NULL,
	"encryption_algorithm" text, -- aes-256-gcm
	"encryption_key_id" text, -- Reference to key used (for key rotation)
	"encryption_iv" text, -- Base64 encoded IV
	"content_hash" text, -- SHA-256 hash of original content for integrity verification

	-- Processing status
	"status" text DEFAULT 'pending' NOT NULL,
	"processing_started_at" timestamp,
	"processing_completed_at" timestamp,
	"error_message" text,
	"retry_count" integer DEFAULT 0 NOT NULL,

	-- Retention policy
	"retention_policy_id" text,
	"retention_days" integer NOT NULL,
	"expires_at" timestamp NOT NULL,
	"deletion_scheduled_at" timestamp,
	"deleted_at" timestamp,

	-- Metadata
	"metadata" text, -- JSON blob for additional metadata
	"tags" text, -- Comma-separated tags for search

	-- Standard timestamps
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);

-- Retention Policy Configuration
CREATE TABLE "call_recording_retention_policy" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,

	-- Policy rules
	"retention_days" integer NOT NULL,
	"auto_delete" boolean DEFAULT true NOT NULL,
	"archive_before_delete" boolean DEFAULT false NOT NULL,

	-- Applicable conditions (JSON - can be call direction, duration, user roles, etc.)
	"conditions" text,

	-- Policy priority (lower = higher priority)
	"priority" integer DEFAULT 100 NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,

	-- Standard timestamps
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);

-- Recording Access Log - Audit trail for recording access
CREATE TABLE "call_recording_access_log" (
	"id" text PRIMARY KEY NOT NULL,
	"recording_id" text NOT NULL,
	"user_id" text,

	-- Access details
	"access_type" text NOT NULL, -- download, stream, view_metadata, delete, decrypt
	"ip_address" text,
	"user_agent" text,
	"success" boolean NOT NULL,
	"error_message" text,

	-- Timestamps
	"accessed_at" timestamp NOT NULL
);

-- Encryption Key Registry - For key rotation and management
CREATE TABLE "call_recording_encryption_key" (
	"id" text PRIMARY KEY NOT NULL,
	"key_version" integer NOT NULL,

	-- Key material (encrypted with master key)
	"encrypted_key" text NOT NULL,
	"key_hash" text NOT NULL, -- Hash for quick lookup

	-- Status
	"is_active" boolean DEFAULT true NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL, -- Primary key for new encryptions
	"rotated_at" timestamp,
	"rotated_by" text,

	-- Standard timestamps
	"created_at" timestamp NOT NULL,
	"expires_at" timestamp
);

-- Foreign key constraints
ALTER TABLE "call_recording" ADD CONSTRAINT "call_recording_call_record_id_call_record_id_fk" FOREIGN KEY ("call_record_id") REFERENCES "public"."call_record"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "call_recording" ADD CONSTRAINT "call_recording_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "call_recording" ADD CONSTRAINT "call_recording_retention_policy_id_policy_id_fk" FOREIGN KEY ("retention_policy_id") REFERENCES "public"."call_recording_retention_policy"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "call_recording" ADD CONSTRAINT "call_recording_encryption_key_id_key_id_fk" FOREIGN KEY ("encryption_key_id") REFERENCES "public"."call_recording_encryption_key"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "call_recording_access_log" ADD CONSTRAINT "call_recording_access_log_recording_id_fk" FOREIGN KEY ("recording_id") REFERENCES "public"."call_recording"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "call_recording_access_log" ADD CONSTRAINT "call_recording_access_log_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;

-- Indexes for performance
CREATE INDEX "idx_call_recording_call_record_id" ON "call_recording" USING btree ("call_record_id");
CREATE INDEX "idx_call_recording_user_id" ON "call_recording" USING btree ("user_id");
CREATE INDEX "idx_call_recording_status" ON "call_recording" USING btree ("status");
CREATE INDEX "idx_call_recording_expires_at" ON "call_recording" USING btree ("expires_at");
CREATE INDEX "idx_call_recording_fusionpbx_call_uuid" ON "call_recording" USING btree ("fusionpbx_call_uuid");
CREATE INDEX "idx_call_recording_storage_key" ON "call_recording" USING btree ("storage_key");
CREATE INDEX "idx_call_recording_created_at" ON "call_recording" USING btree ("created_at");
CREATE INDEX "idx_call_recording_retention_policy" ON "call_recording" USING btree ("retention_policy_id");
CREATE INDEX "idx_call_recording_deletion_scheduled" ON "call_recording" USING btree ("deletion_scheduled_at");
CREATE INDEX "idx_call_recording_user_status" ON "call_recording" USING btree ("user_id", "status");

CREATE INDEX "idx_retention_policy_active" ON "call_recording_retention_policy" USING btree ("is_active");
CREATE INDEX "idx_retention_policy_default" ON "call_recording_retention_policy" USING btree ("is_default");
CREATE INDEX "idx_retention_policy_priority" ON "call_recording_retention_policy" USING btree ("priority");

CREATE INDEX "idx_access_log_recording_id" ON "call_recording_access_log" USING btree ("recording_id");
CREATE INDEX "idx_access_log_user_id" ON "call_recording_access_log" USING btree ("user_id");
CREATE INDEX "idx_access_log_accessed_at" ON "call_recording_access_log" USING btree ("accessed_at");
CREATE INDEX "idx_access_log_access_type" ON "call_recording_access_log" USING btree ("access_type");

CREATE INDEX "idx_encryption_key_active" ON "call_recording_encryption_key" USING btree ("is_active");
CREATE INDEX "idx_encryption_key_primary" ON "call_recording_encryption_key" USING btree ("is_primary");
CREATE INDEX "idx_encryption_key_version" ON "call_recording_encryption_key" USING btree ("key_version");
