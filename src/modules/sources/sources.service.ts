import prisma from '../../database/client';
import { AppError } from '../../middleware/error';
import { CreateSourceInput, UpdateSourceInput } from './sources.schema';
import { getPaginationOptions, getPaginationMeta, getPaginationSkip } from '../../utils/pagination';

export const sourcesService = {
  async create(data: CreateSourceInput) {
    const existing = await prisma.source.findUnique({ where: { baseUrl: data.baseUrl } });
    if (existing) throw new AppError('A source with this URL already exists', 409);
    return prisma.source.create({ data });
  },

  async findAll(query: any) {
    const pagination = getPaginationOptions(query);
    const skip = getPaginationSkip(pagination);
    const where = query.enabled !== undefined
      ? { enabled: query.enabled === 'true' }
      : {};

    const [sources, total] = await Promise.all([
      prisma.source.findMany({
        where,
        skip,
        take: pagination.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { jobs: true, crawlLogs: true } },
        },
      }),
      prisma.source.count({ where }),
    ]);

    return { sources, meta: getPaginationMeta(total, pagination) };
  },

  async findById(id: string) {
    const source = await prisma.source.findUnique({
      where: { id },
      include: {
        _count: { select: { jobs: true } },
        crawlLogs: {
          orderBy: { startedAt: 'desc' },
          take: 5,
        },
      },
    });
    if (!source) throw new AppError('Source not found', 404);
    return source;
  },

  async update(id: string, data: UpdateSourceInput) {
    await sourcesService.findById(id);
    return prisma.source.update({ where: { id }, data });
  },

  async delete(id: string) {
    await sourcesService.findById(id);
    return prisma.source.delete({ where: { id } });
  },

  async setEnabled(id: string, enabled: boolean) {
    await sourcesService.findById(id);
    return prisma.source.update({ where: { id }, data: { enabled } });
  },
};
