/**
 * Financial Data Fetchers
 * 
 * Fetches financial data from Odoo for AI COO analysis
 */

import { getOdooClient } from '~/data-access/odoo';

// ============================================================================
// Types
// ============================================================================

export interface ARAgingData {
  total: number;
  current: number;      // 0-30 days
  days30: number;       // 31-60 days
  days60: number;       // 61-90 days
  days90plus: number;   // 90+ days
  invoices: Array<{
    id: number;
    name: string;
    partner: string;
    amount: number;
    dueDate: string;
    daysOverdue: number;
  }>;
}

export interface APAgingData {
  total: number;
  current: number;
  days30: number;
  days60: number;
  days90plus: number;
  bills: Array<{
    id: number;
    name: string;
    partner: string;
    amount: number;
    dueDate: string;
    daysOverdue: number;
  }>;
}

export interface BankBalanceData {
  total: number;
  accounts: Array<{
    name: string;
    balance: number;
  }>;
}

// ============================================================================
// Accounts Receivable
// ============================================================================

export async function getAccountsReceivable(): Promise<ARAgingData> {
  const odoo = await getOdooClient();

  // Fetch all open customer invoices
  const invoices = await odoo.searchRead('account.move', [
    ['move_type', '=', 'out_invoice'],
    ['state', '=', 'posted'],
    ['payment_state', 'in', ['not_paid', 'partial']],
  ], {
    fields: ['name', 'partner_id', 'invoice_date', 'invoice_date_due', 'amount_residual', 'amount_total'],
  });
  
  // Calculate aging
  const now = new Date();
  const aging: ARAgingData = {
    current: 0,
    days30: 0,
    days60: 0,
    days90plus: 0,
    total: 0,
    invoices: [],
  };
  
  for (const inv of invoices) {
    const dueDate = new Date(inv.invoice_date_due);
    const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
    
    const invoiceData = {
      id: inv.id,
      name: inv.name,
      partner: Array.isArray(inv.partner_id) ? inv.partner_id[1] : 'Unknown',
      amount: inv.amount_residual,
      dueDate: inv.invoice_date_due,
      daysOverdue: Math.max(0, daysOverdue),
    };
    
    aging.invoices.push(invoiceData);
    aging.total += inv.amount_residual;
    
    if (daysOverdue <= 30) {
      aging.current += inv.amount_residual;
    } else if (daysOverdue <= 60) {
      aging.days30 += inv.amount_residual;
    } else if (daysOverdue <= 90) {
      aging.days60 += inv.amount_residual;
    } else {
      aging.days90plus += inv.amount_residual;
    }
  }
  
  // Sort by days overdue (most overdue first)
  aging.invoices.sort((a, b) => b.daysOverdue - a.daysOverdue);
  
  return aging;
}

// ============================================================================
// Accounts Payable
// ============================================================================

export async function getAccountsPayable(): Promise<APAgingData> {
  const odoo = await getOdooClient();

  // Fetch all open vendor bills
  const bills = await odoo.searchRead('account.move', [
    ['move_type', '=', 'in_invoice'],
    ['state', '=', 'posted'],
    ['payment_state', 'in', ['not_paid', 'partial']],
  ], {
    fields: ['name', 'partner_id', 'invoice_date', 'invoice_date_due', 'amount_residual', 'amount_total'],
  });
  
  const now = new Date();
  const aging: APAgingData = {
    current: 0,
    days30: 0,
    days60: 0,
    days90plus: 0,
    total: 0,
    bills: [],
  };
  
  for (const bill of bills) {
    const dueDate = new Date(bill.invoice_date_due);
    const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
    
    const billData = {
      id: bill.id,
      name: bill.name,
      partner: Array.isArray(bill.partner_id) ? bill.partner_id[1] : 'Unknown',
      amount: bill.amount_residual,
      dueDate: bill.invoice_date_due,
      daysOverdue: Math.max(0, daysOverdue),
    };
    
    aging.bills.push(billData);
    aging.total += bill.amount_residual;
    
    if (daysOverdue <= 30) {
      aging.current += bill.amount_residual;
    } else if (daysOverdue <= 60) {
      aging.days30 += bill.amount_residual;
    } else if (daysOverdue <= 90) {
      aging.days60 += bill.amount_residual;
    } else {
      aging.days90plus += bill.amount_residual;
    }
  }
  
  aging.bills.sort((a, b) => b.daysOverdue - a.daysOverdue);
  
  return aging;
}

// ============================================================================
// Bank Balances
// ============================================================================

export async function getBankBalances(): Promise<BankBalanceData> {
  const odoo = await getOdooClient();

  // Fetch bank journals
  const journals = await odoo.searchRead('account.journal', [
    ['type', '=', 'bank'],
  ], {
    fields: ['name', 'currency_id', 'default_account_id'],
  });
  
  let totalBalance = 0;
  const accounts = [];
  
  for (const journal of journals) {
    if (!journal.default_account_id) continue;
    
    // Get account balance
    const accountId = Array.isArray(journal.default_account_id) 
      ? journal.default_account_id[0] 
      : journal.default_account_id;
      
    const [account] = await odoo.searchRead('account.account', [
      ['id', '=', accountId],
    ], {
      fields: ['name', 'current_balance'],
    });
    
    if (account) {
      const balance = account.current_balance || 0;
      totalBalance += balance;
      accounts.push({
        name: journal.name,
        balance,
      });
    }
  }
  
  return {
    total: totalBalance,
    accounts,
  };
}

// ============================================================================
// Monthly Burn Rate
// ============================================================================

export async function getMonthlyBurnRate(): Promise<number> {
  const odoo = await getOdooClient();

  // Get expenses from last 3 months to calculate average
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const expenses = await odoo.searchRead('account.move', [
    ['move_type', '=', 'in_invoice'],
    ['state', '=', 'posted'],
    ['invoice_date', '>=', threeMonthsAgo.toISOString().split('T')[0]],
  ], {
    fields: ['amount_total', 'invoice_date'],
  });
  
  const totalExpenses = expenses.reduce((sum: number, exp: any) => sum + (exp.amount_total || 0), 0);
  const monthlyBurn = totalExpenses / 3;
  
  return monthlyBurn;
}

// ============================================================================
// Complete Financial Snapshot
// ============================================================================

export async function getFinancialSnapshot() {
  const [ar, ap, bank, monthlyBurn] = await Promise.all([
    getAccountsReceivable(),
    getAccountsPayable(),
    getBankBalances(),
    getMonthlyBurnRate(),
  ]);
  
  // Calculate derived metrics
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
