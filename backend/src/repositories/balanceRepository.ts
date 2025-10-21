import { getSupabaseClient } from '../config/database';

export interface BalanceRecord {
  id: string;
  userId: string;
  currency: string;
  amount: number;
  lastUpdated: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface BalanceRow {
  id: string;
  user_id: string;
  currency: string;
  amount: number;
  last_updated: string;
  created_at: string;
  updated_at: string;
}

const toBalanceRecord = (row: BalanceRow): BalanceRecord => ({
  id: row.id,
  userId: row.user_id,
  currency: row.currency,
  amount: row.amount,
  lastUpdated: new Date(row.last_updated),
  createdAt: new Date(row.created_at),
  updatedAt: new Date(row.updated_at)
});

export const listBalances = async (userId: string): Promise<BalanceRecord[]> => {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('balances')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    throw error;
  }

  return (data ?? []).map(toBalanceRecord);
};

export const getBalanceByCurrency = async (
  userId: string,
  currency: string
): Promise<BalanceRecord | null> => {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('balances')
    .select('*')
    .eq('user_id', userId)
    .eq('currency', currency)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? toBalanceRecord(data) : null;
};

export const upsertBalance = async (payload: {
  userId: string;
  currency: string;
  amount: number;
  lastUpdated: Date;
}): Promise<void> => {
  const client = getSupabaseClient();
  const { error } = await client
    .from('balances')
    .upsert(
      {
        user_id: payload.userId,
        currency: payload.currency,
        amount: payload.amount,
        last_updated: payload.lastUpdated.toISOString()
      },
      { onConflict: 'user_id,currency' }
    );

  if (error) {
    throw error;
  }
};
