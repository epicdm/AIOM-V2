-- Migration: Add role field to user table
-- Description: Database schema extension adding role field to users table with enum values (md, field-tech, admin, sales)

-- Add the role column to the user table
ALTER TABLE "user" ADD COLUMN "role" text;

-- Create an index on the role field for efficient role-based queries
CREATE INDEX IF NOT EXISTS "idx_user_role" ON "user" ("role");

-- Add a check constraint to ensure only valid roles are stored
-- Valid roles: md, field-tech, admin, sales
ALTER TABLE "user" ADD CONSTRAINT "user_role_check"
  CHECK ("role" IS NULL OR "role" IN ('md', 'field-tech', 'admin', 'sales'));

-- Comment on the column for documentation
COMMENT ON COLUMN "user"."role" IS 'User role for role-based access control. Valid values: md, field-tech, admin, sales';
