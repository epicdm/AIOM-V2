/**
 * Mock Financial Data Fetchers
 * 
 * Provides sample data for testing AI COO without Odoo connection
 * Replace with real financial.ts once Odoo integration is working
 */

import type { ARAgingData, APAgingData, BankBalanceData } from './financial';

export async function getAccountsReceivable(): Promise<ARAgingData> {
  // Mock data for testing
  return {
    total: 125000,
    current: 75000,
    days30: 25000,
    days60: 15000,
    days90plus: 10000,
    invoices: [
      {
        id: 1,
        name: 'INV-2024-001',
        partner: 'Acme Corp',
        amount: 5000,
        dueDate: '2024-10-15',
        daysOverdue: 95,
      },
      {
        id: 2,
        name: 'INV-2024-002',
        partner: 'Tech Solutions Inc',
        amount: 3000,
        dueDate: '2024-11-20',
        daysOverdue: 59,
      },
      {
        id: 3,
        name: 'INV-2024-003',
        partner: 'Global Services',
        amount: 2000,
        dueDate: '2024-12-01',
        daysOverdue: 48,
      },
    ],
  };
}

export async function getAccountsPayable(): Promise<APAgingData> {
  return {
    total: 85000,
    current: 60000,
    days30: 15000,
    days60: 7000,
    days90plus: 3000,
    bills: [
      {
        id: 1,
        name: 'BILL-2024-001',
        partner: 'Office Supplies Co',
        amount: 1500,
        dueDate: '2024-10-20',
        daysOverdue: 90,
      },
      {
        id: 2,
        name: 'BILL-2024-002',
        partner: 'Cloud Services Provider',
        amount: 1500,
        dueDate: '2024-11-25',
        daysOverdue: 54,
      },
    ],
  };
}

export async function getBankBalances(): Promise<BankBalanceData> {
  return {
    total: 45000,
    accounts: [
      { name: 'Operating Account', balance: 35000 },
      { name: 'Savings Account', balance: 10000 },
    ],
  };
}

export async function getMonthlyBurnRate(): Promise<number> {
  return 25000; // $25k per month
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
