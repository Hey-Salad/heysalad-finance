const AdminPage = () => (
  <div className="space-y-6">
    <header>
      <h2 className="font-display text-2xl text-slate-800">Admin Center</h2>
      <p className="text-sm text-slate-500">
        Monitor sync jobs, manage users, and review audit logs. Backend endpoints will hydrate this view.
      </p>
    </header>
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-600">System Status</h3>
      <ul className="mt-3 space-y-2 text-sm text-slate-700">
        <li>Wise sync job: scheduled every 30 minutes</li>
        <li>Stripe webhook: awaiting verification</li>
        <li>Audit trail: coming soon</li>
      </ul>
    </section>
  </div>
);

export default AdminPage;
