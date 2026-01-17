/**
 * Expense GL Posting Server Functions
 *
 * Server functions for posting approved and reconciled expense vouchers
 * to the General Ledger in Odoo with proper account coding and journal entries.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authenticatedMiddleware } from "./middleware";
import {
  postExpenseVoucherToOdooGL,
  batchPostExpenseVouchersToGL,
  autoPostPendingVouchersToGL,
  reverseExpenseGLPosting,
  getOdooGLPostingStatus,
  getExpenseGLAccounts,
  getExpenseJournals,
  validateGLAccountCode,
} from "~/data-access/expense-gl-posting";
import { findExpenseVoucherById } from "~/data-access/expense-vouchers";

// =============================================================================
// Validation Schemas
// =============================================================================

const postToGLOptionsSchema = z.object({
  postingDate: z.string().optional(),
  journalCode: z.string().optional(),
  apAccountCode: z.string().optional(),
});

const postSingleVoucherSchema = z.object({
  voucherId: z.string(),
  options: postToGLOptionsSchema.optional(),
});

const postBatchVouchersSchema = z.object({
  voucherIds: z.array(z.string()).min(1, "At least one voucher ID is required"),
  options: postToGLOptionsSchema.optional(),
});

const reverseGLPostingSchema = z.object({
  voucherId: z.string(),
  reason: z.string().min(1, "Reason for reversal is required").max(500),
});

const validateAccountCodeSchema = z.object({
  accountCode: z.string().min(1, "Account code is required"),
});

// =============================================================================
// GL Posting Server Functions
// =============================================================================

/**
 * Post a single expense voucher to Odoo GL
 */
export const postExpenseVoucherToGLFn = createServerFn({
  method: "POST",
})
  .inputValidator(postSingleVoucherSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    // Verify the voucher exists and user has permission
    const voucher = await findExpenseVoucherById(data.voucherId);

    if (!voucher) {
      throw new Error("Expense voucher not found");
    }

    // Only approved vouchers can be posted
    if (voucher.status !== "approved") {
      throw new Error(`Only approved vouchers can be posted to GL. Current status: ${voucher.status}`);
    }

    // Check if already posted
    if (voucher.postingStatus === "posted") {
      throw new Error("This voucher has already been posted to the General Ledger");
    }

    const result = await postExpenseVoucherToOdooGL(data.voucherId, {
      ...data.options,
      postedById: context.userId,
    });

    if (!result.success) {
      throw new Error(result.error || "Failed to post voucher to GL");
    }

    return result;
  });

/**
 * Post multiple expense vouchers to Odoo GL in batch
 */
export const batchPostExpenseVouchersToGLFn = createServerFn({
  method: "POST",
})
  .inputValidator(postBatchVouchersSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    // Verify all vouchers exist
    for (const voucherId of data.voucherIds) {
      const voucher = await findExpenseVoucherById(voucherId);
      if (!voucher) {
        throw new Error(`Expense voucher ${voucherId} not found`);
      }
    }

    const result = await batchPostExpenseVouchersToGL(data.voucherIds, {
      ...data.options,
      postedById: context.userId,
    });

    return result;
  });

/**
 * Automatically post all pending approved vouchers to GL
 * This is typically called by a scheduled job or admin action
 */
export const autoPostPendingVouchersToGLFn = createServerFn({
  method: "POST",
})
  .inputValidator(postToGLOptionsSchema.optional())
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const result = await autoPostPendingVouchersToGL({
      ...data,
      postedById: context.userId,
    });

    return result;
  });

/**
 * Reverse a GL posting for an expense voucher
 */
export const reverseExpenseGLPostingFn = createServerFn({
  method: "POST",
})
  .inputValidator(reverseGLPostingSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const voucher = await findExpenseVoucherById(data.voucherId);

    if (!voucher) {
      throw new Error("Expense voucher not found");
    }

    if (voucher.postingStatus !== "posted") {
      throw new Error("Only posted vouchers can have their GL posting reversed");
    }

    const result = await reverseExpenseGLPosting(data.voucherId, data.reason, context.userId);

    if (!result.success) {
      throw new Error(result.error || "Failed to reverse GL posting");
    }

    return result;
  });

/**
 * Get the GL posting status from Odoo for a voucher
 */
export const getExpenseGLPostingStatusFn = createServerFn({
  method: "GET",
})
  .inputValidator(z.object({ voucherId: z.string() }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    return getOdooGLPostingStatus(data.voucherId);
  });

// =============================================================================
// GL Account & Journal Lookup Functions
// =============================================================================

/**
 * Get available GL accounts for expense coding
 */
export const getExpenseGLAccountsFn = createServerFn({
  method: "GET",
})
  .middleware([authenticatedMiddleware])
  .handler(async () => {
    return getExpenseGLAccounts();
  });

/**
 * Get available journals for expense posting
 */
export const getExpenseJournalsFn = createServerFn({
  method: "GET",
})
  .middleware([authenticatedMiddleware])
  .handler(async () => {
    return getExpenseJournals();
  });

/**
 * Validate a GL account code exists in Odoo
 */
export const validateGLAccountCodeFn = createServerFn({
  method: "GET",
})
  .inputValidator(validateAccountCodeSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    const account = await validateGLAccountCode(data.accountCode);
    return {
      valid: account !== null,
      account,
    };
  });

// =============================================================================
// Automatic Posting Trigger
// =============================================================================

/**
 * Trigger automatic GL posting for a voucher after approval
 * This is called internally after an expense voucher is approved
 */
export async function triggerAutoGLPostingAfterApproval(
  voucherId: string,
  autoPostEnabled: boolean = true
): Promise<void> {
  if (!autoPostEnabled) {
    return;
  }

  try {
    const voucher = await findExpenseVoucherById(voucherId);

    if (!voucher || voucher.status !== "approved") {
      return;
    }

    // Only auto-post if reconciled or if auto-posting before reconciliation is enabled
    // For now, we'll auto-post approved vouchers
    await postExpenseVoucherToOdooGL(voucherId, {
      postedById: "system",
    });
  } catch (error) {
    // Log the error but don't throw - auto-posting failure shouldn't block approval
    console.error(`Auto GL posting failed for voucher ${voucherId}:`, error);
  }
}

/**
 * Trigger automatic GL posting after reconciliation
 * This is called when a voucher is reconciled
 */
export async function triggerAutoGLPostingAfterReconciliation(
  voucherId: string
): Promise<void> {
  try {
    const voucher = await findExpenseVoucherById(voucherId);

    if (!voucher || voucher.status !== "approved") {
      return;
    }

    // Only post if not already posted
    if (voucher.postingStatus === "posted") {
      return;
    }

    await postExpenseVoucherToOdooGL(voucherId, {
      postedById: "system",
    });
  } catch (error) {
    console.error(`Auto GL posting after reconciliation failed for voucher ${voucherId}:`, error);
  }
}
