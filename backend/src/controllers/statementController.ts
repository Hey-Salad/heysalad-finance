import { Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth';
import {
  StatementFormat,
  StatementDateRange,
  generateBalanceSheet,
  generateCashFlow,
  generateProfitAndLoss,
  exportStatement
} from '../services/accountingService';

const dateRangeSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional()
});

const exportSchema = dateRangeSchema.extend({
  format: z.enum(['json', 'csv', 'pdf']).default('json'),
  statement: z.enum(['balance-sheet', 'p-and-l', 'cash-flow'])
});

const resolveRange = (payload: { startDate?: string; endDate?: string }): StatementDateRange => {
  const start = payload.startDate ? new Date(payload.startDate) : new Date('1970-01-01');
  const end = payload.endDate ? new Date(payload.endDate) : new Date();
  return { startDate: start, endDate: end };
};

const ensureUser = (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ message: 'Unauthorized' });
    return null;
  }
  return req.user.id;
};

export const getBalanceSheetStatement = async (req: AuthenticatedRequest, res: Response) => {
  const userId = ensureUser(req, res);
  if (!userId) {
    return;
  }
  const range = resolveRange(dateRangeSchema.parse(req.query));
  const statement = await generateBalanceSheet(userId, range);
  res.json(statement);
};

export const getProfitAndLossStatement = async (req: AuthenticatedRequest, res: Response) => {
  const userId = ensureUser(req, res);
  if (!userId) {
    return;
  }
  const range = resolveRange(dateRangeSchema.parse(req.query));
  const statement = await generateProfitAndLoss(userId, range);
  res.json(statement);
};

export const getCashFlowStatement = async (req: AuthenticatedRequest, res: Response) => {
  const userId = ensureUser(req, res);
  if (!userId) {
    return;
  }
  const range = resolveRange(dateRangeSchema.parse(req.query));
  const statement = await generateCashFlow(userId, range);
  res.json(statement);
};

export const exportFinancialStatement = async (req: AuthenticatedRequest, res: Response) => {
  const userId = ensureUser(req, res);
  if (!userId) {
    return;
  }
  const payload = exportSchema.parse(req.query);
  const range = resolveRange(payload);

  let title = '';
  let data: unknown;

  switch (payload.statement) {
    case 'balance-sheet':
      data = await generateBalanceSheet(userId, range);
      title = 'Balance Sheet';
      break;
    case 'p-and-l':
      data = await generateProfitAndLoss(userId, range);
      title = 'Profit and Loss Statement';
      break;
    case 'cash-flow':
      data = await generateCashFlow(userId, range);
      title = 'Cash Flow Statement';
      break;
    default:
      return res.status(400).json({ message: 'Invalid statement type' });
  }

  const exported = exportStatement(title, data as any, range, payload.format as StatementFormat);

  if (payload.format === 'pdf') {
    res.setHeader('Content-Type', 'application/pdf');
    res.attachment(`${payload.statement}.pdf`);
    return res.send(exported);
  }

  if (payload.format === 'csv') {
    res.setHeader('Content-Type', 'text/csv');
    res.attachment(`${payload.statement}.csv`);
    return res.send(exported);
  }

  res.json(exported);
};
