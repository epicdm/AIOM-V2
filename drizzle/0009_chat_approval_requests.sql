CREATE TABLE "chat_approval_request" (
	"id" text PRIMARY KEY NOT NULL,
	"conversation_id" text NOT NULL,
	"message_id" text NOT NULL,
	"requester_id" text NOT NULL,
	"approver_id" text,
	"approval_type" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"amount" text,
	"currency" text,
	"status" text NOT NULL,
	"response_comment" text,
	"responded_at" timestamp,
	"metadata" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"expires_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "chat_approval_thread" (
	"id" text PRIMARY KEY NOT NULL,
	"approval_request_id" text NOT NULL,
	"user_id" text NOT NULL,
	"is_read" boolean NOT NULL,
	"read_at" timestamp,
	"notification_type" text NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chat_approval_request" ADD CONSTRAINT "chat_approval_request_conversation_id_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_approval_request" ADD CONSTRAINT "chat_approval_request_message_id_message_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."message"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_approval_request" ADD CONSTRAINT "chat_approval_request_requester_id_user_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_approval_request" ADD CONSTRAINT "chat_approval_request_approver_id_user_id_fk" FOREIGN KEY ("approver_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_approval_thread" ADD CONSTRAINT "chat_approval_thread_approval_request_id_chat_approval_request_id_fk" FOREIGN KEY ("approval_request_id") REFERENCES "public"."chat_approval_request"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_approval_thread" ADD CONSTRAINT "chat_approval_thread_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_chat_approval_conversation_id" ON "chat_approval_request" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "idx_chat_approval_message_id" ON "chat_approval_request" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "idx_chat_approval_requester_id" ON "chat_approval_request" USING btree ("requester_id");--> statement-breakpoint
CREATE INDEX "idx_chat_approval_approver_id" ON "chat_approval_request" USING btree ("approver_id");--> statement-breakpoint
CREATE INDEX "idx_chat_approval_status" ON "chat_approval_request" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_chat_approval_type" ON "chat_approval_request" USING btree ("approval_type");--> statement-breakpoint
CREATE INDEX "idx_chat_approval_created_at" ON "chat_approval_request" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_chat_approval_thread_request_id" ON "chat_approval_thread" USING btree ("approval_request_id");--> statement-breakpoint
CREATE INDEX "idx_chat_approval_thread_user_id" ON "chat_approval_thread" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_chat_approval_thread_is_read" ON "chat_approval_thread" USING btree ("user_id","is_read");