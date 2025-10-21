import client from './client';

export interface TransactionFilter {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
  category?: string;
  currency?: string;
  type?: string;
  search?: string;
}

export const fetchTransactions = async (filters: TransactionFilter = {}) => {
  const response = await client.get('/transactions', { params: filters });
  return response.data;
};

export const updateTransaction = async (id: string, payload: { category?: string; notes?: string }) => {
  const response = await client.put(`/transactions/${id}`, payload);
  return response.data;
};

export const exportTransactions = async (format: 'csv' | 'json') => {
  const response = await client.get('/transactions/export', {
    params: { format },
    responseType: format === 'csv' ? 'blob' : 'json'
  });
  return response.data;
};

export const triggerWiseSync = async (payload: { startDate?: string; endDate?: string; currency?: string }) => {
  const response = await client.post('/transactions/sync', payload);
  return response.data;
};

export interface ImportSummary {
  message?: string;
  imported: number;
  skipped: number;
}

export const importTransactionsFromFile = async (file: File): Promise<ImportSummary> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await client.post('/transactions/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};
