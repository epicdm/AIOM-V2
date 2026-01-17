CREATE TABLE "ai_conversation" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text,
	"summary" text,
	"status" text NOT NULL,
	"system_prompt" text,
	"context_metadata" text,
	"total_input_tokens" integer NOT NULL,
	"total_output_tokens" integer NOT NULL,
	"model_id" text,
	"last_message_at" timestamp,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"archived_at" timestamp,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "ai_conversation_context" (
	"id" text PRIMARY KEY NOT NULL,
	"conversation_id" text NOT NULL,
	"context_type" text NOT NULL,
	"context_key" text NOT NULL,
	"context_value" text NOT NULL,
	"priority" integer NOT NULL,
	"expires_at" timestamp,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_message" (
	"id" text PRIMARY KEY NOT NULL,
	"conversation_id" text NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"sequence_number" integer NOT NULL,
	"input_tokens" integer,
	"output_tokens" integer,
	"parent_message_id" text,
	"metadata" text,
	"feedback_rating" integer,
	"feedback_text" text,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_tool_call" (
	"id" text PRIMARY KEY NOT NULL,
	"message_id" text NOT NULL,
	"conversation_id" text NOT NULL,
	"tool_name" text NOT NULL,
	"tool_call_id" text,
	"input_arguments" text,
	"output_result" text,
	"status" text NOT NULL,
	"error_message" text,
	"started_at" timestamp,
	"completed_at" timestamp,
	"duration_ms" integer,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_user_preference" (
	"id" text PRIMARY KEY NOT NULL,
	"preferred_model" text,
	"default_system_prompt" text,
	"response_preferences" text,
	"enable_context_memory" boolean NOT NULL,
	"max_context_messages" integer NOT NULL,
	"save_conversation_history" boolean NOT NULL,
	"allow_data_training" boolean NOT NULL,
	"daily_message_limit" integer,
	"monthly_token_limit" integer,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_conversation" ADD CONSTRAINT "ai_conversation_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_conversation_context" ADD CONSTRAINT "ai_conversation_context_conversation_id_ai_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."ai_conversation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_message" ADD CONSTRAINT "ai_message_conversation_id_ai_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."ai_conversation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_tool_call" ADD CONSTRAINT "ai_tool_call_message_id_ai_message_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."ai_message"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_tool_call" ADD CONSTRAINT "ai_tool_call_conversation_id_ai_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."ai_conversation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_user_preference" ADD CONSTRAINT "ai_user_preference_id_user_id_fk" FOREIGN KEY ("id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_ai_conversation_user_id" ON "ai_conversation" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_ai_conversation_status" ON "ai_conversation" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_ai_conversation_created_at" ON "ai_conversation" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_ai_conversation_last_message_at" ON "ai_conversation" USING btree ("last_message_at");--> statement-breakpoint
CREATE INDEX "idx_ai_conversation_user_status" ON "ai_conversation" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "idx_ai_context_conversation_id" ON "ai_conversation_context" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "idx_ai_context_type" ON "ai_conversation_context" USING btree ("context_type");--> statement-breakpoint
CREATE INDEX "idx_ai_context_conversation_type" ON "ai_conversation_context" USING btree ("conversation_id","context_type");--> statement-breakpoint
CREATE INDEX "idx_ai_context_priority" ON "ai_conversation_context" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "idx_ai_context_expires_at" ON "ai_conversation_context" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_ai_message_conversation_id" ON "ai_message" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "idx_ai_message_sequence" ON "ai_message" USING btree ("conversation_id","sequence_number");--> statement-breakpoint
CREATE INDEX "idx_ai_message_created_at" ON "ai_message" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_ai_message_role" ON "ai_message" USING btree ("role");--> statement-breakpoint
CREATE INDEX "idx_ai_message_parent" ON "ai_message" USING btree ("parent_message_id");--> statement-breakpoint
CREATE INDEX "idx_ai_tool_call_message_id" ON "ai_tool_call" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "idx_ai_tool_call_conversation_id" ON "ai_tool_call" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "idx_ai_tool_call_tool_name" ON "ai_tool_call" USING btree ("tool_name");--> statement-breakpoint
CREATE INDEX "idx_ai_tool_call_status" ON "ai_tool_call" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_ai_tool_call_created_at" ON "ai_tool_call" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_ai_user_preference_id" ON "ai_user_preference" USING btree ("id");