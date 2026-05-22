import prisma from '../../database/client';

export const analyticsService = {
  async getDashboardStats() {
    const [
      totalJobs,
      activeJobs,
      inactiveJobs,
      totalSources,
      enabledSources,
      totalSearches,
      recentSearches,
      totalCrawls,
      successfulCrawls,
      failedCrawls,
      sourceDistribution,
      recentCrawlLogs,
      jobsAddedToday,
      jobsAddedThisWeek,
    ] = await Promise.all([
      prisma.job.count(),
      prisma.job.count({ where: { status: 'ACTIVE' } }),
      prisma.job.count({ where: { status: 'INACTIVE' } }),
      prisma.source.count(),
      prisma.source.count({ where: { enabled: true } }),
      prisma.searchLog.count(),
      prisma.searchLog.count({
        where: { createdAt: { gte: new Date(Date.now() - 24 * 3600 * 1000) } },
      }),
      prisma.crawlLog.count(),
      prisma.crawlLog.count({ where: { status: 'SUCCESS' } }),
      prisma.crawlLog.count({ where: { status: 'FAILED' } }),
      prisma.job.groupBy({
        by: ['sourceId'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),
      prisma.crawlLog.findMany({
        orderBy: { startedAt: 'desc' },
        take: 10,
        include: { source: { select: { name: true } } },
      }),
      prisma.job.count({
        where: { createdAt: { gte: new Date(Date.now() - 24 * 3600 * 1000) } },
      }),
      prisma.job.count({
        where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 3600 * 1000) } },
      }),
    ]);

    // Resolve source names for distribution
    const sourceIds = sourceDistribution.map((s: any) => s.sourceId);
    const sources = await prisma.source.findMany({
      where: { id: { in: sourceIds } },
      select: { id: true, name: true },
    });
    const sourceMap = new Map(sources.map((s: any) => [s.id, s.name]));

    const distribution = sourceDistribution.map((s: any) => ({
      sourceId: s.sourceId,
      sourceName: sourceMap.get(s.sourceId) || 'Unknown',
      jobCount: s._count.id,
    }));

    // Top search queries (last 7 days)
    const topSearches = await prisma.searchLog.groupBy({
      by: ['query'],
      _count: { id: true },
      _avg: { resultCount: true },
      where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 3600 * 1000) } },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });

    const crawlSuccessRate = totalCrawls > 0
      ? Math.round((successfulCrawls / totalCrawls) * 100)
      : 0;

    return {
      overview: {
        totalJobs,
        activeJobs,
        inactiveJobs,
        deletedJobs: totalJobs - activeJobs - inactiveJobs,
        totalSources,
        enabledSources,
        disabledSources: totalSources - enabledSources,
      },
      crawling: {
        totalCrawls,
        successfulCrawls,
        failedCrawls,
        crawlSuccessRate: `${crawlSuccessRate}%`,
        recentCrawlLogs,
      },
      search: {
        totalSearches,
        recentSearches24h: recentSearches,
        topSearches: topSearches.map((s: any) => ({
          query: s.query,
          count: s._count.id,
          avgResults: Math.round(s._avg.resultCount || 0),
        })),
      },
      growth: {
        jobsAddedToday,
        jobsAddedThisWeek,
      },
      sourceDistribution: distribution,
    };
  },
};
