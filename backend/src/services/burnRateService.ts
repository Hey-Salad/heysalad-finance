import dayjs from 'dayjs';
import { listBalances } from '../repositories/balanceRepository';
import { listTransactionsBetween } from '../repositories/transactionRepository';
import {
  listScenarios as listScenarioRecords,
  upsertScenario
} from '../repositories/burnRateScenarioRepository';

export interface BurnRateMetrics {
  grossBurnRate: {
    sevenDay: number;
    thirtyDay: number;
    ninetyDay: number;
  };
  netBurnRate: {
    sevenDay: number;
    thirtyDay: number;
    ninetyDay: number;
  };
  averageMonthlyIncome: number;
  averageMonthlyExpenses: number;
  averageNetBurn: number;
  currentCash: number;
  projectedRunwayMonths: number;
}

export interface ScenarioInput {
  name: string;
  revenueMultiplier: number;
  expenseMultiplier: number;
}

export interface ScenarioResult {
  id: string;
  name: string;
  revenueMultiplier: number;
  expenseMultiplier: number;
  projectedRunway: number;
}

const sumTransactions = async (
  userId: string,
  start: Date,
  end: Date
): Promise<{ income: number; expenses: number }> => {
  const transactions = await listTransactionsBetween(userId, start, end);

  return transactions.reduce(
    (acc, transaction) => {
      if (transaction.amount >= 0) {
        acc.income += transaction.amount;
      } else {
        acc.expenses += Math.abs(transaction.amount);
      }
      return acc;
    },
    { income: 0, expenses: 0 }
  );
};

const averageMonthly = (value: number, days: number): number => {
  if (days === 0) {
    return 0;
  }
  const months = days / 30;
  return value / months;
};

const calculateRunway = (cash: number, netBurn: number): number => {
  if (netBurn <= 0) {
    return Number.POSITIVE_INFINITY;
  }
  return cash / netBurn;
};

export const calculateBurnMetrics = async (userId: string): Promise<BurnRateMetrics> => {
  const now = dayjs();

  const range7 = {
    start: now.subtract(7, 'day').toDate(),
    end: now.toDate(),
    days: 7
  };
  const range30 = {
    start: now.subtract(30, 'day').toDate(),
    end: now.toDate(),
    days: 30
  };
  const range90 = {
    start: now.subtract(90, 'day').toDate(),
    end: now.toDate(),
    days: 90
  };

  const [metrics7, metrics30, metrics90, balances] = await Promise.all([
    sumTransactions(userId, range7.start, range7.end),
    sumTransactions(userId, range30.start, range30.end),
    sumTransactions(userId, range90.start, range90.end),
    listBalances(userId)
  ]);

  const grossBurn = {
    sevenDay: averageMonthly(metrics7.expenses, range7.days),
    thirtyDay: averageMonthly(metrics30.expenses, range30.days),
    ninetyDay: averageMonthly(metrics90.expenses, range90.days)
  };

  const netBurn = {
    sevenDay: averageMonthly(metrics7.expenses - metrics7.income, range7.days),
    thirtyDay: averageMonthly(metrics30.expenses - metrics30.income, range30.days),
    ninetyDay: averageMonthly(metrics90.expenses - metrics90.income, range90.days)
  };

  const currentCash = balances.reduce((sum, balance) => sum + balance.amount, 0);
  const averageMonthlyIncome = averageMonthly(metrics30.income, range30.days);
  const averageMonthlyExpenses = averageMonthly(metrics30.expenses, range30.days);
  const averageNetBurn = averageMonthlyExpenses - averageMonthlyIncome;
  const projectedRunwayMonths = calculateRunway(currentCash, averageNetBurn);

  return {
    grossBurnRate: grossBurn,
    netBurnRate: netBurn,
    averageMonthlyIncome,
    averageMonthlyExpenses,
    averageNetBurn,
    currentCash,
    projectedRunwayMonths
  };
};

export const projectRunwayWithScenario = (
  baseline: BurnRateMetrics,
  scenario: { revenueMultiplier: number; expenseMultiplier: number }
): number => {
  const adjustedExpenses = baseline.averageMonthlyExpenses * scenario.expenseMultiplier;
  const adjustedIncome = baseline.averageMonthlyIncome * scenario.revenueMultiplier;
  const adjustedNetBurn = Math.max(adjustedExpenses - adjustedIncome, 0);
  return calculateRunway(baseline.currentCash, adjustedNetBurn);
};

export const saveScenario = async (
  userId: string,
  input: ScenarioInput,
  baseline: BurnRateMetrics
): Promise<ScenarioResult> => {
  const projectedRunway = projectRunwayWithScenario(baseline, input);
  const record = await upsertScenario({
    user_id: userId,
    name: input.name,
    revenue_multiplier: input.revenueMultiplier,
    expense_multiplier: input.expenseMultiplier,
    projected_runway: projectedRunway
  });

  return {
    id: record.id,
    name: record.name,
    revenueMultiplier: record.revenueMultiplier,
    expenseMultiplier: record.expenseMultiplier,
    projectedRunway: record.projectedRunway
  };
};

export const listScenarios = async (userId: string): Promise<ScenarioResult[]> => {
  const scenarios = await listScenarioRecords(userId);
  return scenarios.map((scenario) => ({
    id: scenario.id,
    name: scenario.name,
    revenueMultiplier: scenario.revenueMultiplier,
    expenseMultiplier: scenario.expenseMultiplier,
    projectedRunway: scenario.projectedRunway
  }));
};
