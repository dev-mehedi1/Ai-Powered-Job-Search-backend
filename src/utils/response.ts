import { Response } from 'express';

interface ApiResponseOptions<T = any> {
  res: Response;
  statusCode?: number;
  success?: boolean;
  message?: string;
  data?: T;
  meta?: Record<string, any>;
}

export const sendResponse = <T = any>({
  res,
  statusCode = 200,
  success = true,
  message = '',
  data,
  meta,
}: ApiResponseOptions<T>): Response => {
  return res.status(statusCode).json({
    success,
    message,
    data: data !== undefined ? data : null,
    meta: meta !== undefined ? meta : undefined,
  });
};
