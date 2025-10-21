import mongoose, { Document, Model, Schema } from 'mongoose';

export interface JournalEntryDocument extends Document {
  userId: mongoose.Types.ObjectId;
  date: Date;
  description: string;
  debitAccount: string;
  debitAmount: number;
  creditAccount: string;
  creditAmount: number;
  transactionId: mongoose.Types.ObjectId;
  createdAt: Date;
}

const JournalEntrySchema = new Schema<JournalEntryDocument, Model<JournalEntryDocument>>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    date: { type: Date, required: true },
    description: { type: String, required: true },
    debitAccount: { type: String, required: true },
    debitAmount: { type: Number, required: true },
    creditAccount: { type: String, required: true },
    creditAmount: { type: Number, required: true },
    transactionId: { type: Schema.Types.ObjectId, ref: 'Transaction', required: true }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

JournalEntrySchema.index({ userId: 1, date: -1 });

export const JournalEntry = mongoose.model<JournalEntryDocument>('JournalEntry', JournalEntrySchema);
