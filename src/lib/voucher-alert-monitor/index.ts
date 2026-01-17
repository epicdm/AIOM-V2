/**
 * Voucher Alert Monitor
 *
 * Service that monitors expenses awaiting receipts and sends reminder notifications.
 * Escalates overdue reconciliations to approvers.
 *
 * @module voucher-alert-monitor
 */

export {
  VoucherAlertMonitorService,
  getVoucherAlertMonitorService,
  processVoucherAlerts,
} from "./service";

export type {
  VoucherAlertType,
  VoucherAlertProcessResult,
  VoucherAlertDeliveryResult,
  VoucherAlertNotification,
  VoucherAlertStats,
} from "./types";
