import prisma from '../../database/client';
import { aiService } from '../ai/ai.service';
import logger from '../../utils/logger';
import { SearchFilters } from '../../types';

export interface SearchResult {
  id: string;
  title: string;
  company: string;
  description: string;
  location: string;
  salaryMin: number | null;
  salaryMax: number | null;
  employmentType: string | null;
  skills: any;
  jobUrl: string;
  status: string;
  sourceId: string;
  createdAt: Date;
  updatedAt: Date;
  score?: number;
  similarityScore?: number;
  textScore?: number;
}

export const searchService = {
  async hybridSearch(
    filters: SearchFilters,
    page: number = 1,
    limit: number = 20
  ): Promise<{ results: SearchResult[]; total: number }> {
    const offset = (page - 1) * limit;
    const query = filters.query?.trim() || '';

    // If no query, return filtered results
    if (!query) {
      return searchService.filteredSearch(filters, page, limit);
    }

    try {
      // Generate embedding for the search query
      const embedding = await aiService.generateEmbedding(query);
      const embeddingStr = `[${embedding.join(',')}]`;

      // Build WHERE clauses for filters
      const whereClauses: string[] = ["j.status = 'ACTIVE'"];
      const params: any[] = [];
      let paramIdx = 1;

      // $1 = embedding vector
      params.push(embeddingStr);
      paramIdx++; // now 2

      // $2 = query text for ts_rank
      params.push(query);
      paramIdx++; // now 3

      // $3 = limit
      params.push(limit);
      paramIdx++; // now 4

      // $4 = offset
      params.push(offset);
      paramIdx++; // now 5

      if (filters.location) {
        whereClauses.push(`j.location ILIKE $${paramIdx}`);
        params.push(`%${filters.location}%`);
        paramIdx++;
      }
      if (filters.employmentType) {
        whereClauses.push(`j.employment_type = $${paramIdx}`);
        params.push(filters.employmentType);
        paramIdx++;
      }
      if (filters.salaryMin !== undefined) {
        whereClauses.push(`(j.salary_max IS NULL OR j.salary_max >= $${paramIdx})`);
        params.push(filters.salaryMin);
        paramIdx++;
      }
      if (filters.salaryMax !== undefined) {
        whereClauses.push(`(j.salary_min IS NULL OR j.salary_min <= $${paramIdx})`);
        params.push(filters.salaryMax);
        paramIdx++;
      }
      if (filters.company) {
        whereClauses.push(`j.company ILIKE $${paramIdx}`);
        params.push(`%${filters.company}%`);
        paramIdx++;
      }
      if (filters.sourceId) {
        whereClauses.push(`j.source_id = $${paramIdx}`);
        params.push(filters.sourceId);
        paramIdx++;
      }

      const whereStr = whereClauses.join(' AND ');

      // Hybrid search: combine vector similarity with full-text search
      const results = (await prisma.$queryRawUnsafe(
        `SELECT
          j.id, j.title, j.company, j.description, j.location,
          j.salary_min AS "salaryMin", j.salary_max AS "salaryMax",
          j.employment_type AS "employmentType", j.skills,
          j.job_url AS "jobUrl", j.status, j.source_id AS "sourceId",
          j.created_at AS "createdAt", j.updated_at AS "updatedAt",
          CASE
            WHEN j.embedding IS NOT NULL THEN 1 - (j.embedding <=> $1::vector)
            ELSE 0
          END AS "similarityScore",
          CASE
            WHEN to_tsvector('english', j.title || ' ' || j.description || ' ' || j.company || ' ' || j.location)
              @@ plainto_tsquery('english', $2) THEN
              ts_rank(
                to_tsvector('english', j.title || ' ' || j.description || ' ' || j.company || ' ' || j.location),
                plainto_tsquery('english', $2)
              )
            ELSE 0
          END AS "textScore",
          CASE
            WHEN j.embedding IS NOT NULL THEN
              0.6 * (1 - (j.embedding <=> $1::vector)) +
              0.4 * COALESCE(ts_rank(
                to_tsvector('english', j.title || ' ' || j.description || ' ' || j.company || ' ' || j.location),
                plainto_tsquery('english', $2)
              ), 0)
            ELSE
              COALESCE(ts_rank(
                to_tsvector('english', j.title || ' ' || j.description || ' ' || j.company || ' ' || j.location),
                plainto_tsquery('english', $2)
              ), 0)
          END AS score
        FROM jobs j
        WHERE ${whereStr}
        ORDER BY score DESC
        LIMIT $3 OFFSET $4`,
        ...params
      )) as SearchResult[];

      // Get total count for matching filters (without embedding/limit/offset)
      const countParams = params.slice(4); // skip embedding, query, limit, offset
      const countWhere = whereClauses.join(' AND ');
      const countResult = (await prisma.$queryRawUnsafe(
        `SELECT COUNT(*) as count FROM jobs j WHERE ${countWhere}`,
        ...countParams
      )) as [{ count: bigint }];
      const total = Number(countResult[0]?.count || 0);

      // Log the search
      await prisma.searchLog.create({
        data: { query, resultCount: results.length },
      });

      return { results, total };
    } catch (error) {
      logger.error('Hybrid search failed, falling back to filtered search:', error);
      return searchService.filteredSearch(filters, page, limit);
    }
  },

  async filteredSearch(
    filters: SearchFilters,
    page: number = 1,
    limit: number = 20
  ): Promise<{ results: SearchResult[]; total: number }> {
    const skip = (page - 1) * limit;
    const where: any = { status: 'ACTIVE' };

    if (filters.query) {
      where.OR = [
        { title: { contains: filters.query, mode: 'insensitive' } },
        { company: { contains: filters.query, mode: 'insensitive' } },
        { description: { contains: filters.query, mode: 'insensitive' } },
        { location: { contains: filters.query, mode: 'insensitive' } },
      ];
    }
    if (filters.location) {
      where.location = { contains: filters.location, mode: 'insensitive' };
    }
    if (filters.employmentType) {
      where.employmentType = filters.employmentType;
    }
    if (filters.salaryMin !== undefined) {
      where.salaryMax = { gte: filters.salaryMin };
    }
    if (filters.salaryMax !== undefined) {
      where.salaryMin = { lte: filters.salaryMax };
    }
    if (filters.company) {
      where.company = { contains: filters.company, mode: 'insensitive' };
    }
    if (filters.sourceId) {
      where.sourceId = filters.sourceId;
    }

    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, title: true, company: true, description: true,
          location: true, salaryMin: true, salaryMax: true,
          employmentType: true, skills: true, jobUrl: true,
          status: true, sourceId: true, createdAt: true, updatedAt: true,
        },
      }),
      prisma.job.count({ where }),
    ]);

    if (filters.query) {
      await prisma.searchLog.create({
        data: { query: filters.query, resultCount: jobs.length },
      });
    }

    return { results: jobs as any, total };
  },
};
