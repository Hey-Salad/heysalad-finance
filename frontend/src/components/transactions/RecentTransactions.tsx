import dayjs from 'dayjs';

interface TransactionItem {
  id: string;
  date: string;
  description: string;
  amount: number;
  currency: string;
  category: string;
  type: string;
}

interface RecentTransactionsProps {
  transactions: TransactionItem[];
}

const RecentTransactions = ({ transactions }: RecentTransactionsProps) => (
  <div className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm ring-1 ring-slate-900/5">
    <h3 className="text-sm font-semibold text-slate-700">Recent Transactions</h3>
    <div className="mt-4 divide-y divide-slate-200">
      {transactions.map((transaction) => (
        <div key={transaction.id} className="flex items-center justify-between py-3 text-sm">
          <div>
            <p className="font-medium text-slate-800">{transaction.description}</p>
            <p className="text-xs text-slate-500">
              {dayjs(transaction.date).format('DD MMM YYYY')} · {transaction.category}
            </p>
          </div>
          <span
            className={transaction.amount >= 0 ? 'text-emerald-500' : 'text-rose-500'}
          >
            {transaction.amount >= 0 ? '+' : '-'}
            {Math.abs(transaction.amount).toFixed(2)} {transaction.currency}
          </span>
        </div>
      ))}
      {transactions.length === 0 && (
        <p className="py-4 text-sm text-slate-500">
          No transactions yet. Connect Wise or upload statements to get started.
        </p>
      )}
    </div>
  </div>
);

export default RecentTransactions;
