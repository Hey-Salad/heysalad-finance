import 'express-async-errors';
import compression from 'compression';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { config } from './config/env';
import { connectDatabase } from './config/database';
import router from './routes';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';
import { stripeWebhook } from './controllers/stripeController';
import { scheduleWiseSync } from './jobs/wiseSyncJob';

const app = express();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});

app.use(helmet());
app.use(cors({ origin: config.FRONTEND_URL, credentials: true }));
app.use(limiter);
app.use(morgan(config.isProduction ? 'combined' : 'dev'));
app.use(compression());

app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), stripeWebhook);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api', router);

app.use(errorHandler);

export const startServer = async () => {
  await connectDatabase();
  scheduleWiseSync();
  app.listen(config.port, () => {
    logger.info(`🚀 HeySalad® Finance API listening on port ${config.port}`);
  });
};

if (!config.isTest) {
  startServer().catch((error) => {
    logger.error('Failed to start server', error as Error);
    process.exit(1);
  });
}

export default app;
