import { Request, Response, NextFunction } from 'express';
import { analyticsService } from './analytics.service';
import { sendResponse } from '../../utils/response';

export const analyticsController = {
  async getDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await analyticsService.getDashboardStats();
      sendResponse({ res, message: 'Dashboard analytics', data: stats });
    } catch (e) { next(e); }
  },
};
