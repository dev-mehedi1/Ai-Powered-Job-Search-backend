import { config } from '../../config';
import logger from '../../utils/logger';
import { RawJobData } from '../../types';

// Mock embedding generator (1536 dimensions, normalized)
function generateMockEmbedding(): number[] {
  const vec = Array.from({ length: 1536 }, () => (Math.random() * 2 - 1));
  const magnitude = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
  return vec.map(v => v / magnitude);
}

// Mock job extraction from raw HTML
function mockExtractJob(html: string, url: string): Partial<RawJobData> {
  const titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/i) || html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const companyMatch = html.match(/company[^>]*>([^<]+)</i);
  const locationMatch = html.match(/location[^>]*>([^<]+)</i);
  return {
    title: titleMatch?.[1]?.trim() || 'Software Engineer',
    company: companyMatch?.[1]?.trim() || 'Unknown Company',
    location: locationMatch?.[1]?.trim() || 'Remote',
    description: 'This is a mocked job description generated because no OpenAI API key was provided. The job requirements, responsibilities, and other details would normally be extracted here from the raw HTML of the job posting using a language model.',
    jobUrl: url,
  };
}

let openai: any = null;

async function getOpenAIClient() {
  if (!config.openai.apiKey) return null;
  if (openai) return openai;
  try {
    const { OpenAI } = await import('openai' as any);
    openai = new OpenAI({ apiKey: config.openai.apiKey });
    return openai;
  } catch {
    logger.warn('OpenAI package not available; using mock mode.');
    return null;
  }
}

export const aiService = {
  async generateEmbedding(text: string): Promise<number[]> {
    const client = await getOpenAIClient();
    if (!client) {
      logger.debug('AI mock mode: generating mock embedding');
      return generateMockEmbedding();
    }
    try {
      const response = await client.embeddings.create({
        model: 'text-embedding-3-small',
        input: text.slice(0, 8000),
      });
      return response.data[0].embedding;
    } catch (error) {
      logger.error('OpenAI embedding failed, using mock:', error);
      return generateMockEmbedding();
    }
  },

  async extractJobFromHtml(html: string, url: string): Promise<Partial<RawJobData>> {
    const client = await getOpenAIClient();
    if (!client) {
      logger.debug('AI mock mode: using regex extraction');
      return mockExtractJob(html, url);
    }
    try {
      const truncatedHtml = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 6000);

      const response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Extract job posting information from the provided text and return a JSON object with these fields:
              title (string), company (string), description (string), location (string),
              salaryMin (number|null), salaryMax (number|null), employmentType (string|null),
              experienceMin (number|null), experienceMax (number|null), skills (string[]).
              Return only valid JSON, no markdown.`,
          },
          { role: 'user', content: truncatedHtml },
        ],
        temperature: 0,
        max_tokens: 1000,
      });

      const content = response.choices[0]?.message?.content || '{}';
      const parsed = JSON.parse(content);
      return { ...parsed, jobUrl: url };
    } catch (error) {
      logger.error('OpenAI extraction failed, using mock:', error);
      return mockExtractJob(html, url);
    }
  },

  buildJobEmbeddingText(job: {
    title?: string;
    company?: string;
    description?: string;
    location?: string;
    skills?: any;
    employmentType?: string | null;
  }): string {
    const skills = Array.isArray(job.skills) ? job.skills.join(', ') : '';
    return [
      job.title,
      job.company,
      job.location,
      job.employmentType,
      skills,
      job.description?.slice(0, 500),
    ]
      .filter(Boolean)
      .join(' | ');
  },
};
