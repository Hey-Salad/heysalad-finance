import mongoose, { Document, Model, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import { encryptToString, decryptFromString } from '../utils/encryption';

export interface Settings {
  wiseToken?: string;
  stripeKey?: string;
  wiseProfileId?: string;
  defaultCurrency: string;
  refreshInterval: number;
}

export interface UserDocument extends Document {
  email: string;
  password: string;
  company: string;
  createdAt: Date;
  settings: Settings;
  comparePassword(candidate: string): Promise<boolean>;
  setWiseToken(token: string): void;
  getWiseToken(): string | undefined;
  setStripeKey(key: string): void;
  getStripeKey(): string | undefined;
  setWiseProfileId(profileId: string): void;
  getWiseProfileId(): string | undefined;
}

interface UserModel extends Model<UserDocument> {}

const SettingsSchema = new Schema<Settings>(
  {
    wiseToken: { type: String, select: false },
    stripeKey: { type: String, select: false },
    wiseProfileId: { type: String },
    defaultCurrency: { type: String, default: 'EUR' },
    refreshInterval: { type: Number, default: 30 }
  },
  { _id: false }
);

const UserSchema = new Schema<UserDocument, UserModel>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 8 },
    company: { type: String, required: true },
    settings: { type: SettingsSchema, default: {} }
  },
  { timestamps: true }
);

UserSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) {
    return next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

UserSchema.methods.comparePassword = function comparePassword(candidate: string) {
  return bcrypt.compare(candidate, this.password);
};

UserSchema.methods.setWiseToken = function setWiseToken(token: string) {
  this.set('settings.wiseToken', encryptToString(token));
};

UserSchema.methods.getWiseToken = function getWiseToken(): string | undefined {
  const stored = this.get('settings.wiseToken');
  if (!stored) {
    return undefined;
  }
  return decryptFromString(stored);
};

UserSchema.methods.setStripeKey = function setStripeKey(key: string) {
  this.set('settings.stripeKey', encryptToString(key));
};

UserSchema.methods.getStripeKey = function getStripeKey(): string | undefined {
  const stored = this.get('settings.stripeKey');
  if (!stored) {
    return undefined;
  }
  return decryptFromString(stored);
};

UserSchema.methods.setWiseProfileId = function setWiseProfileId(profileId: string) {
  this.set('settings.wiseProfileId', profileId);
};

UserSchema.methods.getWiseProfileId = function getWiseProfileId(): string | undefined {
  return this.get('settings.wiseProfileId');
};

export const User = mongoose.model<UserDocument, UserModel>('User', UserSchema);
