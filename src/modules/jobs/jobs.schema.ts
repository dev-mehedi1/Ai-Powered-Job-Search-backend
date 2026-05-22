import { z } from 'zod';

export const updateJobStatusSchema = z.object({
  body: z.object({
    status: z.enum(['ACTIVE', 'INACTIVE', 'DELETED']),
  }),
  params: z.object({
    id: z.string().uuid(),
  }),
  query: z.object({}).passthrough(),
});

export const bulkUpdateStatusSchema = z.object({
  body: z.object({
    ids: z.array(z.string().uuid()).min(1).max(500),
    status: z.enum(['ACTIVE', 'INACTIVE', 'DELETED']),
  }),
  params: z.object({}),
  query: z.object({}).passthrough(),
});

export const searchQuerySchema = z.object({
  body: z.object({}),
  params: z.object({}),
  query: z.object({
    q: z.string().optional(),
    location: z.string().optional(),
    employmentType: z.string().optional(),
    salaryMin: z.string().optional(),
    salaryMax: z.string().optional(),
    company: z.string().optional(),
    sourceId: z.string().optional(),
    page: z.string().optional(),
    limit: z.string().optional(),
  }).passthrough(),
});
