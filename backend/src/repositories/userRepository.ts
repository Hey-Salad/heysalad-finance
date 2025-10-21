import bcrypt from 'bcryptjs';
import { getSupabaseClient } from '../config/database';
import { encryptToString, decryptFromString } from '../utils/encryption';

export interface UserRecord {
  id: string;
  email: string;
  company: string;
  createdAt: Date;
  defaultCurrency: string;
  refreshInterval: number;
  wiseProfileId: string | null;
  hasWiseToken: boolean;
  hasStripeKey: boolean;
}

export interface UserSecrets {
  passwordHash: string;
  wiseTokenEncrypted: string | null;
  stripeKeyEncrypted: string | null;
}

export type UserWithSecrets = UserRecord & UserSecrets;

interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  company: string;
  created_at: string;
  updated_at: string;
  default_currency: string;
  refresh_interval: number;
  wise_profile_id: string | null;
  wise_token_encrypted: string | null;
  stripe_key_encrypted: string | null;
}

const toUserWithSecrets = (row: UserRow): UserWithSecrets => ({
  id: row.id,
  email: row.email,
  company: row.company,
  createdAt: new Date(row.created_at),
  defaultCurrency: row.default_currency ?? 'EUR',
  refreshInterval: row.refresh_interval ?? 30,
  wiseProfileId: row.wise_profile_id,
  hasWiseToken: Boolean(row.wise_token_encrypted),
  hasStripeKey: Boolean(row.stripe_key_encrypted),
  passwordHash: row.password_hash,
  wiseTokenEncrypted: row.wise_token_encrypted,
  stripeKeyEncrypted: row.stripe_key_encrypted
});

const stripSecrets = (user: UserWithSecrets): UserRecord => ({
  id: user.id,
  email: user.email,
  company: user.company,
  createdAt: user.createdAt,
  defaultCurrency: user.defaultCurrency,
  refreshInterval: user.refreshInterval,
  wiseProfileId: user.wiseProfileId,
  hasWiseToken: user.hasWiseToken,
  hasStripeKey: user.hasStripeKey
});

type FetchOptions = { includeSecrets?: boolean };

const fetchSingleUser = async (
  query: { id?: string; email?: string },
  options?: FetchOptions
): Promise<UserRecord | UserWithSecrets | null> => {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('users')
    .select('*')
    .match(query)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const user = toUserWithSecrets(data);
  if (options?.includeSecrets) {
    return user;
  }
  return stripSecrets(user);
};

export function getUserByEmail(
  email: string,
  options: { includeSecrets: true }
): Promise<UserWithSecrets | null>;
export function getUserByEmail(
  email: string,
  options?: { includeSecrets?: false }
): Promise<UserRecord | null>;
export async function getUserByEmail(
  email: string,
  options?: FetchOptions
): Promise<UserRecord | UserWithSecrets | null> {
  return fetchSingleUser({ email: email.toLowerCase() }, options);
}

export function getUserById(
  id: string,
  options: { includeSecrets: true }
): Promise<UserWithSecrets | null>;
export function getUserById(
  id: string,
  options?: { includeSecrets?: false }
): Promise<UserRecord | null>;
export async function getUserById(
  id: string,
  options?: FetchOptions
): Promise<UserRecord | UserWithSecrets | null> {
  return fetchSingleUser({ id }, options);
}

export const createUser = async (payload: {
  email: string;
  password: string;
  company: string;
}): Promise<UserRecord> => {
  const client = getSupabaseClient();
  const email = payload.email.toLowerCase();
  const passwordHash = await bcrypt.hash(payload.password, 10);

  const { data, error } = await client
    .from('users')
    .insert({
      email,
      password_hash: passwordHash,
      company: payload.company,
      default_currency: 'EUR',
      refresh_interval: 30
    })
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return stripSecrets(toUserWithSecrets(data));
};

export const verifyPassword = async (
  user: UserWithSecrets,
  candidate: string
): Promise<boolean> => {
  return bcrypt.compare(candidate, user.passwordHash);
};

export const setWiseToken = async (userId: string, token: string): Promise<void> => {
  const client = getSupabaseClient();
  const encrypted = encryptToString(token);
  const { error } = await client
    .from('users')
    .update({ wise_token_encrypted: encrypted })
    .eq('id', userId);
  if (error) {
    throw error;
  }
};

export const setStripeKey = async (userId: string, key: string): Promise<void> => {
  const client = getSupabaseClient();
  const encrypted = encryptToString(key);
  const { error } = await client
    .from('users')
    .update({ stripe_key_encrypted: encrypted })
    .eq('id', userId);
  if (error) {
    throw error;
  }
};

export const updateUserSettings = async (
  userId: string,
  payload: { defaultCurrency?: string; refreshInterval?: number }
): Promise<UserRecord> => {
  const client = getSupabaseClient();
  const updates: Record<string, unknown> = {};

  if (payload.defaultCurrency) {
    updates.default_currency = payload.defaultCurrency;
  }

  if (payload.refreshInterval !== undefined) {
    updates.refresh_interval = payload.refreshInterval;
  }

  const { data, error } = await client
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return stripSecrets(toUserWithSecrets(data));
};

export const setWiseProfileId = async (userId: string, profileId: string): Promise<void> => {
  const client = getSupabaseClient();
  const { error } = await client
    .from('users')
    .update({ wise_profile_id: profileId })
    .eq('id', userId);
  if (error) {
    throw error;
  }
};

export const getWiseToken = (user: UserWithSecrets): string | undefined => {
  if (!user.wiseTokenEncrypted) {
    return undefined;
  }
  return decryptFromString(user.wiseTokenEncrypted);
};

export const getStripeKey = (user: UserWithSecrets): string | undefined => {
  if (!user.stripeKeyEncrypted) {
    return undefined;
  }
  return decryptFromString(user.stripeKeyEncrypted);
};

export const listUsersWithWiseToken = async (): Promise<UserWithSecrets[]> => {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('users')
    .select('*')
    .not('wise_token_encrypted', 'is', null);

  if (error) {
    throw error;
  }

  return (data ?? []).map(toUserWithSecrets);
};
