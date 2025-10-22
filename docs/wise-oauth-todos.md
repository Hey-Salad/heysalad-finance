# Wise OAuth Integration Checklist

- [x] Implement the Wise OAuth redirect flow (initiation + token exchange)
- [x] Store user tokens securely (encrypted at rest with refresh support)
- [x] Update frontend to initiate the Wise connect flow and surface statuses
- [x] Ensure `WiseService` consumes OAuth-issued access tokens and refreshes them as needed
- [ ] Migrate any legacy API token users to OAuth tokens
- [ ] Add automated tests that cover OAuth controller/service logic
- [x] Document sandbox setup and production overrides (`backend/README.md`)
- [x] Introduce shared OAuth controller for Wise/Monzo/Google sign-in
- [ ] Provision Supabase table `auth_identities`
