import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { AppError } from './error';
import prisma from '../database/client';

export interface AuthenticatedRequest extends Request {
  admin?: {
    id: string;
    email: string;
    role: string;
  };
}

export const authenticate = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Authorization token required', 401);
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwt.accessSecret) as {
      id: string;
      email: string;
      role: string;
    };

    // Verify admin still exists
    const admin = await prisma.admin.findUnique({ where: { id: decoded.id } });
    if (!admin) {
      throw new AppError('Account no longer exists', 401);
    }

    req.admin = { id: decoded.id, email: decoded.email, role: decoded.role };
    next();
  } catch (error) {
    next(error);
  }
};

export const requireRole = (...roles: string[]) => {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.admin) {
      return next(new AppError('Not authenticated', 401));
    }
    if (!roles.includes(req.admin.role)) {
      return next(new AppError('Insufficient permissions', 403));
    }
    next();
  };
};

export const validate = (schema: any) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      next(error);
    }
  };
};
