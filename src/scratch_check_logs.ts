import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const logs = await prisma.crawlLog.findMany({
    orderBy: { startedAt: 'desc' },
    take: 5,
    include: { source: true }
  });
  console.log("RECENT CRAWL LOGS:");
  console.log(JSON.stringify(logs, null, 2));
}

main().finally(() => prisma.$disconnect());
