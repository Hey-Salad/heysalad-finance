import client from './client';

export interface DashboardSummary {
  balances: Array<{ currency: string; amount: number; lastUpdated?: string }>;
  burnRate: {
    currentCash: number;
    projectedRunwayMonths: number;
    averageNetBurn: number;
    averageMonthlyIncome: number;
    averageMonthlyExpenses: number;
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
  };
  burnRateHistory: Array<{
    month: string;
    income: number;
    expenses: number;
    netBurn: number;
  }>;
  recentTransactions: Array<{
    id: string;
    date: string;
    description: string;
    amount: number;
    currency: string;
    category: string;
    type: string;
  }>;
}

export const fetchDashboardSummary = async (): Promise<DashboardSummary> => {
  const [balancesResponse, burnRateResponse, transactionsResponse, historyResponse] = await Promise.all([
    client.get('/balances'),
    client.get('/burn-rate/current'),
    client.get('/transactions', { params: { limit: 5 } }),
    client.get('/burn-rate/history')
  ]);

  return {
    balances: (balancesResponse.data as Array<any>).map((balance) => ({
      currency: balance.currency,
      amount: balance.amount,
      lastUpdated: balance.lastUpdated
    })),
    burnRate: burnRateResponse.data,
    recentTransactions: (transactionsResponse.data.data as Array<any>).map((transaction) => ({
      id: transaction._id,
      date: transaction.date,
      description: transaction.description,
      amount: transaction.amount,
      currency: transaction.currency,
      category: transaction.category,
      type: transaction.type
    })),
    burnRateHistory: historyResponse.data
  };
};
