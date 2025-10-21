import { Router } from 'express';
import * as authController from '../controllers/authController';
import * as transactionController from '../controllers/transactionController';
import * as statementController from '../controllers/statementController';
import * as burnRateController from '../controllers/burnRateController';
import * as stripeController from '../controllers/stripeController';
import * as settingsController from '../controllers/settingsController';
import * as balanceController from '../controllers/balanceController';
import * as dataImportController from '../controllers/dataImportController';
import * as wiseOauthController from '../controllers/wiseOauthController';
import { authenticate } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { config } from '../config/env';

const router = Router();

router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.post('/auth/refresh', authController.refresh);
router.post('/auth/logout', authController.logout);
if (config.allowDevAutoLogin) {
  router.post('/auth/dev-login', authController.devLogin);
}

router.get('/transactions', authenticate, transactionController.listTransactions);
router.get('/transactions/export', authenticate, transactionController.exportTransactions);
router.get('/transactions/:id', authenticate, transactionController.getTransactionById);
router.put('/transactions/:id', authenticate, transactionController.updateTransaction);
router.post('/transactions/sync', authenticate, transactionController.syncTransactions);
router.post(
  '/transactions/import',
  authenticate,
  upload.single('file'),
  dataImportController.importTransactions
);

router.get('/balances', authenticate, balanceController.listBalances);
router.get('/balances/:currency', authenticate, balanceController.getBalanceByCurrency);

router.get('/statements/balance-sheet', authenticate, statementController.getBalanceSheetStatement);
router.get('/statements/p-and-l', authenticate, statementController.getProfitAndLossStatement);
router.get('/statements/cash-flow', authenticate, statementController.getCashFlowStatement);
router.get('/statements/export', authenticate, statementController.exportFinancialStatement);

router.get('/burn-rate/current', authenticate, burnRateController.getCurrentBurnRate);
router.get('/burn-rate/history', authenticate, burnRateController.getBurnRateHistory);
router.post('/burn-rate/scenarios', authenticate, burnRateController.createScenario);
router.get('/burn-rate/scenarios', authenticate, burnRateController.getScenarios);
router.get('/burn-rate/runway', authenticate, burnRateController.getRunwayProjection);

router.post('/payments/create-session', authenticate, stripeController.createPaymentSession);
router.get('/payments', authenticate, stripeController.listPayments);

router.get('/settings', authenticate, settingsController.getSettings);
router.put('/settings', authenticate, settingsController.updateSettings);

router.get('/wise/oauth/url', authenticate, wiseOauthController.getAuthorizationUrl);
router.get('/wise/oauth/callback', wiseOauthController.handleCallback);

export default router;
