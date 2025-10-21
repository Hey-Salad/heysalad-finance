import { logger } from '../utils/logger';
import { findOverride, upsertOverride } from '../repositories/categoryOverrideRepository';

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
  userId: string,
  transaction: { description: string; recipientName?: string; amount: number; currency: string }
): Promise<CategorizationResult> => {
  const matcherSource = transaction.recipientName || transaction.description;
  const normalizedMatcher = normalizeMatcher(matcherSource);

  const override = await findOverride(userId, normalizedMatcher);
  if (override) {
    return { category: override.category, confidence: 1, source: 'override' };
  }

  const classifier = await loadClassifier();
  const hypothesisTemplate = 'This transaction is related to {label}.';

  try {
    const rawResult = await classifier(matcherSource, TRANSACTION_CATEGORIES, {
      hypothesis_template: hypothesisTemplate
    });

    const normalizedResults: Array<{ label: string; score: number | undefined }> =
      Array.isArray(rawResult)
        ? rawResult
        : Array.isArray(rawResult.labels) && Array.isArray(rawResult.scores)
          ? rawResult.labels.map((label: string, index: number) => ({
              label,
              score: rawResult.scores[index]
            }))
          : [];

    const [topResult] = normalizedResults;

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
  userId: string,
  matcher: string,
  category: string
): Promise<void> => {
  const normalizedMatcher = normalizeMatcher(matcher);
  await upsertOverride(userId, normalizedMatcher, category);
};
