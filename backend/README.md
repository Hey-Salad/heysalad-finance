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

Control which environment is active via `WISE_ENVIRONMENT` (`sandbox` or `production`). The `.env.sandbox` and `.env.production` templates are pre-populated with the correct values:

- `WISE_OAUTH_BASE_URL` defaults to the Wise hosted login for the chosen environment (`https://sandbox.transferwise.tech` or `https://wise.com`). Override `WISE_OAUTH_AUTHORIZE_URL` and `WISE_OAUTH_TOKEN_URL` only if Wise gives you tenant-specific domains.
- If your Wise application specifies an audience, set `WISE_OAUTH_AUDIENCE` (for example `https://api.sandbox.transferwise.tech`).
- API calls respect the environment toggle while still allowing per-request overrides via the optional `useSandbox` flag in `WiseService`.

Use sandbox credentials when developing locally. If you need mTLS, set `WISE_USE_MTLS=true` and configure the relevant certificates in your runtime (for example, via `NODE_EXTRA_CA_CERTS` or a custom Axios agent).

### Wise OAuth 2.0 sandbox quickstart

1. Duplicate `backend/.env.sandbox` to `backend/.env` (or run `npm run dev:sandbox`).
2. Fill `WISE_OAUTH_CLIENT_ID` and `WISE_OAUTH_CLIENT_SECRET` with the app credentials from the Wise sandbox portal. Ensure the redirect URI `http://localhost:4000/api/wise/oauth/callback` is registered.
3. Start the backend with `npm run dev:sandbox` and the frontend with `npm run dev` (default Vite dev server uses port 5173).
4. From the frontend landing page (`http://localhost:5173`), trigger “Sign in with Wise”, approve the sandbox consent screen, and confirm you return to `/settings?wise=linked`.
5. Verify tokens were encrypted and stored by checking the `users` table (`wise_token_encrypted` column) and confirm transactions sync via `POST /api/transactions/sync`.

### Additional OAuth providers

The backend can also authenticate via Monzo and Google using the shared `/api/auth/oauth/:provider` endpoints.

- Configure the relevant `MONZO_OAUTH_*` and `GOOGLE_OAUTH_*` variables in your environment file. Defaults are provided for the standard authorize/token endpoints.
- Final callback URLs default to `/api/oauth/{provider}/callback`. Register those URIs with each provider or override them via the env vars.
- Tokens and refresh tokens for all providers are stored (encrypted) in the `auth_identities` table alongside the user id and provider user id, so you can reuse the credentials for downstream API calls.
- Default scopes included in the templates:
  - Monzo: `openid email profile`
  - Google: `openid email profile`
  Adjust to match the resource permissions you require.
- Recommended table definition:

  ```sql
  create table auth_identities (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references users(id) on delete cascade,
    provider text not null,
    provider_user_id text not null,
    access_token_encrypted text,
    refresh_token_encrypted text,
    scope text,
    expires_at timestamptz,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    unique(provider, provider_user_id)
  );
  ```

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
- `auth_identities`
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
