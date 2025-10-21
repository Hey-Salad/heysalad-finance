import { Request, Response } from 'express';
import { z } from 'zod';
import { config } from '../config/env';
import { RefreshToken } from '../models/RefreshToken';
import { User } from '../models/User';
import {
  generateAccessToken,
  generateRefreshToken,
  revokeRefreshTokens,
  verifyRefreshToken
} from '../utils/jwt';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  company: z.string().min(2)
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

const refreshSchema = z.object({
  refreshToken: z.string().min(10)
});

const tokenResponse = (
  accessToken: string,
  refreshToken: string,
  refreshTokenExpiresAt: Date
) => ({
  accessToken,
  refreshToken,
  refreshTokenExpiresAt,
  expiresIn: Number(config.TOKEN_EXPIRY_MINUTES) * 60
});

export const register = async (req: Request, res: Response) => {
  const payload = registerSchema.parse(req.body);
  const existing = await User.findOne({ email: payload.email });
  if (existing) {
    return res.status(409).json({ message: 'Email already in use' });
  }

  const user = await User.create(payload);
  const tokens = await generateRefreshToken(user);

  res.status(201).json({
    user: {
      id: user._id,
      email: user.email,
      company: user.company
    },
    tokens: tokenResponse(tokens.accessToken, tokens.refreshToken, tokens.refreshTokenExpiresAt)
  });
};

export const login = async (req: Request, res: Response) => {
  const payload = loginSchema.parse(req.body);
  const user = await User.findOne({ email: payload.email });
  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const passwordMatch = await user.comparePassword(payload.password);
  if (!passwordMatch) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const tokens = await generateRefreshToken(user);

  res.json({
    user: {
      id: user._id,
      email: user.email,
      company: user.company
    },
    tokens: tokenResponse(tokens.accessToken, tokens.refreshToken, tokens.refreshTokenExpiresAt)
  });
};

export const refresh = async (req: Request, res: Response) => {
  const { refreshToken } = refreshSchema.parse(req.body);
  const tokenDoc = await verifyRefreshToken(refreshToken);
  if (!tokenDoc) {
    return res.status(401).json({ message: 'Refresh token expired or revoked' });
  }

  const user = await User.findById(tokenDoc.userId);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  tokenDoc.revokedAt = new Date();
  await tokenDoc.save();

  const tokens = await generateRefreshToken(user);
  res.json({
    tokens: tokenResponse(tokens.accessToken, tokens.refreshToken, tokens.refreshTokenExpiresAt)
  });
};

export const logout = async (req: Request, res: Response) => {
  const { refreshToken } = refreshSchema.parse(req.body);
  const tokenDoc = await verifyRefreshToken(refreshToken);
  if (tokenDoc) {
    tokenDoc.revokedAt = new Date();
    await tokenDoc.save();
    await revokeRefreshTokens(tokenDoc.userId.toString());
  }
  res.status(204).send();
};
