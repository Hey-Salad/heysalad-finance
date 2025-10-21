import { Types } from 'mongoose';
import { CategoryOverride } from '../models/CategoryOverride';
import { TransactionDocument } from '../models/Transaction';
import { logger } from '../utils/logger';

export const TRANSACTION_CATEGORIES = [
  'Salaries',
  'Office Supplies',
  'Marketing',
  'Software Subscriptions',
  'Travel',
  'Meals',
  'Utilities',
  'Equipment',
  'Freelancers',
  'Insurance',
  'Rent',
  'Taxes',
  'Other Expenses',
  'Client Revenue',
  'Investment',
  'Grants',
  'Refunds',
  'Other Income',
  'Internal Transfer',
  'External Transfer'
];

type TransformersModule = typeof import('@xenova/transformers');
type ZeroShotClassifier = (
  text: string,
  labels: string[],
  options?: Record<string, unknown>
) => Promise<any>;

let modulePromise: Promise<TransformersModule> | null = null;
let classifierPromise: Promise<ZeroShotClassifier> | null = null;

const normalizeMatcher = (input: string): string =>
  input.toLowerCase().replace(/\s+/g, ' ').trim();

const loadModule = async (): Promise<TransformersModule> => {
  if (!modulePromise) {
    modulePromise = import('@xenova/transformers');
  }
  return modulePromise;
};

const loadClassifier = async (): Promise<ZeroShotClassifier> => {
  if (!classifierPromise) {
    const { pipeline } = await loadModule();
    classifierPromise = pipeline('zero-shot-classification', 'Xenova/mobilebert-uncased-mnli');
  }
  return classifierPromise;
};

export interface CategorizationResult {
  category: string;
  confidence: number;
  source: 'override' | 'ai';
}

export const categorizeTransaction = async (
  userId: Types.ObjectId,
  transaction: Pick<TransactionDocument, 'description' | 'recipientName' | 'amount' | 'currency'>
): Promise<CategorizationResult> => {
  const matcherSource = transaction.recipientName || transaction.description;
  const normalizedMatcher = normalizeMatcher(matcherSource);

  const override = await CategoryOverride.findOne({ userId, matcher: normalizedMatcher }).lean();
  if (override) {
    return { category: override.category, confidence: 1, source: 'override' };
  }

  const classifier = await loadClassifier();
  const hypothesisTemplate = 'This transaction is related to {label}.';

  try {
    const result = await classifier(matcherSource, TRANSACTION_CATEGORIES, {
      hypothesis_template: hypothesisTemplate
    });

    const [topResult] = Array.isArray(result.labels) && Array.isArray(result.scores)
      ? result.labels.map((label, index) => ({ label, score: result.scores[index] }))
      : result;

    if (!topResult) {
      return { category: 'Other Expenses', confidence: 0, source: 'ai' };
    }

    return {
      category: topResult.label,
      confidence: topResult.score ?? 0,
      source: 'ai'
    };
  } catch (error) {
    logger.error('Categorization failed, falling back to default category', error as Error);
    return {
      category: transaction.amount >= 0 ? 'Other Income' : 'Other Expenses',
      confidence: 0,
      source: 'ai'
    };
  }
};

export const recordCategoryOverride = async (
  userId: Types.ObjectId,
  matcher: string,
  category: string
): Promise<void> => {
  const normalizedMatcher = normalizeMatcher(matcher);
  await CategoryOverride.findOneAndUpdate(
    { userId, matcher: normalizedMatcher },
    { category },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};
