-- Demo Environment Tables
-- Isolated sandbox environment with synthetic data for demonstrations and testing

-- Demo Session table - For managing demo user sessions (separate from production)
CREATE TABLE IF NOT EXISTS "demo_session" (
  "id" text PRIMARY KEY,
  "demo_user_email" text NOT NULL,
  "demo_user_name" text NOT NULL,
  "demo_user_role" text NOT NULL,
  "token" text NOT NULL UNIQUE,
  "expires_at" timestamp NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "last_accessed_at" timestamp NOT NULL DEFAULT now(),
  "ip_address" text,
  "user_agent" text,
  "actions_count" integer NOT NULL DEFAULT 0
);

-- Demo Data Snapshot table - Tracks synthetic data states
CREATE TABLE IF NOT EXISTS "demo_data_snapshot" (
  "id" text PRIMARY KEY,
  "snapshot_name" text NOT NULL,
  "description" text,
  "data_content" jsonb NOT NULL,
  "data_type" text NOT NULL,
  "version" integer NOT NULL DEFAULT 1,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),
  "is_active" boolean NOT NULL DEFAULT false
);

-- Demo Activity Log table - Track demo user activities for analytics
CREATE TABLE IF NOT EXISTS "demo_activity_log" (
  "id" text PRIMARY KEY,
  "session_id" text NOT NULL REFERENCES "demo_session"("id") ON DELETE CASCADE,
  "action" text NOT NULL,
  "resource_type" text,
  "resource_id" text,
  "metadata" jsonb,
  "created_at" timestamp NOT NULL DEFAULT now()
);

-- Indexes for demo_session
CREATE INDEX IF NOT EXISTS "idx_demo_session_token" ON "demo_session" ("token");
CREATE INDEX IF NOT EXISTS "idx_demo_session_email" ON "demo_session" ("demo_user_email");
CREATE INDEX IF NOT EXISTS "idx_demo_session_expires" ON "demo_session" ("expires_at");

-- Indexes for demo_data_snapshot
CREATE INDEX IF NOT EXISTS "idx_demo_data_snapshot_name" ON "demo_data_snapshot" ("snapshot_name");
CREATE INDEX IF NOT EXISTS "idx_demo_data_snapshot_type" ON "demo_data_snapshot" ("data_type");
CREATE INDEX IF NOT EXISTS "idx_demo_data_snapshot_active" ON "demo_data_snapshot" ("is_active");

-- Indexes for demo_activity_log
CREATE INDEX IF NOT EXISTS "idx_demo_activity_session" ON "demo_activity_log" ("session_id");
CREATE INDEX IF NOT EXISTS "idx_demo_activity_action" ON "demo_activity_log" ("action");
CREATE INDEX IF NOT EXISTS "idx_demo_activity_created" ON "demo_activity_log" ("created_at");
