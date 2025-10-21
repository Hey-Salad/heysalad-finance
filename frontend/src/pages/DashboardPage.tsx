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
    'inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium',
    tone === 'positive' && 'border-emerald-200 bg-emerald-50 text-emerald-600',
    tone === 'warning' && 'border-amber-200 bg-amber-50 text-amber-600',
    tone === 'critical' && 'border-rose-200 bg-rose-50 text-rose-600',
    tone === 'neutral' && 'border-slate-200 bg-slate-50 text-slate-500'
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

  const summaryTiles = [
    {
      label: 'Balances',
      value: data.balances.length.toString(),
      icon: (
        <svg className="h-4 w-4 text-primary" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M3 7h18v2H3zM5 11h14v10H5z" opacity=".4" />
          <path d="M10 2h4v3h-4zM8 15h8v2H8z" />
        </svg>
      )
    },
    {
      label: 'Net burn',
      value: formatCurrency(
        data.burnRate.netBurnRate.thirtyDay ?? data.burnRate.averageNetBurn,
        primaryCurrency
      ),
      icon: (
        <svg className="h-4 w-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M4 14s1.5-2.5 4-4c2-1.2 3-2 4-6 1 3.5 3 4.5 5 6.5s1 5.5-1 7c-3 2.5-7-.5-7-.5" />
        </svg>
      )
    },
    {
      label: 'Runway',
      value: Number.isFinite(runway) ? `${runway.toFixed(1)} mo` : '∞',
      icon: (
        <svg className="h-4 w-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M12 2v20M4 18l8 4 8-4M4 6l8-4 8 4" />
          <path d="M4 14l8 4 8-4M4 10l8 4 8-4" opacity=".5" />
        </svg>
      )
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
      subtitle: primaryCurrency,
      status: cashStatus,
      empty: false,
      icon: (
        <svg className="h-5 w-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M3 10h18" />
        </svg>
      ),
      metrics: [
        { label: 'Balance', value: formatCurrency(primaryBalance?.amount ?? 0, primaryCurrency) },
        { label: 'Currencies', value: data.balances.length.toString() },
        { label: 'Total', value: formatCurrency(totalBalance, primaryCurrency) }
      ]
    },
    {
      title: 'Burn Rate',
      subtitle: '30 day view',
      status: burnStatus,
      empty: !Number.isFinite(runway),
      icon: (
        <svg className="h-5 w-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M5 12a7 7 0 0 1 11-5.3c1.5 1.4 2.6 3.8 2.6 5.9A7.6 7.6 0 0 1 12 21a5.2 5.2 0 0 1-5-4l2.5-1.5A2.5 2.5 0 0 0 12 18a3.2 3.2 0 0 0 3-3.4c0-1.2-.7-2.4-1.9-3.5" />
        </svg>
      ),
      metrics: [
        { label: 'Net burn', value: formatCurrency(data.burnRate.averageNetBurn, primaryCurrency) },
        { label: 'Income', value: formatCurrency(data.burnRate.averageMonthlyIncome, primaryCurrency) },
        { label: 'Runway', value: Number.isFinite(runway) ? `${runway.toFixed(1)} mo` : 'Sync to calculate' }
      ]
    },
    {
      title: 'Latest Activity',
      subtitle: lastTransaction ? dayjs(lastTransaction.date).format('MMM D · HH:mm') : 'No transactions',
      status: activityStatus,
      empty: !lastTransaction,
      icon: (
        <svg className="h-5 w-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M3 8h18M3 12h8M3 16h5" />
          <circle cx="17" cy="16" r="4" />
          <path d="m15.5 16 1.5 1.5 2.5-2.5" />
        </svg>
      ),
      metrics: [
        {
          label: 'Amount',
          value: lastTransaction
            ? `${lastTransaction.amount >= 0 ? '+' : '-'}${formatCurrency(
                Math.abs(lastTransaction.amount),
                lastTransaction.currency
              )}`
            : 'Add data'
        },
        { label: 'Category', value: lastTransaction ? lastTransaction.category : 'Awaiting data' },
        { label: 'Today', value: data.recentTransactions.length.toString() }
      ]
    }
  ];

  return (
    <div className="flex w-full flex-col gap-8 px-4 pb-10 pt-2 sm:px-6 lg:px-10">
      <section className="grid gap-4 lg:grid-cols-[1.4fr,1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm ring-1 ring-slate-900/5">
          <h1 className="font-heading text-2xl font-semibold text-slate-900">Finance Pulse</h1>
          <p className="mt-2 text-sm text-slate-500">Instant snapshot of liquidity, burn, and momentum.</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {summaryTiles.map((tile) => (
              <div
                key={tile.label}
                className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-light-peach/30">{tile.icon}</span>
                <div>
                  <p className="text-xs uppercase text-slate-400">{tile.label}</p>
                  <p className="text-sm font-semibold text-slate-800">{tile.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm ring-1 ring-slate-900/5">
          <h2 className="flex items-center gap-2 font-heading text-lg font-semibold text-slate-900">
            <svg className="h-5 w-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M4 19h16M4 15l4-8 4 6 4-4 4 6" />
            </svg>
            Performance
          </h2>
          <div className="mt-5 grid gap-3 text-sm text-slate-600">
            <div className="flex justify-between">
              <span>Primary balance</span>
              <span className="font-semibold text-slate-800">
                {formatCurrency(primaryBalance?.amount ?? 0, primaryCurrency)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Runway outlook</span>
              <span className={statusBadge(burnStatus.tone)}>{burnStatus.label}</span>
            </div>
            <div className="flex justify-between">
              <span>Last sync</span>
              <span>{lastTransaction ? dayjs(lastTransaction.date).fromNow() : 'Awaiting data'}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <article
            key={card.title}
            className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm ring-1 ring-slate-900/5"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-light-peach/40 text-primary">
                {card.icon}
              </span>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-slate-900">{card.title}</h3>
                <p className="text-xs uppercase tracking-wide text-slate-400">{card.subtitle}</p>
              </div>
              <span className={statusBadge(card.status.tone)}>{card.status.label}</span>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              {card.metrics.map((metric) => (
                <div key={`${card.title}-${metric.label}`}>
                  <p className="text-[11px] uppercase text-slate-400">{metric.label}</p>
                  <p className="mt-1 text-lg font-semibold text-slate-800">{metric.value}</p>
                </div>
              ))}
            </div>
            {card.empty && (
              <div className="mt-5 flex items-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-3 text-sm text-slate-500">
                <svg className="h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                <span>Sync with Wise/Stripe to populate this card.</span>
              </div>
            )}
          </article>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm ring-1 ring-slate-900/5">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <svg className="h-4 w-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M4 19h16M4 15l4-8 4 6 4-4 4 6" />
            </svg>
            Cash trend
          </h3>
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
        <div className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm ring-1 ring-slate-900/5">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <svg className="h-4 w-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M4 6h16M4 12h10M4 18h7" />
            </svg>
            Income vs expenses
          </h3>
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
