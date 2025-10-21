import { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import SummaryCard from '../components/cards/SummaryCard';

interface CashflowRow {
  month: string;
  inflow: number;
  outflow: number;
}

const defaultPlan: CashflowRow[] = Array.from({ length: 6 }, (_, index) => {
  const month = dayjs().add(index, 'month');
  return {
    month: month.format('MMM YYYY'),
    inflow: 0,
    outflow: 0
  };
});

const FinancialModelingPage = () => {
  const [plan, setPlan] = useState<CashflowRow[]>(defaultPlan);

  const totals = useMemo(() => {
    return plan.reduce(
      (acc, row) => {
        acc.inflow += row.inflow;
        acc.outflow += row.outflow;
        acc.net += row.inflow - row.outflow;
        return acc;
      },
      { inflow: 0, outflow: 0, net: 0 }
    );
  }, [plan]);

  const updateRow = (index: number, key: 'inflow' | 'outflow', value: number) => {
    setPlan((prev) =>
      prev.map((row, rowIndex) => (rowIndex === index ? { ...row, [key]: value } : row))
    );
  };

  return (
    <div className="flex w-full flex-col gap-6 px-4 pb-10 pt-2 sm:px-6 lg:px-10">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-slate-900">Financial modeling</h1>
          <p className="mt-2 max-w-xl text-sm text-slate-500">
            Draft short-term projections by adjusting inflows and outflows per month. Export coming soon.
          </p>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <SummaryCard title="Planned inflow" value={`€${totals.inflow.toLocaleString()}`} />
        <SummaryCard title="Planned outflow" value={`€${totals.outflow.toLocaleString()}`} />
        <SummaryCard
          title="Net position"
          value={`€${totals.net.toLocaleString()}`}
          subtext={totals.net >= 0 ? 'Positive outlook' : 'Review expenses'}
        />
      </section>

      <section className="overflow-x-auto rounded-2xl border border-slate-200 bg-white/80 shadow-sm ring-1 ring-slate-900/5">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Month</th>
              <th className="px-4 py-3 text-right font-medium">Inflow (€)</th>
              <th className="px-4 py-3 text-right font-medium">Outflow (€)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {plan.map((row, index) => (
              <tr key={row.month}>
                <td className="px-4 py-3 text-slate-700">{row.month}</td>
                <td className="px-4 py-3 text-right">
                  <input
                    type="number"
                    min={0}
                    className="w-32 rounded-md border border-slate-300 bg-white px-2 py-1 text-right text-sm"
                    value={row.inflow}
                    onChange={(event) => updateRow(index, 'inflow', Number(event.target.value))}
                  />
                </td>
                <td className="px-4 py-3 text-right">
                  <input
                    type="number"
                    min={0}
                    className="w-32 rounded-md border border-slate-300 bg-white px-2 py-1 text-right text-sm"
                    value={row.outflow}
                    onChange={(event) => updateRow(index, 'outflow', Number(event.target.value))}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
};

export default FinancialModelingPage;
