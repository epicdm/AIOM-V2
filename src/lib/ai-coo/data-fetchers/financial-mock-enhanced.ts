/**
 * Enhanced Mock Financial Data Fetchers
 *
 * Provides rich, realistic sample data for testing AI COO
 * More comprehensive than basic mock, closer to real Odoo data
 */

import type { ARAgingData, APAgingData, BankBalanceData } from './financial';

export async function getAccountsReceivable(): Promise<ARAgingData> {
  // Realistic AR data with variety of customers and aging buckets
  return {
    total: 487500,
    current: 215000,    // 44% current (healthy)
    days30: 142500,     // 29% 30-60 days
    days60: 85000,      // 17% 60-90 days
    days90plus: 45000,  // 10% 90+ days (concerning)
    invoices: [
      // Critical overdue invoices
      {
        id: 1001,
        name: 'INV-2024-001',
        partner: 'Acme Corporation',
        amount: 15000,
        dueDate: '2024-10-01',
        daysOverdue: 117,
      },
      {
        id: 1002,
        name: 'INV-2024-015',
        partner: 'Global Manufacturing Ltd',
        amount: 12500,
        dueDate: '2024-10-15',
        daysOverdue: 103,
      },
      {
        id: 1003,
        name: 'INV-2024-023',
        partner: 'TechStart Innovations',
        amount: 8500,
        dueDate: '2024-10-25',
        daysOverdue: 93,
      },
      {
        id: 1004,
        name: 'INV-2024-031',
        partner: 'Metro Retail Group',
        amount: 9000,
        dueDate: '2024-11-01',
        daysOverdue: 86,
      },

      // 60-90 day aging
      {
        id: 1005,
        name: 'INV-2024-042',
        partner: 'Enterprise Solutions Inc',
        amount: 25000,
        dueDate: '2024-11-10',
        daysOverdue: 77,
      },
      {
        id: 1006,
        name: 'INV-2024-051',
        partner: 'Digital Dynamics Corp',
        amount: 18000,
        dueDate: '2024-11-15',
        daysOverdue: 72,
      },
      {
        id: 1007,
        name: 'INV-2024-058',
        partner: 'FastTrack Logistics',
        amount: 14500,
        dueDate: '2024-11-20',
        daysOverdue: 67,
      },
      {
        id: 1008,
        name: 'INV-2024-063',
        partner: 'Premier Services LLC',
        amount: 12000,
        dueDate: '2024-11-25',
        daysOverdue: 62,
      },
      {
        id: 1009,
        name: 'INV-2024-068',
        partner: 'CloudTech Systems',
        amount: 15000,
        dueDate: '2024-11-28',
        daysOverdue: 59,
      },

      // 30-60 day aging
      {
        id: 1010,
        name: 'INV-2024-075',
        partner: 'Innovate Partners',
        amount: 22500,
        dueDate: '2024-12-01',
        daysOverdue: 56,
      },
      {
        id: 1011,
        name: 'INV-2024-081',
        partner: 'BuildRight Construction',
        amount: 28000,
        dueDate: '2024-12-05',
        daysOverdue: 52,
      },
      {
        id: 1012,
        name: 'INV-2024-087',
        partner: 'Smart Solutions Group',
        amount: 16500,
        dueDate: '2024-12-10',
        daysOverdue: 47,
      },
      {
        id: 1013,
        name: 'INV-2024-092',
        partner: 'NextGen Technologies',
        amount: 19000,
        dueDate: '2024-12-15',
        daysOverdue: 42,
      },
      {
        id: 1014,
        name: 'INV-2024-098',
        partner: 'ProActive Marketing',
        amount: 13500,
        dueDate: '2024-12-18',
        daysOverdue: 39,
      },
      {
        id: 1015,
        name: 'INV-2024-103',
        partner: 'Quality First Industries',
        amount: 21000,
        dueDate: '2024-12-20',
        daysOverdue: 37,
      },
      {
        id: 1016,
        name: 'INV-2024-107',
        partner: 'Velocity Ventures',
        amount: 17500,
        dueDate: '2024-12-25',
        daysOverdue: 32,
      },

      // Current (< 30 days)
      {
        id: 1017,
        name: 'INV-2024-112',
        partner: 'Global Enterprises',
        amount: 35000,
        dueDate: '2025-01-01',
        daysOverdue: 25,
      },
      {
        id: 1018,
        name: 'INV-2024-118',
        partner: 'TechCorp International',
        amount: 42000,
        dueDate: '2025-01-05',
        daysOverdue: 21,
      },
      {
        id: 1019,
        name: 'INV-2024-123',
        partner: 'Dynamic Systems Ltd',
        amount: 28500,
        dueDate: '2025-01-10',
        daysOverdue: 16,
      },
      {
        id: 1020,
        name: 'INV-2024-127',
        partner: 'Precision Manufacturing',
        amount: 31000,
        dueDate: '2025-01-12',
        daysOverdue: 14,
      },
      {
        id: 1021,
        name: 'INV-2025-001',
        partner: 'Innovation Labs',
        amount: 24000,
        dueDate: '2025-01-15',
        daysOverdue: 11,
      },
      {
        id: 1022,
        name: 'INV-2025-005',
        partner: 'Strategic Partners LLC',
        amount: 38500,
        dueDate: '2025-01-18',
        daysOverdue: 8,
      },
      {
        id: 1023,
        name: 'INV-2025-008',
        partner: 'FutureTech Solutions',
        amount: 16000,
        dueDate: '2025-01-22',
        daysOverdue: 4,
      },
    ],
  };
}

export async function getAccountsPayable(): Promise<APAgingData> {
  return {
    total: 342000,
    current: 185000,    // 54% current (good)
    days30: 98000,      // 29% 30-60 days
    days60: 42000,      // 12% 60-90 days
    days90plus: 17000,  // 5% 90+ days (manageable)
    bills: [
      // Critical overdue bills
      {
        id: 2001,
        name: 'BILL-2024-001',
        partner: 'Office Depot Supplies',
        amount: 4500,
        dueDate: '2024-10-20',
        daysOverdue: 98,
      },
      {
        id: 2002,
        name: 'BILL-2024-008',
        partner: 'Cloud Infrastructure Inc',
        amount: 6500,
        dueDate: '2024-11-01',
        daysOverdue: 86,
      },
      {
        id: 2003,
        name: 'BILL-2024-015',
        partner: 'Marketing Agency Pro',
        amount: 6000,
        dueDate: '2024-11-10',
        daysOverdue: 77,
      },

      // 60-90 day aging
      {
        id: 2004,
        name: 'BILL-2024-023',
        partner: 'Software Licensing Corp',
        amount: 12000,
        dueDate: '2024-11-20',
        daysOverdue: 67,
      },
      {
        id: 2005,
        name: 'BILL-2024-029',
        partner: 'Professional Services Ltd',
        amount: 8500,
        dueDate: '2024-11-25',
        daysOverdue: 62,
      },
      {
        id: 2006,
        name: 'BILL-2024-034',
        partner: 'Telecom Solutions',
        amount: 3200,
        dueDate: '2024-11-28',
        daysOverdue: 59,
      },
      {
        id: 2007,
        name: 'BILL-2024-038',
        partner: 'Equipment Rental Co',
        amount: 7800,
        dueDate: '2024-12-01',
        daysOverdue: 56,
      },
      {
        id: 2008,
        name: 'BILL-2024-042',
        partner: 'Utilities & Power Inc',
        amount: 5500,
        dueDate: '2024-12-05',
        daysOverdue: 52,
      },
      {
        id: 2009,
        name: 'BILL-2024-047',
        partner: 'Insurance Providers Group',
        amount: 5000,
        dueDate: '2024-12-08',
        daysOverdue: 49,
      },

      // 30-60 day aging
      {
        id: 2010,
        name: 'BILL-2024-052',
        partner: 'Office Furniture Depot',
        amount: 15000,
        dueDate: '2024-12-10',
        daysOverdue: 47,
      },
      {
        id: 2011,
        name: 'BILL-2024-058',
        partner: 'IT Support Services',
        amount: 8500,
        dueDate: '2024-12-15',
        daysOverdue: 42,
      },
      {
        id: 2012,
        name: 'BILL-2024-063',
        partner: 'Legal Advisors LLC',
        amount: 12000,
        dueDate: '2024-12-18',
        daysOverdue: 39,
      },
      {
        id: 2013,
        name: 'BILL-2024-068',
        partner: 'Accounting Services Pro',
        amount: 9500,
        dueDate: '2024-12-20',
        daysOverdue: 37,
      },
      {
        id: 2014,
        name: 'BILL-2024-073',
        partner: 'Shipping & Logistics Inc',
        amount: 11500,
        dueDate: '2024-12-22',
        daysOverdue: 35,
      },
      {
        id: 2015,
        name: 'BILL-2024-078',
        partner: 'Building Maintenance Co',
        amount: 6500,
        dueDate: '2024-12-25',
        daysOverdue: 32,
      },

      // Current (< 30 days)
      {
        id: 2016,
        name: 'BILL-2025-001',
        partner: 'Cloud Storage Plus',
        amount: 4500,
        dueDate: '2025-01-05',
        daysOverdue: 21,
      },
      {
        id: 2017,
        name: 'BILL-2025-005',
        partner: 'Web Hosting Services',
        amount: 3800,
        dueDate: '2025-01-08',
        daysOverdue: 18,
      },
      {
        id: 2018,
        name: 'BILL-2025-009',
        partner: 'Office Supplies Express',
        amount: 2200,
        dueDate: '2025-01-12',
        daysOverdue: 14,
      },
      {
        id: 2019,
        name: 'BILL-2025-012',
        partner: 'Security Systems Inc',
        amount: 7500,
        dueDate: '2025-01-15',
        daysOverdue: 11,
      },
      {
        id: 2020,
        name: 'BILL-2025-015',
        partner: 'Advertising Agency',
        amount: 12000,
        dueDate: '2025-01-18',
        daysOverdue: 8,
      },
      {
        id: 2021,
        name: 'BILL-2025-018',
        partner: 'Software Subscriptions',
        amount: 8900,
        dueDate: '2025-01-20',
        daysOverdue: 6,
      },
      {
        id: 2022,
        name: 'BILL-2025-021',
        partner: 'Training & Development',
        amount: 5600,
        dueDate: '2025-01-23',
        daysOverdue: 3,
      },
    ],
  };
}

export async function getBankBalances(): Promise<BankBalanceData> {
  return {
    total: 125000,
    accounts: [
      { name: 'Operating Account - Chase Business', balance: 85000 },
      { name: 'Payroll Account - Wells Fargo', balance: 25000 },
      { name: 'Savings Account - Capital One', balance: 15000 },
    ],
  };
}

export async function getMonthlyBurnRate(): Promise<number> {
  // Based on realistic burn rate for the AP we have
  return 45000; // $45k per month
}

export async function getFinancialSnapshot() {
  const [ar, ap, bank, monthlyBurn] = await Promise.all([
    getAccountsReceivable(),
    getAccountsPayable(),
    getBankBalances(),
    getMonthlyBurnRate(),
  ]);

  const cashRunwayMonths = monthlyBurn > 0 ? bank.total / monthlyBurn : 999;
  const netPosition = bank.total + ar.total - ap.total;
  const workingCapital = ar.total - ap.total;

  return {
    ar,
    ap,
    bank,
    monthlyBurn,
    cashRunwayMonths,
    cashRunwayDays: cashRunwayMonths * 30,
    netPosition,
    workingCapital,
    timestamp: new Date(),
  };
}
