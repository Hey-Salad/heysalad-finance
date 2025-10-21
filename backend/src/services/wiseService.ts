import axios, { AxiosInstance } from 'axios';
import dayjs from 'dayjs';
import { Types } from 'mongoose';
import { config } from '../config/env';
import { Balance } from '../models/Balance';
import { Transaction, TransactionDocument } from '../models/Transaction';
import { User } from '../models/User';
import { categorizeTransaction } from './categorizationService';
import { deriveTransactionType, upsertJournalEntriesForTransaction } from './accountingService';
import { logger } from '../utils/logger';

interface WiseProfileResponse {
  id: number;
  type: string;
}

interface WiseBalanceAmount {
  value: number;
  currency: string;
}

interface WiseBalanceResponse {
  id: number;
  currency: string;
  amount: WiseBalanceAmount;
}

interface WiseStatementEntry {
  id: number | string;
  type: string;
  amount: WiseBalanceAmount;
  total: WiseBalanceAmount;
  exchangeRate?: number;
  description: string;
  details?: {
    type?: string;
    reference?: string;
    merchant?: {
      name?: string;
    };
    senderName?: string;
    paymentReference?: string;
  };
  runningBalance: WiseBalanceAmount;
  completedAt: string;
}

interface WiseStatementResponse {
  balance: {
    id: number;
    currency: string;
  };
  statement: {
    intervalStart: string;
    intervalEnd: string;
    transactions: WiseStatementEntry[];
  };
}

export interface SyncOptions {
  startDate?: Date;
  endDate?: Date;
  currency?: string;
  useSandbox?: boolean;
}

export interface SyncResult {
  balances: Array<{ currency: string; amount: number }>;
  transactions: TransactionDocument[];
}

const MAX_INTERVAL_DAYS = 469;

const getBaseUrl = (useSandbox?: boolean): string =>
  useSandbox || config.isDevelopment ? config.WISE_SANDBOX_URL : config.WISE_API_URL;

const buildClient = (token: string, useSandbox?: boolean): AxiosInstance =>
  axios.create({
    baseURL: getBaseUrl(useSandbox),
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    timeout: 15000
  });

const determineDescription = (entry: WiseStatementEntry): string => {
  return (
    entry.details?.merchant?.name ||
    entry.details?.senderName ||
    entry.details?.paymentReference ||
    entry.details?.reference ||
    entry.description ||
    'Wise transaction'
  );
};

const determineRecipient = (entry: WiseStatementEntry): string | undefined =>
  entry.details?.merchant?.name || entry.details?.senderName || undefined;

const determineType = (entry: WiseStatementEntry): 'income' | 'expense' | 'transfer' => {
  const normalizedType = entry.type?.toLowerCase();
  if (normalizedType.includes('transfer')) {
    return 'transfer';
  }
  if (entry.amount.value >= 0) {
    return 'income';
  }
  return 'expense';
};

export class WiseService {
  private async ensureUser(userId: Types.ObjectId) {
    const user = await User.findById(userId).select('+settings.wiseToken');
    if (!user) {
      throw new Error('User not found');
    }
    const token = user.getWiseToken();
    if (!token) {
      throw new Error('Wise API token not configured for user');
    }
    return { user, token };
  }

  private async fetchProfileId(userId: Types.ObjectId, client: AxiosInstance): Promise<string> {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    const existing = user.getWiseProfileId();
    if (existing) {
      return existing;
    }

    const response = await client.get<WiseProfileResponse[]>('/v1/profiles');
    const businessProfile = response.data.find((profile) => profile.type === 'business');
    const profile = businessProfile ?? response.data[0];

    if (!profile) {
      throw new Error('No Wise profile found for token');
    }

    user.setWiseProfileId(String(profile.id));
    await user.save();

    return String(profile.id);
  }

  private async storeBalances(
    userId: Types.ObjectId,
    wiseBalances: WiseBalanceResponse[]
  ): Promise<Array<{ currency: string; amount: number }>> {
    const summaries: Array<{ currency: string; amount: number }> = [];
    const now = new Date();

    await Promise.all(
      wiseBalances.map(async (balance) => {
        const amount = balance.amount?.value ?? 0;
        summaries.push({ currency: balance.currency, amount });
        await Balance.findOneAndUpdate(
          { userId, currency: balance.currency },
          { amount, lastUpdated: now },
          { upsert: true, setDefaultsOnInsert: true }
        );
      })
    );

    return summaries;
  }

  private async fetchStatements(
    client: AxiosInstance,
    profileId: string,
    balanceId: number,
    start: Date,
    end: Date,
    currency: string
  ): Promise<WiseStatementEntry[]> {
    const response = await client.get<WiseStatementResponse>(
      `/v1/profiles/${profileId}/balance-statements/${balanceId}/statement.json`,
      {
        params: {
          currency,
          intervalStart: start.toISOString(),
          intervalEnd: end.toISOString(),
          type: 'COMPACT'
        }
      }
    );

    return response.data.statement.transactions ?? [];
  }

  private async upsertTransaction(
    userId: Types.ObjectId,
    entry: WiseStatementEntry,
    category: { category: string; confidence: number },
    source: 'override' | 'ai'
  ): Promise<TransactionDocument> {
    const amount = entry.amount.value;
    const description = determineDescription(entry);
    const recipientName = determineRecipient(entry);

    const transaction = await Transaction.findOneAndUpdate(
      { wiseId: String(entry.id) },
      {
        userId,
        wiseId: String(entry.id),
        date: new Date(entry.completedAt),
        description,
        amount,
        currency: entry.amount.currency,
        type: determineType(entry),
        category: category.category,
        categoryConfidence: category.confidence,
        source: 'wise',
        recipientName
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    if (source === 'ai') {
      transaction.categoryConfidence = category.confidence;
    } else {
      transaction.categoryConfidence = 1;
    }

    await transaction.save();
    await upsertJournalEntriesForTransaction(transaction);

    return transaction;
  }

  private async syncTransactionsForBalance(
    userId: Types.ObjectId,
    client: AxiosInstance,
    profileId: string,
    balance: WiseBalanceResponse,
    options: SyncOptions
  ): Promise<TransactionDocument[]> {
    const latest = await Transaction.findOne({
      userId,
      currency: balance.currency,
      source: 'wise'
    })
      .sort({ date: -1 })
      .lean();

    const defaultStart = latest ? dayjs(latest.date).subtract(1, 'day') : dayjs().subtract(90, 'day');
    const startDate = options.startDate ? dayjs(options.startDate) : defaultStart;
    const endDate = options.endDate ? dayjs(options.endDate) : dayjs();

    if (endDate.diff(startDate, 'day') > MAX_INTERVAL_DAYS) {
      throw new Error('Wise API restricts statements to 469 day ranges');
    }

    const entries = await this.fetchStatements(
      client,
      profileId,
      balance.id,
      startDate.toDate(),
      endDate.toDate(),
      balance.currency
    );

    const synced: TransactionDocument[] = [];

    for (const entry of entries) {
      const description = determineDescription(entry);
      const categorization = await categorizeTransaction(userId, {
        description,
        recipientName: determineRecipient(entry),
        amount: entry.amount.value,
        currency: entry.amount.currency
      });

      const transaction = await this.upsertTransaction(userId, entry, categorization, categorization.source);
      synced.push(transaction);
    }

    return synced;
  }

  public async syncUserData(userId: Types.ObjectId, options: SyncOptions = {}): Promise<SyncResult> {
    const { user, token } = await this.ensureUser(userId);
    const client = buildClient(token, options.useSandbox);
    const profileId = await this.fetchProfileId(user._id, client);

    const balancesResponse = await client.get<WiseBalanceResponse[]>(\n      `/v4/profiles/${profileId}/balances`\n    );\n\n    const balances: WiseBalanceResponse[] = balancesResponse.data;
    const filteredBalances = options.currency
      ? balances.filter((balance) => balance.currency === options.currency)
      : balances;

    const balanceSummaries = await this.storeBalances(user._id, balances);
    const transactionsArrays = await Promise.all(
      filteredBalances.map((balance) =>
        this.syncTransactionsForBalance(user._id, client, profileId, balance, options)
      )
    );

    return {
      balances: balanceSummaries,
      transactions: transactionsArrays.flat()
    };
  }
}

export const wiseService = new WiseService();
