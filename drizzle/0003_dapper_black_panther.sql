CREATE TABLE "delivery_tracking" (
	"id" text PRIMARY KEY NOT NULL,
	"push_message_id" text NOT NULL,
	"device_token_id" text NOT NULL,
	"status" text NOT NULL,
	"provider_message_id" text,
	"provider_response" text,
	"sent_at" timestamp,
	"delivered_at" timestamp,
	"failed_at" timestamp,
	"error_code" text,
	"error_message" text,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "device_token" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token_type" text NOT NULL,
	"token" text NOT NULL,
	"web_push_keys" text,
	"device_name" text,
	"device_platform" text,
	"browser_info" text,
	"is_active" boolean NOT NULL,
	"last_used_at" timestamp NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"content" text,
	"related_id" text,
	"related_type" text,
	"is_read" boolean NOT NULL,
	"read_at" timestamp,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "push_message" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"notification_id" text,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"icon" text,
	"badge" text,
	"image" text,
	"click_action" text,
	"data" text,
	"scheduled_at" timestamp,
	"status" text NOT NULL,
	"priority" text NOT NULL,
	"processed_at" timestamp,
	"error_message" text,
	"retry_count" integer NOT NULL,
	"max_retries" integer NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "delivery_tracking" ADD CONSTRAINT "delivery_tracking_push_message_id_push_message_id_fk" FOREIGN KEY ("push_message_id") REFERENCES "public"."push_message"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_tracking" ADD CONSTRAINT "delivery_tracking_device_token_id_device_token_id_fk" FOREIGN KEY ("device_token_id") REFERENCES "public"."device_token"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_token" ADD CONSTRAINT "device_token_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_message" ADD CONSTRAINT "push_message_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_message" ADD CONSTRAINT "push_message_notification_id_notification_id_fk" FOREIGN KEY ("notification_id") REFERENCES "public"."notification"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_delivery_tracking_message" ON "delivery_tracking" USING btree ("push_message_id");--> statement-breakpoint
CREATE INDEX "idx_delivery_tracking_device" ON "delivery_tracking" USING btree ("device_token_id");--> statement-breakpoint
CREATE INDEX "idx_delivery_tracking_status" ON "delivery_tracking" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_device_token_user_id" ON "device_token" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_device_token_type" ON "device_token" USING btree ("token_type");--> statement-breakpoint
CREATE INDEX "idx_device_token_active" ON "device_token" USING btree ("user_id","is_active");--> statement-breakpoint
CREATE INDEX "idx_device_token_token" ON "device_token" USING btree ("token");--> statement-breakpoint
CREATE INDEX "idx_notification_user_id" ON "notification" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_notification_is_read" ON "notification" USING btree ("user_id","is_read");--> statement-breakpoint
CREATE INDEX "idx_notification_created_at" ON "notification" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_push_message_user_id" ON "push_message" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_push_message_status" ON "push_message" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_push_message_scheduled" ON "push_message" USING btree ("scheduled_at");--> statement-breakpoint
CREATE INDEX "idx_push_message_notification" ON "push_message" USING btree ("notification_id");