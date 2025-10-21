import axios from 'axios';
import jwt from 'jsonwebtoken';
import { Request, Response } from 'express';
import { config } from '../config/env';
import { AuthenticatedRequest } from '../middleware/auth';
import { setWiseToken } from '../repositories/userRepository';
import { logger } from '../utils/logger';

const getOauthBaseUrl = () =>
  config.isProduction ? 'https://wise.com' : 'https://sandbox.transferwise.tech';

const getAuthorizeUrl = () => `${getOauthBaseUrl()}/oauth/authorize`;
const getTokenUrl = () => `${getOauthBaseUrl()}/oauth/token`;

const createStateToken = (userId: string): string =>
  jwt.sign({ sub: userId }, config.JWT_SECRET, { expiresIn: 600 });

const decodeStateToken = (state: string): { sub: string } =>
  jwt.verify(state, config.JWT_SECRET) as { sub: string };

export const getAuthorizationUrl = (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  if (!config.WISE_OAUTH_CLIENT_ID || !config.WISE_OAUTH_REDIRECT_URI) {
    return res.status(500).json({ message: 'Wise OAuth is not configured' });
  }

  const state = createStateToken(req.user.id);
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.WISE_OAUTH_CLIENT_ID,
    redirect_uri: config.WISE_OAUTH_REDIRECT_URI,
    state
  });

  if (config.WISE_OAUTH_SCOPE) {
    params.set('scope', config.WISE_OAUTH_SCOPE);
  }

  const url = `${getAuthorizeUrl()}?${params.toString()}`;
  res.json({ url });
};

export const handleCallback = async (req: Request, res: Response) => {
  const { code, state, error, error_description: errorDescription } = req.query;

  if (error) {
    logger.warn('Wise OAuth error response', { error, errorDescription });
    const redirect = new URL(config.FRONTEND_URL);
    redirect.pathname = '/settings';
    redirect.searchParams.set('wise', 'error');
    redirect.searchParams.set('reason', String(error));
    return res.redirect(redirect.toString());
  }

  if (!code || typeof code !== 'string' || !state || typeof state !== 'string') {
    return res.status(400).json({ message: 'Missing authorization code or state' });
  }

  let userId: string;
  try {
    const payload = decodeStateToken(state);
    userId = payload.sub;
  } catch (stateError) {
    logger.warn('Invalid Wise OAuth state token', stateError as Error);
    return res.status(400).json({ message: 'Invalid state parameter' });
  }

  if (
    !config.WISE_OAUTH_CLIENT_ID ||
    !config.WISE_OAUTH_CLIENT_SECRET ||
    !config.WISE_OAUTH_REDIRECT_URI
  ) {
    logger.error('Wise OAuth credentials missing from configuration');
    return res.status(500).json({ message: 'Wise OAuth is not configured' });
  }

  try {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: config.WISE_OAUTH_REDIRECT_URI,
      client_id: config.WISE_OAUTH_CLIENT_ID,
      client_secret: config.WISE_OAUTH_CLIENT_SECRET
    });

    const tokenResponse = await axios.post(getTokenUrl(), params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const { access_token: accessToken, refresh_token: refreshToken, expires_in: expiresIn } =
      tokenResponse.data;

    if (!accessToken) {
      throw new Error('Access token missing from Wise response');
    }

    const expiresAt = expiresIn ? Date.now() + Number(expiresIn) * 1000 : undefined;

    await setWiseToken(
      userId,
      JSON.stringify({
        accessToken,
        refreshToken,
        expiresAt
      })
    );

    const redirect = new URL(config.FRONTEND_URL);
    redirect.pathname = '/settings';
    redirect.searchParams.set('wise', 'linked');
    res.redirect(redirect.toString());
  } catch (exchangeError) {
    logger.error('Wise OAuth token exchange failed', exchangeError as Error);
    const redirect = new URL(config.FRONTEND_URL);
    redirect.pathname = '/settings';
    redirect.searchParams.set('wise', 'error');
    res.redirect(redirect.toString());
  }
};
