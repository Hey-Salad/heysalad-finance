import { Request, Response } from 'express';
import { z } from 'zod';
import { config } from '../config/env';
import {
  createUser,
  getUserByEmail,
  getUserById,
  verifyPassword,
  UserWithSecrets
} from '../repositories/userRepository';
import {
  generateRefreshToken,
  revokeRefreshTokens,
  verifyRefreshToken,
  revokeRefreshTokenById,
  AuthUser
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
  const existing = await getUserByEmail(payload.email);
  if (existing) {
    return res.status(409).json({ message: 'Email already in use' });
  }

  const user = await createUser(payload);
  const authUser: AuthUser = { id: user.id, email: user.email };
  const tokens = await generateRefreshToken(authUser);

  res.status(201).json({
    user: {
      id: user.id,
      email: user.email,
      company: user.company
    },
    tokens: tokenResponse(tokens.accessToken, tokens.refreshToken, tokens.refreshTokenExpiresAt)
  });
};

export const login = async (req: Request, res: Response) => {
  const payload = loginSchema.parse(req.body);
  const user = await getUserByEmail(payload.email, { includeSecrets: true });
  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const passwordMatch = await verifyPassword(user as UserWithSecrets, payload.password);
  if (!passwordMatch) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const authUser: AuthUser = { id: user.id, email: user.email };
  const tokens = await generateRefreshToken(authUser);

  res.json({
    user: {
      id: user.id,
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

  const user = await getUserById(tokenDoc.userId);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  await revokeRefreshTokenById(tokenDoc);

  const authUser: AuthUser = { id: user.id, email: user.email };
  const tokens = await generateRefreshToken(authUser);
  res.json({
    tokens: tokenResponse(tokens.accessToken, tokens.refreshToken, tokens.refreshTokenExpiresAt)
  });
};

export const logout = async (req: Request, res: Response) => {
  const { refreshToken } = refreshSchema.parse(req.body);
  const tokenDoc = await verifyRefreshToken(refreshToken);
  if (tokenDoc) {
    await revokeRefreshTokenById(tokenDoc);
    await revokeRefreshTokens(tokenDoc.userId);
  }
  res.status(204).send();
};
