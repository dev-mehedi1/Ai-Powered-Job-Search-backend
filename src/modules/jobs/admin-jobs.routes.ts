import { Router } from 'express';
import { jobsController } from './jobs.controller';
import { authenticate, requireRole, validate } from '../../middleware/auth';
import { updateJobStatusSchema, bulkUpdateStatusSchema } from './jobs.schema';

export const adminJobsRoutes = Router();

// All admin job routes require authentication
adminJobsRoutes.use(authenticate as any);
adminJobsRoutes.use(requireRole('ADMIN', 'SUPER_ADMIN') as any);

// GET /api/v1/admin/jobs - List all jobs with filters
adminJobsRoutes.get('/jobs', jobsController.adminList);

// GET /api/v1/admin/jobs/stats - Get job statistics
adminJobsRoutes.get('/jobs/stats', jobsController.getStats);

// GET /api/v1/admin/jobs/:id - Get job detail (with raw HTML)
adminJobsRoutes.get('/jobs/:id', jobsController.adminGetById);

// PATCH /api/v1/admin/jobs/:id/status - Update single job status
adminJobsRoutes.patch('/jobs/:id/status', validate(updateJobStatusSchema), jobsController.updateStatus);

// POST /api/v1/admin/jobs/bulk-status - Bulk update job statuses
adminJobsRoutes.post('/jobs/bulk-status', validate(bulkUpdateStatusSchema), jobsController.bulkUpdateStatus);

// DELETE /api/v1/admin/jobs/:id - Delete a job
adminJobsRoutes.delete('/jobs/:id', jobsController.deleteJob);
