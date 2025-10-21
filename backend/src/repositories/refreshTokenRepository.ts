import { getSupabaseClient } from '../config/database';

export interface RefreshTokenRecord {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
}

interface RefreshTokenRow {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string;
  revoked_at: string | null;
  created_at: string;
}

const toRefreshTokenRecord = (row: RefreshTokenRow): RefreshTokenRecord => ({
  id: row.id,
  userId: row.user_id,
  tokenHash: row.token_hash,
  expiresAt: new Date(row.expires_at),
  revokedAt: row.revoked_at ? new Date(row.revoked_at) : null,
  createdAt: new Date(row.created_at)
});

export const createRefreshToken = async (payload: {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}): Promise<void> => {
  const client = getSupabaseClient();
  const { error } = await client.from('refresh_tokens').insert({
    user_id: payload.userId,
    token_hash: payload.tokenHash,
    expires_at: payload.expiresAt.toISOString()
  });

  if (error) {
    throw error;
  }
};

export const findActiveRefreshTokenByHash = async (
  tokenHash: string
): Promise<RefreshTokenRecord | null> => {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('refresh_tokens')
    .select('*')
    .eq('token_hash', tokenHash)
    .is('revoked_at', null)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? toRefreshTokenRecord(data) : null;
};

export const markRefreshTokenRevoked = async (id: string): Promise<void> => {
  const client = getSupabaseClient();
  const { error } = await client
    .from('refresh_tokens')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', id);
  if (error) {
    throw error;
  }
};

export const revokeRefreshTokensForUser = async (userId: string): Promise<void> => {
  const client = getSupabaseClient();
  const { error } = await client
    .from('refresh_tokens')
    .update({ revoked_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('revoked_at', null);

  if (error) {
    throw error;
  }
};
