CREATE TABLE "expense_voucher" (
	"id" text PRIMARY KEY NOT NULL,
	"voucher_number" text NOT NULL,
	"expense_request_id" text,
	"amount" text NOT NULL,
	"currency" text NOT NULL,
	"description" text NOT NULL,
	"vendor_name" text,
	"vendor_id" text,
	"gl_account_code" text,
	"gl_account_name" text,
	"cost_center" text,
	"department" text,
	"project_code" text,
	"submitter_id" text NOT NULL,
	"current_approver_id" text,
	"final_approver_id" text,
	"approval_chain" text,
	"current_approval_step" integer NOT NULL,
	"total_approval_steps" integer NOT NULL,
	"status" text NOT NULL,
	"reconciliation_status" text NOT NULL,
	"posting_status" text NOT NULL,
	"gl_posting_date" timestamp,
	"gl_journal_entry_id" text,
	"gl_posting_reference" text,
	"gl_posting_error" text,
	"reconciliation_date" timestamp,
	"reconciliation_reference" text,
	"reconciled_by_id" text,
	"reconciliation_notes" text,
	"payment_method" text,
	"payment_reference" text,
	"payment_date" timestamp,
	"bank_account_id" text,
	"receipt_attachments" text,
	"notes" text,
	"external_reference" text,
	"tags" text,
	"rejection_reason" text,
	"rejected_by_id" text,
	"rejected_at" timestamp,
	"voided_by_id" text,
	"voided_at" timestamp,
	"void_reason" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"submitted_at" timestamp,
	"approved_at" timestamp,
	"posted_at" timestamp,
	CONSTRAINT "expense_voucher_voucher_number_unique" UNIQUE("voucher_number")
);
--> statement-breakpoint
CREATE TABLE "expense_voucher_approval_history" (
	"id" text PRIMARY KEY NOT NULL,
	"voucher_id" text NOT NULL,
	"approver_id" text NOT NULL,
	"approver_role" text,
	"action" text NOT NULL,
	"step_number" integer NOT NULL,
	"comments" text,
	"previous_status" text,
	"new_status" text,
	"action_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expense_voucher_line_item" (
	"id" text PRIMARY KEY NOT NULL,
	"voucher_id" text NOT NULL,
	"line_number" integer NOT NULL,
	"description" text NOT NULL,
	"amount" text NOT NULL,
	"quantity" text NOT NULL,
	"unit_price" text,
	"gl_account_code" text,
	"gl_account_name" text,
	"cost_center" text,
	"department" text,
	"project_code" text,
	"tax_code" text,
	"tax_amount" text,
	"tax_rate" text,
	"expense_category" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "expense_voucher" ADD CONSTRAINT "expense_voucher_expense_request_id_expense_request_id_fk" FOREIGN KEY ("expense_request_id") REFERENCES "public"."expense_request"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_voucher" ADD CONSTRAINT "expense_voucher_submitter_id_user_id_fk" FOREIGN KEY ("submitter_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_voucher" ADD CONSTRAINT "expense_voucher_current_approver_id_user_id_fk" FOREIGN KEY ("current_approver_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_voucher" ADD CONSTRAINT "expense_voucher_final_approver_id_user_id_fk" FOREIGN KEY ("final_approver_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_voucher" ADD CONSTRAINT "expense_voucher_reconciled_by_id_user_id_fk" FOREIGN KEY ("reconciled_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_voucher" ADD CONSTRAINT "expense_voucher_rejected_by_id_user_id_fk" FOREIGN KEY ("rejected_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_voucher" ADD CONSTRAINT "expense_voucher_voided_by_id_user_id_fk" FOREIGN KEY ("voided_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_voucher_approval_history" ADD CONSTRAINT "expense_voucher_approval_history_voucher_id_expense_voucher_id_fk" FOREIGN KEY ("voucher_id") REFERENCES "public"."expense_voucher"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_voucher_approval_history" ADD CONSTRAINT "expense_voucher_approval_history_approver_id_user_id_fk" FOREIGN KEY ("approver_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_voucher_line_item" ADD CONSTRAINT "expense_voucher_line_item_voucher_id_expense_voucher_id_fk" FOREIGN KEY ("voucher_id") REFERENCES "public"."expense_voucher"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_expense_voucher_voucher_number" ON "expense_voucher" USING btree ("voucher_number");--> statement-breakpoint
CREATE INDEX "idx_expense_voucher_expense_request_id" ON "expense_voucher" USING btree ("expense_request_id");--> statement-breakpoint
CREATE INDEX "idx_expense_voucher_submitter_id" ON "expense_voucher" USING btree ("submitter_id");--> statement-breakpoint
CREATE INDEX "idx_expense_voucher_current_approver_id" ON "expense_voucher" USING btree ("current_approver_id");--> statement-breakpoint
CREATE INDEX "idx_expense_voucher_status" ON "expense_voucher" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_expense_voucher_reconciliation_status" ON "expense_voucher" USING btree ("reconciliation_status");--> statement-breakpoint
CREATE INDEX "idx_expense_voucher_posting_status" ON "expense_voucher" USING btree ("posting_status");--> statement-breakpoint
CREATE INDEX "idx_expense_voucher_gl_account_code" ON "expense_voucher" USING btree ("gl_account_code");--> statement-breakpoint
CREATE INDEX "idx_expense_voucher_created_at" ON "expense_voucher" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_expense_voucher_vendor_id" ON "expense_voucher" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX "idx_expense_voucher_approval_history_voucher_id" ON "expense_voucher_approval_history" USING btree ("voucher_id");--> statement-breakpoint
CREATE INDEX "idx_expense_voucher_approval_history_approver_id" ON "expense_voucher_approval_history" USING btree ("approver_id");--> statement-breakpoint
CREATE INDEX "idx_expense_voucher_approval_history_action_at" ON "expense_voucher_approval_history" USING btree ("action_at");--> statement-breakpoint
CREATE INDEX "idx_expense_voucher_line_item_voucher_id" ON "expense_voucher_line_item" USING btree ("voucher_id");--> statement-breakpoint
CREATE INDEX "idx_expense_voucher_line_item_gl_account" ON "expense_voucher_line_item" USING btree ("gl_account_code");--> statement-breakpoint
CREATE INDEX "idx_expense_voucher_line_item_line_number" ON "expense_voucher_line_item" USING btree ("voucher_id","line_number");