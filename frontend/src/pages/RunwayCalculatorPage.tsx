import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { calculateRunwayScenario, fetchBurnRateMetrics } from '../store/runwayApi';
import Loader from '../components/Loader';

const multipliers = [0.5, 0.75, 1, 1.25, 1.5];

const RunwayCalculatorPage = () => {
  const [revenueMultiplier, setRevenueMultiplier] = useState(1);
  const [expenseMultiplier, setExpenseMultiplier] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['burn-rate'],
    queryFn: fetchBurnRateMetrics
  });

  const scenarioMutation = useMutation({
    mutationFn: () => calculateRunwayScenario({ revenueMultiplier, expenseMultiplier }),
    onError: (error: unknown) =>
      window.alert(
        `Scenario calculation failed: ${
          error instanceof Error ? error.message : 'Unexpected error occurred'
        }`
      )
  });

  const scenarioRunway = scenarioMutation.data?.scenarioRunway ?? data?.projectedRunwayMonths ?? 0;

  const runwayStatus = useMemo(() => {
    if (!scenarioRunway || !Number.isFinite(scenarioRunway)) {
      return 'Default alive';
    }
    if (scenarioRunway < 3) return 'Critical';
    if (scenarioRunway < 6) return 'Warning';
    return 'Healthy';
  }, [scenarioRunway]);

  if (isLoading || !data) {
    return <Loader />;
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl text-slate-800">Runway Calculator</h2>
          <p className="text-sm text-slate-500">
            Explore best, base, and worst-case scenarios for monthly runway projections.
          </p>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-600">Baseline Metrics</h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            <li>Current cash: €{data.currentCash.toLocaleString()}</li>
            <li>Average net burn: €{data.averageNetBurn.toFixed(2)} / month</li>
            <li>Average monthly income: €{data.averageMonthlyIncome.toFixed(2)}</li>
            <li>Average monthly expenses: €{data.averageMonthlyExpenses.toFixed(2)}</li>
            <li>Projected runway: {Number.isFinite(data.projectedRunwayMonths) ? `${data.projectedRunwayMonths.toFixed(1)} months` : '∞'}</li>
            <li>Status: {runwayStatus}</li>
          </ul>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-600">Scenario Builder</h3>
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs uppercase tracking-wide text-slate-500">Revenue multiplier</label>
              <select
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                value={revenueMultiplier}
                onChange={(event) => setRevenueMultiplier(Number(event.target.value))}
              >
                {multipliers.map((value) => (
                  <option key={value} value={value}>
                    {value}x
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs uppercase tracking-wide text-slate-500">Expense multiplier</label>
              <select
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                value={expenseMultiplier}
                onChange={(event) => setExpenseMultiplier(Number(event.target.value))}
              >
                {multipliers.map((value) => (
                  <option key={value} value={value}>
                    {value}x
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button
            type="button"
            className="mt-4 rounded-md bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary/90"
            onClick={() => scenarioMutation.mutate()}
            disabled={scenarioMutation.isPending}
          >
            {scenarioMutation.isPending ? 'Calculating…' : 'Calculate Scenario'}
          </button>
        </section>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-600">Scenario Output</h3>
        <p className="mt-3 text-sm text-slate-700">
          Runway with selected multipliers: {Number.isFinite(scenarioRunway) ? `${scenarioRunway.toFixed(1)} months` : '∞'}
        </p>
        <p className="text-xs text-slate-500">Save scenarios to persist them once backend integration is ready.</p>
      </section>
    </div>
  );
};

export default RunwayCalculatorPage;
