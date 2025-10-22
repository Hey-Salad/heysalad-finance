import { useEffect, useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import logoUrl from '../public/logo.svg?url';
import wiseLogoUrl from '../public/wise-logo.svg?url';
import { DEV_TOKEN_STORAGE_KEY } from '../constants/auth';

type OAuthProvider = 'wise' | 'monzo' | 'google';

const providers: Array<{
  id: OAuthProvider;
  label: string;
  className: string;
  logo?: string;
  hideLabel?: boolean;
}> = [
  {
    id: 'wise',
    label: 'Continue with Wise',
    className:
      'bg-primary text-white hover:bg-primary-dark focus:ring-peach/40 disabled:bg-primary/70',
    logo: wiseLogoUrl
  },
  {
    id: 'monzo',
    label: 'Continue with Monzo',
    className:
      'bg-slate-900 text-white hover:bg-slate-800 focus:ring-slate-500/40 disabled:bg-slate-700'
  },
  {
    id: 'google',
    label: 'Continue with Google',
    className:
      'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 focus:ring-sky-300/40 disabled:bg-slate-100'
  }
];

const LandingPage = () => {
  const storedToken = useMemo(() => {
    if (typeof window === 'undefined') {
      return null;
    }
    try {
      return localStorage.getItem(DEV_TOKEN_STORAGE_KEY);
    } catch {
      return null;
    }
  }, []);

  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const oauthMutation = useMutation<{ provider: OAuthProvider; url: string }, unknown, OAuthProvider>({
    mutationFn: async (provider: OAuthProvider) => {
      setError(null);
      const response = await client.get(`/auth/oauth/${provider}/url`, {
        params: { redirect: '/oauth/callback' }
      });
      const data = response.data as { url: string };
      return { provider, ...data };
    },
    onSuccess: ({ url }) => {
      window.location.href = url;
    },
    onError: () => {
      setError('Unable to start sign-in. Please try again.');
    }
  });

  useEffect(() => {
    if (storedToken && storedToken.startsWith('Bearer ')) {
      navigate('/dashboard', { replace: true });
    }
  }, [navigate, storedToken]);

  const isProcessing = (provider: OAuthProvider) =>
    oauthMutation.isPending && oauthMutation.variables === provider;

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-4 py-12">
      <div className="flex w-full max-w-lg flex-col items-center rounded-3xl border border-slate-200 bg-white px-10 py-12 text-center shadow-sm">
        <img src={logoUrl} alt="HeySalad®" className="h-16 w-auto" />
        <p className="mt-4 text-sm text-slate-500">
          To access HeySalad® Finance, sign in with one of your connected accounts.
        </p>
        <div className="mt-6 flex w-full flex-col gap-3">
          {providers.map((provider) => (
            <button
              key={provider.id}
              type="button"
              className={`inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-base font-semibold shadow-sm transition focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto ${provider.className}`}
              onClick={() => oauthMutation.mutate(provider.id)}
              disabled={isProcessing(provider.id)}
              aria-label={provider.label}
            >
              {isProcessing(provider.id) ? (
                <>
                  <span className="block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Redirecting…
                </>
              ) : provider.logo ? (
                <>
                  <img src={provider.logo} alt={provider.label} className="h-10 w-auto object-contain" />
                  {!provider.hideLabel && <span>{provider.label}</span>}
                </>
              ) : (
                <span>{provider.label}</span>
              )}
            </button>
          ))}
        </div>
        {error && <p className="mt-3 text-sm text-rose-500">{error}</p>}
        <div className="mt-6 text-sm text-slate-500">
          Already connected?{' '}
          <a href="/dashboard" className="text-primary hover:underline">
            Go to dashboard
          </a>
        </div>
        <div className="mt-8 text-xs uppercase tracking-wide text-slate-300">
          HeySalad® OÜ · © 2025
        </div>
      </div>
    </main>
  );
};

export default LandingPage;
