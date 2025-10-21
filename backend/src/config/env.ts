import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('4000'),
  MONGODB_URI: z.string(),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  WISE_API_URL: z.string().url().default('https://api.transferwise.tech'),
  WISE_SANDBOX_URL: z.string().url().default('https://api.sandbox.transferwise.tech'),
  WISE_API_TOKEN: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  ENCRYPTION_KEY: z
    .string()
    .min(32, 'ENCRYPTION_KEY must be 32 characters for AES-256-GCM encryption'),
  ENCRYPTION_IV_LENGTH: z.string().transform((val) => Number(val) || 16).default('16'),
  TOKEN_EXPIRY_MINUTES: z.string().default('60'),
  REFRESH_TOKEN_EXPIRY_DAYS: z.string().default('30'),
  WISE_POLL_INTERVAL_MINUTES: z.string().default('30'),
  FRONTEND_URL: z.string().default('http://localhost:5173')
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
  port: Number(env.PORT)
};

export type AppConfig = typeof config;
