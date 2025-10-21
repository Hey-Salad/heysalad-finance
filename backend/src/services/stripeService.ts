import Stripe from 'stripe';
import { Types } from 'mongoose';
import dayjs from 'dayjs';
import { config } from '../config/env';
import { Transaction } from '../models/Transaction';
import { User } from '../models/User';
import { upsertJournalEntriesForTransaction } from './accountingService';
import { logger } from '../utils/logger';

const stripeClients = new Map<string, Stripe>();

const getStripeKeyForUser = async (userId: Types.ObjectId): Promise<string> => {
  const user = await User.findById(userId).select('+settings.stripeKey');
  if (!user) {
    throw new Error('User not found');
  }
  const userKey = user.getStripeKey();
  if (userKey) {
    return userKey;
  }
  if (!config.STRIPE_SECRET_KEY) {
    throw new Error('Stripe secret key not configured');
  }
  return config.STRIPE_SECRET_KEY;
};

const getStripeClient = async (userId: Types.ObjectId): Promise<Stripe> => {
  const key = await getStripeKeyForUser(userId);
  if (stripeClients.has(key)) {
    return stripeClients.get(key)!;
  }
  const client = new Stripe(key, { apiVersion: '2024-06-20' });
  stripeClients.set(key, client);
  return client;
};

export interface CheckoutSessionInput {
  amount: number;
  currency: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
  customerEmail?: string;
}

export const createCheckoutSession = async (
  userId: Types.ObjectId,
  payload: CheckoutSessionInput
): Promise<Stripe.Checkout.Session> => {
  const stripe = await getStripeClient(userId);
  return stripe.checkout.sessions.create({
    mode: 'payment',
    success_url: payload.successUrl,
    cancel_url: payload.cancelUrl,
    customer_email: payload.customerEmail,
    metadata: {
      userId: userId.toString(),
      ...payload.metadata
    },
    line_items: [
      {
        price_data: {
          currency: payload.currency,
          product_data: {
            name: payload.metadata?.description ?? 'HeySalad Payment'
          },
          unit_amount: Math.round(payload.amount * 100)
        },
        quantity: 1
      }
    ]
  });
};

interface StripeWebhookContext {
  signature: string | string[] | undefined;
  secret: string;
}

export const verifyStripeWebhook = (
  rawBody: Buffer,
  { signature, secret }: StripeWebhookContext
): Stripe.Event => {
  const stripe = new Stripe(config.STRIPE_SECRET_KEY ?? '', { apiVersion: '2024-06-20' });
  return stripe.webhooks.constructEvent(rawBody, signature as string, secret);
};

const recordStripeTransaction = async (
  userId: Types.ObjectId,
  payload: {
    stripeId: string;
    description: string;
    amount: number;
    currency: string;
    occurredAt: Date;
    customerEmail?: string;
  }
) => {
  const transaction = await Transaction.findOneAndUpdate(
    { userId, externalId: payload.stripeId },
    {
      userId,
      externalId: payload.stripeId,
      date: payload.occurredAt,
      description: payload.description,
      amount: payload.amount,
      currency: payload.currency,
      type: 'income',
      category: 'Client Revenue',
      categoryConfidence: 1,
      source: 'stripe',
      recipientName: payload.customerEmail
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await upsertJournalEntriesForTransaction(transaction);
};

export const handleStripeWebhook = async (
  event: Stripe.Event
): Promise<{ acknowledged: boolean }> => {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      if (!userId) {
        logger.warn('Stripe webhook missing userId metadata');
        return { acknowledged: false };
      }
      if (!session.amount_total || !session.currency) {
        return { acknowledged: false };
      }

      await recordStripeTransaction(new Types.ObjectId(userId), {
        stripeId: session.id,
        description: session.metadata?.description ?? 'Stripe Checkout Payment',
        amount: (session.amount_total ?? 0) / 100,
        currency: session.currency,
        occurredAt: dayjs(session.created * 1000).toDate(),
        customerEmail: session.customer_details?.email || session.customer_email || undefined
      });
      break;
    }
    case 'payment_intent.succeeded': {
      const intent = event.data.object as Stripe.PaymentIntent;
      const userId = intent.metadata?.userId;
      if (!userId || !intent.amount_received || !intent.currency) {
        return { acknowledged: false };
      }
      await recordStripeTransaction(new Types.ObjectId(userId), {
        stripeId: intent.id,
        description: intent.metadata?.description ?? intent.description ?? 'Stripe Payment Intent',
        amount: intent.amount_received / 100,
        currency: intent.currency,
        occurredAt: dayjs(intent.created * 1000).toDate(),
        customerEmail: intent.receipt_email || undefined
      });
      break;
    }
    default:
      logger.debug(`Unhandled stripe event: ${event.type}`);
  }
  return { acknowledged: true };
};

export const listStripePayments = async (userId: Types.ObjectId) => {
  return Transaction.find({ userId, source: 'stripe' }).sort({ date: -1 }).lean();
};
