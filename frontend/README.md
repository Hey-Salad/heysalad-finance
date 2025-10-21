# HeySalad Finance Frontend

React + TypeScript dashboard for HeySalad Finance. It consumes the Supabase-backed REST API exposed by the backend service.

## Scripts

- `npm run dev` – Start Vite dev server on port 5173
- `npm run build` – Create production build
- `npm run preview` – Preview built app
- `npm run lint` – Run ESLint
- `npm run test` – Run Vitest unit tests

## Environment

Create `.env.local` (or edit the provided `.env`) and set:

```
# Local API
VITE_API_URL=http://localhost:4000/api

# Optional: override branding assets or feature flags here
```

The dashboard expects the backend to expose Supabase data through its REST endpoints. No direct Supabase client is used in the UI today.

## Stack

- React 18, React Router 7
- Zustand for lightweight state (on deck)
- React Query for data fetching/caching
- Tailwind CSS for styling
- Recharts for charts
- Vitest + Testing Library

## Features

- Live balances, burn-rate analytics, and recent transactions from the backend API.
- Upload CSV, Excel, or PDF statements from the Transactions page to auto-generate data.
- HeySalad brand styling with Grandstander (display) and Figtree (body) fonts.
- Responsive sidebar/top-bar layout with accessible navigation states.
