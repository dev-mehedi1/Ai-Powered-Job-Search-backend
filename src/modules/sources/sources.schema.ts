import { z } from 'zod';

export const createSourceSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    baseUrl: z.string().url('Must be a valid URL'),
    enabled: z.boolean().optional().default(true),
    crawlFrequency: z.string().optional().default('0 0 * * *'),
  }),
});

export const updateSourceSchema = z.object({
  body: z.object({
    name: z.string().min(2).optional(),
    baseUrl: z.string().url().optional(),
    enabled: z.boolean().optional(),
    crawlFrequency: z.string().optional(),
  }),
  params: z.object({ id: z.string().uuid() }),
});

export const sourceIdSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});

export type CreateSourceInput = z.infer<typeof createSourceSchema>['body'];
export type UpdateSourceInput = z.infer<typeof updateSourceSchema>['body'];
