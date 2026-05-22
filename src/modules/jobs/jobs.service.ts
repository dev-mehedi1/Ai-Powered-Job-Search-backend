import prisma from '../../database/client';
import { AppError } from '../../middleware/error';
import { getPaginationOptions, getPaginationMeta, getPaginationSkip } from '../../utils/pagination';

export const jobsService = {
  async findAll(query: any) {
    const pagination = getPaginationOptions(query);
    const skip = getPaginationSkip(pagination);
    const where: any = {};

    if (query.status) where.status = query.status;
    if (query.sourceId) where.sourceId = query.sourceId;
    if (query.employmentType) where.employmentType = query.employmentType;
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { company: { contains: query.search, mode: 'insensitive' } },
        { location: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        skip,
        take: pagination.limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, title: true, company: true, location: true,
          salaryMin: true, salaryMax: true, employmentType: true,
          skills: true, jobUrl: true, status: true, sourceId: true,
          createdAt: true, updatedAt: true,
        },
      }),
      prisma.job.count({ where }),
    ]);

    return { jobs, meta: getPaginationMeta(total, pagination) };
  },

  async findById(id: string) {
    const job = await prisma.job.findUnique({
      where: { id },
      include: { source: { select: { id: true, name: true, baseUrl: true } } },
    });
    if (!job) throw new AppError('Job not found', 404);
    return job;
  },

  async findPublicById(id: string) {
    const job = await prisma.job.findUnique({
      where: { id, status: 'ACTIVE' },
      select: {
        id: true, title: true, company: true, description: true,
        location: true, salaryMin: true, salaryMax: true,
        employmentType: true, experienceMin: true, experienceMax: true,
        skills: true, jobUrl: true, createdAt: true, updatedAt: true,
        source: { select: { name: true } },
      },
    });
    if (!job) throw new AppError('Job not found', 404);
    return job;
  },

  async updateStatus(id: string, status: string) {
    await jobsService.findById(id);
    return prisma.job.update({ where: { id }, data: { status } });
  },

  async bulkUpdateStatus(ids: string[], status: string) {
    const result = await prisma.job.updateMany({
      where: { id: { in: ids } },
      data: { status },
    });
    return { updated: result.count };
  },

  async deleteJob(id: string) {
    await jobsService.findById(id);
    await prisma.job.delete({ where: { id } });
  },

  async getStats() {
    const [total, active, inactive] = await Promise.all([
      prisma.job.count(),
      prisma.job.count({ where: { status: 'ACTIVE' } }),
      prisma.job.count({ where: { status: 'INACTIVE' } }),
    ]);
    return { total, active, inactive, deleted: total - active - inactive };
  },
};
