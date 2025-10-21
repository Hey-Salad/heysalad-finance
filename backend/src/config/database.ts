import mongoose from 'mongoose';
import { config } from './env';
import { logger } from '../utils/logger';

mongoose.set('strictQuery', true);

export const connectDatabase = async (): Promise<typeof mongoose> => {
  try {
    const connection = await mongoose.connect(config.MONGODB_URI, {
      autoIndex: !config.isProduction
    });
    logger.info('MongoDB connected successfully');
    return connection;
  } catch (error) {
    logger.error('MongoDB connection error', error as Error);
    throw error;
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  await mongoose.disconnect();
  logger.info('MongoDB disconnected');
};
