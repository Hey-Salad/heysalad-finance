import cron from 'node-cron';
import { config } from '../config/env';
import { wiseService } from '../services/wiseService';
import { logger } from '../utils/logger';
import { listUsersWithWiseToken } from '../repositories/userRepository';

const runSync = async () => {
  const users = await listUsersWithWiseToken();

  for (const user of users) {
    try {
      await wiseService.syncUserData(user.id, { useSandbox: !config.isProduction });
      logger.info(`Wise data synced for user ${user.id}`);
    } catch (error) {
      logger.error(`Failed to sync Wise data for user ${user.id}`, error as Error);
    }
  }
};

export const scheduleWiseSync = () => {
  if (config.isTest) {
    return;
  }

  const intervalMinutes = Number(config.WISE_POLL_INTERVAL_MINUTES) || 30;
  const expression = `*/${intervalMinutes} * * * *`;

  cron.schedule(expression, () => {
    logger.info('Running scheduled Wise sync job');
    runSync().catch((error) => logger.error('Wise sync job failure', error as Error));
  });

  // run initial sync shortly after startup
  setTimeout(() => {
    runSync().catch((error) => logger.error('Initial Wise sync failure', error as Error));
  }, 10_000);
};
