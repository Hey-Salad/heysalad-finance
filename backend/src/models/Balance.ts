import mongoose, { Document, Model, Schema } from 'mongoose';

export interface BalanceDocument extends Document {
  userId: mongoose.Types.ObjectId;
  currency: string;
  amount: number;
  lastUpdated: Date;
}

const BalanceSchema = new Schema<BalanceDocument, Model<BalanceDocument>>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    currency: { type: String, required: true },
    amount: { type: Number, required: true },
    lastUpdated: { type: Date, required: true }
  },
  {
    timestamps: true
  }
);

BalanceSchema.index({ userId: 1, currency: 1 }, { unique: true });

export const Balance = mongoose.model<BalanceDocument>('Balance', BalanceSchema);
