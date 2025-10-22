import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import {
  createRefreshToken,
  findActiveRefreshTokenByHash,
  markRefreshTokenRevoked,
  revokeRefreshTokensForUser,
  RefreshTokenRecord
} from '../repositories/refreshTokenRepository';

export interface AuthUser {
  id: string;
  email: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
  expiresInSeconds: number;
}

const generateRawRefreshToken = () => crypto.randomBytes(48).toString('hex');
const hashToken = (token: string): string => crypto.createHash('sha256').update(token).digest('hex');

export const generateAccessToken = (user: AuthUser): string =>
  jwt.sign({ email: user.email }, config.JWT_SECRET, {
    subject: user.id,
    expiresIn: Math.max(1, Number(config.TOKEN_EXPIRY_MINUTES) || 60) * 60
  });

export const generateRefreshToken = async (user: AuthUser): Promise<TokenPair> => {
  const refreshToken = generateRawRefreshToken();
  const expires = new Date();
  expires.setDate(expires.getDate() + Number(config.REFRESH_TOKEN_EXPIRY_DAYS));

  await createRefreshToken({
    userId: user.id,
    tokenHash: hashToken(refreshToken),
    expiresAt: expires
  });

  return {
    accessToken: generateAccessToken(user),
    refreshToken,
    refreshTokenExpiresAt: expires,
    expiresInSeconds: Math.max(1, Number(config.TOKEN_EXPIRY_MINUTES) || 60) * 60
  };
};

export const verifyRefreshToken = async (token: string) => {
  const hashed = hashToken(token);
  return findActiveRefreshTokenByHash(hashed);
};

export const revokeRefreshTokens = async (userId: string): Promise<void> => {
  await revokeRefreshTokensForUser(userId);
};

export const revokeRefreshTokenById = async (token: RefreshTokenRecord): Promise<void> => {
  await markRefreshTokenRevoked(token.id);
};

export const hashRefreshToken = hashToken;
