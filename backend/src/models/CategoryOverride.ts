import mongoose, { Document, Model, Schema } from 'mongoose';

export interface CategoryOverrideDocument extends Document {
  userId: mongoose.Types.ObjectId;
  matcher: string; // normalized description or recipient name
  category: string;
  updatedAt: Date;
}

const CategoryOverrideSchema = new Schema<CategoryOverrideDocument, Model<CategoryOverrideDocument>>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    matcher: { type: String, required: true },
    category: { type: String, required: true }
  },
  {
    timestamps: { createdAt: false, updatedAt: true }
  }
);

CategoryOverrideSchema.index({ userId: 1, matcher: 1 }, { unique: true });

export const CategoryOverride = mongoose.model<CategoryOverrideDocument>(
  'CategoryOverride',
  CategoryOverrideSchema
);
