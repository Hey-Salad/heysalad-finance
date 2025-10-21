import { Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth';
import {
  getUserById,
  setWiseToken,
  setStripeKey,
  updateUserSettings,
  UserWithSecrets
} from '../repositories/userRepository';

const updateSchema = z.object({
  wiseToken: z.string().min(10).optional(),
  stripeKey: z.string().min(10).optional(),
  defaultCurrency: z.string().length(3).optional(),
  refreshInterval: z.number().min(5).max(1440).optional()
});

const ensureUser = async (req: AuthenticatedRequest, res: Response): Promise<UserWithSecrets | null> => {
  if (!req.user) {
    res.status(401).json({ message: 'Unauthorized' });
    return null;
  }
  const user = await getUserById(req.user.id, { includeSecrets: true });
  if (!user) {
    res.status(404).json({ message: 'User not found' });
    return null;
  }
  return user;
};

export const getSettings = async (req: AuthenticatedRequest, res: Response) => {
  const user = await ensureUser(req, res);
  if (!user) {
    return;
  }

  res.json({
    defaultCurrency: user.defaultCurrency,
    refreshInterval: user.refreshInterval,
    hasWiseToken: user.hasWiseToken,
    hasStripeKey: user.hasStripeKey
  });
};

export const updateSettings = async (req: AuthenticatedRequest, res: Response) => {
  const user = await ensureUser(req, res);
  if (!user) {
    return;
  }
  const payload = updateSchema.parse(req.body);

  if (payload.wiseToken) {
    await setWiseToken(user.id, payload.wiseToken);
    user.hasWiseToken = true;
  }

  if (payload.stripeKey) {
    await setStripeKey(user.id, payload.stripeKey);
    user.hasStripeKey = true;
  }

  const updates: { defaultCurrency?: string; refreshInterval?: number } = {};

  if (payload.defaultCurrency) {
    updates.defaultCurrency = payload.defaultCurrency.toUpperCase();
  }

  if (payload.refreshInterval !== undefined) {
    updates.refreshInterval = payload.refreshInterval;
  }

  if (Object.keys(updates).length > 0) {
    const updated = await updateUserSettings(user.id, updates);
    user.defaultCurrency = updated.defaultCurrency;
    user.refreshInterval = updated.refreshInterval;
  }

  res.json({
    defaultCurrency: user.defaultCurrency,
    refreshInterval: user.refreshInterval,
    hasWiseToken: user.hasWiseToken,
    hasStripeKey: user.hasStripeKey
  });
};
