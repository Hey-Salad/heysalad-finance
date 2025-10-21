import path from 'path';
import { parse } from 'csv-parse/sync';
import pdfParse from 'pdf-parse';
import xlsx from 'xlsx';
import dayjs from 'dayjs';
import { Types } from 'mongoose';
import { Transaction, TransactionDocument } from '../models/Transaction';
import { categorizeTransaction } from './categorizationService';
import { upsertJournalEntriesForTransaction } from './accountingService';
import { logger } from '../utils/logger';

export interface ImportedRecord {
  date: Date;
  description: string;
  amount: number;
  currency: string;
  notes?: string;
}

interface ImportSummary {
  imported: number;
  skipped: number;
}

const normaliseCurrency = (value?: string): string => {
  if (!value) {
    return 'EUR';
  }
  return value.trim().slice(0, 3).toUpperCase();
};

const extractAmount = (row: Record<string, string>): number | null => {
  const amountValue =
    row.amount ?? row.Amount ?? row.value ?? row.Value ?? row.debit ?? row.credit ?? row.Debit ?? row.Credit;
  if (amountValue === undefined || amountValue === null) {
    return null;
  }
  const normalised = String(amountValue).replace(/[^0-9.-]/g, '');
  if (!normalised) {
    return null;
  }
  const amount = Number(normalised);
  if (Number.isNaN(amount)) {
    return null;
  }

  const typeField = (row.type ?? row.Type ?? row.category ?? row.Category ?? '').toString().toLowerCase();
  if (typeField.includes('expense') || typeField.includes('debit')) {
    return Math.abs(amount) * -1;
  }
  if (typeField.includes('income') || typeField.includes('credit')) {
    return Math.abs(amount);
  }

  return amount;
};

const parseCSV = (buffer: Buffer): ImportedRecord[] => {
  const content = buffer.toString('utf-8');
  const rows = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  }) as Record<string, string>[];

  return rows.reduce<ImportedRecord[]>((collection, row) => {
    const amount = extractAmount(row);
    if (amount === null) {
      return collection;
    }

    const parsedDate = dayjs(row.date ?? row.Date);
    if (!parsedDate.isValid()) {
      return collection;
    }

    collection.push({
      date: parsedDate.toDate(),
      description: row.description ?? row.Description ?? row.note ?? row.Note ?? 'Imported transaction',
      amount,
      currency: normaliseCurrency(row.currency ?? row.Currency),
      notes: row.notes ?? row.Notes
    });

    return collection;
  }, []);
};

const parseXLSX = (buffer: Buffer): ImportedRecord[] => {
  const workbook = xlsx.read(buffer, { type: 'buffer' });
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];
  const rows = xlsx.utils.sheet_to_json<Record<string, string>>(sheet, { defval: '' });

  return rows.reduce<ImportedRecord[]>((collection, row) => {
    const amount = extractAmount(row);
    if (amount === null) {
      return collection;
    }

    const parsedDate = dayjs(row.date ?? row.Date);
    if (!parsedDate.isValid()) {
      return collection;
    }

    collection.push({
      date: parsedDate.toDate(),
      description: row.description ?? row.Description ?? row.note ?? row.Note ?? 'Imported transaction',
      amount,
      currency: normaliseCurrency(row.currency ?? row.Currency),
      notes: row.notes ?? row.Notes
    });

    return collection;
  }, []);
};

const parsePDF = async (buffer: Buffer): Promise<ImportedRecord[]> => {
  const parsed = await pdfParse(buffer);
  const lines = parsed.text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const records: ImportedRecord[] = [];
  const lineRegex = /(\d{4}-\d{2}-\d{2})\s+(.+?)\s+(-?\d+[.,]?\d*)\s+([A-Z]{3})/;

  for (const line of lines) {
    const match = line.match(lineRegex);
    if (!match) {
      continue;
    }

    const [, date, description, amountValue, currency] = match;
    const amount = Number(amountValue.replace(',', ''));
    const parsedDate = dayjs(date);

    if (!parsedDate.isValid() || Number.isNaN(amount)) {
      continue;
    }

    records.push({
      date: parsedDate.toDate(),
      description,
      amount,
      currency: normaliseCurrency(currency)
    });
  }

  if (!records.length) {
    logger.warn('PDF import produced no structured rows, please ensure the document is tabular.');
  }

  return records;
};

const parseBufferByExtension = async (file: { buffer: Buffer; originalname: string }): Promise<ImportedRecord[]> => {
  const ext = path.extname(file.originalname).toLowerCase();

  if (ext === '.csv') {
    return parseCSV(file.buffer);
  }

  if (ext === '.xls' || ext === '.xlsx') {
    return parseXLSX(file.buffer);
  }

  if (ext === '.pdf') {
    return parsePDF(file.buffer);
  }

  throw new Error('Unsupported file extension. Please upload CSV, XLSX, or PDF files.');
};

const createTransactionHash = (record: ImportedRecord): string => {
  return `${dayjs(record.date).format('YYYY-MM-DD')}:${record.description}:${record.amount}:${record.currency}`.toLowerCase();
};

export const importTransactionsFromFile = async (
  userId: Types.ObjectId,
  file: Express.Multer.File
): Promise<ImportSummary> => {
  const records = await parseBufferByExtension({ buffer: file.buffer, originalname: file.originalname });

  let imported = 0;
  let skipped = 0;

  for (const record of records) {
    const hash = createTransactionHash(record);

    const existing = await Transaction.findOne({
      userId,
      externalId: hash
    });

    if (existing) {
      skipped += 1;
      continue;
    }

    const categorisation = await categorizeTransaction(userId, {
      description: record.description,
      recipientName: undefined,
      amount: record.amount,
      currency: record.currency
    });

    const transactionType: TransactionDocument['type'] =
      record.amount > 0 ? 'income' : record.amount < 0 ? 'expense' : 'transfer';

    const transaction = new Transaction({
      userId,
      date: record.date,
      description: record.description,
      amount: record.amount,
      currency: record.currency,
      type: transactionType,
      category: categorisation.category,
      categoryConfidence: categorisation.confidence,
      source: 'manual',
      notes: record.notes,
      externalId: hash
    });

    await transaction.save();
    await upsertJournalEntriesForTransaction(transaction);

    imported += 1;
  }

  return { imported, skipped };
};
