import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { calculateRunwayScenario, fetchBurnRateMetrics } from '../store/runwayApi';
import Loader from '../components/Loader';

const multipliers = [0.5, 0.75, 1, 1.25, 1.5];

const RunwayCalculatorPage = () => {
  const [revenueMultiplier, setRevenueMultiplier] = useState(1);
  const [expenseMultiplier, setExpenseMultiplier] = useState(1);
  const [scenarioResult, setScenarioResult] = useState<number | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['burn-rate'],
    queryFn: fetchBurnRateMetrics
  });

  const scenarioMutation = useMutation({
    mutationFn: () => calculateRunwayScenario({ revenueMultiplier, expenseMultiplier }),
    onSuccess: (result) => {
      setScenarioResult(result.scenarioRunway);
      queryClient.invalidateQueries({ queryKey: ['burn-rate'] });
    },
    onError: (error: unknown) =>
      window.alert(
        `Scenario calculation failed: ${
          error instanceof Error ? error.message : 'Unexpected error occurred'
        }`
      )
  });

  const effectiveRunway =
    scenarioResult ?? scenarioMutation.data?.scenarioRunway ?? data?.projectedRunwayMonths ?? 0;
  const delta =
    scenarioResult !== null && Number.isFinite(data.projectedRunwayMonths)
      ? scenarioResult - data.projectedRunwayMonths
      : null;

  const runwayStatus = useMemo(() => {
    if (!effectiveRunway || !Number.isFinite(effectiveRunway)) {
      return 'Default alive';
    }
    if (effectiveRunway < 3) return 'Critical';
    if (effectiveRunway < 6) return 'Warning';
    return 'Healthy';
  }, [effectiveRunway]);

  if (isLoading || !data) {
    return <Loader />;
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-heading text-2xl font-semibold text-slate-900">Runway Calculator</h2>
          <p className="text-sm text-slate-500">
            Explore best, base, and worst-case scenarios for monthly runway projections.
          </p>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm ring-1 ring-slate-900/5">
          <h3 className="text-sm font-semibold text-slate-700">Baseline Metrics</h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            <li>Current cash: €{data.currentCash.toLocaleString()}</li>
            <li>Average net burn: €{data.averageNetBurn.toFixed(2)} / month</li>
            <li>Average monthly income: €{data.averageMonthlyIncome.toFixed(2)}</li>
            <li>Average monthly expenses: €{data.averageMonthlyExpenses.toFixed(2)}</li>
            <li>Projected runway: {Number.isFinite(data.projectedRunwayMonths) ? `${data.projectedRunwayMonths.toFixed(1)} months` : '∞'}</li>
            <li>Status: {runwayStatus}</li>
          </ul>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm ring-1 ring-slate-900/5">
          <h3 className="text-sm font-semibold text-slate-700">Scenario Builder</h3>
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

      <section className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm ring-1 ring-slate-900/5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">Scenario Output</h3>
          {scenarioMutation.isPending && (
            <span className="inline-flex items-center gap-2 text-xs text-slate-500">
              <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
              Syncing…
            </span>
          )}
        </div>
        <p className="mt-3 text-sm text-slate-700">
          Runway with selected multipliers:{' '}
          {Number.isFinite(effectiveRunway) ? `${effectiveRunway.toFixed(1)} months` : '∞'}
        </p>
        {delta !== null && (
          <p className="text-xs text-slate-500">
            Change vs baseline: {delta >= 0 ? '+' : ''}
            {delta.toFixed(1)} months.
          </p>
        )}
        <p className="mt-2 text-xs text-slate-400">
          Save scenarios to persist them once backend integration is ready.
        </p>
      </section>
    </div>
  );
};

export default RunwayCalculatorPage;
