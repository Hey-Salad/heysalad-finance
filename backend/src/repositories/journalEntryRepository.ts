import { getSupabaseClient } from '../config/database';

export interface JournalEntryRecord {
  id: string;
  userId: string;
  date: Date;
  description: string;
  debitAccount: string;
  debitAmount: number;
  creditAccount: string;
  creditAmount: number;
  transactionId: string;
  createdAt: Date;
}

interface JournalEntryRow {
  id: string;
  user_id: string;
  date: string;
  description: string;
  debit_account: string;
  debit_amount: number;
  credit_account: string;
  credit_amount: number;
  transaction_id: string;
  created_at: string;
}

const toJournalEntryRecord = (row: JournalEntryRow): JournalEntryRecord => ({
  id: row.id,
  userId: row.user_id,
  date: new Date(row.date),
  description: row.description,
  debitAccount: row.debit_account,
  debitAmount: row.debit_amount,
  creditAccount: row.credit_account,
  creditAmount: row.credit_amount,
  transactionId: row.transaction_id,
  createdAt: new Date(row.created_at)
});

export const deleteEntriesByTransactionId = async (transactionId: string): Promise<void> => {
  const client = getSupabaseClient();
  const { error } = await client.from('journal_entries').delete().eq('transaction_id', transactionId);
  if (error) {
    throw error;
  }
};

export const insertJournalEntries = async (
  entries: Array<{
    userId: string;
    date: Date;
    description: string;
    debitAccount: string;
    debitAmount: number;
    creditAccount: string;
    creditAmount: number;
    transactionId: string;
  }>
): Promise<void> => {
  if (!entries.length) {
    return;
  }
  const client = getSupabaseClient();
  const payload = entries.map((entry) => ({
    user_id: entry.userId,
    date: entry.date.toISOString(),
    description: entry.description,
    debit_account: entry.debitAccount,
    debit_amount: entry.debitAmount,
    credit_account: entry.creditAccount,
    credit_amount: entry.creditAmount,
    transaction_id: entry.transactionId
  }));

  const { error } = await client.from('journal_entries').insert(payload);
  if (error) {
    throw error;
  }
};

export const listJournalEntries = async (
  userId: string,
  filters: { startDate?: Date; endDate?: Date }
): Promise<JournalEntryRecord[]> => {
  const client = getSupabaseClient();
  const query = client
    .from('journal_entries')
    .select('*')
    .eq('user_id', userId);

  if (filters.startDate) {
    query.gte('date', filters.startDate.toISOString());
  }
  if (filters.endDate) {
    query.lte('date', filters.endDate.toISOString());
  }

  query.order('date', { ascending: true });

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  return (data ?? []).map(toJournalEntryRecord);
};
