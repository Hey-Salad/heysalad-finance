import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('4000'),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string(),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  WISE_API_URL: z.string().url().default('https://api.wise.com'),
  WISE_API_MTLS_URL: z.string().url().default('https://api-mtls.transferwise.com'),
  WISE_SANDBOX_URL: z.string().url().default('https://api.sandbox.transferwise.tech'),
  WISE_SANDBOX_MTLS_URL: z.string().url().default('https://api-mtls.sandbox.transferwise.tech'),
  WISE_USE_MTLS: z
    .string()
    .optional()
    .transform((value) => value === 'true'),
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
  WISE_OAUTH_SCOPE: z.string().optional()
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Invalid environment variables', parsedEnv.error.flatten().fieldErrors);
  throw new Error('Invalid environment variables, see logs for details');
}

const env = parsedEnv.data;

export const config = {
  ...env,
  isProduction: env.NODE_ENV === 'production',
  isDevelopment: env.NODE_ENV === 'development',
  isTest: env.NODE_ENV === 'test',
  port: Number(env.PORT),
  useWiseMtls: env.WISE_USE_MTLS ?? false,
  allowDevAutoLogin: env.ALLOW_DEV_AUTO_LOGIN ?? false
};

export type AppConfig = typeof config;
