import * as cheerio from 'cheerio';
import { RawJobData } from '../../../types';
import logger from '../../../utils/logger';
// import { RawJobData } from '../../types';
// import logger from '../../utils/logger';

export interface ScrapedJob {
  title: string;
  company: string;
  description: string;
  location: string;
  salaryMin?: number;
  salaryMax?: number;
  employmentType?: string;
  experienceMin?: number;
  experienceMax?: number;
  skills?: string[];
  jobUrl: string;
  rawHtml?: string;
}

export interface ScraperConfig {
  sourceId: string;
  baseUrl: string;
  usesJavaScript?: boolean;
}

// Utility: Extract structured data (JSON-LD / microdata)
export function extractStructuredData(html: string): Partial<RawJobData> | null {
  const $ = cheerio.load(html);
  const jsonLdScripts = $('script[type="application/ld+json"]');
  for (let i = 0; i < jsonLdScripts.length; i++) {
    try {
      const json = JSON.parse($(jsonLdScripts[i]).html() || '{}');
      const data = Array.isArray(json) ? json.find(j => j['@type'] === 'JobPosting') : json;
      if (data && data['@type'] === 'JobPosting') {
        const salary = data.baseSalary?.value;
        return {
          title: data.title,
          company: data.hiringOrganization?.name,
          description: data.description?.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(),
          location: data.jobLocation?.address?.addressLocality
            || data.jobLocation?.address?.addressRegion
            || data.jobLocation?.address?.addressCountry
            || 'Remote',
          employmentType: data.employmentType,
          salaryMin: salary?.minValue || salary?.value,
          salaryMax: salary?.maxValue,
        };
      }
    } catch {
      continue;
    }
  }
  return null;
}

// Utility: Parse salary strings like "$80k - $120k", "£50,000 per year"
export function parseSalary(text: string): { min?: number; max?: number } {
  if (!text) return {};
  const normalized = text.replace(/,/g, '').toLowerCase();
  const kMatch = normalized.match(/(\d+(?:\.\d+)?)k?\s*[-–to]+\s*(\d+(?:\.\d+)?)k/);
  if (kMatch) {
    const multiplier = normalized.includes('k') ? 1000 : 1;
    return { min: parseFloat(kMatch[1]) * multiplier, max: parseFloat(kMatch[2]) * multiplier };
  }
  const single = normalized.match(/(\d{4,})/);
  if (single) return { min: parseInt(single[1]) };
  return {};
}

// Utility: Extract skills from description
export function extractSkills(description: string): string[] {
  const commonSkills = [
    'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'Go', 'Rust', 'Swift', 'Kotlin',
    'React', 'Vue', 'Angular', 'Next.js', 'Node.js', 'Express', 'NestJS', 'Django', 'Flask',
    'FastAPI', 'Spring', 'Laravel', 'Rails', 'GraphQL', 'REST', 'PostgreSQL', 'MySQL',
    'MongoDB', 'Redis', 'Docker', 'Kubernetes', 'AWS', 'GCP', 'Azure', 'CI/CD', 'Git',
    'TailwindCSS', 'CSS', 'HTML', 'SQL', 'NoSQL', 'Machine Learning', 'AI', 'TensorFlow',
    'PyTorch', 'Figma', 'Linux', 'Terraform', 'Prisma', 'Elasticsearch',
  ];
  const found: string[] = [];
  for (const skill of commonSkills) {
    const escapedSkill = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp(`\\b${escapedSkill}\\b`, 'i').test(description)) found.push(skill);
  }
  return [...new Set(found)];
}

// Utility: Normalize employment type
export function normalizeEmploymentType(type?: string): string | undefined {
  if (!type) return undefined;
  const t = type.toLowerCase().replace(/[-_\s]/g, '');
  if (t.includes('fulltime') || t.includes('permanent')) return 'FULL_TIME';
  if (t.includes('parttime')) return 'PART_TIME';
  if (t.includes('contract') || t.includes('freelance')) return 'CONTRACT';
  if (t.includes('remote')) return 'REMOTE';
  if (t.includes('intern')) return 'INTERNSHIP';
  return type.toUpperCase();
}

// Utility: Fetch HTML using native fetch (no Playwright)
export async function fetchHtml(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; JobAggregatorBot/1.0)',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  return response.text();
}

// Utility: Fetch HTML using Playwright for JS-rendered pages
export async function fetchHtmlWithPlaywright(url: string): Promise<string> {
  let browser: any;
  try {
    const { chromium } = await import('playwright');
    browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setExtraHTTPHeaders({ 'User-Agent': 'Mozilla/5.0 (compatible; JobAggregatorBot/1.0)' });
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    return await page.content();
  } finally {
    if (browser) await browser.close();
  }
}

// Utility: Detect sitemap URL
export async function detectSitemapUrl(baseUrl: string): Promise<string | null> {
  const candidates = ['/sitemap.xml', '/sitemap_index.xml', '/sitemap-jobs.xml', '/robots.txt'];
  for (const path of candidates) {
    try {
      const url = new URL(path, baseUrl).toString();
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        if (path === '/robots.txt') {
          const text = await res.text();
          const match = text.match(/Sitemap:\s*(.+)/i);
          if (match) return match[1].trim();
        } else {
          return url;
        }
      }
    } catch {
      continue;
    }
  }
  return null;
}

// Utility: Parse sitemap XML for job URLs
export async function parseSitemapUrls(sitemapUrl: string): Promise<string[]> {
  try {
    const html = await fetchHtml(sitemapUrl);
    const $ = cheerio.load(html, { xmlMode: true });
    const urls: string[] = [];
    $('url > loc').each((_, el) => { urls.push($(el).text().trim()); });
    $('sitemap > loc').each((_, el) => { urls.push($(el).text().trim()); });
    return urls;
  } catch (error) {
    logger.warn(`Failed to parse sitemap ${sitemapUrl}:`, error);
    return [];
  }
}

// Utility: Generic job list page scraper
export function scrapeJobListings(html: string, baseUrl: string): string[] {
  const $ = cheerio.load(html);
  const urls: Set<string> = new Set();

  // Common job listing link patterns
  const selectors = [
    'a[href*="/jobs/"]',
    'a[href*="/job/"]',
    'a[href*="/careers/"]',
    'a[href*="/career/"]',
    'a[href*="/position/"]',
    'a[href*="/vacancy/"]',
    'a[href*="/opening/"]',
    '.job-listing a',
    '.job-card a',
    '.job-item a',
    '[data-job-id] a',
    '.position a',
  ];

  for (const selector of selectors) {
    $(selector).each((_, el) => {
      const href = $(el).attr('href');
      if (!href) return;
      try {
        const fullUrl = new URL(href, baseUrl).toString();
        if (!fullUrl.includes('?') || fullUrl.includes('/job')) {
          urls.add(fullUrl);
        }
      } catch {}
    });
  }

  return Array.from(urls);
}

// Utility: Find next page URL
export function findNextPage(html: string, baseUrl: string): string | null {
  const $ = cheerio.load(html);
  const selectors = [
    'a[rel="next"]',
    'a:contains("Next")',
    'a:contains("›")',
    'a:contains("»")',
    '.pagination .next a',
    '.next-page a',
    '[aria-label="Next page"]',
    '[aria-label="next"]',
  ];
  for (const selector of selectors) {
    const href = $(selector).first().attr('href');
    if (href) {
      try { return new URL(href, baseUrl).toString(); } catch {}
    }
  }
  return null;
}

// Generic page scraper: parses a single job detail page
export function scrapeJobDetail(html: string, url: string): Partial<RawJobData> {
  const $ = cheerio.load(html);

  // Try structured data first
  const structured = extractStructuredData(html);
  if (structured?.title && structured?.description) {
    return { ...structured, jobUrl: url };
  }

  // Fallback: parse HTML heuristically
  const title =
    $('h1').first().text().trim() ||
    $('[class*="title"]').first().text().trim() ||
    $('meta[property="og:title"]').attr('content') || '';

  const company =
    $('[class*="company"]').first().text().trim() ||
    $('[class*="employer"]').first().text().trim() ||
    $('[itemprop="hiringOrganization"]').text().trim() || '';

  const location =
    $('[class*="location"]').first().text().trim() ||
    $('[itemprop="jobLocation"]').text().trim() ||
    $('[class*="city"]').first().text().trim() || 'Remote';

  // Get full description block
  const descEl =
    $('[class*="description"]').first() ||
    $('[class*="job-detail"]').first() ||
    $('main').first() ||
    $('article').first();

  const description = descEl.text().replace(/\s+/g, ' ').trim().slice(0, 5000);

  const skills = extractSkills(description);

  return { title, company, location, description, skills, jobUrl: url };
}
