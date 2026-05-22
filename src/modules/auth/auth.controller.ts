import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service';
import { sendResponse } from '../../utils/response';
import { AuthenticatedRequest } from '../../middleware/auth';

export const authController = {
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.register(req.body);
      sendResponse({ res, statusCode: 201, message: 'Admin registered successfully', data: result });
    } catch (error) {
      next(error);
    }
  },

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.login(req.body);
      sendResponse({ res, message: 'Login successful', data: result });
    } catch (error) {
      next(error);
    }
  },

  async refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body;
      const result = await authService.refreshToken(refreshToken);
      sendResponse({ res, message: 'Token refreshed', data: result });
    } catch (error) {
      next(error);
    }
  },

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body;
      await authService.logout(refreshToken);
      sendResponse({ res, message: 'Logged out successfully', data: null });
    } catch (error) {
      next(error);
    }
  },

  async profile(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const admin = await authService.getProfile(req.admin!.id);
      sendResponse({ res, message: 'Profile fetched', data: admin });
    } catch (error) {
      next(error);
    }
  },
};
