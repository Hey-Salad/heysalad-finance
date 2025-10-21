import { NextFunction, Request, Response } from 'express';
import { logger } from '../utils/logger';

interface AppError extends Error {
  status?: number;
  code?: string;
  details?: unknown;
}

export const errorHandler = (
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  const status = err.status || 500;
  const response = {
    message: err.message || 'Internal server error',
    code: err.code,
    details: err.details
  };

  if (status >= 500) {
    logger.error('Unhandled error', err);
  } else {
    logger.warn(`Handled error (${status})`, err);
  }

  res.status(status).json(response);
};
