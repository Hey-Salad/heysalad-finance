import crypto from 'crypto';
import mongoose, { Document, Model, Schema } from 'mongoose';

export interface RefreshTokenDocument extends Document {
  userId: mongoose.Types.ObjectId;
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
  revokedAt?: Date;
  compareToken(token: string): boolean;
}

interface RefreshTokenModel extends Model<RefreshTokenDocument> {
  hashToken(token: string): string;
}

const RefreshTokenSchema = new Schema<RefreshTokenDocument, RefreshTokenModel>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

RefreshTokenSchema.methods.compareToken = function compareToken(token: string): boolean {
  const hash = RefreshToken.hashToken(token);
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(this.tokenHash, 'hex'));
};

RefreshTokenSchema.statics.hashToken = function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
};

export const RefreshToken = mongoose.model<RefreshTokenDocument, RefreshTokenModel>(
  'RefreshToken',
  RefreshTokenSchema
);
