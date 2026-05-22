import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';
import { ZodError } from 'zod';

export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Zod validation errors
  if (err instanceof ZodError) {
    res.status(422).json({
      success: false,
      message: 'Validation failed',
      data: null,
      errors: err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
    return;
  }

  // Operational errors (known)
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      data: null,
    });
    return;
  }

  // Prisma unique constraint errors
  if ((err as any).code === 'P2002') {
    res.status(409).json({
      success: false,
      message: 'A record with this value already exists',
      data: null,
    });
    return;
  }

  // Prisma not found errors
  if ((err as any).code === 'P2025') {
    res.status(404).json({
      success: false,
      message: 'Record not found',
      data: null,
    });
    return;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    res.status(401).json({
      success: false,
      message: 'Invalid token',
      data: null,
    });
    return;
  }

  if (err.name === 'TokenExpiredError') {
    res.status(401).json({
      success: false,
      message: 'Token expired',
      data: null,
    });
    return;
  }

  // Unknown errors
  logger.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    data: null,
  });
};
