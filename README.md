# HeySalad® Finance

Monorepo for the HeySalad® Finance platform. It contains the production API and the customer dashboard that run on top of the same Supabase/Postgres data store.

| Package   | Description                                                                 |
|-----------|-----------------------------------------------------------------------------|
| `backend` | Express + TypeScript API (Wise, Stripe, accounting jobs, Supabase data layer) |
| `frontend`| React + Vite dashboard for financial insights and runway planning           |

## Requirements

- Node.js 20+
- Supabase project (URL + service role key) with the tables referenced in `backend/src/repositories`
- pnpm/npm (repo currently uses npm lockfiles)

## Quick Start

1. Clone the repo and install dependencies:
   ```bash
   npm install --prefix backend
   npm install --prefix frontend
   ```
2. Configure environment variables (see the dedicated README in each package for the full list).
3. Run the API:
   ```bash
   npm run dev --prefix backend
   ```
4. Run the dashboard:
   ```bash
   npm run dev --prefix frontend
   ```

## Documentation

- [`backend/README.md`](backend/README.md) – Supabase schema, env vars, jobs, and testing hints.
- [`frontend/README.md`](frontend/README.md) – Dashboard scripts, env, and stack notes.

## Contributing

- Keep `.env*` files out of version control (see `.gitignore`).
- Run linting/tests inside each package before opening a PR.
