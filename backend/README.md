# HeySalad Finance API

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
2. Create `.env` from `.env.example` and set:
   ```
   SUPABASE_URL=https://<your-supabase-project>.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=service-role-key
   JWT_SECRET=...
   JWT_REFRESH_SECRET=...
   ENCRYPTION_KEY=32-char-hex
   WISE_API_URL=https://api.transferwise.tech
   WISE_SANDBOX_URL=https://api.sandbox.transferwise.tech
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PUBLISHABLE_KEY=pk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   FRONTEND_URL=http://localhost:5173
   ```
3. Run in development:
   ```bash
   npm run dev
   ```
4. Build for production:
   ```bash
   npm run build && npm start
   ```

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
