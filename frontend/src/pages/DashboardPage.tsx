import clsx from 'clsx';
import dayjs from 'dayjs';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Loader from '../components/Loader';
import BalanceTrendChart from '../components/charts/BalanceTrendChart';
import IncomeExpenseChart from '../components/charts/IncomeExpenseChart';
import RecentTransactions from '../components/transactions/RecentTransactions';
import { fetchDashboardSummary } from '../api/dashboard';

const statusBadge = (tone: 'positive' | 'warning' | 'critical' | 'neutral') =>
  clsx(
    'inline-flex items-center rounded-full px-4 py-1.5 text-xs font-semibold',
    tone === 'positive' && 'bg-emerald-100 text-emerald-700',
    tone === 'warning' && 'bg-amber-100 text-amber-700',
    tone === 'critical' && 'bg-rose-100 text-rose-700',
    tone === 'neutral' && 'bg-slate-100 text-slate-600'
  );

const formatCurrency = (amount: number, currency = 'EUR') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);

const DashboardPage = () => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: fetchDashboardSummary,
    staleTime: 60_000,
    retry: 1
  });

  const balanceTrendData = useMemo(() => {
    if (!data?.burnRateHistory?.length) {
      return [];
    }
    const runningBalance: { date: string; value: number }[] = [];
    let currentBalance = data.burnRate.currentCash;
    [...data.burnRateHistory]
      .slice()
      .reverse()
      .forEach((period, index) => {
        const label = dayjs(period.month).format('MMM YYYY');
        if (index === 0) {
          runningBalance.push({ date: label, value: currentBalance });
        } else {
          currentBalance -= period.netBurn;
          runningBalance.push({ date: label, value: currentBalance });
        }
      });
    return runningBalance.reverse();
  }, [data?.burnRate.currentCash, data?.burnRateHistory]);

  const incomeExpenseData = useMemo(() => {
    if (!data?.burnRateHistory?.length) {
      return [];
    }
    return data.burnRateHistory.map((period) => ({
      month: dayjs(period.month).format('MMM YYYY'),
      income: period.income,
      expenses: period.expenses
    }));
  }, [data?.burnRateHistory]);

  if (isLoading) {
    return <Loader />;
  }

  if (isError || !data) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-rose-700">
        <h2 className="text-lg font-semibold">Unable to load dashboard</h2>
        <p className="mt-2 text-sm">Please verify your integrations, then refresh to try again.</p>
      </div>
    );
  }

  const totalBalance = data.balances.reduce((sum, balance) => sum + balance.amount, 0);
  const primaryBalance = data.balances.find((balance) => balance.currency === 'EUR') ?? data.balances[0];
  const primaryCurrency = primaryBalance?.currency ?? 'EUR';
  const runway = data.burnRate.projectedRunwayMonths;
  const lastTransaction = data.recentTransactions[0];

  const summaryChips = [
    { label: 'Active Accounts', value: data.balances.length.toString() },
    {
      label: 'Net Burn (30d)',
      value: formatCurrency(data.burnRate.netBurnRate.thirtyDay ?? data.burnRate.averageNetBurn, primaryCurrency)
    },
    {
      label: 'Runway',
      value: Number.isFinite(runway) ? `${runway.toFixed(1)} mo` : '∞'
    }
  ];

  const cashStatus = (primaryBalance?.amount ?? 0) >= 0
    ? { label: 'Online', tone: 'positive' as const }
    : { label: 'Attention', tone: 'critical' as const };

  const burnStatus = (() => {
    if (!Number.isFinite(runway)) {
      return { label: 'Stable', tone: 'positive' as const };
    }
    if (runway >= 12) return { label: 'Healthy', tone: 'positive' as const };
    if (runway >= 6) return { label: 'Degrading', tone: 'warning' as const };
    return { label: 'Critical', tone: 'critical' as const };
  })();

  const activityStatus = lastTransaction
    ? {
        label: lastTransaction.type === 'income' ? 'Income' : lastTransaction.type === 'expense' ? 'Expense' : 'Transfer',
        tone:
          lastTransaction.type === 'income'
            ? ('positive' as const)
            : lastTransaction.type === 'expense'
            ? ('critical' as const)
            : ('warning' as const)
      }
    : { label: 'Idle', tone: 'neutral' as const };

  const cards = [
    {
      title: 'Cash Hub',
      subtitle: `Wise · Primary ${primaryCurrency}`,
      status: cashStatus,
      metrics: [
        { label: 'Balance', value: formatCurrency(primaryBalance?.amount ?? 0, primaryCurrency) },
        { label: 'Currencies synced', value: data.balances.length },
        { label: 'Total holdings', value: formatCurrency(totalBalance, primaryCurrency) }
      ],
      note: `Monitoring ${data.balances.length} Wise balances across currencies.`
    },
    {
      title: 'Burn Rate',
      subtitle: 'Last 30 days snapshot',
      status: burnStatus,
      metrics: [
        { label: 'Net burn', value: formatCurrency(data.burnRate.averageNetBurn, primaryCurrency) },
        { label: 'Monthly income', value: formatCurrency(data.burnRate.averageMonthlyIncome, primaryCurrency) },
        { label: 'Runway', value: Number.isFinite(runway) ? `${runway.toFixed(1)} months` : 'Indefinite' }
      ],
      note: 'Runway updates automatically as new transactions sync from Wise and Stripe.'
    },
    {
      title: 'Latest Activity',
      subtitle: lastTransaction
        ? `${lastTransaction.description} · ${dayjs(lastTransaction.date).format('MMM D, HH:mm')}`
        : 'No transactions yet',
      status: activityStatus,
      metrics: [
        {
          label: 'Amount',
          value: lastTransaction
            ? `${lastTransaction.amount >= 0 ? '+' : '-'}${formatCurrency(
                Math.abs(lastTransaction.amount),
                lastTransaction.currency
              )}`
            : '—'
        },
        { label: 'Category', value: lastTransaction ? lastTransaction.category : 'Awaiting data' },
        { label: 'Transactions today', value: data.recentTransactions.length }
      ],
      note: lastTransaction
        ? `Source: ${lastTransaction.source.toUpperCase()}. View details in Transactions.`
        : 'Upload a CSV, Excel, or PDF to jump-start your ledger.'
    }
  ];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col space-y-10">
      <section className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-display text-4xl text-slate-900">Finance Pulse</h1>
          <p className="max-w-2xl text-base text-slate-500">
            Live heartbeat of balances, burn rate, and revenue across your HeySalad finance stack.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {summaryChips.map((chip) => (
            <div
              key={chip.label}
              className="flex flex-col rounded-full border border-slate-200 bg-white px-6 py-3 shadow-sm"
            >
              <span className="text-xs uppercase text-slate-400">{chip.label}</span>
              <span className="text-base font-semibold text-slate-700">{chip.value}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        {cards.map((card) => (
          <article key={card.title} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">{card.title}</h3>
                <p className="text-sm text-slate-500">{card.subtitle}</p>
              </div>
              <span className={statusBadge(card.status.tone)}>{card.status.label}</span>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              {card.metrics.map((metric) => (
                <div key={`${card.title}-${metric.label}`}>
                  <p className="text-xs uppercase text-slate-400">{metric.label}</p>
                  <p className="mt-1 text-lg font-semibold text-slate-800">{metric.value}</p>
                </div>
              ))}
            </div>
            <p className="mt-5 text-sm text-slate-500">{card.note}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-600">Cash Balance Trend</h3>
          {balanceTrendData.length ? (
            <div className="mt-4">
              <BalanceTrendChart data={balanceTrendData} />
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500">
              Balance history unavailable. Sync transactions to populate historical cash data.
            </p>
          )}
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-600">Income vs Expenses</h3>
          {incomeExpenseData.length ? (
            <div className="mt-4">
              <IncomeExpenseChart data={incomeExpenseData} />
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500">
              Not enough history yet. Keep syncing data to build a track record.
            </p>
          )}
        </div>
      </section>

      <section>
        <RecentTransactions transactions={data.recentTransactions} />
      </section>
    </div>
  );
};

export default DashboardPage;
