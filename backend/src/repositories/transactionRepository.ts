import { getSupabaseClient } from '../config/database';

export type TransactionSource = 'wise' | 'stripe' | 'manual';
export type TransactionType = 'income' | 'expense' | 'transfer';

export interface TransactionRecord {
  id: string;
  userId: string;
  wiseId: string | null;
  externalId: string | null;
  date: Date;
  description: string;
  amount: number;
  currency: string;
  type: TransactionType;
  category: string;
  categoryConfidence: number | null;
  source: TransactionSource;
  notes: string | null;
  recipientName: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface TransactionRow {
  id: string;
  user_id: string;
  wise_id: string | null;
  external_id: string | null;
  date: string;
  description: string;
  amount: number;
  currency: string;
  type: TransactionType;
  category: string;
  category_confidence: number | null;
  source: TransactionSource;
  notes: string | null;
  recipient_name: string | null;
  created_at: string;
  updated_at: string;
}

const toTransactionRecord = (row: TransactionRow): TransactionRecord => ({
  id: row.id,
  userId: row.user_id,
  wiseId: row.wise_id,
  externalId: row.external_id,
  date: new Date(row.date),
  description: row.description,
  amount: row.amount,
  currency: row.currency,
  type: row.type,
  category: row.category,
  categoryConfidence: row.category_confidence,
  source: row.source,
  notes: row.notes,
  recipientName: row.recipient_name,
  createdAt: new Date(row.created_at),
  updatedAt: new Date(row.updated_at)
});

export interface TransactionListFilters {
  startDate?: Date;
  endDate?: Date;
  category?: string;
  currency?: string;
  type?: TransactionType;
  search?: string;
  page: number;
  limit: number;
}

export const listTransactions = async (
  userId: string,
  filters: TransactionListFilters
): Promise<{ data: TransactionRecord[]; total: number }> => {
  const client = getSupabaseClient();
  const query = client
    .from('transactions')
    .select('*', { count: 'exact' })
    .eq('user_id', userId);

  if (filters.startDate) {
    query.gte('date', filters.startDate.toISOString());
  }
  if (filters.endDate) {
    query.lte('date', filters.endDate.toISOString());
  }
  if (filters.category) {
    query.eq('category', filters.category);
  }
  if (filters.currency) {
    query.eq('currency', filters.currency);
  }
  if (filters.type) {
    query.eq('type', filters.type);
  }
  if (filters.search) {
    const pattern = `%${filters.search}%`;
    query.or(
      `description.ilike.${pattern},recipient_name.ilike.${pattern}`
    );
  }

  const offset = (filters.page - 1) * filters.limit;
  query.order('date', { ascending: false });
  query.range(offset, offset + filters.limit - 1);

  const { data, error, count } = await query;

  if (error) {
    throw error;
  }

  return {
    data: (data ?? []).map(toTransactionRecord),
    total: count ?? 0
  };
};

export const listAllTransactionsForUser = async (
  userId: string
): Promise<TransactionRecord[]> => {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map(toTransactionRecord);
};

export const getTransactionById = async (
  userId: string,
  transactionId: string
): Promise<TransactionRecord | null> => {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('transactions')
    .select('*')
    .eq('id', transactionId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? toTransactionRecord(data) : null;
};

export const updateTransactionById = async (
  userId: string,
  transactionId: string,
  updates: Partial<Pick<TransactionRecord, 'category' | 'notes' | 'categoryConfidence'>>
): Promise<TransactionRecord | null> => {
  const client = getSupabaseClient();
  const payload: Record<string, unknown> = {};

  if (updates.category !== undefined) {
    payload.category = updates.category;
  }
  if (updates.categoryConfidence !== undefined) {
    payload.category_confidence = updates.categoryConfidence;
  }
  if (updates.notes !== undefined) {
    payload.notes = updates.notes;
  }

  const { data, error } = await client
    .from('transactions')
    .update(payload)
    .eq('id', transactionId)
    .eq('user_id', userId)
    .select('*')
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? toTransactionRecord(data) : null;
};

export const findTransactionByExternalId = async (
  userId: string,
  externalId: string
): Promise<TransactionRecord | null> => {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .eq('external_id', externalId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? toTransactionRecord(data) : null;
};

export const createTransaction = async (
  payload: Omit<TransactionRow, 'id' | 'created_at' | 'updated_at'>
): Promise<TransactionRecord> => {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('transactions')
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return toTransactionRecord(data);
};

export const upsertTransactionByExternalId = async (
  payload: Omit<TransactionRow, 'id' | 'created_at' | 'updated_at'>
): Promise<TransactionRecord> => {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('transactions')
    .upsert(payload, { onConflict: 'external_id' })
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return toTransactionRecord(data);
};

export const upsertTransactionByWiseId = async (
  payload: Omit<TransactionRow, 'id' | 'created_at' | 'updated_at' | 'external_id'>
): Promise<TransactionRecord> => {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('transactions')
    .upsert(payload, { onConflict: 'wise_id' })
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return toTransactionRecord(data);
};

export const findLatestTransactionBySourceAndCurrency = async (
  userId: string,
  source: TransactionSource,
  currency: string
): Promise<TransactionRecord | null> => {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .eq('source', source)
    .eq('currency', currency)
    .order('date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? toTransactionRecord(data) : null;
};

export const listTransactionsBySource = async (
  userId: string,
  source: TransactionSource
): Promise<TransactionRecord[]> => {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .eq('source', source)
    .order('date', { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map(toTransactionRecord);
};

export const listTransactionsBetween = async (
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<TransactionRecord[]> => {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .gte('date', startDate.toISOString())
    .lte('date', endDate.toISOString());

  if (error) {
    throw error;
  }

  return (data ?? []).map(toTransactionRecord);
};
