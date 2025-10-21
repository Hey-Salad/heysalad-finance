process.env.NODE_ENV = 'test';
process.env.SUPABASE_URL = process.env.SUPABASE_URL ?? 'http://localhost:54321';
process.env.SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'test-service-role-key';
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret-key-test-secret-key-1234';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? 'refresh-secret-key-refresh-secret-key-1234';
process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY ?? '0123456789abcdef0123456789abcdef';
process.env.ENCRYPTION_IV_LENGTH = process.env.ENCRYPTION_IV_LENGTH ?? '16';
process.env.WISE_API_URL = process.env.WISE_API_URL ?? 'https://api.transferwise.tech';
process.env.WISE_SANDBOX_URL = process.env.WISE_SANDBOX_URL ?? 'https://api.sandbox.transferwise.tech';
process.env.TOKEN_EXPIRY_MINUTES = process.env.TOKEN_EXPIRY_MINUTES ?? '60';
process.env.REFRESH_TOKEN_EXPIRY_DAYS = process.env.REFRESH_TOKEN_EXPIRY_DAYS ?? '30';
process.env.FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:5173';
