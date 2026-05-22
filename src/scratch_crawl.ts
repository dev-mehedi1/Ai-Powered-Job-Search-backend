import { crawlerService } from './modules/crawler/crawler.service';
import prisma from './database/client';

async function main() {
  console.log("Starting forced manual crawl...");
  await crawlerService.crawlAllEnabled();
  console.log("Crawl completed.");
}

main().finally(() => prisma.$disconnect());
