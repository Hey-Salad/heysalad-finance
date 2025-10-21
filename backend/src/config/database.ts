import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from './env';
import { logger } from '../utils/logger';

let supabaseClient: SupabaseClient | null = null;

export const getSupabaseClient = (): SupabaseClient => {
  if (!supabaseClient) {
    supabaseClient = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
  }
  return supabaseClient;
};

export const connectDatabase = async (): Promise<SupabaseClient> => {
  const client = getSupabaseClient();
  try {
    const { error } = await client.from('users').select('id').limit(1);
    if (error) {
      logger.warn(
        'Supabase connection check failed. Ensure tables exist and credentials are correct.',
        error as Error
      );
    } else {
      logger.info('Supabase connection verified');
    }
  } catch (error) {
    logger.error('Supabase connection error', error as Error);
    throw error;
  }
  return client;
};

export const disconnectDatabase = async (): Promise<void> => {
  logger.info('Supabase client cleanup not required for HTTP-based connections');
};
