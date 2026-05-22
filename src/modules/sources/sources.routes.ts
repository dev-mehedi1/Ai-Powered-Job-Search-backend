import { Router } from 'express';
import { sourcesController } from './sources.controller';
import { authenticate, requireRole, validate } from '../../middleware/auth';
import { createSourceSchema, updateSourceSchema } from './sources.schema';

export const adminSourcesRoutes = Router();

// All source routes require authentication
adminSourcesRoutes.use(authenticate as any);

// POST /api/v1/admin/sources
adminSourcesRoutes.post('/sources', requireRole('ADMIN', 'SUPER_ADMIN'), validate(createSourceSchema), sourcesController.create);
// GET /api/v1/admin/sources
adminSourcesRoutes.get('/sources', requireRole('ADMIN', 'SUPER_ADMIN'), sourcesController.findAll);
// GET /api/v1/admin/sources/:id
adminSourcesRoutes.get('/sources/:id', requireRole('ADMIN', 'SUPER_ADMIN'), sourcesController.findById);
// PATCH /api/v1/admin/sources/:id
adminSourcesRoutes.patch('/sources/:id', requireRole('ADMIN', 'SUPER_ADMIN'), validate(updateSourceSchema), sourcesController.update);
// DELETE /api/v1/admin/sources/:id
adminSourcesRoutes.delete('/sources/:id', requireRole('SUPER_ADMIN'), sourcesController.delete);

// Source actions
// POST /api/v1/admin/sources/:id/start
adminSourcesRoutes.post('/sources/:id/start', requireRole('ADMIN', 'SUPER_ADMIN'), sourcesController.start);
// POST /api/v1/admin/sources/:id/stop
adminSourcesRoutes.post('/sources/:id/stop', requireRole('ADMIN', 'SUPER_ADMIN'), sourcesController.stop);
// POST /api/v1/admin/sources/:id/crawl-now
adminSourcesRoutes.post('/sources/:id/crawl-now', requireRole('ADMIN', 'SUPER_ADMIN'), sourcesController.crawlNow);
