import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import client from '../api/client';
import Loader from '../components/Loader';

const SettingsPage = () => {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
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
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    const status = searchParams.get('wise');
    const reason = searchParams.get('reason');
    if (!status) {
      return;
    }
    if (status === 'linked') {
      setBanner({ type: 'success', message: 'Wise account linked successfully.' });
    } else {
      setBanner({
        type: 'error',
        message: `Wise linking failed${reason ? `: ${reason}` : '.'}`
      });
    }
    const next = new URLSearchParams(searchParams);
    next.delete('wise');
    next.delete('reason');
    setSearchParams(next, { replace: true });
    queryClient.invalidateQueries({ queryKey: ['settings'] });
  }, [queryClient, searchParams, setSearchParams]);

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

  const wiseOauthMutation = useMutation({
    mutationFn: async () => {
      const response = await client.get('/wise/oauth/url');
      return response.data as { url: string };
    },
    onSuccess: (payload) => {
      window.location.href = payload.url;
    },
    onError: () => {
      setBanner({ type: 'error', message: 'Unable to start Wise linking flow. Please try again.' });
    }
  });

  if (isLoading) {
    return <Loader />;
  }

  return (
    <div className="space-y-6">
      {banner && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            banner.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-rose-200 bg-rose-50 text-rose-700'
          }`}
        >
          {banner.message}
        </div>
      )}
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
          <button
            type="button"
            className="mt-3 inline-flex items-center gap-2 rounded-md border border-primary bg-white px-3 py-2 text-sm font-medium text-primary hover:bg-primary hover:text-white"
            onClick={() => wiseOauthMutation.mutate()}
            disabled={wiseOauthMutation.isPending}
          >
            {wiseOauthMutation.isPending ? (
              <>
                <span className="block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Redirecting…
              </>
            ) : (
              'Connect with Wise'
            )}
          </button>
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
