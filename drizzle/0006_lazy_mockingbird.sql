CREATE TABLE "contact_sync_log" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"operation_type" text NOT NULL,
	"started_at" timestamp NOT NULL,
	"completed_at" timestamp,
	"status" text NOT NULL,
	"contacts_synced" integer NOT NULL,
	"contacts_created" integer NOT NULL,
	"contacts_updated" integer NOT NULL,
	"contacts_deleted" integer NOT NULL,
	"conflicts_detected" integer NOT NULL,
	"conflicts_resolved" integer NOT NULL,
	"error_message" text,
	"error_details" text,
	"sync_metadata" text
);
--> statement-breakpoint
CREATE TABLE "contact_sync_state" (
	"id" text PRIMARY KEY NOT NULL,
	"last_full_sync_at" timestamp,
	"last_incremental_sync_at" timestamp,
	"last_sync_token" text,
	"auto_sync_enabled" boolean NOT NULL,
	"sync_interval_minutes" integer NOT NULL,
	"sync_on_wifi_only" boolean NOT NULL,
	"sync_customers" boolean NOT NULL,
	"sync_vendors" boolean NOT NULL,
	"sync_companies_only" boolean NOT NULL,
	"total_contacts_synced" integer NOT NULL,
	"pending_conflicts" integer NOT NULL,
	"pending_changes" integer NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dashboard_config" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"role" text,
	"name" text NOT NULL,
	"description" text,
	"widgets" text NOT NULL,
	"layout_config" text,
	"data_sources" text,
	"allowed_widgets" text,
	"is_default" boolean NOT NULL,
	"is_customized" boolean NOT NULL,
	"display_order" integer NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "onboarding_session" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"current_step" text NOT NULL,
	"phone_number" text,
	"phone_verification_id" text,
	"sip_credential_id" text,
	"device_id" text,
	"device_platform" text,
	"device_name" text,
	"session_data" text,
	"is_completed" boolean NOT NULL,
	"completed_at" timestamp,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "phone_verification" (
	"id" text PRIMARY KEY NOT NULL,
	"phone_number" text NOT NULL,
	"otp_code" text NOT NULL,
	"user_id" text,
	"status" text NOT NULL,
	"attempt_count" integer NOT NULL,
	"max_attempts" integer NOT NULL,
	"expires_at" timestamp NOT NULL,
	"verified_at" timestamp,
	"device_id" text,
	"device_platform" text,
	"ip_address" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reloadly_operator_cache" (
	"id" text PRIMARY KEY NOT NULL,
	"operator_id" integer NOT NULL,
	"name" text NOT NULL,
	"country_code" text NOT NULL,
	"country_name" text NOT NULL,
	"bundle" boolean NOT NULL,
	"data" boolean NOT NULL,
	"pin" boolean NOT NULL,
	"denomination_type" text NOT NULL,
	"sender_currency_code" text NOT NULL,
	"destination_currency_code" text NOT NULL,
	"min_amount" text,
	"max_amount" text,
	"local_min_amount" text,
	"local_max_amount" text,
	"fixed_amounts" text,
	"local_fixed_amounts" text,
	"fx_rate" text,
	"commission" text,
	"international_discount" text,
	"logo_urls" text,
	"full_data" text,
	"last_updated_at" timestamp NOT NULL,
	"expires_at" timestamp NOT NULL,
	CONSTRAINT "reloadly_operator_cache_operator_id_unique" UNIQUE("operator_id")
);
--> statement-breakpoint
CREATE TABLE "reloadly_transaction" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"reloadly_transaction_id" text,
	"custom_identifier" text,
	"operator_id" integer NOT NULL,
	"operator_name" text NOT NULL,
	"country_code" text NOT NULL,
	"recipient_phone" text NOT NULL,
	"recipient_country_code" text NOT NULL,
	"sender_phone" text,
	"sender_country_code" text,
	"requested_amount" text NOT NULL,
	"requested_amount_currency" text NOT NULL,
	"delivered_amount" text,
	"delivered_amount_currency" text,
	"use_local_amount" boolean NOT NULL,
	"discount" text,
	"discount_currency" text,
	"status" text NOT NULL,
	"error_code" text,
	"error_message" text,
	"pin_details" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"completed_at" timestamp,
	CONSTRAINT "reloadly_transaction_custom_identifier_unique" UNIQUE("custom_identifier")
);
--> statement-breakpoint
CREATE TABLE "sip_credential" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"sip_username" text NOT NULL,
	"sip_password" text NOT NULL,
	"sip_domain" text NOT NULL,
	"sip_uri" text NOT NULL,
	"phone_number" text NOT NULL,
	"display_name" text,
	"status" text NOT NULL,
	"transport_protocol" text NOT NULL,
	"registration_expires_seconds" integer NOT NULL,
	"codec_preferences" text NOT NULL,
	"stun_turn_config" text,
	"associated_devices" text,
	"provisioned_at" timestamp NOT NULL,
	"provisioned_by" text,
	"last_registration_at" timestamp,
	"last_registration_ip" text,
	"last_registration_user_agent" text,
	"suspended_at" timestamp,
	"suspended_reason" text,
	"revoked_at" timestamp,
	"revoked_reason" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "sip_credential_sip_username_unique" UNIQUE("sip_username")
);
--> statement-breakpoint
CREATE TABLE "synced_contact" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"odoo_partner_id" integer NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"mobile" text,
	"website" text,
	"street" text,
	"street2" text,
	"city" text,
	"state_id" integer,
	"state_name" text,
	"zip" text,
	"country_id" integer,
	"country_name" text,
	"is_company" boolean NOT NULL,
	"company_type" text,
	"parent_id" integer,
	"parent_name" text,
	"job_title" text,
	"vat" text,
	"ref" text,
	"is_customer" boolean NOT NULL,
	"is_vendor" boolean NOT NULL,
	"sync_status" text NOT NULL,
	"last_synced_at" timestamp NOT NULL,
	"odoo_write_date" timestamp,
	"local_version" integer NOT NULL,
	"server_version" integer NOT NULL,
	"has_conflict" boolean NOT NULL,
	"conflict_data" text,
	"full_contact_data" text,
	"pending_changes" text,
	"is_favorite" boolean NOT NULL,
	"tags" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "role" text;--> statement-breakpoint
ALTER TABLE "contact_sync_log" ADD CONSTRAINT "contact_sync_log_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_sync_state" ADD CONSTRAINT "contact_sync_state_id_user_id_fk" FOREIGN KEY ("id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dashboard_config" ADD CONSTRAINT "dashboard_config_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_session" ADD CONSTRAINT "onboarding_session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_session" ADD CONSTRAINT "onboarding_session_phone_verification_id_phone_verification_id_fk" FOREIGN KEY ("phone_verification_id") REFERENCES "public"."phone_verification"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_session" ADD CONSTRAINT "onboarding_session_sip_credential_id_sip_credential_id_fk" FOREIGN KEY ("sip_credential_id") REFERENCES "public"."sip_credential"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "phone_verification" ADD CONSTRAINT "phone_verification_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reloadly_transaction" ADD CONSTRAINT "reloadly_transaction_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sip_credential" ADD CONSTRAINT "sip_credential_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "synced_contact" ADD CONSTRAINT "synced_contact_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_contact_sync_log_user_id" ON "contact_sync_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_contact_sync_log_status" ON "contact_sync_log" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_contact_sync_log_started_at" ON "contact_sync_log" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "idx_contact_sync_log_operation_type" ON "contact_sync_log" USING btree ("operation_type");--> statement-breakpoint
CREATE INDEX "idx_contact_sync_state_id" ON "contact_sync_state" USING btree ("id");--> statement-breakpoint
CREATE INDEX "idx_dashboard_config_user_id" ON "dashboard_config" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_dashboard_config_role" ON "dashboard_config" USING btree ("role");--> statement-breakpoint
CREATE INDEX "idx_dashboard_config_is_default" ON "dashboard_config" USING btree ("is_default");--> statement-breakpoint
CREATE INDEX "idx_dashboard_config_user_role" ON "dashboard_config" USING btree ("user_id","role");--> statement-breakpoint
CREATE INDEX "idx_onboarding_session_user_id" ON "onboarding_session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_onboarding_session_phone_number" ON "onboarding_session" USING btree ("phone_number");--> statement-breakpoint
CREATE INDEX "idx_onboarding_session_device_id" ON "onboarding_session" USING btree ("device_id");--> statement-breakpoint
CREATE INDEX "idx_onboarding_session_current_step" ON "onboarding_session" USING btree ("current_step");--> statement-breakpoint
CREATE INDEX "idx_onboarding_session_is_completed" ON "onboarding_session" USING btree ("is_completed");--> statement-breakpoint
CREATE INDEX "idx_onboarding_session_expires_at" ON "onboarding_session" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_phone_verification_phone_number" ON "phone_verification" USING btree ("phone_number");--> statement-breakpoint
CREATE INDEX "idx_phone_verification_user_id" ON "phone_verification" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_phone_verification_status" ON "phone_verification" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_phone_verification_expires_at" ON "phone_verification" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_phone_verification_created_at" ON "phone_verification" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_reloadly_operator_cache_operator_id" ON "reloadly_operator_cache" USING btree ("operator_id");--> statement-breakpoint
CREATE INDEX "idx_reloadly_operator_cache_country_code" ON "reloadly_operator_cache" USING btree ("country_code");--> statement-breakpoint
CREATE INDEX "idx_reloadly_operator_cache_expires_at" ON "reloadly_operator_cache" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_reloadly_operator_cache_name" ON "reloadly_operator_cache" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_reloadly_transaction_user_id" ON "reloadly_transaction" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_reloadly_transaction_reloadly_id" ON "reloadly_transaction" USING btree ("reloadly_transaction_id");--> statement-breakpoint
CREATE INDEX "idx_reloadly_transaction_custom_id" ON "reloadly_transaction" USING btree ("custom_identifier");--> statement-breakpoint
CREATE INDEX "idx_reloadly_transaction_status" ON "reloadly_transaction" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_reloadly_transaction_recipient_phone" ON "reloadly_transaction" USING btree ("recipient_phone");--> statement-breakpoint
CREATE INDEX "idx_reloadly_transaction_created_at" ON "reloadly_transaction" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_reloadly_transaction_user_status" ON "reloadly_transaction" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "idx_sip_credential_user_id" ON "sip_credential" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_sip_credential_sip_username" ON "sip_credential" USING btree ("sip_username");--> statement-breakpoint
CREATE INDEX "idx_sip_credential_phone_number" ON "sip_credential" USING btree ("phone_number");--> statement-breakpoint
CREATE INDEX "idx_sip_credential_status" ON "sip_credential" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_sip_credential_created_at" ON "sip_credential" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_synced_contact_user_id" ON "synced_contact" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_synced_contact_odoo_partner_id" ON "synced_contact" USING btree ("odoo_partner_id");--> statement-breakpoint
CREATE INDEX "idx_synced_contact_user_odoo" ON "synced_contact" USING btree ("user_id","odoo_partner_id");--> statement-breakpoint
CREATE INDEX "idx_synced_contact_sync_status" ON "synced_contact" USING btree ("sync_status");--> statement-breakpoint
CREATE INDEX "idx_synced_contact_is_customer" ON "synced_contact" USING btree ("is_customer");--> statement-breakpoint
CREATE INDEX "idx_synced_contact_is_vendor" ON "synced_contact" USING btree ("is_vendor");--> statement-breakpoint
CREATE INDEX "idx_synced_contact_has_conflict" ON "synced_contact" USING btree ("has_conflict");--> statement-breakpoint
CREATE INDEX "idx_synced_contact_name" ON "synced_contact" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_synced_contact_updated_at" ON "synced_contact" USING btree ("updated_at");