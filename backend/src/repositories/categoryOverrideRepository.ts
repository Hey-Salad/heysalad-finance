import { getSupabaseClient } from '../config/database';

export interface CategoryOverrideRecord {
  id: string;
  userId: string;
  matcher: string;
  category: string;
  updatedAt: Date;
}

interface CategoryOverrideRow {
  id: string;
  user_id: string;
  matcher: string;
  category: string;
  updated_at: string;
}

const toCategoryOverrideRecord = (row: CategoryOverrideRow): CategoryOverrideRecord => ({
  id: row.id,
  userId: row.user_id,
  matcher: row.matcher,
  category: row.category,
  updatedAt: new Date(row.updated_at)
});

export const findOverride = async (
  userId: string,
  matcher: string
): Promise<CategoryOverrideRecord | null> => {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('category_overrides')
    .select('*')
    .eq('user_id', userId)
    .eq('matcher', matcher)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? toCategoryOverrideRecord(data) : null;
};

export const upsertOverride = async (
  userId: string,
  matcher: string,
  category: string
): Promise<void> => {
  const client = getSupabaseClient();
  const { error } = await client
    .from('category_overrides')
    .upsert(
      {
        user_id: userId,
        matcher,
        category
      },
      { onConflict: 'user_id,matcher' }
    );

  if (error) {
    throw error;
  }
};
