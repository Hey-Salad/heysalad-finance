import { FormEvent, ReactNode, useMemo, useState } from 'react';
import { DEV_TOKEN_STORAGE_KEY } from '../../constants/auth';

interface DevAuthGateProps {
  children: ReactNode;
}

const normalizeToken = (raw: string) => {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  return trimmed.startsWith('Bearer ') ? trimmed : `Bearer ${trimmed}`;
};

const DevAuthGate = ({ children }: DevAuthGateProps) => {
  const isDev = import.meta.env.DEV;
  const existingToken = useMemo(() => {
    if (typeof window === 'undefined') {
      return import.meta.env.VITE_DEV_AUTH_TOKEN ?? null;
    }
    const stored = localStorage.getItem(DEV_TOKEN_STORAGE_KEY);
    return stored ?? import.meta.env.VITE_DEV_AUTH_TOKEN ?? null;
  }, []);

  const [hasToken, setHasToken] = useState(Boolean(existingToken));
  const [isPromptOpen, setIsPromptOpen] = useState(isDev && !existingToken);
  const [input, setInput] = useState('');

  if (!isDev) {
    return <>{children}</>;
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = normalizeToken(input);
    if (!normalized) {
      return;
    }
    localStorage.setItem(DEV_TOKEN_STORAGE_KEY, normalized);
    setHasToken(true);
    setIsPromptOpen(false);
    setInput('');
  };

  const handleClear = () => {
    localStorage.removeItem(DEV_TOKEN_STORAGE_KEY);
    setHasToken(false);
    setIsPromptOpen(true);
    setInput('');
  };

  return (
    <>
      {children}
      <button
        type="button"
        onClick={() => setIsPromptOpen(true)}
        className="fixed bottom-4 right-4 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-primary text-white shadow-lg transition hover:bg-primary/90"
        aria-label={hasToken ? 'Update dev token' : 'Set dev token'}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="7.5" cy="15.5" r="3" />
          <path d="M10.2 13.2 21 2.5l1.5 1.5L14 12.5" />
          <path d="m12 14 2 2" />
        </svg>
      </button>
      {isPromptOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 px-4">
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-md space-y-4 rounded-lg bg-white p-6 shadow-xl"
          >
            <h2 className="text-lg font-semibold text-slate-800">Enter API token</h2>
            <p className="text-sm text-slate-500">
              Paste the JWT generated from the backend. The header prefix is added automatically
              if omitted.
            </p>
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              className="h-32 w-full rounded border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              placeholder="eyJhbGciOiJIUzI1NiIs..."
              spellCheck={false}
            />
            <div className="flex items-center justify-between gap-2">
              <div className="flex gap-2">
                {hasToken && (
                  <button
                    type="button"
                    onClick={() => setIsPromptOpen(false)}
                    className="rounded border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  className="rounded bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
                >
                  Save token
                </button>
              </div>
              {hasToken && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-sm text-red-500 hover:text-red-400"
                >
                  Clear stored token
                </button>
              )}
            </div>
          </form>
        </div>
      )}
    </>
  );
};

export default DevAuthGate;
