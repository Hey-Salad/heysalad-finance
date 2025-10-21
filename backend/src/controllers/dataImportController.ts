import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { importTransactionsFromFile } from '../services/importService';

export const importTransactions = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded. Please attach a CSV, Excel, or PDF file.' });
  }

  try {
    const summary = await importTransactionsFromFile(req.user.id, req.file);
    return res.status(201).json({
      message: 'Import completed',
      ...summary
    });
  } catch (error) {
    return res.status(400).json({ message: (error as Error).message });
  }
};
