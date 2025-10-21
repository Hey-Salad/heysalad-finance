import mongoose, { Document, Model, Schema } from 'mongoose';

export interface BurnRateScenarioDocument extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  revenueMultiplier: number;
  expenseMultiplier: number;
  projectedRunway: number;
  createdAt: Date;
}

const BurnRateScenarioSchema = new Schema<BurnRateScenarioDocument, Model<BurnRateScenarioDocument>>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true },
    revenueMultiplier: { type: Number, required: true },
    expenseMultiplier: { type: Number, required: true },
    projectedRunway: { type: Number, required: true }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

BurnRateScenarioSchema.index({ userId: 1, name: 1 }, { unique: true });

export const BurnRateScenario = mongoose.model<BurnRateScenarioDocument>(
  'BurnRateScenario',
  BurnRateScenarioSchema
);
