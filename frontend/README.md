# HeySalad Finance Frontend

React + TypeScript dashboard for HeySalad Finance.

## Scripts

- `npm run dev` – Start Vite dev server on port 5173
- `npm run build` – Create production build
- `npm run preview` – Preview built app
- `npm run lint` – Run ESLint
- `npm run test` – Run Vitest unit tests

## Environment

Create `.env.local` and set:

```
VITE_API_URL=http://localhost:4000/api
```

## Stack

- React 18, React Router 7
- Zustand for lightweight state (coming soon)
- React Query for data fetching
- Tailwind CSS for styling
- Recharts for charts
- Vitest + Testing Library

## Features

- Live balances, burn-rate analytics, and recent transactions from the backend API.
- Upload CSV, Excel, or PDF statements from the Transactions page to auto-generate data.
- HeySalad brand styling with Grandstander (display) and Figtree (body) fonts.
