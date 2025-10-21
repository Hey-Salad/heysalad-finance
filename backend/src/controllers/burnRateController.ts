import { Response } from 'express';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth';
import {
  BurnRateMetrics,
  ScenarioInput,
  calculateBurnMetrics,
  listScenarios,
  projectRunwayWithScenario,
  saveScenario
} from '../services/burnRateService';
import { listTransactionsBetween } from '../repositories/transactionRepository';

dayjs.extend(isBetween);

const scenarioSchema = z.object({
  name: z.string().min(2),
  revenueMultiplier: z.number().positive(),
  expenseMultiplier: z.number().positive()
});

const ensureUser = (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ message: 'Unauthorized' });
    return null;
  }
  return req.user.id;
};

const formatMetrics = (metrics: BurnRateMetrics) => ({
  grossBurnRate: metrics.grossBurnRate,
  netBurnRate: metrics.netBurnRate,
  currentCash: metrics.currentCash,
  projectedRunwayMonths: metrics.projectedRunwayMonths,
  averageNetBurn: metrics.averageNetBurn
});

export const getCurrentBurnRate = async (req: AuthenticatedRequest, res: Response) => {
  const userId = ensureUser(req, res);
  if (!userId) {
    return;
  }

  const metrics = await calculateBurnMetrics(userId);
  res.json(formatMetrics(metrics));
};

export const getBurnRateHistory = async (req: AuthenticatedRequest, res: Response) => {
  const userId = ensureUser(req, res);
  if (!userId) {
    return;
  }

  const start = dayjs().subtract(6, 'month');
  const transactions = await listTransactionsBetween(userId, start.toDate(), new Date());

  const history: Array<{ month: string; income: number; expenses: number; netBurn: number }> = [];

  for (let i = 0; i < 6; i += 1) {
    const monthStart = start.add(i, 'month');
    const monthEnd = monthStart.endOf('month');
    const monthTransactions = transactions.filter((transaction) =>
      dayjs(transaction.date).isBetween(monthStart, monthEnd, null, '[]')
    );
    const income = monthTransactions
      .filter((transaction) => transaction.amount >= 0)
      .reduce((sum, transaction) => sum + transaction.amount, 0);
    const expenses = monthTransactions
      .filter((transaction) => transaction.amount < 0)
      .reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0);
    history.push({
      month: monthStart.format('YYYY-MM'),
      income,
      expenses,
      netBurn: expenses - income
    });
  }

  res.json(history);
};

export const createScenario = async (req: AuthenticatedRequest, res: Response) => {
  const userId = ensureUser(req, res);
  if (!userId) {
    return;
  }
  const input = scenarioSchema.parse(req.body) as ScenarioInput;
  const baseline = await calculateBurnMetrics(userId);
  const scenario = await saveScenario(userId, input, baseline);
  res.status(201).json(scenario);
};

export const getScenarios = async (req: AuthenticatedRequest, res: Response) => {
  const userId = ensureUser(req, res);
  if (!userId) {
    return;
  }
  const scenarios = await listScenarios(userId);
  res.json(scenarios);
};

export const getRunwayProjection = async (req: AuthenticatedRequest, res: Response) => {
  const userId = ensureUser(req, res);
  if (!userId) {
    return;
  }
  const metrics = await calculateBurnMetrics(userId);
  const querySchema = z.object({
    revenueMultiplier: z.coerce.number().positive().default(1),
    expenseMultiplier: z.coerce.number().positive().default(1)
  });
  const query = querySchema.parse(req.query);
  const runway = projectRunwayWithScenario(metrics, query);
  res.json({
    currentRunway: metrics.projectedRunwayMonths,
    scenarioRunway: runway,
    baseline: formatMetrics(metrics)
  });
};
