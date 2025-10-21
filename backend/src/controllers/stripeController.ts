import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth';
import {
  CheckoutSessionInput,
  createCheckoutSession,
  handleStripeWebhook,
  listStripePayments,
  verifyStripeWebhook
} from '../services/stripeService';

const checkoutSchema = z.object({
  amount: z.number().positive(),
  currency: z.string().length(3),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
  metadata: z.record(z.string()).optional(),
  customerEmail: z.string().email().optional()
});

export const createPaymentSession = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const payload = checkoutSchema.parse(req.body) as CheckoutSessionInput;
  const session = await createCheckoutSession(new Types.ObjectId(req.user.id), payload);
  res.status(201).json(session);
};

export const stripeWebhook = async (req: Request, res: Response) => {
  const signature = req.headers['stripe-signature'];
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return res.status(500).json({ message: 'Stripe webhook secret not configured' });
  }

  try {
    const event = verifyStripeWebhook(req.body as Buffer, { signature, secret });
    await handleStripeWebhook(event);
    res.status(200).send({ received: true });
  } catch (error) {
    res.status(400).json({ message: 'Invalid webhook signature', error: (error as Error).message });
  }
};

export const listPayments = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  const payments = await listStripePayments(new Types.ObjectId(req.user.id));
  res.json(payments);
};
