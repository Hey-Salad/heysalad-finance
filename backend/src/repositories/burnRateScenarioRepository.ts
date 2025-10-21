import { getSupabaseClient } from '../config/database';

export interface BurnRateScenarioRecord {
  id: string;
  userId: string;
  name: string;
  revenueMultiplier: number;
  expenseMultiplier: number;
  projectedRunway: number;
  createdAt: Date;
}

interface BurnRateScenarioRow {
  id: string;
  user_id: string;
  name: string;
  revenue_multiplier: number;
  expense_multiplier: number;
  projected_runway: number;
  created_at: string;
}

const toScenarioRecord = (row: BurnRateScenarioRow): BurnRateScenarioRecord => ({
  id: row.id,
  userId: row.user_id,
  name: row.name,
  revenueMultiplier: row.revenue_multiplier,
  expenseMultiplier: row.expense_multiplier,
  projectedRunway: row.projected_runway,
  createdAt: new Date(row.created_at)
});

export const upsertScenario = async (
  payload: Omit<BurnRateScenarioRow, 'id' | 'created_at'>
): Promise<BurnRateScenarioRecord> => {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('burn_rate_scenarios')
    .upsert(payload, { onConflict: 'user_id,name' })
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return toScenarioRecord(data);
};

export const listScenarios = async (userId: string): Promise<BurnRateScenarioRecord[]> => {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('burn_rate_scenarios')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map(toScenarioRecord);
};
