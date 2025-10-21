import mongoose, { Document, Model, Schema } from 'mongoose';

export type TransactionSource = 'wise' | 'stripe' | 'manual';
export type TransactionType = 'income' | 'expense' | 'transfer';

export interface TransactionDocument extends Document {
  userId: mongoose.Types.ObjectId;
  wiseId?: string;
  externalId?: string;
  date: Date;
  description: string;
  amount: number;
  currency: string;
  type: TransactionType;
  category: string;
  categoryConfidence?: number;
  source: TransactionSource;
  notes?: string;
  recipientName?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TransactionSchema = new Schema<TransactionDocument, Model<TransactionDocument>>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    wiseId: { type: String, unique: true, sparse: true },
    externalId: { type: String },
    date: { type: Date, required: true },
    description: { type: String, required: true },
    amount: { type: Number, required: true },
    currency: { type: String, required: true },
    type: { type: String, enum: ['income', 'expense', 'transfer'], required: true },
    category: { type: String, required: true },
    categoryConfidence: { type: Number, min: 0, max: 1 },
    source: { type: String, enum: ['wise', 'stripe', 'manual'], default: 'wise' },
    notes: { type: String },
    recipientName: { type: String }
  },
  { timestamps: true }
);

TransactionSchema.index({ userId: 1, date: -1 });
TransactionSchema.index({ userId: 1, category: 1 });
TransactionSchema.index({ userId: 1, currency: 1 });
TransactionSchema.index({ userId: 1, externalId: 1 }, { unique: true, sparse: true });

export const Transaction = mongoose.model<TransactionDocument>('Transaction', TransactionSchema);
