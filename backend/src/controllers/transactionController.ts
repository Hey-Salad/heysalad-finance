import { Response } from 'express';
import { z } from 'zod';
import dayjs from 'dayjs';
import { AuthenticatedRequest } from '../middleware/auth';
import { recordCategoryOverride } from '../services/categorizationService';
import { wiseService } from '../services/wiseService';
import {
  listTransactions as listTransactionsRepository,
  getTransactionById as getTransactionByIdRepository,
  updateTransactionById,
  listAllTransactionsForUser,
  TransactionRecord
} from '../repositories/transactionRepository';
import { upsertJournalEntriesForTransaction } from '../services/accountingService';

const listSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(25),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  category: z.string().optional(),
  currency: z.string().optional(),
  type: z.enum(['income', 'expense', 'transfer']).optional(),
  search: z.string().optional()
});

const updateSchema = z.object({
  category: z.string().optional(),
  notes: z.string().optional()
});

const syncSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  currency: z.string().optional(),
  sandbox: z.coerce.boolean().optional()
});

const exportSchema = z.object({
  format: z.enum(['json', 'csv']).default('json')
});

export const listTransactions = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  const filters = listSchema.parse(req.query);
  const [startDate, endDate] = [
    filters.startDate ? dayjs(filters.startDate).startOf('day').toDate() : undefined,
    filters.endDate ? dayjs(filters.endDate).endOf('day').toDate() : undefined
  ];

  const { data, total } = await listTransactionsRepository(req.user.id, {
    page: filters.page,
    limit: filters.limit,
    startDate,
    endDate,
    category: filters.category,
    currency: filters.currency,
    type: filters.type,
    search: filters.search
  });

  res.json({
    data,
    pagination: {
      page: filters.page,
      limit: filters.limit,
      total,
      totalPages: Math.ceil(total / filters.limit)
    }
  });
};

export const getTransactionById = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const transaction = await getTransactionByIdRepository(req.user.id, req.params.id);
  if (!transaction) {
    return res.status(404).json({ message: 'Transaction not found' });
  }

  res.json(transaction);
};

export const updateTransaction = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  const payload = updateSchema.parse(req.body);

  const transaction = await getTransactionByIdRepository(req.user.id, req.params.id);
  if (!transaction) {
    return res.status(404).json({ message: 'Transaction not found' });
  }

  const updates: Partial<Pick<TransactionRecord, 'category' | 'categoryConfidence' | 'notes'>> = {};
  let shouldPersist = false;

  if (payload.category && payload.category !== transaction.category) {
    updates.category = payload.category;
    updates.categoryConfidence = 1;
    shouldPersist = true;
    if (transaction.description) {
      await recordCategoryOverride(req.user.id, transaction.description, payload.category);
    }
  }

  if (payload.notes !== undefined && payload.notes !== transaction.notes) {
    updates.notes = payload.notes;
    shouldPersist = true;
  }

  if (!shouldPersist) {
    return res.json(transaction);
  }

  const updated = await updateTransactionById(req.user.id, transaction.id, updates);
  if (!updated) {
    return res.status(404).json({ message: 'Transaction not found' });
  }

  await upsertJournalEntriesForTransaction(updated);
  res.json(updated);
};

export const syncTransactions = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  const payload = syncSchema.parse(req.body ?? {});

  const result = await wiseService.syncUserData(req.user.id, {
    startDate: payload.startDate ? new Date(payload.startDate) : undefined,
    endDate: payload.endDate ? new Date(payload.endDate) : undefined,
    currency: payload.currency,
    useSandbox: payload.sandbox
  });

  res.json({
    balances: result.balances,
    transactionsSynced: result.transactions.length
  });
};

const buildCsv = (rows: any[]): string => {
  const header = Object.keys(rows[0] ?? {}).join(',');
  const body = rows.map((row) => Object.values(row).join(',')).join('\n');
  return `${header}\n${body}`;
};

export const exportTransactions = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  const { format } = exportSchema.parse(req.query);
  const transactions = await listAllTransactionsForUser(req.user.id);

  if (format === 'csv') {
    const csv = buildCsv(
      transactions.map((transaction) => ({
        date: dayjs(transaction.date).format('YYYY-MM-DD'),
        description: transaction.description,
        amount: transaction.amount,
        currency: transaction.currency,
        category: transaction.category,
        type: transaction.type
      }))
    );
    res.setHeader('Content-Type', 'text/csv');
    res.attachment('transactions.csv');
    return res.send(csv);
  }

  res.json(transactions);
};
