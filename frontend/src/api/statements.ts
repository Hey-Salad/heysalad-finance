import client from './client';

export interface StatementRange {
  startDate?: string;
  endDate?: string;
}

export interface BalanceSheet {
  assets: Array<{ account: string; amount: number }>;
  liabilities: Array<{ account: string; amount: number }>;
  equity: Array<{ account: string; amount: number }>;
  totals: {
    assets: number;
    liabilities: number;
    equity: number;
  };
}

export interface ProfitAndLoss {
  income: Array<{ account: string; amount: number }>;
  expenses: Array<{ account: string; amount: number }>;
  netProfit: number;
}

export interface CashFlow {
  operating: number;
  investing: number;
  financing: number;
  netChange: number;
}

const withRange = (range: StatementRange = {}) => ({
  params: {
    ...(range.startDate ? { startDate: range.startDate } : {}),
    ...(range.endDate ? { endDate: range.endDate } : {})
  }
});

export const fetchBalanceSheet = async (range: StatementRange) => {
  const response = await client.get<BalanceSheet>('/statements/balance-sheet', withRange(range));
  return response.data;
};

export const fetchProfitAndLoss = async (range: StatementRange) => {
  const response = await client.get<ProfitAndLoss>('/statements/p-and-l', withRange(range));
  return response.data;
};

export const fetchCashFlow = async (range: StatementRange) => {
  const response = await client.get<CashFlow>('/statements/cash-flow', withRange(range));
  return response.data;
};

export const exportStatement = async (
  type: 'balance-sheet' | 'p-and-l' | 'cash-flow',
  format: 'json' | 'csv' | 'pdf',
  range: StatementRange
) => {
  const response = await client.get(`/statements/export`, {
    params: {
      statement: type,
      format,
      ...(range.startDate ? { startDate: range.startDate } : {}),
      ...(range.endDate ? { endDate: range.endDate } : {})
    },
    responseType: format === 'json' ? 'json' : 'blob'
  });
  return response.data;
};
