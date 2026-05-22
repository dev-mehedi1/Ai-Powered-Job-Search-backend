import { Router } from 'express';
import { analyticsController } from './analytics.controller';
import { authenticate, requireRole } from '../../middleware/auth';

export const analyticsRoutes = Router();

// All analytics routes require admin authentication
analyticsRoutes.use(authenticate as any);
analyticsRoutes.use(requireRole('ADMIN', 'SUPER_ADMIN') as any);

// GET /api/v1/admin/analytics/dashboard - Full dashboard stats
analyticsRoutes.get('/analytics/dashboard', analyticsController.getDashboard);
