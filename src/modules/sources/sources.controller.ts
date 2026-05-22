import { Request, Response, NextFunction } from 'express';
import { sourcesService } from './sources.service';
import { sendResponse } from '../../utils/response';
import { crawlerService } from '../crawler/crawler.service';

export const sourcesController = {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const source = await sourcesService.create(req.body);
      sendResponse({ res, statusCode: 201, message: 'Source created', data: source });
    } catch (e) { next(e); }
  },
  async findAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sources, meta } = await sourcesService.findAll(req.query);
      sendResponse({ res, message: 'Sources fetched', data: sources, meta });
    } catch (e) { next(e); }
  },
  async findById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const source = await sourcesService.findById(req.params.id);
      sendResponse({ res, message: 'Source fetched', data: source });
    } catch (e) { next(e); }
  },
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const source = await sourcesService.update(req.params.id, req.body);
      sendResponse({ res, message: 'Source updated', data: source });
    } catch (e) { next(e); }
  },
  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await sourcesService.delete(req.params.id);
      sendResponse({ res, message: 'Source deleted', data: null });
    } catch (e) { next(e); }
  },
  async start(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const source = await sourcesService.setEnabled(req.params.id, true);
      sendResponse({ res, message: 'Source enabled', data: source });
    } catch (e) { next(e); }
  },
  async stop(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const source = await sourcesService.setEnabled(req.params.id, false);
      sendResponse({ res, message: 'Source disabled', data: source });
    } catch (e) { next(e); }
  },
  async crawlNow(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const source = await sourcesService.findById(req.params.id);
      // Fire-and-forget crawl
      crawlerService.crawlSource(source.id).catch(() => {});
      sendResponse({ res, message: 'Crawl started', data: { sourceId: source.id, status: 'RUNNING' } });
    } catch (e) { next(e); }
  },
};
