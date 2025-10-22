import { randomUUID } from 'crypto';
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { config } from '../config/env';
import { logger } from '../utils/logger';
import {
  buildAuthorizationUrl,
  exchangeCodeForToken,
  fetchProviderProfile,
  OAuthProvider
} from '../services/oauthService';
import { getIdentityByProviderId, upsertIdentity } from '../repositories/authIdentityRepository';
import {
  createUser,
  getUserByEmail,
  getUserById,
  setWiseProfileId,
  setWiseToken,
  UserRecord
} from '../repositories/userRepository';
import { AuthUser, generateRefreshToken } from '../utils/jwt';
import { AuthenticatedRequest } from '../middleware/auth';

const providerSchema = z.enum(['wise', 'monzo', 'google']);
const modeSchema = z.enum(['login', 'link']);

const statePayloadSchema = z.object({
  provider: providerSchema,
  mode: modeSchema,
  userId: z.string().uuid().optional(),
  redirect: z.string().optional(),
  nonce: z.string()
});

type StatePayload = z.infer<typeof statePayloadSchema>;

const sanitizeRedirect = (redirect?: string): string | undefined => {
  if (!redirect) {
    return undefined;
  }
  if (redirect.startsWith('/')) {
    return redirect;
  }
  try {
    const parsed = new URL(redirect, config.FRONTEND_URL);
    if (parsed.origin === new URL(config.FRONTEND_URL).origin) {
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
  } catch {
    // ignore invalid redirect
  }
  return undefined;
};

const createStateToken = (payload: StatePayload): string =>
  jwt.sign(payload, config.JWT_SECRET, { expiresIn: 600 });

const decodeStateToken = (token: string): StatePayload => {
  const decoded = jwt.verify(token, config.JWT_SECRET);
  return statePayloadSchema.parse(decoded);
};

const buildRedirectUrl = (target: string | undefined, provider: OAuthProvider) => {
  const redirect = sanitizeRedirect(target) ?? '/oauth/callback';
  const next = new URL(redirect, config.FRONTEND_URL);
  next.searchParams.set('provider', provider);
  return next;
};

const ensureProviderConfigured = (provider: OAuthProvider): void => {
  try {
    buildAuthorizationUrl(provider, 'health-check');
  } catch (error) {
    throw new Error(
      `OAuth provider "${provider}" is not configured: ${(error as Error).message}`
    );
  }
};

const prepareUserForLogin = async (
  provider: OAuthProvider,
  providerUserId: string,
  email?: string,
  displayName?: string
): Promise<UserRecord> => {
  const existingIdentity = await getIdentityByProviderId(provider, providerUserId);
  if (existingIdentity) {
    const user = await getUserById(existingIdentity.userId);
    if (!user) {
      throw new Error('User linked to OAuth identity not found');
    }
    return user;
  }

  if (email) {
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return existingUser;
    }
  }

  const sanitizedProviderId = providerUserId.replace(/[^a-zA-Z0-9_-]/g, '');
  const fallbackId = sanitizedProviderId || randomUUID().replace(/[^a-zA-Z0-9]/g, '');
  const safeEmail = email ?? `${fallbackId}@${provider}.oauth`;
  const company =
    displayName && displayName.trim().length > 1
      ? `${displayName} (${provider})`
      : `${provider.charAt(0).toUpperCase()}${provider.slice(1)} user`;

  const password = randomUUID();
  const created = await createUser({
    email: safeEmail.toLowerCase(),
    password,
    company
  });
  return created;
};

const storeProviderTokens = async (params: {
  userId: string;
  provider: OAuthProvider;
  providerUserId: string;
  accessToken: string;
  refreshToken?: string;
  scope?: string;
  expiresAt?: number;
}) => {
  const { userId, provider, providerUserId, accessToken, refreshToken, scope, expiresAt } = params;

  await upsertIdentity({
    userId,
    provider,
    providerUserId,
    accessToken,
    refreshToken,
    scope: scope ?? null,
    expiresAt: expiresAt ?? null
  });

  if (provider === 'wise') {
    await setWiseToken(
      userId,
      JSON.stringify({
        accessToken,
        refreshToken,
        scope,
        expiresAt
      })
    );
    await setWiseProfileId(userId, providerUserId);
  }
};

export const getAuthorizationUrl = async (req: AuthenticatedRequest, res: Response) => {
  const provider = providerSchema.parse(req.params.provider);

  const requestedMode = typeof req.query.mode === 'string' ? req.query.mode : undefined;
  const isLinkMode = requestedMode === 'link' && Boolean(req.user);
  if (requestedMode === 'link' && !req.user) {
    return res.status(401).json({ message: 'Authentication required to link providers' });
  }

  try {
    ensureProviderConfigured(provider);
  } catch (error) {
    logger.error('OAuth provider misconfiguration', error as Error, { provider });
    return res.status(503).json({ message: 'OAuth provider not configured' });
  }

  const redirectParam =
    typeof req.query.redirect === 'string' ? sanitizeRedirect(req.query.redirect) : undefined;

  const stateToken = createStateToken({
    provider,
    mode: isLinkMode ? 'link' : 'login',
    userId: req.user?.id,
    redirect: redirectParam,
    nonce: randomUUID()
  });

  try {
    const url = buildAuthorizationUrl(provider, stateToken);
    res.json({ url, state: stateToken });
  } catch (error) {
    logger.error('Failed to build OAuth authorization URL', error as Error, { provider });
    res.status(500).json({ message: 'Unable to start OAuth flow' });
  }
};

export const handleCallback = async (req: Request, res: Response) => {
  const provider = providerSchema.parse(req.params.provider);
  const { code, state, error, error_description: errorDescription } = req.query;

  if (error || !code || typeof code !== 'string') {
    logger.warn('OAuth error response', { provider, error, errorDescription });
    const failureRedirect = buildRedirectUrl(undefined, provider);
    failureRedirect.searchParams.set('status', 'error');
    if (typeof error === 'string') {
      failureRedirect.searchParams.set('reason', error);
    }
    return res.redirect(failureRedirect.toString());
  }

  if (!state || typeof state !== 'string') {
    logger.warn('OAuth callback missing state', { provider });
    return res.status(400).json({ message: 'Invalid OAuth state' });
  }

  let payload: StatePayload;
  try {
    payload = decodeStateToken(state);
  } catch (decodeError) {
    logger.warn('Invalid OAuth state token', decodeError as Error, { provider });
    return res.status(400).json({ message: 'Invalid state parameter' });
  }

  if (payload.provider !== provider) {
    logger.warn('OAuth provider mismatch', { expected: payload.provider, actual: provider });
    return res.status(400).json({ message: 'State mismatch' });
  }

  try {
    const tokenResponse = await exchangeCodeForToken(provider, code);
    if (!tokenResponse.accessToken) {
      throw new Error('No access token returned by provider');
    }

    const profile = await fetchProviderProfile(provider, tokenResponse.accessToken);

    let user: UserRecord;
    if (payload.mode === 'link') {
      if (!payload.userId) {
        throw new Error('Link mode state missing user id');
      }
      const existingUser = await getUserById(payload.userId);
      if (!existingUser) {
        throw new Error('User not found for linking');
      }
      user = existingUser;
    } else {
      user = await prepareUserForLogin(
        provider,
        profile.providerUserId,
        profile.email,
        profile.displayName
      );
    }

    await storeProviderTokens({
      userId: user.id,
      provider,
      providerUserId: profile.providerUserId,
      accessToken: tokenResponse.accessToken,
      refreshToken: tokenResponse.refreshToken,
      scope: tokenResponse.scope,
      expiresAt: tokenResponse.expiresAt
    });

    if (payload.mode === 'login') {
      const authUser: AuthUser = { id: user.id, email: user.email };
      const sessionTokens = await generateRefreshToken(authUser);
      const successRedirect = buildRedirectUrl(payload.redirect, provider);
      successRedirect.searchParams.set('status', 'success');
      successRedirect.searchParams.set('accessToken', sessionTokens.accessToken);
      successRedirect.searchParams.set('refreshToken', sessionTokens.refreshToken);
      successRedirect.searchParams.set(
        'refreshTokenExpiresAt',
        sessionTokens.refreshTokenExpiresAt.toISOString()
      );
      successRedirect.searchParams.set('expiresIn', String(sessionTokens.expiresInSeconds));
      return res.redirect(successRedirect.toString());
    }

    const linkRedirect = buildRedirectUrl(payload.redirect ?? '/settings', provider);
    linkRedirect.searchParams.set('status', 'linked');
    linkRedirect.searchParams.set('provider', provider);
    res.redirect(linkRedirect.toString());
  } catch (handlerError) {
    logger.error('OAuth callback processing failed', handlerError as Error, { provider });
    const failureRedirect = buildRedirectUrl(payload?.redirect, provider);
    failureRedirect.searchParams.set('status', 'error');
    failureRedirect.searchParams.set('reason', 'callback-failed');
    res.redirect(failureRedirect.toString());
  }
};
