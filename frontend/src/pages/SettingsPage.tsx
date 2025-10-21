import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import client from '../api/client';
import Loader from '../components/Loader';

const SettingsPage = () => {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const response = await client.get('/settings');
      return response.data;
    }
  });

  const [form, setForm] = useState({
    wiseToken: '',
    stripeKey: '',
    defaultCurrency: 'EUR',
    refreshInterval: 30
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      await client.put('/settings', {
        wiseToken: form.wiseToken || undefined,
        stripeKey: form.stripeKey || undefined,
        defaultCurrency: form.defaultCurrency,
        refreshInterval: form.refreshInterval
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings'] })
  });

  if (isLoading) {
    return <Loader />;
  }

  return (
    <div className="space-y-6">
      <header>
        <h2 className="font-heading text-2xl font-semibold text-slate-900">Settings</h2>
        <p className="text-sm text-slate-500">Manage API credentials, defaults, and sync preferences.</p>
      </header>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm ring-1 ring-slate-900/5">
          <h3 className="text-sm font-semibold text-slate-700">Wise Integration</h3>
          <p className="mt-2 text-xs text-slate-500">
            Securely stored with AES-256 encryption. Required for automatic sync.
          </p>
          <input
            type="password"
            placeholder="Wise API token"
            className="mt-3 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
            value={form.wiseToken}
            onChange={(event) => setForm((prev) => ({ ...prev, wiseToken: event.target.value }))}
          />
          <p className="mt-2 text-xs text-slate-500">
            Token configured: {data?.hasWiseToken ? 'Yes' : 'No'}. Update token to rotate credentials.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm ring-1 ring-slate-900/5">
          <h3 className="text-sm font-semibold text-slate-700">Stripe Integration</h3>
          <input
            type="password"
            placeholder="Stripe secret key"
            className="mt-3 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
            value={form.stripeKey}
            onChange={(event) => setForm((prev) => ({ ...prev, stripeKey: event.target.value }))}
          />
          <p className="mt-2 text-xs text-slate-500">
            Key configured: {data?.hasStripeKey ? 'Yes' : 'No'}.
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm ring-1 ring-slate-900/5">
        <h3 className="text-sm font-semibold text-slate-700">Preferences</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs uppercase tracking-wide text-slate-400">Default currency</label>
            <input
              type="text"
              maxLength={3}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm uppercase"
              value={form.defaultCurrency}
              onChange={(event) => setForm((prev) => ({ ...prev, defaultCurrency: event.target.value.toUpperCase() }))}
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-slate-400">Refresh interval (minutes)</label>
            <input
              type="number"
              min={5}
              max={180}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
              value={form.refreshInterval}
              onChange={(event) => setForm((prev) => ({ ...prev, refreshInterval: Number(event.target.value) }))}
            />
          </div>
        </div>
        <button
          type="button"
          className="mt-4 rounded-md bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary/90"
          onClick={() => updateMutation.mutate()}
          disabled={updateMutation.isPending}
        >
          {updateMutation.isPending ? 'Saving…' : 'Save changes'}
        </button>
      </section>
    </div>
  );
};

export default SettingsPage;
