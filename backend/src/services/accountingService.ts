import PDFDocument from 'pdfkit';
import { createObjectCsvStringifier } from 'csv-writer';
import dayjs from 'dayjs';
import { logger } from '../utils/logger';
import { TransactionRecord, TransactionType } from '../repositories/transactionRepository';
import {
  deleteEntriesByTransactionId,
  insertJournalEntries,
  listJournalEntries,
  JournalEntryRecord
} from '../repositories/journalEntryRepository';

export type StatementFormat = 'json' | 'csv' | 'pdf';

export interface StatementDateRange {
  startDate: Date;
  endDate: Date;
}

export interface StatementLineItem {
  account: string;
  amount: number;
}

export interface BalanceSheet {
  assets: StatementLineItem[];
  liabilities: StatementLineItem[];
  equity: StatementLineItem[];
  totals: {
    assets: number;
    liabilities: number;
    equity: number;
  };
}

export interface ProfitAndLossStatement {
  income: StatementLineItem[];
  expenses: StatementLineItem[];
  netProfit: number;
}

export interface CashFlowStatement {
  operating: number;
  investing: number;
  financing: number;
  netChange: number;
}

const ACCOUNT_GROUPS = {
  assets: ['Cash:Wise', 'Cash:Bank', 'Accounts Receivable'],
  liabilities: ['Accounts Payable', 'Tax Payable', 'Loans'],
  equity: ['Owner Capital', 'Retained Earnings'],
  income: ['Client Revenue', 'Investment Income', 'Grants', 'Refunds', 'Other Income'],
  expenses: [
    'Salaries',
    'Office Supplies',
    'Marketing',
    'Software Subscriptions',
    'Travel',
    'Meals',
    'Utilities',
    'Equipment',
    'Freelancers',
    'Insurance',
    'Rent',
    'Taxes',
    'Other Expenses'
  ]
} as const;

type AccountGroupKey = keyof typeof ACCOUNT_GROUPS;

type AccountMap = Record<AccountGroupKey, Set<string>>;

const ACCOUNT_GROUP_MAP: AccountMap = Object.fromEntries(
  Object.entries(ACCOUNT_GROUPS).map(([key, accounts]) => [key as AccountGroupKey, new Set(accounts)])
) as AccountMap;

const CATEGORY_TO_ACCOUNT: Record<string, string> = {
  Salaries: 'Salaries',
  'Office Supplies': 'Office Supplies',
  Marketing: 'Marketing',
  'Software Subscriptions': 'Software Subscriptions',
  Travel: 'Travel',
  Meals: 'Meals',
  Utilities: 'Utilities',
  Equipment: 'Equipment',
  Freelancers: 'Freelancers',
  Insurance: 'Insurance',
  Rent: 'Rent',
  Taxes: 'Taxes',
  'Other Expenses': 'Other Expenses',
  'Client Revenue': 'Client Revenue',
  Investment: 'Investment Income',
  Grants: 'Grants',
  Refunds: 'Refunds',
  'Other Income': 'Other Income',
  'Internal Transfer': 'Cash:Wise',
  'External Transfer': 'Cash:Bank'
};

const classifyAccount = (account: string): AccountGroupKey | null => {
  const normalized = account.trim();
  for (const [group, accounts] of Object.entries(ACCOUNT_GROUP_MAP) as [AccountGroupKey, Set<string>][]) {
    if (accounts.has(normalized)) {
      return group;
    }
  }
  if (normalized.startsWith('Cash:')) {
    return 'assets';
  }
  return null;
};

const getCashAccount = (source: 'wise' | 'stripe' | 'manual', currency: string): string => {
  switch (source) {
    case 'stripe':
      return `Cash:Stripe:${currency}`;
    case 'manual':
      return `Cash:Manual:${currency}`;
    default:
      return `Cash:Wise:${currency}`;
  }
};

const buildJournalEntries = (
  transaction: TransactionRecord
): Array<{
  debitAccount: string;
  debitAmount: number;
  creditAccount: string;
  creditAmount: number;
}> => {
  const amount = Math.abs(transaction.amount);
  const cashAccount = getCashAccount(transaction.source, transaction.currency);
  const categoryAccount = CATEGORY_TO_ACCOUNT[transaction.category] ?? transaction.category;

  if (transaction.type === 'income') {
    return [
      {
        debitAccount: cashAccount,
        debitAmount: amount,
        creditAccount: categoryAccount,
        creditAmount: amount
      }
    ];
  }

  if (transaction.type === 'expense') {
    return [
      {
        debitAccount: categoryAccount,
        debitAmount: amount,
        creditAccount: cashAccount,
        creditAmount: amount
      }
    ];
  }

  // transfer
  const targetAccount = categoryAccount === 'Cash:Wise' ? `Cash:Wise:${transaction.currency}` : categoryAccount;
  return [
    {
      debitAccount: targetAccount,
      debitAmount: amount,
      creditAccount: cashAccount,
      creditAmount: amount
    }
  ];
};

export const upsertJournalEntriesForTransaction = async (
  transaction: TransactionRecord
): Promise<void> => {
  await deleteEntriesByTransactionId(transaction.id);

  const entries = buildJournalEntries(transaction);
  await insertJournalEntries(
    entries.map((entry) => ({
      userId: transaction.userId,
      date: transaction.date,
      description: transaction.description,
      transactionId: transaction.id,
      ...entry
    }))
  );
};

const aggregateAccountBalances = (entries: JournalEntryRecord[]) => {
  const balances = new Map<string, number>();

  for (const entry of entries) {
    const debitValue = balances.get(entry.debitAccount) ?? 0;
    balances.set(entry.debitAccount, debitValue + entry.debitAmount);

    const creditValue = balances.get(entry.creditAccount) ?? 0;
    balances.set(entry.creditAccount, creditValue - entry.creditAmount);
  }

  return balances;
};

const summarizeGroup = (balances: Map<string, number>, group: AccountGroupKey): StatementLineItem[] => {
  const items: StatementLineItem[] = [];
  for (const [account, amount] of balances) {
    const classification = classifyAccount(account);
    if (classification === group && amount !== 0) {
      items.push({ account, amount });
    }
  }
  return items.sort((a, b) => a.account.localeCompare(b.account));
};

export const generateBalanceSheet = async (
  userId: string,
  range: StatementDateRange
): Promise<BalanceSheet> => {
  const entries = await listJournalEntries(userId, { endDate: range.endDate });

  const balances = aggregateAccountBalances(entries);

  const assets = summarizeGroup(balances, 'assets');
  const liabilities = summarizeGroup(balances, 'liabilities');
  const equity = summarizeGroup(balances, 'equity');

  const totals = {
    assets: assets.reduce((sum, item) => sum + item.amount, 0),
    liabilities: liabilities.reduce((sum, item) => sum + item.amount, 0),
    equity: equity.reduce((sum, item) => sum + item.amount, 0)
  };

  return { assets, liabilities, equity, totals };
};

export const generateProfitAndLoss = async (
  userId: string,
  range: StatementDateRange
): Promise<ProfitAndLossStatement> => {
  const entries = await listJournalEntries(userId, {
    startDate: range.startDate,
    endDate: range.endDate
  });

  const balances = aggregateAccountBalances(entries);
  const income = summarizeGroup(balances, 'income');
  const expenses = summarizeGroup(balances, 'expenses');
  const incomeTotal = income.reduce((sum, item) => sum + item.amount, 0);
  const expenseTotal = expenses.reduce((sum, item) => sum + item.amount, 0);

  return {
    income,
    expenses,
    netProfit: incomeTotal + expenseTotal
  };
};

export const generateCashFlow = async (
  userId: string,
  range: StatementDateRange
): Promise<CashFlowStatement> => {
  const entries = await listJournalEntries(userId, {
    startDate: range.startDate,
    endDate: range.endDate
  });

  const balances = aggregateAccountBalances(entries);

  let operating = 0;
  let investing = 0;
  let financing = 0;

  for (const [account, amount] of balances) {
    if (account.startsWith('Cash:')) {
      continue;
    }

    const classification = classifyAccount(account);
    if (classification === 'income' || classification === 'expenses') {
      operating += amount;
    } else if (classification === 'assets') {
      investing += amount;
    } else if (classification === 'liabilities' || classification === 'equity') {
      financing += amount;
    }
  }

  const netChange = operating + investing + financing;

  return {
    operating,
    investing,
    financing,
    netChange
  };
};

const buildPdf = (
  title: string,
  payload: BalanceSheet | ProfitAndLossStatement | CashFlowStatement,
  range: StatementDateRange
): Buffer => {
  const doc = new PDFDocument({ margin: 50 });
  const chunks: Buffer[] = [];
  doc.on('data', (chunk) => chunks.push(chunk));
  doc.on('error', (error) => logger.error('PDF generation error', error));
  doc.fontSize(18).text(title, { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).text(`Period: ${dayjs(range.startDate).format('YYYY-MM-DD')} - ${dayjs(range.endDate).format('YYYY-MM-DD')}`);
  doc.moveDown();

  const renderLineItems = (items: StatementLineItem[], heading: string) => {
    doc.fontSize(14).text(heading);
    doc.moveDown(0.5);
    items.forEach((item) => {
      doc.fontSize(12).text(`${item.account}: ${item.amount.toFixed(2)}`);
    });
    doc.moveDown();
  };

  if ('assets' in payload) {
    renderLineItems(payload.assets, 'Assets');
    renderLineItems(payload.liabilities, 'Liabilities');
    renderLineItems(payload.equity, 'Equity');
    doc.fontSize(12).text(`Total Assets: ${payload.totals.assets.toFixed(2)}`);
    doc.fontSize(12).text(`Total Liabilities: ${payload.totals.liabilities.toFixed(2)}`);
    doc.fontSize(12).text(`Total Equity: ${payload.totals.equity.toFixed(2)}`);
  } else if ('income' in payload) {
    renderLineItems(payload.income, 'Income');
    renderLineItems(payload.expenses, 'Expenses');
    doc.fontSize(12).text(`Net Profit: ${payload.netProfit.toFixed(2)}`);
  } else {
    doc.fontSize(12).text(`Operating Activities: ${payload.operating.toFixed(2)}`);
    doc.fontSize(12).text(`Investing Activities: ${payload.investing.toFixed(2)}`);
    doc.fontSize(12).text(`Financing Activities: ${payload.financing.toFixed(2)}`);
    doc.fontSize(12).text(`Net Change: ${payload.netChange.toFixed(2)}`);
  }

  doc.end();
  return Buffer.concat(chunks);
};

const buildCsv = (
  payload: BalanceSheet | ProfitAndLossStatement | CashFlowStatement
): string => {
  if ('assets' in payload) {
    const csvWriter = createObjectCsvStringifier({
      header: [
        { id: 'section', title: 'Section' },
        { id: 'account', title: 'Account' },
        { id: 'amount', title: 'Amount' }
      ]
    });

    const records = [
      ...payload.assets.map((item) => ({ section: 'Assets', account: item.account, amount: item.amount })),
      ...payload.liabilities.map((item) => ({
        section: 'Liabilities',
        account: item.account,
        amount: item.amount
      })),
      ...payload.equity.map((item) => ({ section: 'Equity', account: item.account, amount: item.amount }))
    ];

    return csvWriter.getHeaderString() + csvWriter.stringifyRecords(records);
  }

  if ('income' in payload) {
    const csvWriter = createObjectCsvStringifier({
      header: [
        { id: 'section', title: 'Section' },
        { id: 'account', title: 'Account' },
        { id: 'amount', title: 'Amount' }
      ]
    });

    const records = [
      ...payload.income.map((item) => ({ section: 'Income', account: item.account, amount: item.amount })),
      ...payload.expenses.map((item) => ({ section: 'Expenses', account: item.account, amount: item.amount }))
    ];

    records.push({ section: 'Summary', account: 'Net Profit', amount: payload.netProfit });

    return csvWriter.getHeaderString() + csvWriter.stringifyRecords(records);
  }

  const csvWriter = createObjectCsvStringifier({
    header: [
      { id: 'section', title: 'Section' },
      { id: 'amount', title: 'Amount' }
    ]
  });

  const records = [
    { section: 'Operating', amount: payload.operating },
    { section: 'Investing', amount: payload.investing },
    { section: 'Financing', amount: payload.financing },
    { section: 'Net Change', amount: payload.netChange }
  ];

  return csvWriter.getHeaderString() + csvWriter.stringifyRecords(records);
};

export const exportStatement = (
  title: string,
  payload: BalanceSheet | ProfitAndLossStatement | CashFlowStatement,
  range: StatementDateRange,
  format: StatementFormat
): Buffer | string | Record<string, unknown> => {
  switch (format) {
    case 'pdf':
      return buildPdf(title, payload, range);
    case 'csv':
      return buildCsv(payload);
    case 'json':
    default:
      return payload as unknown as Record<string, unknown>;
  }
};

export const deriveTransactionType = (transaction: TransactionRecord): TransactionType => {
  if (transaction.type) {
    return transaction.type;
  }
  if (transaction.amount > 0) {
    return 'income';
  }
  if (transaction.amount < 0) {
    return 'expense';
  }
  return 'transfer';
};
