/**
 * Demo Environment Module
 *
 * Main export file for the demo environment feature.
 */

// Types
export * from "./types";

// Service functions
export {
  authenticateDemoUser,
  validateDemoSession,
  getDemoSessionById,
  endDemoSession,
  cleanupExpiredSessions,
  logDemoActivity,
  getDemoActivities,
  getAvailableDemoRoles,
  isDemoAccount,
  getDemoRestrictions,
} from "./service";

// Data generators
export {
  generatePersonName,
  generateCompanyName,
  generateAddress,
  generateExpenses,
  generateWorkOrders,
  generateCustomers,
  generateTransactions,
  generateDemoDataSet,
  generateDashboardStats,
} from "./data-generator";
