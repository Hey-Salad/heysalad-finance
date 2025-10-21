import SummaryCard from '../components/cards/SummaryCard';

const agents = [
  { name: 'Wise Sync', status: 'Running', schedule: 'Every 30 minutes' },
  { name: 'Stripe Imports', status: 'Idle', schedule: 'On demand' },
  { name: 'Statement Ingestor', status: 'Paused', schedule: 'Manual upload' }
];

const AgentsPage = () => (
  <div className="flex w-full flex-col gap-6 px-4 pb-10 pt-2 sm:px-6 lg:px-10">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-slate-900">Automation agents</h1>
        <p className="mt-2 max-w-xl text-sm text-slate-500">
          Monitor operational jobs and trigger syncs when needed. Live control panel coming soon.
        </p>
      </div>
    </header>

    <section className="grid gap-4 sm:grid-cols-3">
      <SummaryCard title="Active agents" value="3" />
      <SummaryCard title="Next run" value="12:30" subtext="Wise sync" />
      <SummaryCard title="Manual actions" value="2" subtext="Stripe · Statement ingestor" />
    </section>

    <section className="space-y-3">
      {agents.map((agent) => (
        <div
          key={agent.name}
          className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white/80 px-4 py-4 shadow-sm ring-1 ring-slate-900/5"
        >
          <div>
            <p className="text-sm font-semibold text-slate-800">{agent.name}</p>
            <p className="text-xs uppercase tracking-wide text-slate-400">{agent.schedule}</p>
          </div>
          <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-600">
            {agent.status}
          </span>
        </div>
      ))}
    </section>
  </div>
);

export default AgentsPage;
