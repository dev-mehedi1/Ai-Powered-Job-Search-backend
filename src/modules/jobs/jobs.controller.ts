import { Request, Response, NextFunction } from 'express';
import { jobsService } from './jobs.service';
import { searchService } from '../search/search.service';
import { sendResponse } from '../../utils/response';
import { getPaginationOptions, getPaginationMeta } from '../../utils/pagination';
import { SearchFilters } from '../../types';

export const jobsController = {
  // Admin: list all jobs with filters
  async adminList(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { jobs, meta } = await jobsService.findAll(req.query);
      sendResponse({ res, message: 'Jobs fetched', data: jobs, meta });
    } catch (e) { next(e); }
  },

  // Admin: get job by ID (includes raw HTML)
  async adminGetById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const job = await jobsService.findById(req.params.id);
      sendResponse({ res, message: 'Job fetched', data: job });
    } catch (e) { next(e); }
  },

  // Admin: update job status
  async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const job = await jobsService.updateStatus(req.params.id, req.body.status);
      sendResponse({ res, message: 'Job status updated', data: job });
    } catch (e) { next(e); }
  },

  // Admin: bulk update status
  async bulkUpdateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await jobsService.bulkUpdateStatus(req.body.ids, req.body.status);
      sendResponse({ res, message: `${result.updated} jobs updated`, data: result });
    } catch (e) { next(e); }
  },

  // Admin: delete job
  async deleteJob(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await jobsService.deleteJob(req.params.id);
      sendResponse({ res, message: 'Job deleted', data: null });
    } catch (e) { next(e); }
  },

  // Admin: get job stats
  async getStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await jobsService.getStats();
      sendResponse({ res, message: 'Job stats fetched', data: stats });
    } catch (e) { next(e); }
  },

  // Public: search jobs (hybrid vector + text search)
  async publicSearch(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page, limit } = getPaginationOptions(req.query);
      const filters: SearchFilters = {
        query: req.query.q as string,
        location: req.query.location as string,
        employmentType: req.query.employmentType as string,
        salaryMin: req.query.salaryMin ? parseFloat(req.query.salaryMin as string) : undefined,
        salaryMax: req.query.salaryMax ? parseFloat(req.query.salaryMax as string) : undefined,
        company: req.query.company as string,
        sourceId: req.query.sourceId as string,
      };

      const { results, total } = await searchService.hybridSearch(filters, page, limit);
      const meta = getPaginationMeta(total, { page, limit });
      sendResponse({ res, message: 'Search results', data: results, meta });
    } catch (e) { next(e); }
  },

  // Public: get single job detail
  async publicGetById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const job = await jobsService.findPublicById(req.params.id);
      sendResponse({ res, message: 'Job details', data: job });
    } catch (e) { next(e); }
  },
};
