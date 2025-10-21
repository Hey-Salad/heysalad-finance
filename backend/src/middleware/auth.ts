import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { logger } from '../utils/logger';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

const extractToken = (req: Request): string | null => {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    return header.substring(7);
  }
  if (req.cookies?.token) {
    return req.cookies.token;
  }
  return null;
};

export const authenticate = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const token = extractToken(req);

  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET) as {
      sub: string;
      email: string;
      iat: number;
      exp: number;
    };

    req.user = {
      id: decoded.sub,
      email: decoded.email
    };

    return next();
  } catch (error) {
    logger.warn('Invalid authentication token', error as Error);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};
