CREATE TABLE "conversation" (
	"id" text PRIMARY KEY NOT NULL,
	"participant1_id" text NOT NULL,
	"participant2_id" text NOT NULL,
	"last_message_at" timestamp,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "message" (
	"id" text PRIMARY KEY NOT NULL,
	"conversation_id" text NOT NULL,
	"sender_id" text NOT NULL,
	"content" text NOT NULL,
	"is_read" boolean NOT NULL,
	"read_at" timestamp,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "unified_inbox_thread" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"source_type" text NOT NULL,
	"source_id" text NOT NULL,
	"title" text NOT NULL,
	"subtitle" text,
	"avatar_url" text,
	"status" text NOT NULL,
	"unread_count" integer NOT NULL,
	"last_message_at" timestamp,
	"last_message_preview" text,
	"is_pinned" boolean NOT NULL,
	"is_muted" boolean NOT NULL,
	"last_synced_at" timestamp NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_participant1_id_user_id_fk" FOREIGN KEY ("participant1_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_participant2_id_user_id_fk" FOREIGN KEY ("participant2_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message" ADD CONSTRAINT "message_conversation_id_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message" ADD CONSTRAINT "message_sender_id_user_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unified_inbox_thread" ADD CONSTRAINT "unified_inbox_thread_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_conversation_participant1_id" ON "conversation" USING btree ("participant1_id");--> statement-breakpoint
CREATE INDEX "idx_conversation_participant2_id" ON "conversation" USING btree ("participant2_id");--> statement-breakpoint
CREATE INDEX "idx_conversation_last_message_at" ON "conversation" USING btree ("last_message_at");--> statement-breakpoint
CREATE INDEX "idx_conversation_participants" ON "conversation" USING btree ("participant1_id","participant2_id");--> statement-breakpoint
CREATE INDEX "idx_message_conversation_id" ON "message" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "idx_message_sender_id" ON "message" USING btree ("sender_id");--> statement-breakpoint
CREATE INDEX "idx_message_created_at" ON "message" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_message_is_read" ON "message" USING btree ("is_read");--> statement-breakpoint
CREATE INDEX "idx_message_conversation_created" ON "message" USING btree ("conversation_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_unified_inbox_thread_user_id" ON "unified_inbox_thread" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_unified_inbox_thread_source" ON "unified_inbox_thread" USING btree ("source_type","source_id");--> statement-breakpoint
CREATE INDEX "idx_unified_inbox_thread_user_source" ON "unified_inbox_thread" USING btree ("user_id","source_type");--> statement-breakpoint
CREATE INDEX "idx_unified_inbox_thread_status" ON "unified_inbox_thread" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_unified_inbox_thread_last_message" ON "unified_inbox_thread" USING btree ("last_message_at");--> statement-breakpoint
CREATE INDEX "idx_unified_inbox_thread_user_pinned" ON "unified_inbox_thread" USING btree ("user_id","is_pinned");--> statement-breakpoint
CREATE INDEX "idx_unified_inbox_thread_unread" ON "unified_inbox_thread" USING btree ("user_id","unread_count");