const AdminPage = () => (
  <div className="space-y-6">
    <header>
      <h2 className="font-heading text-2xl font-semibold text-slate-800">Admin Center</h2>
      <p className="text-sm text-slate-500">
        Monitor sync jobs, manage users, and review audit logs. Backend endpoints will hydrate this view.
      </p>
    </header>
    <section className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm ring-1 ring-slate-900/5">
      <h3 className="text-sm font-semibold text-slate-700">System Status</h3>
      <ul className="mt-3 space-y-2 text-sm text-slate-700">
        <li>Wise sync job: scheduled every 30 minutes</li>
        <li>Stripe webhook: awaiting verification</li>
        <li>Audit trail: coming soon</li>
      </ul>
    </section>
  </div>
);

export default AdminPage;
