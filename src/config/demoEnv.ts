/**
 * Demo Environment Configuration
 *
 * This module provides configuration for the isolated demo/sandbox environment.
 * Demo mode allows users to explore the application with synthetic data
 * without affecting production data.
 */

// Demo environment detection
export const isDemoMode = (): boolean => {
  // Check for demo mode in environment variables
  return process.env.DEMO_MODE === "true" || process.env.VITE_DEMO_MODE === "true";
};

// Demo user credentials configuration
export const DEMO_CREDENTIALS = {
  // Demo account with MD (Managing Director) role
  MD: {
    email: "demo-md@aiom.demo",
    password: "demo123!",
    name: "Demo MD User",
    role: "md" as const,
    description: "Managing Director with full access to reports, approvals, and team management",
  },
  // Demo account with Field Tech role
  FIELD_TECH: {
    email: "demo-tech@aiom.demo",
    password: "demo123!",
    name: "Demo Field Tech",
    role: "field-tech" as const,
    description: "Field technician with access to work orders, inventory, and route planning",
  },
  // Demo account with Sales role
  SALES: {
    email: "demo-sales@aiom.demo",
    password: "demo123!",
    name: "Demo Sales Rep",
    role: "sales" as const,
    description: "Sales representative with access to customer management and sales tools",
  },
  // Demo account with Admin role
  ADMIN: {
    email: "demo-admin@aiom.demo",
    password: "demo123!",
    name: "Demo Admin",
    role: "admin" as const,
    description: "Administrator with full system access and configuration capabilities",
  },
} as const;

// Demo mode feature configuration
export const DEMO_CONFIG = {
  // Session duration for demo users (24 hours)
  sessionDurationMs: 24 * 60 * 60 * 1000,

  // Enable/disable specific features in demo mode
  features: {
    // Disable real payment processing in demo
    payments: false,
    // Disable real email sending in demo
    emails: false,
    // Disable real push notifications in demo
    pushNotifications: false,
    // Disable real external API calls (Odoo, etc.) in demo
    externalAPIs: false,
    // Enable demo data generation
    syntheticData: true,
    // Show demo mode banner
    showBanner: true,
  },

  // Limits for demo environment
  limits: {
    maxExpenseRequests: 50,
    maxTransactions: 100,
    maxWorkOrders: 25,
    maxCustomers: 20,
  },

  // Demo data refresh interval (4 hours)
  dataRefreshIntervalMs: 4 * 60 * 60 * 1000,

  // Synthetic data time range (last 30 days)
  dataTimeRangeDays: 30,
} as const;

// Demo environment namespace for Redis cache
export const DEMO_CACHE_NAMESPACE = "demo:" as const;

// Type exports
export type DemoCredential = (typeof DEMO_CREDENTIALS)[keyof typeof DEMO_CREDENTIALS];
export type DemoRole = DemoCredential["role"];
