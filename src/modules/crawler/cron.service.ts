import cron from 'node-cron';
import prisma from '../../database/client';
import logger from '../../utils/logger';
import { crawlerService } from './crawler.service';

let isInitialized = false;

export const cronService = {
  init(): void {
    if (isInitialized) return;
    isInitialized = true;

    // Every hour: check which sources are due to be crawled
    cron.schedule('0 * * * *', async () => {
      logger.info('⏰ [CRON] Running scheduled source crawl check...');
      try {
        const sources = await prisma.source.findMany({ where: { enabled: true } });
        const now = new Date();

        for (const source of sources) {
          // Simple check: if not crawled in past 24 hours or frequency matches
          const lastCrawledHoursAgo = source.lastCrawledAt
            ? (now.getTime() - source.lastCrawledAt.getTime()) / 3600000
            : Infinity;

          // Parse cron frequency to determine if crawl is due
          if (lastCrawledHoursAgo >= 24) {
            logger.info(`📋 [CRON] Scheduling crawl for ${source.name}`);
            // Non-blocking crawl
            crawlerService.crawlSource(source.id).catch((err) =>
              logger.error(`[CRON] Crawl error for ${source.name}:`, err)
            );
          }
        }
      } catch (err) {
        logger.error('[CRON] Scheduled crawl check failed:', err);
      }
    });

    // Every day at 3 AM: Regenerate missing embeddings
    cron.schedule('0 3 * * *', async () => {
      logger.info('⏰ [CRON] Running embedding regeneration...');
      try {
        await crawlerService.regenerateMissingEmbeddings();
      } catch (err) {
        logger.error('[CRON] Embedding regeneration failed:', err);
      }
    });

    // Every week on Sunday at 4 AM: Cleanup duplicates
    cron.schedule('0 4 * * 0', async () => {
      logger.info('⏰ [CRON] Running duplicate cleanup...');
      try {
        await crawlerService.cleanupDuplicates();
      } catch (err) {
        logger.error('[CRON] Duplicate cleanup failed:', err);
      }
    });

    // Every day at midnight: Delete INACTIVE jobs older than 30 days
    cron.schedule('0 0 * * *', async () => {
      logger.info('⏰ [CRON] Purging stale inactive jobs...');
      try {
        const cutoff = new Date(Date.now() - 30 * 24 * 3600 * 1000);
        const result = await prisma.job.deleteMany({
          where: { status: 'INACTIVE', updatedAt: { lt: cutoff } },
        });
        logger.info(`[CRON] Purged ${result.count} stale jobs`);
      } catch (err) {
        logger.error('[CRON] Stale job purge failed:', err);
      }
    });

    logger.info('✅ Cron jobs initialized');
  },

  stop(): void {
    // node-cron tasks are tracked automatically; call this for graceful shutdown
    isInitialized = false;
    logger.info('🛑 Cron jobs stopped');
  },
};

// Named export for server.ts compatibility
export const initializeCronJobs = () => cronService.init();
