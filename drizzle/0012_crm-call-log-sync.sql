CREATE TABLE "crm_call_log_sync" (
	"id" text PRIMARY KEY NOT NULL,
	"call_record_id" text NOT NULL,
	"user_id" text NOT NULL,
	"status" text NOT NULL,
	"odoo_partner_id" integer,
	"odoo_lead_id" integer,
	"odoo_activity_id" integer,
	"odoo_message_id" integer,
	"partner_name" text,
	"partner_phone" text,
	"partner_email" text,
	"lead_name" text,
	"sync_attempts" integer NOT NULL,
	"last_sync_attempt" timestamp,
	"synced_at" timestamp,
	"last_error" text,
	"last_error_code" text,
	"sync_options" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "qr_payment_request" (
	"id" text PRIMARY KEY NOT NULL,
	"qr_code" text NOT NULL,
	"short_code" text,
	"type" text NOT NULL,
	"merchant_id" text NOT NULL,
	"merchant_info" text NOT NULL,
	"amount" text NOT NULL,
	"currency" text NOT NULL,
	"min_amount" text,
	"max_amount" text,
	"fee_amount" text NOT NULL,
	"fee_type" text NOT NULL,
	"fee_percentage" text,
	"status" text NOT NULL,
	"expires_at" timestamp,
	"is_expired" boolean NOT NULL,
	"description" text,
	"reference" text,
	"payment_attempts" text,
	"attempt_count" integer NOT NULL,
	"paid_at" timestamp,
	"paid_by" text,
	"payer_wallet_id" text,
	"transaction_id" text,
	"paid_amount" text,
	"paid_currency" text,
	"refunded_amount" text NOT NULL,
	"refunds" text,
	"is_fully_refunded" boolean NOT NULL,
	"metadata" text,
	"idempotency_key" text,
	"qr_code_image_url" text,
	"qr_code_format" text NOT NULL,
	"notify_merchant_on_payment" boolean NOT NULL,
	"notify_payer_on_payment" boolean NOT NULL,
	"merchant_notified_at" timestamp,
	"payer_notified_at" timestamp,
	"cancelled_at" timestamp,
	"cancelled_by" text,
	"cancellation_reason" text,
	"last_error" text,
	"last_error_at" timestamp,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "qr_payment_request_qr_code_unique" UNIQUE("qr_code"),
	CONSTRAINT "qr_payment_request_short_code_unique" UNIQUE("short_code"),
	CONSTRAINT "qr_payment_request_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
ALTER TABLE "crm_call_log_sync" ADD CONSTRAINT "crm_call_log_sync_call_record_id_call_record_id_fk" FOREIGN KEY ("call_record_id") REFERENCES "public"."call_record"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_call_log_sync" ADD CONSTRAINT "crm_call_log_sync_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qr_payment_request" ADD CONSTRAINT "qr_payment_request_merchant_id_user_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qr_payment_request" ADD CONSTRAINT "qr_payment_request_paid_by_user_id_fk" FOREIGN KEY ("paid_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qr_payment_request" ADD CONSTRAINT "qr_payment_request_payer_wallet_id_user_wallet_id_fk" FOREIGN KEY ("payer_wallet_id") REFERENCES "public"."user_wallet"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qr_payment_request" ADD CONSTRAINT "qr_payment_request_transaction_id_wallet_transaction_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."wallet_transaction"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qr_payment_request" ADD CONSTRAINT "qr_payment_request_cancelled_by_user_id_fk" FOREIGN KEY ("cancelled_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_crm_call_log_sync_call_record_id" ON "crm_call_log_sync" USING btree ("call_record_id");--> statement-breakpoint
CREATE INDEX "idx_crm_call_log_sync_user_id" ON "crm_call_log_sync" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_crm_call_log_sync_status" ON "crm_call_log_sync" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_crm_call_log_sync_user_status" ON "crm_call_log_sync" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "idx_crm_call_log_sync_odoo_partner_id" ON "crm_call_log_sync" USING btree ("odoo_partner_id");--> statement-breakpoint
CREATE INDEX "idx_crm_call_log_sync_odoo_lead_id" ON "crm_call_log_sync" USING btree ("odoo_lead_id");--> statement-breakpoint
CREATE INDEX "idx_crm_call_log_sync_created_at" ON "crm_call_log_sync" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_crm_call_log_sync_synced_at" ON "crm_call_log_sync" USING btree ("synced_at");--> statement-breakpoint
CREATE INDEX "idx_crm_call_log_sync_pending" ON "crm_call_log_sync" USING btree ("status","sync_attempts");--> statement-breakpoint
CREATE INDEX "idx_qr_payment_qr_code" ON "qr_payment_request" USING btree ("qr_code");--> statement-breakpoint
CREATE INDEX "idx_qr_payment_short_code" ON "qr_payment_request" USING btree ("short_code");--> statement-breakpoint
CREATE INDEX "idx_qr_payment_merchant_id" ON "qr_payment_request" USING btree ("merchant_id");--> statement-breakpoint
CREATE INDEX "idx_qr_payment_merchant_status" ON "qr_payment_request" USING btree ("merchant_id","status");--> statement-breakpoint
CREATE INDEX "idx_qr_payment_merchant_created" ON "qr_payment_request" USING btree ("merchant_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_qr_payment_status" ON "qr_payment_request" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_qr_payment_expires_at" ON "qr_payment_request" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_qr_payment_status_expires" ON "qr_payment_request" USING btree ("status","expires_at");--> statement-breakpoint
CREATE INDEX "idx_qr_payment_paid_by" ON "qr_payment_request" USING btree ("paid_by");--> statement-breakpoint
CREATE INDEX "idx_qr_payment_payer_wallet" ON "qr_payment_request" USING btree ("payer_wallet_id");--> statement-breakpoint
CREATE INDEX "idx_qr_payment_transaction_id" ON "qr_payment_request" USING btree ("transaction_id");--> statement-breakpoint
CREATE INDEX "idx_qr_payment_created_at" ON "qr_payment_request" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_qr_payment_paid_at" ON "qr_payment_request" USING btree ("paid_at");--> statement-breakpoint
CREATE INDEX "idx_qr_payment_reference" ON "qr_payment_request" USING btree ("reference");