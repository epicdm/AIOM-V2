CREATE TABLE "briefing_schedule_preference" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"is_enabled" boolean NOT NULL,
	"delivery_time" text NOT NULL,
	"timezone" text NOT NULL,
	"delivery_method" text NOT NULL,
	"days_of_week" text NOT NULL,
	"skip_if_no_updates" boolean NOT NULL,
	"last_delivered_at" timestamp,
	"last_attempted_at" timestamp,
	"consecutive_failures" integer NOT NULL,
	"last_error_message" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "briefing_schedule_preference_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "scheduled_briefing_log" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"briefing_id" text,
	"scheduled_for" timestamp NOT NULL,
	"delivered_at" timestamp,
	"status" text NOT NULL,
	"delivery_method" text NOT NULL,
	"push_message_id" text,
	"error_message" text,
	"skip_reason" text,
	"metadata" text,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_wallet" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"balance" text NOT NULL,
	"available_balance" text NOT NULL,
	"pending_balance" text NOT NULL,
	"currency" text NOT NULL,
	"status" text NOT NULL,
	"kyc_status" text NOT NULL,
	"kyc_level" text NOT NULL,
	"kyc_submitted_at" timestamp,
	"kyc_approved_at" timestamp,
	"kyc_expires_at" timestamp,
	"kyc_documents" text,
	"daily_transaction_limit" text,
	"monthly_transaction_limit" text,
	"single_transaction_limit" text,
	"daily_transaction_total" text NOT NULL,
	"monthly_transaction_total" text NOT NULL,
	"last_limit_reset_date" timestamp,
	"settings" text,
	"status_changed_at" timestamp,
	"status_change_reason" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "user_wallet_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "wallet_audit_log" (
	"id" text PRIMARY KEY NOT NULL,
	"wallet_id" text NOT NULL,
	"action" text NOT NULL,
	"actor_id" text,
	"actor_type" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"transaction_id" text,
	"previous_value" text,
	"new_value" text,
	"change_description" text,
	"metadata" text,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wallet_transaction" (
	"id" text PRIMARY KEY NOT NULL,
	"wallet_id" text NOT NULL,
	"type" text NOT NULL,
	"status" text NOT NULL,
	"amount" text NOT NULL,
	"currency" text NOT NULL,
	"fee" text NOT NULL,
	"fee_currency" text,
	"net_amount" text NOT NULL,
	"balance_before" text NOT NULL,
	"balance_after" text NOT NULL,
	"description" text,
	"reference" text,
	"idempotency_key" text,
	"related_expense_request_id" text,
	"related_expense_voucher_id" text,
	"related_reloadly_transaction_id" text,
	"counterpart_wallet_id" text,
	"counterpart_transaction_id" text,
	"payment_method" text,
	"metadata" text,
	"error_code" text,
	"error_message" text,
	"failed_at" timestamp,
	"reversed_at" timestamp,
	"reversal_reason" text,
	"original_transaction_id" text,
	"initiated_at" timestamp NOT NULL,
	"processed_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "wallet_transaction_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
ALTER TABLE "briefing_schedule_preference" ADD CONSTRAINT "briefing_schedule_preference_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_briefing_log" ADD CONSTRAINT "scheduled_briefing_log_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_briefing_log" ADD CONSTRAINT "scheduled_briefing_log_briefing_id_daily_briefing_id_fk" FOREIGN KEY ("briefing_id") REFERENCES "public"."daily_briefing"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_briefing_log" ADD CONSTRAINT "scheduled_briefing_log_push_message_id_push_message_id_fk" FOREIGN KEY ("push_message_id") REFERENCES "public"."push_message"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_wallet" ADD CONSTRAINT "user_wallet_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_audit_log" ADD CONSTRAINT "wallet_audit_log_wallet_id_user_wallet_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."user_wallet"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_audit_log" ADD CONSTRAINT "wallet_audit_log_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_audit_log" ADD CONSTRAINT "wallet_audit_log_transaction_id_wallet_transaction_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."wallet_transaction"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_transaction" ADD CONSTRAINT "wallet_transaction_wallet_id_user_wallet_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."user_wallet"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_transaction" ADD CONSTRAINT "wallet_transaction_related_expense_request_id_expense_request_id_fk" FOREIGN KEY ("related_expense_request_id") REFERENCES "public"."expense_request"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_transaction" ADD CONSTRAINT "wallet_transaction_related_expense_voucher_id_expense_voucher_id_fk" FOREIGN KEY ("related_expense_voucher_id") REFERENCES "public"."expense_voucher"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_transaction" ADD CONSTRAINT "wallet_transaction_related_reloadly_transaction_id_reloadly_transaction_id_fk" FOREIGN KEY ("related_reloadly_transaction_id") REFERENCES "public"."reloadly_transaction"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_transaction" ADD CONSTRAINT "wallet_transaction_counterpart_wallet_id_user_wallet_id_fk" FOREIGN KEY ("counterpart_wallet_id") REFERENCES "public"."user_wallet"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_briefing_pref_user_id" ON "briefing_schedule_preference" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_briefing_pref_enabled" ON "briefing_schedule_preference" USING btree ("is_enabled");--> statement-breakpoint
CREATE INDEX "idx_briefing_pref_delivery_time" ON "briefing_schedule_preference" USING btree ("delivery_time");--> statement-breakpoint
CREATE INDEX "idx_briefing_pref_timezone" ON "briefing_schedule_preference" USING btree ("timezone");--> statement-breakpoint
CREATE INDEX "idx_scheduled_briefing_log_user_id" ON "scheduled_briefing_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_scheduled_briefing_log_scheduled_for" ON "scheduled_briefing_log" USING btree ("scheduled_for");--> statement-breakpoint
CREATE INDEX "idx_scheduled_briefing_log_status" ON "scheduled_briefing_log" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_scheduled_briefing_log_user_scheduled" ON "scheduled_briefing_log" USING btree ("user_id","scheduled_for");--> statement-breakpoint
CREATE INDEX "idx_user_wallet_user_id" ON "user_wallet" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_wallet_status" ON "user_wallet" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_user_wallet_kyc_status" ON "user_wallet" USING btree ("kyc_status");--> statement-breakpoint
CREATE INDEX "idx_user_wallet_currency" ON "user_wallet" USING btree ("currency");--> statement-breakpoint
CREATE INDEX "idx_wallet_audit_log_wallet_id" ON "wallet_audit_log" USING btree ("wallet_id");--> statement-breakpoint
CREATE INDEX "idx_wallet_audit_log_action" ON "wallet_audit_log" USING btree ("action");--> statement-breakpoint
CREATE INDEX "idx_wallet_audit_log_actor_id" ON "wallet_audit_log" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "idx_wallet_audit_log_created_at" ON "wallet_audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_wallet_audit_log_transaction_id" ON "wallet_audit_log" USING btree ("transaction_id");--> statement-breakpoint
CREATE INDEX "idx_wallet_audit_log_wallet_created" ON "wallet_audit_log" USING btree ("wallet_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_wallet_transaction_wallet_id" ON "wallet_transaction" USING btree ("wallet_id");--> statement-breakpoint
CREATE INDEX "idx_wallet_transaction_type" ON "wallet_transaction" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_wallet_transaction_status" ON "wallet_transaction" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_wallet_transaction_created_at" ON "wallet_transaction" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_wallet_transaction_reference" ON "wallet_transaction" USING btree ("reference");--> statement-breakpoint
CREATE INDEX "idx_wallet_transaction_idempotency" ON "wallet_transaction" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "idx_wallet_transaction_wallet_status" ON "wallet_transaction" USING btree ("wallet_id","status");--> statement-breakpoint
CREATE INDEX "idx_wallet_transaction_wallet_created" ON "wallet_transaction" USING btree ("wallet_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_wallet_transaction_expense_request" ON "wallet_transaction" USING btree ("related_expense_request_id");--> statement-breakpoint
CREATE INDEX "idx_wallet_transaction_expense_voucher" ON "wallet_transaction" USING btree ("related_expense_voucher_id");--> statement-breakpoint
CREATE INDEX "idx_wallet_transaction_reloadly" ON "wallet_transaction" USING btree ("related_reloadly_transaction_id");