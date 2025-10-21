# HeySalad® Finance API

Production-ready Express + TypeScript backend providing Wise, Stripe, AI categorisation, and accounting services.

## Requirements

- Node.js 20+
- Supabase project URL and service role key (Postgres)
- Wise API token and Stripe secret (sandbox or production)

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Pick an environment file:
   - `.env.sandbox` – template prefilled for Wise sandbox testing on localhost. Duplicate it as `.env` or run with `npm run dev:sandbox`.
   - `.env.production` – template with placeholders for production secrets.
   - Alternatively create your own `.env` from scratch.
3. Run in development:
   ```bash
   npm run dev
   ```
4. Build for production:
   ```bash
   npm run build && npm start
   ```

Useful scripts:

- `npm run dev:sandbox` – load `.env.sandbox` and start the dev server.
- `npm run dev:prod` – load `.env.production` locally (still runs in dev mode, but with production creds).

### Wise environments

Wise exposes separate endpoints for Sandbox and Production, each with both TLS and mTLS hosts:

| Environment | TLS endpoint | mTLS endpoint |
|-------------|--------------|---------------|
| Sandbox     | `https://api.sandbox.transferwise.tech` | `https://api-mtls.sandbox.transferwise.tech` |
| Production  | `https://api.wise.com` | `https://api-mtls.transferwise.com` |

Use sandbox credentials when developing locally. If you need mTLS, set `WISE_USE_MTLS=true` and configure the relevant certificates in your runtime (for example, via `NODE_EXTRA_CA_CERTS` or a custom Axios agent).

### Dev utilities

To speed up local testing you can set `ALLOW_DEV_AUTO_LOGIN=true` and call `POST /api/auth/dev-login` with `{ "email": "user@example.com" }`. The endpoint is only available in development mode and issues a fresh access/refresh token pair without requiring a password.

## Testing

```bash
npm test
```

Unit tests currently cover encryption and burn-rate utilities. Add service and integration tests as features evolve.

## Project Structure

```
src/
  controllers/
  services/
  repositories/
  middleware/
  routes/
  jobs/
  utils/
```

Wise sync runs every 30 minutes via `node-cron` (`scheduleWiseSync`). Stripe webhooks expect a raw body at `/api/webhooks/stripe`.

### Supabase schema

See `src/repositories` for the expected table structures. At minimum you will need tables for:

- `users`
- `transactions`
- `balances`
- `journal_entries`
- `refresh_tokens`
- `category_overrides`
- `burn_rate_scenarios`

Each repository file documents the column names used when reading/writing through Supabase.

### Importing historical transactions

Upload CSV, XLSX, or PDF statements via:

```
POST /api/transactions/import
Content-Type: multipart/form-data (field name: file)
```

The importer de-duplicates by date + description + amount + currency hash and will auto-categorise each row using the AI classifier before generating double-entry journal entries.
