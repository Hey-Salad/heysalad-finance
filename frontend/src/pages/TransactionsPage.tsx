import { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import {
  type ImportSummary,
  fetchTransactions,
  importTransactionsFromFile,
  triggerWiseSync,
  updateTransaction
} from '../api/transactions';
import Loader from '../components/Loader';

interface Filters {
  page: number;
  limit: number;
  search?: string;
  category?: string;
  type?: string;
}

const defaultFilters: Filters = {
  page: 1,
  limit: 20
};

const TransactionsPage = () => {
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['transactions', filters],
    queryFn: () => fetchTransactions(filters)
  });

  const updateMutation = useMutation({
    mutationFn: (payload: { id: string; category?: string }) =>
      updateTransaction(payload.id, { category: payload.category }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['transactions'] })
  });

  const syncMutation = useMutation({
    mutationFn: triggerWiseSync,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['transactions'] })
  });

  const importMutation = useMutation({
    mutationFn: importTransactionsFromFile,
    onSuccess: (response: ImportSummary) => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      window.alert(`Imported ${response.imported} transactions (${response.skipped} skipped as duplicates).`);
    },
    onError: (error: unknown) => {
      window.alert(
        `Upload failed: ${error instanceof Error ? error.message : 'Unable to process the provided file.'}`
      );
    }
  });

  const transactions = data?.data ?? [];
  const pagination = data?.pagination;

  const categories = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach((transaction: any) => set.add(transaction.category));
    return Array.from(set);
  }, [transactions]);

  if (isLoading) {
    return <Loader />;
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-heading text-2xl font-semibold text-slate-900">Transactions</h2>
          <p className="text-sm text-slate-500">
            Combined view of Wise and Stripe data. Override categories, sync on demand, or upload historical
            statements to auto-generate entries.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded-md border border-primary px-3 py-2 text-sm font-medium text-primary hover:bg-primary hover:text-white"
            onClick={() => syncMutation.mutate({})}
            disabled={syncMutation.isPending}
          >
            {syncMutation.isPending ? 'Syncing…' : 'Sync from Wise'}
          </button>
          <button
            type="button"
            className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-white shadow hover:bg-primary/90"
            onClick={() => fileInputRef.current?.click()}
            disabled={importMutation.isPending}
          >
            {importMutation.isPending ? 'Uploading…' : 'Upload CSV / Excel / PDF'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xls,.xlsx,.pdf"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                importMutation.mutate(file);
                event.target.value = '';
              }
            }}
          />
        </div>
      </header>

      <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm ring-1 ring-slate-900/5">
        <div className="grid gap-3 md:grid-cols-3">
          <input
            type="text"
            placeholder="Search description"
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
            onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value, page: 1 }))}
          />
          <select
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
            onChange={(event) =>
              setFilters((prev) => ({
                ...prev,
                category: event.target.value || undefined,
                page: 1
              }))
            }
          >
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          <select
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
            onChange={(event) =>
              setFilters((prev) => ({
                ...prev,
                type: event.target.value || undefined,
                page: 1
              }))
            }
          >
            <option value="">All types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
            <option value="transfer">Transfer</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white/80 shadow-sm ring-1 ring-slate-900/5">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Date</th>
              <th className="px-4 py-3 text-left font-medium">Description</th>
              <th className="px-4 py-3 text-left font-medium">Category</th>
              <th className="px-4 py-3 text-right font-medium">Amount</th>
              <th className="px-4 py-3 text-left font-medium">Source</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {transactions.map((transaction: any) => (
              <tr key={transaction._id}>
                <td className="px-4 py-3 text-slate-600">
                  {dayjs(transaction.date).format('YYYY-MM-DD')}
                </td>
                <td className="px-4 py-3 text-slate-700">{transaction.description}</td>
                <td className="px-4 py-3 text-slate-600">
                  <select
                    className="rounded-md border border-slate-300 bg-white px-2 py-1"
                    value={transaction.category}
                    onChange={(event) =>
                      updateMutation.mutate({ id: transaction._id, category: event.target.value })
                    }
                  >
                    <option value={transaction.category}>{transaction.category}</option>
                  </select>
                </td>
                <td
                  className={`px-4 py-3 text-right ${
                    transaction.amount >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {transaction.amount.toFixed(2)} {transaction.currency}
                </td>
                <td className="px-4 py-3 text-slate-500 uppercase">{transaction.source}</td>
              </tr>
            ))}
            {transactions.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                  No transactions match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pagination && (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded-md border border-slate-300 px-3 py-1 hover:bg-slate-100"
              disabled={pagination.page === 1}
              onClick={() => setFilters((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
            >
              Previous
            </button>
            <button
              type="button"
              className="rounded-md border border-slate-300 px-3 py-1 hover:bg-slate-100"
              disabled={pagination.page === pagination.totalPages}
              onClick={() =>
                setFilters((prev) => ({ ...prev, page: Math.min(pagination.totalPages, prev.page + 1) }))
              }
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionsPage;
