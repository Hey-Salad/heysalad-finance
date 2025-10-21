import { Response } from 'express';
import { Types } from 'mongoose';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth';
import { Balance } from '../models/Balance';

const currencySchema = z.object({
  currency: z.string().length(3)
});

const ensureUser = (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ message: 'Unauthorized' });
    return null;
  }
  return new Types.ObjectId(req.user.id);
};

export const listBalances = async (req: AuthenticatedRequest, res: Response) => {
  const userId = ensureUser(req, res);
  if (!userId) {
    return;
  }
  const balances = await Balance.find({ userId }).lean();
  res.json(balances);
};

export const getBalanceByCurrency = async (req: AuthenticatedRequest, res: Response) => {
  const userId = ensureUser(req, res);
  if (!userId) {
    return;
  }
  const { currency } = currencySchema.parse(req.params);
  const balance = await Balance.findOne({ userId, currency: currency.toUpperCase() }).lean();
  if (!balance) {
    return res.status(404).json({ message: 'Balance not found' });
  }
  res.json(balance);
};
