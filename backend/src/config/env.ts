import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('4000'),
  WISE_ENVIRONMENT: z.enum(['sandbox', 'production']).optional(),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string(),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  WISE_API_URL: z.string().url().default('https://api.wise.com'),
  WISE_API_MTLS_URL: z.string().url().default('https://api-mtls.transferwise.com'),
  WISE_SANDBOX_URL: z.string().url().default('https://api.sandbox.transferwise.tech'),
  WISE_SANDBOX_MTLS_URL: z.string().url().default('https://api-mtls.sandbox.transferwise.tech'),
  WISE_OAUTH_BASE_URL: z.string().url().optional(),
  WISE_OAUTH_AUTHORIZE_URL: z.string().url().optional(),
  WISE_OAUTH_TOKEN_URL: z.string().url().optional(),
  WISE_OAUTH_AUDIENCE: z.string().optional(),
  WISE_USE_MTLS: z
    .string()
    .optional()
    .transform((value) => value === 'true'),
  MONZO_OAUTH_CLIENT_ID: z.string().optional(),
  MONZO_OAUTH_CLIENT_SECRET: z.string().optional(),
  MONZO_OAUTH_REDIRECT_URI: z.string().optional(),
  MONZO_OAUTH_SCOPE: z.string().default('openid email profile'),
  MONZO_OAUTH_AUTHORIZE_URL: z.string().url().optional(),
  MONZO_OAUTH_TOKEN_URL: z.string().url().optional(),
  GOOGLE_OAUTH_CLIENT_ID: z.string().optional(),
  GOOGLE_OAUTH_CLIENT_SECRET: z.string().optional(),
  GOOGLE_OAUTH_REDIRECT_URI: z.string().optional(),
  GOOGLE_OAUTH_SCOPE: z.string().default('openid email profile'),
  GOOGLE_OAUTH_AUTHORIZE_URL: z.string().url().optional(),
  GOOGLE_OAUTH_TOKEN_URL: z.string().url().optional(),
  ALLOW_DEV_AUTO_LOGIN: z
    .string()
    .optional()
    .transform((value) => value === 'true'),
  WISE_API_TOKEN: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  ENCRYPTION_KEY: z
    .string()
    .min(32, 'ENCRYPTION_KEY must be 32 characters for AES-256-GCM encryption'),
  ENCRYPTION_IV_LENGTH: z.string().transform((val) => Number(val) || 16).default(() => 16),
  TOKEN_EXPIRY_MINUTES: z.string().default('60'),
  REFRESH_TOKEN_EXPIRY_DAYS: z.string().default('30'),
  WISE_POLL_INTERVAL_MINUTES: z.string().default('30'),
  FRONTEND_URL: z.string().default('http://localhost:5173'),
  WISE_OAUTH_CLIENT_ID: z.string().optional(),
  WISE_OAUTH_CLIENT_SECRET: z.string().optional(),
  WISE_OAUTH_REDIRECT_URI: z.string().optional(),
  WISE_OAUTH_SCOPE: z.string().default('profiles balances.read transfers.read')
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Invalid environment variables', parsedEnv.error.flatten().fieldErrors);
  throw new Error('Invalid environment variables, see logs for details');
}

const env = parsedEnv.data;
const wiseEnvironment =
  env.WISE_ENVIRONMENT ?? (env.NODE_ENV === 'production' ? 'production' : 'sandbox');
const wiseOauthBaseUrl =
  env.WISE_OAUTH_BASE_URL ??
  (wiseEnvironment === 'production' ? 'https://wise.com' : 'https://sandbox.transferwise.tech');
const normalizedOauthBaseUrl = wiseOauthBaseUrl.replace(/\/+$/, '');
const wiseOauthAuthorizeUrl =
  env.WISE_OAUTH_AUTHORIZE_URL ?? `${normalizedOauthBaseUrl}/oauth/authorize`;
const wiseOauthTokenUrl = env.WISE_OAUTH_TOKEN_URL ?? `${normalizedOauthBaseUrl}/oauth/token`;
const wiseOauthAudience = env.WISE_OAUTH_AUDIENCE?.trim() || undefined;
const monzoOauthAuthorizeUrl = env.MONZO_OAUTH_AUTHORIZE_URL ?? 'https://auth.monzo.com';
const monzoOauthTokenUrl = env.MONZO_OAUTH_TOKEN_URL ?? 'https://api.monzo.com/oauth2/token';
const googleOauthAuthorizeUrl =
  env.GOOGLE_OAUTH_AUTHORIZE_URL ?? 'https://accounts.google.com/o/oauth2/v2/auth';
const googleOauthTokenUrl =
  env.GOOGLE_OAUTH_TOKEN_URL ?? 'https://oauth2.googleapis.com/token';

export const config = {
  ...env,
  isProduction: env.NODE_ENV === 'production',
  isDevelopment: env.NODE_ENV === 'development',
  isTest: env.NODE_ENV === 'test',
  port: Number(env.PORT),
  useWiseMtls: env.WISE_USE_MTLS ?? false,
  allowDevAutoLogin: env.ALLOW_DEV_AUTO_LOGIN ?? false,
  wiseEnvironment,
  wiseOauthBaseUrl: normalizedOauthBaseUrl,
  wiseOauthAuthorizeUrl,
  wiseOauthTokenUrl,
  wiseOauthAudience,
  monzoOauthAuthorizeUrl,
  monzoOauthTokenUrl,
  googleOauthAuthorizeUrl,
  googleOauthTokenUrl
};

export type AppConfig = typeof config;
