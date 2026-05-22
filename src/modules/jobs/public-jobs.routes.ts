import { Router } from 'express';
import { jobsController } from './jobs.controller';
import { validate } from '../../middleware/auth';
import { searchQuerySchema } from './jobs.schema';

export const publicJobsRoutes = Router();

// GET /api/v1/jobs/search - Public hybrid search
publicJobsRoutes.get('/search', validate(searchQuerySchema), jobsController.publicSearch);

// GET /api/v1/jobs/:id - Public job detail
publicJobsRoutes.get('/:id', jobsController.publicGetById);
