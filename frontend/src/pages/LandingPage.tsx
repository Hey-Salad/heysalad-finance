import { useMutation } from '@tanstack/react-query';
import client from '../api/client';
import logoUrl from '../public/logo.svg?url';

const LandingPage = () => {
  const wiseAuthMutation = useMutation({
    mutationFn: async () => {
      const response = await client.get('/wise/oauth/url');
      return response.data as { url: string };
    },
    onSuccess: ({ url }) => {
      window.location.href = url;
    }
  });

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-4 py-12">
      <div className="flex w-full max-w-lg flex-col items-center rounded-3xl border border-slate-200 bg-white px-10 py-12 text-center shadow-sm">
        <img src={logoUrl} alt="HeySalad®" className="h-16 w-auto" />
        <p className="mt-4 text-sm text-slate-500">
          To access HeySalad® Finance, please log in with your Wise account.
        </p>
        <button
          type="button"
          className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-primary-dark focus:outline-none focus:ring-4 focus:ring-peach/40 disabled:opacity-50 sm:w-auto"
          onClick={() => wiseAuthMutation.mutate()}
          disabled={wiseAuthMutation.isPending}
        >
          {wiseAuthMutation.isPending ? 'Redirecting…' : 'Sign in with Wise'}
        </button>
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
