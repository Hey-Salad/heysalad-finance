import axios, { AxiosInstance } from 'axios';
import dayjs from 'dayjs';
import { config } from '../config/env';
import { categorizeTransaction } from './categorizationService';
import { upsertJournalEntriesForTransaction } from './accountingService';
import { logger } from '../utils/logger';
import {
  getUserById,
  getWiseToken as decryptWiseToken,
  setWiseProfileId,
  setWiseToken,
  UserWithSecrets
} from '../repositories/userRepository';
import { upsertBalance } from '../repositories/balanceRepository';
import {
  findLatestTransactionBySourceAndCurrency,
  TransactionRecord,
  upsertTransactionByWiseId
} from '../repositories/transactionRepository';

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
  transactions: TransactionRecord[];
}

const MAX_INTERVAL_DAYS = 469;
const getOauthBaseUrl = () =>
  config.isProduction ? 'https://wise.com' : 'https://sandbox.transferwise.tech';

const getBaseUrl = (useSandbox?: boolean): string => {
  const sandbox = useSandbox || config.isDevelopment;
  if (config.useWiseMtls) {
    return sandbox ? config.WISE_SANDBOX_MTLS_URL : config.WISE_API_MTLS_URL;
  }
  return sandbox ? config.WISE_SANDBOX_URL : config.WISE_API_URL;
};

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

interface WiseTokenMeta {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  tokenType?: string;
  scope?: string;
}

export class WiseService {
  private async ensureUser(userId: string) {
    const user = await getUserById(userId, { includeSecrets: true });
    if (!user) {
      throw new Error('User not found');
    }
    const storedToken = decryptWiseToken(user as UserWithSecrets);
    const tokenMeta = await this.resolveToken(userId, storedToken);
    return { user: user as UserWithSecrets, token: tokenMeta.accessToken };
  }

  private async resolveToken(userId: string, stored?: string): Promise<WiseTokenMeta> {
    if (stored) {
      let parsed: WiseTokenMeta;
      try {
        parsed = JSON.parse(stored) as WiseTokenMeta;
        if (!parsed.accessToken) {
          parsed = { accessToken: stored };
        }
      } catch {
        parsed = { accessToken: stored };
      }

      if (parsed.expiresAt && parsed.expiresAt <= Date.now() + 60_000) {
        if (!parsed.refreshToken) {
          throw new Error('Wise access token expired. Please reconnect your Wise integration.');
        }
        return this.refreshAccessToken(userId, parsed.refreshToken);
      }

      return parsed;
    }

    if (config.WISE_API_TOKEN) {
      return { accessToken: config.WISE_API_TOKEN };
    }

    throw new Error('Wise API token not configured for user');
  }

  private buildTokenPayload(data: Record<string, unknown>): WiseTokenMeta {
    const expiresIn = Number(data.expires_in ?? 0);
    return {
      accessToken: String(data.access_token ?? ''),
      refreshToken: data.refresh_token ? String(data.refresh_token) : undefined,
      tokenType: data.token_type ? String(data.token_type) : undefined,
      scope: data.scope ? String(data.scope) : undefined,
      expiresAt: expiresIn ? Date.now() + expiresIn * 1000 : undefined
    };
  }

  private async refreshAccessToken(userId: string, refreshToken: string): Promise<WiseTokenMeta> {
    if (
      !config.WISE_OAUTH_CLIENT_ID ||
      !config.WISE_OAUTH_CLIENT_SECRET ||
      !config.WISE_OAUTH_REDIRECT_URI
    ) {
      throw new Error('Wise OAuth credentials are not configured');
    }

    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: config.WISE_OAUTH_CLIENT_ID,
      client_secret: config.WISE_OAUTH_CLIENT_SECRET,
      redirect_uri: config.WISE_OAUTH_REDIRECT_URI
    });

    const response = await axios.post(`${getOauthBaseUrl()}/oauth/token`, params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const payload = this.buildTokenPayload(response.data);
    if (!payload.accessToken) {
      throw new Error('Failed to refresh Wise access token');
    }

    await setWiseToken(userId, JSON.stringify(payload));
    logger.info('Wise access token refreshed', { userId });
    return payload;
  }

  private async fetchProfileId(userId: string, client: AxiosInstance): Promise<string> {
    const user = await getUserById(userId, { includeSecrets: true });
    if (!user) {
      throw new Error('User not found');
    }
    const existing = user.wiseProfileId;
    if (existing) {
      return existing;
    }

    const response = await client.get<WiseProfileResponse[]>('/v1/profiles');
    const businessProfile = response.data.find((profile) => profile.type === 'business');
    const profile = businessProfile ?? response.data[0];

    if (!profile) {
      throw new Error('No Wise profile found for token');
    }

    await setWiseProfileId(userId, String(profile.id));

    return String(profile.id);
  }

  private async storeBalances(
    userId: string,
    wiseBalances: WiseBalanceResponse[]
  ): Promise<Array<{ currency: string; amount: number }>> {
    const summaries: Array<{ currency: string; amount: number }> = [];
    const now = new Date();

    await Promise.all(
      wiseBalances.map(async (balance) => {
        const amount = balance.amount?.value ?? 0;
        summaries.push({ currency: balance.currency, amount });
        await upsertBalance({
          userId,
          currency: balance.currency,
          amount,
          lastUpdated: now
        });
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
    userId: string,
    entry: WiseStatementEntry,
    category: { category: string; confidence: number },
    source: 'override' | 'ai'
  ): Promise<TransactionRecord> {
    const amount = entry.amount.value;
    const description = determineDescription(entry);
    const recipientName = determineRecipient(entry);
    const categoryConfidence = source === 'ai' ? category.confidence : 1;

    const transaction = await upsertTransactionByWiseId({
      user_id: userId,
      wise_id: String(entry.id),
      date: new Date(entry.completedAt).toISOString(),
      description,
      amount,
      currency: entry.amount.currency,
      type: determineType(entry),
      category: category.category,
      category_confidence: categoryConfidence,
      source: 'wise',
      recipient_name: recipientName ?? null,
      notes: null
    });

    await upsertJournalEntriesForTransaction(transaction);

    return transaction;
  }

  private async syncTransactionsForBalance(
    userId: string,
    client: AxiosInstance,
    profileId: string,
    balance: WiseBalanceResponse,
    options: SyncOptions
  ): Promise<TransactionRecord[]> {
    const latest = await findLatestTransactionBySourceAndCurrency(userId, 'wise', balance.currency);

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

    const synced: TransactionRecord[] = [];

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

  public async syncUserData(userId: string, options: SyncOptions = {}): Promise<SyncResult> {
    const { user, token } = await this.ensureUser(userId);
    const client = buildClient(token, options.useSandbox);
    const profileId = await this.fetchProfileId(user.id, client);

    const balancesResponse = await client.get<WiseBalanceResponse[]>(`/v4/profiles/${profileId}/balances`);

    const balances: WiseBalanceResponse[] = balancesResponse.data;
    const filteredBalances = options.currency
      ? balances.filter((balance) => balance.currency === options.currency)
      : balances;

    const balanceSummaries = await this.storeBalances(user.id, balances);
    const transactionsArrays = await Promise.all(
      filteredBalances.map((balance) =>
        this.syncTransactionsForBalance(user.id, client, profileId, balance, options)
      )
    );

    return {
      balances: balanceSummaries,
      transactions: transactionsArrays.flat()
    };
  }
}

export const wiseService = new WiseService();
