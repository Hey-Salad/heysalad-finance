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
  <div className="rounded-xl border border-slate-200 bg-white p-5">
    <h3 className="text-sm font-semibold text-slate-600">Recent Transactions</h3>
    <div className="mt-4 space-y-3">
      {transactions.map((transaction) => (
        <div key={transaction.id} className="flex items-center justify-between text-sm">
          <div>
            <p className="font-medium text-slate-800">{transaction.description}</p>
            <p className="text-xs text-slate-500">
              {dayjs(transaction.date).format('DD MMM YYYY')} · {transaction.category}
            </p>
          </div>
          <span className={transaction.amount >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
            {transaction.amount >= 0 ? '+' : '-'}
            {Math.abs(transaction.amount).toFixed(2)} {transaction.currency}
          </span>
        </div>
      ))}
      {transactions.length === 0 && (
        <p className="text-sm text-slate-500">
          No transactions yet. Connect Wise or upload statements to get started.
        </p>
      )}
    </div>
  </div>
);

export default RecentTransactions;
