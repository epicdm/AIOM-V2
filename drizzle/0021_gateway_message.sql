CREATE TABLE "event" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp NOT NULL,
	"event_link" text,
	"event_type" text NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gateway_message" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"channel" text NOT NULL,
	"external_chat_id" text NOT NULL,
	"external_user_id" text NOT NULL,
	"external_message_id" text,
	"dedupe_key" text NOT NULL,
	"text" text,
	"raw" jsonb NOT NULL,
	"received_at" timestamp NOT NULL,
	"created_at" timestamp NOT NULL,
	CONSTRAINT "gateway_message_dedupe_key_unique" UNIQUE("dedupe_key")
);
--> statement-breakpoint
ALTER TABLE "event" ADD CONSTRAINT "event_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gateway_message" ADD CONSTRAINT "gateway_message_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_event_start_time" ON "event" USING btree ("start_time");--> statement-breakpoint
CREATE INDEX "idx_event_created_by" ON "event" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "idx_event_type" ON "event" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "idx_gateway_message_tenant_channel_chat" ON "gateway_message" USING btree ("tenant_id","channel","external_chat_id","received_at");--> statement-breakpoint
CREATE INDEX "idx_gateway_message_dedupe_key" ON "gateway_message" USING btree ("dedupe_key");