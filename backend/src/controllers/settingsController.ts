import { Response } from 'express';
import { Types } from 'mongoose';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth';
import { User } from '../models/User';

const updateSchema = z.object({
  wiseToken: z.string().min(10).optional(),
  stripeKey: z.string().min(10).optional(),
  defaultCurrency: z.string().length(3).optional(),
  refreshInterval: z.number().min(5).max(1440).optional()
});

const ensureUser = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ message: 'Unauthorized' });
    return null;
  }
  const user = await User.findById(new Types.ObjectId(req.user.id)).select('+settings.wiseToken +settings.stripeKey');
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
    defaultCurrency: user.settings.defaultCurrency,
    refreshInterval: user.settings.refreshInterval,
    hasWiseToken: !!user.getWiseToken(),
    hasStripeKey: !!user.getStripeKey()
  });
};

export const updateSettings = async (req: AuthenticatedRequest, res: Response) => {
  const user = await ensureUser(req, res);
  if (!user) {
    return;
  }
  const payload = updateSchema.parse(req.body);

  if (payload.wiseToken) {
    user.setWiseToken(payload.wiseToken);
  }

  if (payload.stripeKey) {
    user.setStripeKey(payload.stripeKey);
  }

  if (payload.defaultCurrency) {
    user.settings.defaultCurrency = payload.defaultCurrency.toUpperCase();
  }

  if (payload.refreshInterval) {
    user.settings.refreshInterval = payload.refreshInterval;
  }

  await user.save();

  res.json({
    defaultCurrency: user.settings.defaultCurrency,
    refreshInterval: user.settings.refreshInterval,
    hasWiseToken: !!user.getWiseToken(),
    hasStripeKey: !!user.getStripeKey()
  });
};
