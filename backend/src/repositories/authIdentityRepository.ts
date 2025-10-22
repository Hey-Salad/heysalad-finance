import { getSupabaseClient } from '../config/database';
import { encryptToString, decryptFromString } from '../utils/encryption';

export interface AuthIdentityRecord {
  id: string;
  userId: string;
  provider: 'wise' | 'monzo' | 'google';
  providerUserId: string;
  scope: string | null;
  expiresAt: Date | null;
  accessTokenEncrypted: string | null;
  refreshTokenEncrypted: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface AuthIdentityRow {
  id: string;
  user_id: string;
  provider: string;
  provider_user_id: string;
  scope: string | null;
  expires_at: string | null;
  access_token_encrypted: string | null;
  refresh_token_encrypted: string | null;
  created_at: string;
  updated_at: string;
}

const toRecord = (row: AuthIdentityRow): AuthIdentityRecord => ({
  id: row.id,
  userId: row.user_id,
  provider: row.provider as AuthIdentityRecord['provider'],
  providerUserId: row.provider_user_id,
  scope: row.scope,
  expiresAt: row.expires_at ? new Date(row.expires_at) : null,
  accessTokenEncrypted: row.access_token_encrypted,
  refreshTokenEncrypted: row.refresh_token_encrypted,
  createdAt: new Date(row.created_at),
  updatedAt: new Date(row.updated_at)
});

export const getIdentityByProviderId = async (
  provider: AuthIdentityRecord['provider'],
  providerUserId: string
): Promise<AuthIdentityRecord | null> => {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('auth_identities')
    .select('*')
    .eq('provider', provider)
    .eq('provider_user_id', providerUserId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return toRecord(data as AuthIdentityRow);
};

export const upsertIdentity = async (payload: {
  userId: string;
  provider: AuthIdentityRecord['provider'];
  providerUserId: string;
  accessToken?: string;
  refreshToken?: string;
  scope?: string | null;
  expiresAt?: number | null;
}): Promise<AuthIdentityRecord> => {
  const client = getSupabaseClient();
  const { userId, provider, providerUserId, accessToken, refreshToken, scope, expiresAt } = payload;

  const encryptedAccessToken = accessToken ? encryptToString(accessToken) : null;
  const encryptedRefreshToken = refreshToken ? encryptToString(refreshToken) : null;

  const upsertPayload: Record<string, unknown> = {
    user_id: userId,
    provider,
    provider_user_id: providerUserId,
    access_token_encrypted: encryptedAccessToken,
    refresh_token_encrypted: encryptedRefreshToken,
    scope: scope ?? null,
    expires_at: expiresAt ? new Date(expiresAt).toISOString() : null
  };

  const { data, error } = await client
    .from('auth_identities')
    .upsert(upsertPayload, { onConflict: 'provider,provider_user_id' })
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return toRecord(data as AuthIdentityRow);
};

export const deleteIdentity = async (
  provider: AuthIdentityRecord['provider'],
  providerUserId: string
): Promise<void> => {
  const client = getSupabaseClient();
  const { error } = await client
    .from('auth_identities')
    .delete()
    .eq('provider', provider)
    .eq('provider_user_id', providerUserId);

  if (error) {
    throw error;
  }
};

export const decryptToken = (encrypted: string | null): string | null => {
  if (!encrypted) {
    return null;
  }
  return decryptFromString(encrypted);
};
