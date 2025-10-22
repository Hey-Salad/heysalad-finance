import axios from 'axios';
import { randomUUID } from 'crypto';
import { config } from '../config/env';
import { logger } from '../utils/logger';

export type OAuthProvider = 'wise' | 'monzo' | 'google';

interface ProviderSettings {
  authorizeUrl: string;
  tokenUrl: string;
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
  scope?: string;
  audience?: string;
  extraAuthorizeParams?: Record<string, string>;
  extraTokenParams?: Record<string, string>;
}

export interface TokenPayload {
  accessToken: string;
  refreshToken?: string;
  scope?: string;
  tokenType?: string;
  expiresAt?: number;
  idToken?: string;
  raw: unknown;
}

export interface ProviderProfile {
  provider: OAuthProvider;
  providerUserId: string;
  email?: string;
  displayName?: string;
  raw: unknown;
}

const getWiseApiBaseUrl = () =>
  config.wiseEnvironment === 'sandbox' ? config.WISE_SANDBOX_URL : config.WISE_API_URL;

const providerSettings: Record<OAuthProvider, ProviderSettings> = {
  wise: {
    authorizeUrl: config.wiseOauthAuthorizeUrl,
    tokenUrl: config.wiseOauthTokenUrl,
    clientId: config.WISE_OAUTH_CLIENT_ID,
    clientSecret: config.WISE_OAUTH_CLIENT_SECRET,
    redirectUri: config.WISE_OAUTH_REDIRECT_URI,
    scope: config.WISE_OAUTH_SCOPE,
    audience: config.wiseOauthAudience
  },
  monzo: {
    authorizeUrl: config.monzoOauthAuthorizeUrl,
    tokenUrl: config.monzoOauthTokenUrl,
    clientId: config.MONZO_OAUTH_CLIENT_ID,
    clientSecret: config.MONZO_OAUTH_CLIENT_SECRET,
    redirectUri: config.MONZO_OAUTH_REDIRECT_URI,
    scope: config.MONZO_OAUTH_SCOPE
  },
  google: {
    authorizeUrl: config.googleOauthAuthorizeUrl,
    tokenUrl: config.googleOauthTokenUrl,
    clientId: config.GOOGLE_OAUTH_CLIENT_ID,
    clientSecret: config.GOOGLE_OAUTH_CLIENT_SECRET,
    redirectUri: config.GOOGLE_OAUTH_REDIRECT_URI,
    scope: config.GOOGLE_OAUTH_SCOPE,
    extraAuthorizeParams: {
      access_type: 'offline',
      prompt: 'consent',
      include_granted_scopes: 'true'
    }
  }
};

const ensureConfigured = (provider: OAuthProvider): ProviderSettings => {
  const settings = providerSettings[provider];
  if (!settings) {
    throw new Error(`Unsupported provider "${provider}"`);
  }
  if (!settings.clientId || !settings.clientSecret || !settings.redirectUri) {
    throw new Error(`OAuth provider "${provider}" is not fully configured`);
  }
  return settings;
};

export const buildAuthorizationUrl = (
  provider: OAuthProvider,
  state: string,
  extraParams?: Record<string, string>
): string => {
  const settings = ensureConfigured(provider);
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: settings.clientId!,
    redirect_uri: settings.redirectUri!,
    state
  });

  if (settings.scope) {
    params.set('scope', settings.scope);
  }

  if (settings.audience) {
    params.set('audience', settings.audience);
  }

  if (settings.extraAuthorizeParams) {
    Object.entries(settings.extraAuthorizeParams).forEach(([key, value]) => {
      params.set(key, value);
    });
  }

  if (extraParams) {
    Object.entries(extraParams).forEach(([key, value]) => {
      params.set(key, value);
    });
  }

  return `${settings.authorizeUrl}?${params.toString()}`;
};

export const exchangeCodeForToken = async (
  provider: OAuthProvider,
  code: string
): Promise<TokenPayload> => {
  const settings = ensureConfigured(provider);

  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: settings.redirectUri!,
    client_id: settings.clientId!,
    client_secret: settings.clientSecret!
  });

  if (settings.audience) {
    params.set('audience', settings.audience);
  }

  if (settings.extraTokenParams) {
    Object.entries(settings.extraTokenParams).forEach(([key, value]) => {
      params.set(key, value);
    });
  }

  const response = await axios.post(settings.tokenUrl, params.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });

  return normalizeTokenPayload(response.data);
};

export const refreshAccessToken = async (
  provider: OAuthProvider,
  refreshToken: string
): Promise<TokenPayload> => {
  const settings = ensureConfigured(provider);

  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: settings.clientId!,
    client_secret: settings.clientSecret!,
    redirect_uri: settings.redirectUri!
  });

  if (settings.audience) {
    params.set('audience', settings.audience);
  }

  const response = await axios.post(settings.tokenUrl, params.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });

  return normalizeTokenPayload(response.data);
};

const normalizeTokenPayload = (data: Record<string, unknown>): TokenPayload => {
  const expiresIn = typeof data.expires_in === 'number' ? data.expires_in : Number(data.expires_in ?? 0);
  return {
    accessToken: String(data.access_token ?? ''),
    refreshToken: data.refresh_token ? String(data.refresh_token) : undefined,
    scope: data.scope ? String(data.scope) : undefined,
    tokenType: data.token_type ? String(data.token_type) : undefined,
    expiresAt: expiresIn ? Date.now() + expiresIn * 1000 : undefined,
    idToken: data.id_token ? String(data.id_token) : undefined,
    raw: data
  };
};

export const fetchProviderProfile = async (
  provider: OAuthProvider,
  accessToken: string
): Promise<ProviderProfile> => {
  switch (provider) {
    case 'wise':
      return fetchWiseProfile(accessToken);
    case 'monzo':
      return fetchMonzoProfile(accessToken);
    case 'google':
      return fetchGoogleProfile(accessToken);
    default:
      throw new Error(`Unsupported provider "${provider}"`);
  }
};

const fetchWiseProfile = async (accessToken: string): Promise<ProviderProfile> => {
  const apiBase = getWiseApiBaseUrl();
  const response = await axios.get(`${apiBase}/v1/me`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const data = response.data as Record<string, unknown>;
  const profile = {
    provider: 'wise' as const,
    providerUserId: String(data.id ?? data.uuid ?? randomUUID()),
    email: typeof data.email === 'string' ? data.email : undefined,
    displayName: typeof data.name === 'string' ? data.name : undefined,
    raw: data
  };
  return profile;
};

const fetchMonzoProfile = async (accessToken: string): Promise<ProviderProfile> => {
  const headers = { Authorization: `Bearer ${accessToken}` };
  const whoami = await axios
    .get('https://api.monzo.com/ping/whoami', { headers })
    .then((res) => res.data as Record<string, unknown>);

  let identity: Record<string, unknown> | undefined;
  try {
    const identityResponse = await axios.get('https://api.monzo.com/identity', { headers });
    identity = identityResponse.data as Record<string, unknown>;
  } catch (error) {
    logger.warn('Failed to fetch Monzo identity details', error);
  }

  return {
    provider: 'monzo',
    providerUserId: String(whoami.user_id ?? randomUUID()),
    email: typeof identity?.email === 'string' ? (identity.email as string) : undefined,
    displayName:
      typeof identity?.preferred_first_name === 'string'
        ? `${identity.preferred_first_name as string} ${identity?.preferred_last_name ?? ''}`.trim()
        : undefined,
    raw: { whoami, identity }
  };
};

const fetchGoogleProfile = async (accessToken: string): Promise<ProviderProfile> => {
  const response = await axios.get('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const data = response.data as Record<string, unknown>;
  return {
    provider: 'google',
    providerUserId: String(data.sub ?? randomUUID()),
    email: typeof data.email === 'string' ? data.email : undefined,
    displayName: typeof data.name === 'string' ? data.name : undefined,
    raw: data
  };
};
