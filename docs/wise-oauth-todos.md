# Wise OAuth Integration TODOs

1. Implement the Wise OAuth redirect flow
   - Configure client credentials and redirect URI handling.
   - Add endpoints to initiate OAuth and exchange auth codes for user tokens.
2. Store user tokens securely
   - Encrypt tokens at rest, support refresh/rotation, and track linked profile IDs.
3. Update frontend to drive Wise connect flow
   - Add UI that guides the user through Wise login/consent.
   - Handle success and error redirects, persisting the link state.
4. Backfill balances and transactions via the new tokens
   - Update `WiseService` to use user tokens created via OAuth.
   - Migrate existing manual tokens if necessary.
5. Expand automated tests and documentation
   - Cover OAuth controller/service logic.
   - Document setup steps for sandbox and production.
