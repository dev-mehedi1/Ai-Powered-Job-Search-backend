import prisma from '../../database/client';
import logger from '../../utils/logger';
import { aiService } from '../ai/ai.service';
import {
  fetchHtml,
  fetchHtmlWithPlaywright,
  detectSitemapUrl,
  parseSitemapUrls,
  scrapeJobListings,
  scrapeJobDetail,
  findNextPage,
  normalizeEmploymentType,
  extractSkills,
} from './scrapers/base.scraper';
import { RawJobData } from '../../types';

// Active crawl tracking (sourceId -> boolean) to prevent duplicate crawls
const activeCrawls = new Set<string>();

export const crawlerService = {
  async crawlSource(sourceId: string): Promise<void> {
    if (activeCrawls.has(sourceId)) {
      logger.warn(`Crawl already running for source ${sourceId}`);
      return;
    }
    activeCrawls.add(sourceId);

    const source = await prisma.source.findUnique({ where: { id: sourceId } });
    if (!source || !source.enabled) {
      activeCrawls.delete(sourceId);
      return;
    }

    const log = await prisma.crawlLog.create({
      data: { sourceId, status: 'RUNNING', totalFound: 0, totalSaved: 0 },
    });

    logger.info(`🕷️  Starting crawl for: ${source.name} (${source.baseUrl})`);

    let totalFound = 0;
    let totalSaved = 0;

    try {
      // 1. Try sitemap detection
      const jobUrls = await crawlerService.discoverJobUrls(source.baseUrl);
      totalFound = jobUrls.length;
      logger.info(`Found ${totalFound} job URLs on ${source.name}`);

      // 2. Process each job URL
      for (const jobUrl of jobUrls) {
        const saved = await crawlerService.processJobUrl(jobUrl, sourceId, source.baseUrl);
        if (saved) totalSaved++;
        // Small delay to be respectful
        await new Promise(r => setTimeout(r, 300));
      }

      // 3. Update crawl log and source
      await Promise.all([
        prisma.crawlLog.update({
          where: { id: log.id },
          data: { status: 'SUCCESS', totalFound, totalSaved, finishedAt: new Date() },
        }),
        prisma.source.update({
          where: { id: sourceId },
          data: { lastCrawledAt: new Date() },
        }),
      ]);

      logger.info(`✅ Crawl complete for ${source.name}: ${totalSaved}/${totalFound} jobs saved`);
    } catch (error) {
      logger.error(`❌ Crawl failed for ${source.name}:`, error);
      await prisma.crawlLog.update({
        where: { id: log.id },
        data: { status: 'FAILED', totalFound, totalSaved, finishedAt: new Date() },
      });
    } finally {
      activeCrawls.delete(sourceId);
    }
  },

  async discoverJobUrls(baseUrl: string): Promise<string[]> {
    const urls: Set<string> = new Set();

    // Try sitemap first
    try {
      const sitemapUrl = await detectSitemapUrl(baseUrl);
      if (sitemapUrl) {
        const sitemapUrls = await parseSitemapUrls(sitemapUrl);
        const jobUrls = sitemapUrls.filter(u =>
          /\/(job|jobs|career|careers|position|vacancy|opening)/i.test(u)
        );
        if (jobUrls.length > 0) {
          jobUrls.forEach(u => urls.add(u));
          return Array.from(urls).slice(0, 500);
        }
      }
    } catch (err) {
      logger.warn(`Sitemap detection failed for ${baseUrl}:`, err);
    }

    // Fallback: crawl listing pages with pagination
    let currentUrl: string | null = baseUrl;
    let pageCount = 0;
    const maxPages = 20;

    while (currentUrl && pageCount < maxPages) {
      try {
        let html: string;
        try {
          html = await fetchHtml(currentUrl);
        } catch {
          html = await fetchHtmlWithPlaywright(currentUrl);
        }

        const pageUrls = scrapeJobListings(html, baseUrl);
        pageUrls.forEach(u => urls.add(u));

        const nextPage = findNextPage(html, baseUrl);
        currentUrl = nextPage !== currentUrl ? nextPage : null;
        pageCount++;

        await new Promise(r => setTimeout(r, 500));
      } catch (err) {
        logger.warn(`Failed to crawl page ${currentUrl}:`, err);
        break;
      }
    }

    return Array.from(urls).slice(0, 500);
  },

  async processJobUrl(jobUrl: string, sourceId: string, baseUrl: string): Promise<boolean> {
    // Skip already existing jobs
    const existing = await prisma.job.findUnique({ where: { jobUrl } });
    if (existing) {
      // Update job if older than 24 hours
      const ageHours = (Date.now() - existing.updatedAt.getTime()) / 3600000;
      if (ageHours < 24) return false;
    }

    try {
      let html: string;
      try {
        html = await fetchHtml(jobUrl);
      } catch {
        html = await fetchHtmlWithPlaywright(jobUrl);
      }

      // Extraction pipeline: Structured → HTML → AI
      let jobData: Partial<RawJobData> = scrapeJobDetail(html, jobUrl);

      // If extraction is poor, use AI fallback
      if (!jobData.title || !jobData.description || jobData.description.length < 100) {
        const aiExtracted = await aiService.extractJobFromHtml(html, jobUrl);
        jobData = { ...jobData, ...aiExtracted };
      }

      if (!jobData.title || !jobData.description) {
        logger.debug(`Skipping ${jobUrl}: insufficient data`);
        return false;
      }

      // Generate embedding
      const embeddingText = aiService.buildJobEmbeddingText({
        title: jobData.title,
        company: jobData.company,
        description: jobData.description,
        location: jobData.location,
        skills: jobData.skills,
        employmentType: jobData.employmentType,
      });
      const embedding = await aiService.generateEmbedding(embeddingText);

      const skills = jobData.skills?.length
        ? jobData.skills
        : extractSkills(jobData.description || '');

      const jobRecord = {
        sourceId,
        title: jobData.title!.slice(0, 255),
        company: (jobData.company || 'Unknown').slice(0, 255),
        description: jobData.description || '',
        location: (jobData.location || 'Remote').slice(0, 255),
        salaryMin: jobData.salaryMin || null,
        salaryMax: jobData.salaryMax || null,
        employmentType: normalizeEmploymentType(jobData.employmentType) || null,
        experienceMin: jobData.experienceMin || null,
        experienceMax: jobData.experienceMax || null,
        skills: skills as any,
        jobUrl,
        rawHtml: html.slice(0, 50000),
        status: 'ACTIVE',
      };

      if (existing) {
        await prisma.job.update({ where: { jobUrl }, data: jobRecord });
      } else {
        // Use raw SQL to insert with vector embedding
        await prisma.$executeRawUnsafe(
          `INSERT INTO jobs (
            id, source_id, title, company, description, location,
            salary_min, salary_max, employment_type, experience_min, experience_max,
            skills, job_url, raw_html, embedding, status, created_at, updated_at
          ) VALUES (
            gen_random_uuid(), $1, $2, $3, $4, $5,
            $6, $7, $8, $9, $10,
            $11::jsonb, $12, $13, $14::vector, $15, NOW(), NOW()
          ) ON CONFLICT (job_url) DO UPDATE SET
            title = EXCLUDED.title,
            description = EXCLUDED.description,
            embedding = EXCLUDED.embedding,
            updated_at = NOW()`,
          jobRecord.sourceId,
          jobRecord.title,
          jobRecord.company,
          jobRecord.description,
          jobRecord.location,
          jobRecord.salaryMin,
          jobRecord.salaryMax,
          jobRecord.employmentType,
          jobRecord.experienceMin,
          jobRecord.experienceMax,
          JSON.stringify(jobRecord.skills),
          jobRecord.jobUrl,
          jobRecord.rawHtml,
          `[${embedding.join(',')}]`,
          jobRecord.status,
        );
      }

      return true;
    } catch (error) {
      logger.error(`Failed to process job URL ${jobUrl}:`, error);
      return false;
    }
  },

  async crawlAllEnabled(): Promise<void> {
    const sources = await prisma.source.findMany({ where: { enabled: true } });
    logger.info(`Starting scheduled crawl for ${sources.length} sources`);
    for (const source of sources) {
      await crawlerService.crawlSource(source.id);
    }
  },

  async regenerateMissingEmbeddings(): Promise<void> {
    const jobs = await prisma.$queryRaw<{ id: string; title: string; company: string; description: string; location: string; skills: any; employment_type: string | null }[]>`
      SELECT id, title, company, description, location, skills, employment_type
      FROM jobs WHERE embedding IS NULL AND status = 'ACTIVE' LIMIT 100
    `;

    logger.info(`Regenerating embeddings for ${jobs.length} jobs`);
    for (const job of jobs) {
      try {
        const text = aiService.buildJobEmbeddingText({
          title: job.title,
          company: job.company,
          description: job.description,
          location: job.location,
          skills: job.skills,
          employmentType: job.employment_type,
        });
        const embedding = await aiService.generateEmbedding(text);
        await prisma.$executeRawUnsafe(
          `UPDATE jobs SET embedding = $1::vector WHERE id = $2`,
          `[${embedding.join(',')}]`,
          job.id
        );
      } catch (err) {
        logger.error(`Failed to regenerate embedding for job ${job.id}:`, err);
      }
    }
    logger.info('Embedding regeneration complete');
  },

  async cleanupDuplicates(): Promise<void> {
    const result = await prisma.$executeRaw`
      DELETE FROM jobs
      WHERE id NOT IN (
        SELECT DISTINCT ON (job_url) id
        FROM jobs
        ORDER BY job_url, created_at DESC
      )
    `;
    logger.info(`Cleaned up duplicate jobs`);
  },
};
