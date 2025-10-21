import Stripe from 'stripe';
import dayjs from 'dayjs';
import { config } from '../config/env';
import { upsertJournalEntriesForTransaction } from './accountingService';
import { logger } from '../utils/logger';
import {
  getUserById,
  getStripeKey as decryptStripeKey,
  UserWithSecrets
} from '../repositories/userRepository';
import {
  listTransactionsBySource,
  upsertTransactionByExternalId
} from '../repositories/transactionRepository';

const STRIPE_API_VERSION: Stripe.LatestApiVersion = '2025-09-30.clover';

const stripeClients = new Map<string, Stripe>();

const getStripeKeyForUser = async (userId: string): Promise<string> => {
  const user = await getUserById(userId, { includeSecrets: true });
  if (!user) {
    throw new Error('User not found');
  }
  const userKey = decryptStripeKey(user as UserWithSecrets);
  if (userKey) {
    return userKey;
  }
  if (!config.STRIPE_SECRET_KEY) {
    throw new Error('Stripe secret key not configured');
  }
  return config.STRIPE_SECRET_KEY;
};

const getStripeClient = async (userId: string): Promise<Stripe> => {
  const key = await getStripeKeyForUser(userId);
  if (stripeClients.has(key)) {
    return stripeClients.get(key)!;
  }
  const client = new Stripe(key, { apiVersion: STRIPE_API_VERSION });
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
  userId: string,
  payload: CheckoutSessionInput
): Promise<Stripe.Checkout.Session> => {
  const stripe = await getStripeClient(userId);
  return stripe.checkout.sessions.create({
    mode: 'payment',
    success_url: payload.successUrl,
    cancel_url: payload.cancelUrl,
    customer_email: payload.customerEmail,
    metadata: {
      userId,
      ...payload.metadata
    },
    line_items: [
      {
        price_data: {
          currency: payload.currency,
          product_data: {
            name: payload.metadata?.description ?? 'HeySalad® Payment'
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
  const stripe = new Stripe(config.STRIPE_SECRET_KEY ?? '', { apiVersion: STRIPE_API_VERSION });
  return stripe.webhooks.constructEvent(rawBody, signature as string, secret);
};

const recordStripeTransaction = async (
  userId: string,
  payload: {
    stripeId: string;
    description: string;
    amount: number;
    currency: string;
    occurredAt: Date;
    customerEmail?: string;
  }
) => {
  const transaction = await upsertTransactionByExternalId({
    user_id: userId,
    external_id: payload.stripeId,
    wise_id: null,
    date: payload.occurredAt.toISOString(),
    description: payload.description,
    amount: payload.amount,
    currency: payload.currency,
    type: 'income',
    category: 'Client Revenue',
    category_confidence: 1,
    source: 'stripe',
    notes: null,
    recipient_name: payload.customerEmail ?? null
  });

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

      await recordStripeTransaction(userId, {
        stripeId: session.id,
        description: session.metadata?.description ?? 'HeySalad® Stripe Checkout',
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
      await recordStripeTransaction(userId, {
        stripeId: intent.id,
        description:
          intent.metadata?.description ?? intent.description ?? 'HeySalad® Stripe Payment Intent',
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

export const listStripePayments = async (userId: string) => {
  return listTransactionsBySource(userId, 'stripe');
};
