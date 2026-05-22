// Shared TypeScript types for the job aggregator platform

export type AdminRole = 'ADMIN' | 'SUPER_ADMIN';

export type JobStatus = 'ACTIVE' | 'INACTIVE' | 'DELETED';

export type CrawlStatus = 'RUNNING' | 'SUCCESS' | 'FAILED';

export type EmploymentType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'REMOTE' | 'INTERNSHIP';

export interface TokenPayload {
  id: string;
  email: string;
  role: AdminRole;
}

export interface SearchFilters {
  query?: string;
  location?: string;
  employmentType?: string;
  salaryMin?: number;
  salaryMax?: number;
  skills?: string[];
  company?: string;
  sourceId?: string;
}

export interface RawJobData {
  title?: string;
  company?: string;
  description?: string;
  location?: string;
  salaryMin?: number;
  salaryMax?: number;
  employmentType?: string;
  experienceMin?: number;
  experienceMax?: number;
  skills?: string[];
  jobUrl: string;
  rawHtml?: string;
}

export interface CrawlerConfig {
  sourceId: string;
  baseUrl: string;
  usesJavaScript?: boolean;
  sitemapUrl?: string;
  selectors?: {
    jobList?: string;
    jobTitle?: string;
    jobCompany?: string;
    jobLocation?: string;
    jobDescription?: string;
    jobUrl?: string;
    nextPage?: string;
  };
}
