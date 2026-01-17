/**
 * Demo Data Generator
 *
 * Generates realistic synthetic data for the demo environment.
 * All data is fictional and designed for demonstration purposes.
 */

import { DEMO_CONFIG } from "~/config/demoEnv";
import type {
  DemoExpenseData,
  DemoWorkOrderData,
  DemoCustomerData,
  DemoTransactionData,
  DemoDataConfig,
} from "./types";

// =============================================================================
// Sample Data Pools
// =============================================================================

const FIRST_NAMES = [
  "James", "Mary", "John", "Patricia", "Robert", "Jennifer", "Michael", "Linda",
  "William", "Elizabeth", "David", "Barbara", "Richard", "Susan", "Joseph", "Jessica",
  "Thomas", "Sarah", "Charles", "Karen", "Christopher", "Nancy", "Daniel", "Lisa",
  "Matthew", "Betty", "Anthony", "Margaret", "Donald", "Sandra", "Steven", "Ashley",
];

const LAST_NAMES = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
  "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson",
  "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson",
  "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson", "Walker",
];

const COMPANY_SUFFIXES = ["Corp", "Inc", "LLC", "Ltd", "Industries", "Solutions", "Services", "Tech"];

const STREETS = [
  "Main St", "Oak Ave", "Maple Dr", "Cedar Ln", "Pine Rd", "Elm St", "Washington Ave",
  "Park Blvd", "Commerce Dr", "Industrial Way", "Business Park Rd", "Technology Ln",
];

const CITIES = [
  { city: "New York", state: "NY", zip: "10001" },
  { city: "Los Angeles", state: "CA", zip: "90001" },
  { city: "Chicago", state: "IL", zip: "60601" },
  { city: "Houston", state: "TX", zip: "77001" },
  { city: "Phoenix", state: "AZ", zip: "85001" },
  { city: "Philadelphia", state: "PA", zip: "19101" },
  { city: "San Antonio", state: "TX", zip: "78201" },
  { city: "San Diego", state: "CA", zip: "92101" },
  { city: "Dallas", state: "TX", zip: "75201" },
  { city: "San Jose", state: "CA", zip: "95101" },
];

const EXPENSE_PURPOSES = [
  "Office supplies", "Client meeting lunch", "Travel expenses", "Software subscription",
  "Equipment purchase", "Marketing materials", "Professional development", "Team lunch",
  "Conference registration", "Parking fees", "Fuel reimbursement", "Internet bill",
  "Phone bill", "Printing services", "Courier charges", "Training materials",
];

const WORK_ORDER_TITLES = [
  "Network infrastructure upgrade", "Server maintenance", "Security patch deployment",
  "Database optimization", "Cloud migration phase", "VPN configuration", "Firewall update",
  "Email server maintenance", "Backup system check", "Hardware replacement",
  "Software installation", "User account setup", "Printer configuration", "WiFi expansion",
  "Data center inspection", "System performance audit",
];

const TRANSACTION_CATEGORIES = [
  "Payroll", "Vendor payment", "Client payment", "Utility bill", "Insurance premium",
  "Tax payment", "Equipment lease", "Office rent", "Marketing expense", "Travel reimbursement",
  "Professional fees", "Subscription fees", "Maintenance costs", "Training expenses",
];

// =============================================================================
// Utility Functions
// =============================================================================

function randomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function randomNumber(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDecimal(min: number, max: number, decimals = 2): string {
  const value = Math.random() * (max - min) + min;
  return value.toFixed(decimals);
}

function randomDate(daysAgo: number): Date {
  const now = new Date();
  const pastDate = new Date(now.getTime() - randomNumber(0, daysAgo) * 24 * 60 * 60 * 1000);
  return pastDate;
}

function futureDate(daysAhead: number): Date {
  const now = new Date();
  const future = new Date(now.getTime() + randomNumber(1, daysAhead) * 24 * 60 * 60 * 1000);
  return future;
}

function generateId(): string {
  return `demo_${crypto.randomUUID().split("-")[0]}`;
}

function generatePhone(): string {
  const areaCode = randomNumber(200, 999);
  const prefix = randomNumber(200, 999);
  const line = randomNumber(1000, 9999);
  return `(${areaCode}) ${prefix}-${line}`;
}

function generateEmail(firstName: string, lastName: string): string {
  const domains = ["demo.example.com", "test.demo.com", "sample.demo.org"];
  return `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${randomElement(domains)}`;
}

function generateReference(): string {
  const prefix = randomElement(["INV", "TXN", "PAY", "REC", "ORD"]);
  const number = randomNumber(10000, 99999);
  return `${prefix}-${number}`;
}

// =============================================================================
// Data Generators
// =============================================================================

/**
 * Generate a random person name
 */
export function generatePersonName(): { firstName: string; lastName: string; fullName: string } {
  const firstName = randomElement(FIRST_NAMES);
  const lastName = randomElement(LAST_NAMES);
  return {
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`,
  };
}

/**
 * Generate a random company name
 */
export function generateCompanyName(): string {
  const lastName = randomElement(LAST_NAMES);
  const suffix = randomElement(COMPANY_SUFFIXES);
  return `${lastName} ${suffix}`;
}

/**
 * Generate a random address
 */
export function generateAddress(): string {
  const number = randomNumber(100, 9999);
  const street = randomElement(STREETS);
  const location = randomElement(CITIES);
  return `${number} ${street}, ${location.city}, ${location.state} ${location.zip}`;
}

/**
 * Generate synthetic expense data
 */
export function generateExpenses(count: number = DEMO_CONFIG.limits.maxExpenseRequests): DemoExpenseData[] {
  const expenses: DemoExpenseData[] = [];
  const statuses: DemoExpenseData["status"][] = ["pending", "approved", "rejected", "disbursed"];

  for (let i = 0; i < count; i++) {
    const person = generatePersonName();
    const status = randomElement(statuses);
    const createdAt = randomDate(DEMO_CONFIG.dataTimeRangeDays);

    expenses.push({
      id: generateId(),
      amount: randomDecimal(10, 5000),
      currency: "USD",
      purpose: randomElement(EXPENSE_PURPOSES),
      description: `Demo expense for ${randomElement(EXPENSE_PURPOSES).toLowerCase()}. Created for demonstration purposes.`,
      status,
      createdAt,
      requesterName: person.fullName,
    });
  }

  // Sort by date descending
  return expenses.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

/**
 * Generate synthetic work order data
 */
export function generateWorkOrders(count: number = DEMO_CONFIG.limits.maxWorkOrders): DemoWorkOrderData[] {
  const workOrders: DemoWorkOrderData[] = [];
  const statuses: DemoWorkOrderData["status"][] = ["open", "in_progress", "completed", "cancelled"];
  const priorities: DemoWorkOrderData["priority"][] = ["low", "medium", "high", "urgent"];

  for (let i = 0; i < count; i++) {
    const technician = generatePersonName();
    const customer = generateCompanyName();
    const createdAt = randomDate(DEMO_CONFIG.dataTimeRangeDays);

    workOrders.push({
      id: generateId(),
      title: randomElement(WORK_ORDER_TITLES),
      description: `Demo work order for ${randomElement(WORK_ORDER_TITLES).toLowerCase()}. This is synthetic data for demonstration.`,
      status: randomElement(statuses),
      priority: randomElement(priorities),
      assignedTo: technician.fullName,
      customerName: customer,
      createdAt,
      scheduledDate: futureDate(14),
    });
  }

  return workOrders.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

/**
 * Generate synthetic customer data
 */
export function generateCustomers(count: number = DEMO_CONFIG.limits.maxCustomers): DemoCustomerData[] {
  const customers: DemoCustomerData[] = [];

  for (let i = 0; i < count; i++) {
    const isCompany = Math.random() > 0.5;
    const name = isCompany ? generateCompanyName() : generatePersonName().fullName;
    const nameParts = name.split(" ");

    customers.push({
      id: generateId(),
      name,
      email: generateEmail(nameParts[0], nameParts[nameParts.length - 1]),
      phone: generatePhone(),
      address: generateAddress(),
      createdAt: randomDate(365), // Customers can be older
      totalOrders: randomNumber(1, 50),
      totalSpent: randomDecimal(100, 50000),
    });
  }

  return customers.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

/**
 * Generate synthetic transaction data
 */
export function generateTransactions(count: number = DEMO_CONFIG.limits.maxTransactions): DemoTransactionData[] {
  const transactions: DemoTransactionData[] = [];
  const types: DemoTransactionData["type"][] = ["credit", "debit"];

  for (let i = 0; i < count; i++) {
    const type = randomElement(types);
    const category = randomElement(TRANSACTION_CATEGORIES);

    transactions.push({
      id: generateId(),
      type,
      amount: randomDecimal(50, 10000),
      currency: "USD",
      description: `${type === "credit" ? "Received" : "Paid"}: ${category}`,
      category,
      createdAt: randomDate(DEMO_CONFIG.dataTimeRangeDays),
      reference: generateReference(),
    });
  }

  return transactions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

/**
 * Generate a complete demo data set
 */
export function generateDemoDataSet(config?: Partial<DemoDataConfig>): {
  expenses: DemoExpenseData[];
  workOrders: DemoWorkOrderData[];
  customers: DemoCustomerData[];
  transactions: DemoTransactionData[];
  generatedAt: Date;
} {
  const finalConfig: DemoDataConfig = {
    expenseCount: config?.expenseCount ?? DEMO_CONFIG.limits.maxExpenseRequests,
    workOrderCount: config?.workOrderCount ?? DEMO_CONFIG.limits.maxWorkOrders,
    customerCount: config?.customerCount ?? DEMO_CONFIG.limits.maxCustomers,
    transactionCount: config?.transactionCount ?? DEMO_CONFIG.limits.maxTransactions,
    dateRangeDays: config?.dateRangeDays ?? DEMO_CONFIG.dataTimeRangeDays,
  };

  return {
    expenses: generateExpenses(finalConfig.expenseCount),
    workOrders: generateWorkOrders(finalConfig.workOrderCount),
    customers: generateCustomers(finalConfig.customerCount),
    transactions: generateTransactions(finalConfig.transactionCount),
    generatedAt: new Date(),
  };
}

/**
 * Generate dashboard summary statistics
 */
export function generateDashboardStats(): {
  totalExpenses: number;
  pendingApprovals: number;
  openWorkOrders: number;
  totalCustomers: number;
  monthlyRevenue: string;
  monthlyExpenses: string;
} {
  return {
    totalExpenses: randomNumber(20, 100),
    pendingApprovals: randomNumber(5, 25),
    openWorkOrders: randomNumber(10, 50),
    totalCustomers: randomNumber(50, 200),
    monthlyRevenue: randomDecimal(50000, 200000),
    monthlyExpenses: randomDecimal(20000, 80000),
  };
}
