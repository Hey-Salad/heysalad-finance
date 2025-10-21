import { Response } from 'express';
import { z } from 'zod';
import dayjs from 'dayjs';
import { Types } from 'mongoose';
import { AuthenticatedRequest } from '../middleware/auth';
import { recordCategoryOverride } from '../services/categorizationService';
import { wiseService } from '../services/wiseService';
import { Transaction } from '../models/Transaction';
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
  const query = { userId: req.user.id } as Record<string, unknown>;

  if (filters.startDate || filters.endDate) {
    query.date = {
      ...(filters.startDate ? { $gte: dayjs(filters.startDate).startOf('day').toDate() } : {}),
      ...(filters.endDate ? { $lte: dayjs(filters.endDate).endOf('day').toDate() } : {})
    };
  }

  if (filters.category) {
    query.category = filters.category;
  }

  if (filters.currency) {
    query.currency = filters.currency;
  }

  if (filters.type) {
    query.type = filters.type;
  }

  if (filters.search) {
    query.$or = [
      { description: { $regex: filters.search, $options: 'i' } },
      { recipientName: { $regex: filters.search, $options: 'i' } }
    ];
  }

  const skip = (filters.page - 1) * filters.limit;
  const [transactions, total] = await Promise.all([
    Transaction.find(query)
      .sort({ date: -1 })
      .skip(skip)
      .limit(filters.limit)
      .lean(),
    Transaction.countDocuments(query)
  ]);

  res.json({
    data: transactions,
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

  const transaction = await Transaction.findOne({ _id: req.params.id, userId: req.user.id });
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

  const transaction = await Transaction.findOne({ _id: req.params.id, userId: req.user.id });
  if (!transaction) {
    return res.status(404).json({ message: 'Transaction not found' });
  }

  if (payload.category && payload.category !== transaction.category) {
    transaction.category = payload.category;
    transaction.categoryConfidence = 1;
    if (transaction.description) {
      await recordCategoryOverride(transaction.userId, transaction.description, payload.category);
    }
    await upsertJournalEntriesForTransaction(transaction);
  }

  if (payload.notes !== undefined) {
    transaction.notes = payload.notes;
  }

  await transaction.save();
  res.json(transaction);
};

export const syncTransactions = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  const payload = syncSchema.parse(req.body ?? {});

  const result = await wiseService.syncUserData(new Types.ObjectId(req.user.id), {
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
  const transactions = await Transaction.find({ userId: req.user.id }).lean();

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
