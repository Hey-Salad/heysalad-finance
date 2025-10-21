import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { RefreshToken } from '../models/RefreshToken';
import { UserDocument } from '../models/User';

interface TokenPair {
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
}

const generateRawRefreshToken = () => crypto.randomBytes(48).toString('hex');

export const generateAccessToken = (user: UserDocument): string => {
  return jwt.sign({ email: user.email }, config.JWT_SECRET, {
    subject: user._id.toString(),
    expiresIn: `${config.TOKEN_EXPIRY_MINUTES}m`
  });
};

export const generateRefreshToken = async (user: UserDocument): Promise<TokenPair> => {
  const refreshToken = generateRawRefreshToken();
  const expires = new Date();
  expires.setDate(expires.getDate() + Number(config.REFRESH_TOKEN_EXPIRY_DAYS));

  await RefreshToken.create({
    userId: user._id,
    tokenHash: RefreshToken.hashToken(refreshToken),
    expiresAt: expires
  });

  return {
    accessToken: generateAccessToken(user),
    refreshToken,
    refreshTokenExpiresAt: expires
  };
};

export const verifyRefreshToken = async (token: string) => {
  const hashed = RefreshToken.hashToken(token);
  return RefreshToken.findOne({
    tokenHash: hashed,
    revokedAt: { $exists: false },
    expiresAt: { $gt: new Date() }
  });
};

export const revokeRefreshTokens = async (userId: string): Promise<void> => {
  await RefreshToken.updateMany({ userId, revokedAt: { $exists: false } }, { revokedAt: new Date() });
};
