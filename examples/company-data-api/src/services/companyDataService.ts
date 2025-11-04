import { logger } from '../middleware/logger';

export interface CompanyQuery {
  companyName?: string;
  domain?: string;
  industry?: string;
}

export interface CompanyData {
  name: string;
  domain: string;
  industry: string;
  founded: number;
  fundingRaised: string;
  lastFundingRound: string;
  teamSize: string;
  pricing: {
    tier: string;
    price: string;
    billingPeriod: string;
  }[];
  headquarters: string;
  description: string;
  competitors: string[];
}

// Mock company database
const COMPANY_DATABASE: CompanyData[] = [
  {
    name: 'GitHub Copilot',
    domain: 'github.com/features/copilot',
    industry: 'AI Coding Assistants',
    founded: 2021,
    fundingRaised: '$100M+ (Microsoft owned)',
    lastFundingRound: 'Acquired by Microsoft',
    teamSize: '500+',
    pricing: [
      { tier: 'Individual', price: '$10', billingPeriod: 'month' },
      { tier: 'Business', price: '$19', billingPeriod: 'user/month' },
      { tier: 'Enterprise', price: 'Custom', billingPeriod: 'contact sales' },
    ],
    headquarters: 'San Francisco, CA',
    description: 'AI pair programmer that helps you write code faster',
    competitors: ['Cursor', 'Tabnine', 'Codeium', 'Amazon CodeWhisperer'],
  },
  {
    name: 'Cursor',
    domain: 'cursor.sh',
    industry: 'AI Coding Assistants',
    founded: 2022,
    fundingRaised: '$60M',
    lastFundingRound: 'Series A - $60M (Aug 2024)',
    teamSize: '20-50',
    pricing: [
      { tier: 'Free', price: '$0', billingPeriod: 'forever' },
      { tier: 'Pro', price: '$20', billingPeriod: 'month' },
      { tier: 'Business', price: '$40', billingPeriod: 'user/month' },
    ],
    headquarters: 'San Francisco, CA',
    description: 'AI-first code editor built for pair programming with AI',
    competitors: ['GitHub Copilot', 'Windsurf', 'Claude Code', 'Zed'],
  },
  {
    name: 'Anthropic Claude',
    domain: 'anthropic.com',
    industry: 'AI Language Models',
    founded: 2021,
    fundingRaised: '$7.3B',
    lastFundingRound: 'Series D - $4B (2024)',
    teamSize: '500+',
    pricing: [
      { tier: 'Free', price: '$0', billingPeriod: 'limited usage' },
      { tier: 'Pro', price: '$20', billingPeriod: 'month' },
      { tier: 'Team', price: '$30', billingPeriod: 'user/month' },
      { tier: 'Enterprise', price: 'Custom', billingPeriod: 'contact sales' },
    ],
    headquarters: 'San Francisco, CA',
    description: 'Constitutional AI system focused on safety and helpfulness',
    competitors: ['OpenAI GPT-4', 'Google Gemini', 'Meta Llama'],
  },
  {
    name: 'OpenAI',
    domain: 'openai.com',
    industry: 'AI Language Models',
    founded: 2015,
    fundingRaised: '$13B+',
    lastFundingRound: 'Series C - $10B (Microsoft, 2023)',
    teamSize: '1000+',
    pricing: [
      { tier: 'Free', price: '$0', billingPeriod: 'limited usage' },
      { tier: 'Plus', price: '$20', billingPeriod: 'month' },
      { tier: 'Team', price: '$30', billingPeriod: 'user/month' },
      { tier: 'Enterprise', price: 'Custom', billingPeriod: 'contact sales' },
    ],
    headquarters: 'San Francisco, CA',
    description: 'Creator of ChatGPT and GPT-4, leading AGI research lab',
    competitors: ['Anthropic', 'Google DeepMind', 'Meta AI'],
  },
  {
    name: 'Vercel',
    domain: 'vercel.com',
    industry: 'Web Hosting & Development',
    founded: 2015,
    fundingRaised: '$313M',
    lastFundingRound: 'Series D - $150M (Nov 2021)',
    teamSize: '200-500',
    pricing: [
      { tier: 'Hobby', price: '$0', billingPeriod: 'forever' },
      { tier: 'Pro', price: '$20', billingPeriod: 'user/month' },
      { tier: 'Enterprise', price: 'Custom', billingPeriod: 'contact sales' },
    ],
    headquarters: 'San Francisco, CA',
    description: 'Frontend cloud platform for deploying web applications',
    competitors: ['Netlify', 'AWS Amplify', 'Cloudflare Pages'],
  },
];

export class CompanyDataService {
  /**
   * Get company data by query
   */
  async getCompanyData(query: CompanyQuery): Promise<CompanyData[]> {
    try {
      logger.info('Fetching company data:', query);

      let results = [...COMPANY_DATABASE];

      // Filter by company name
      if (query.companyName) {
        const searchTerm = query.companyName.toLowerCase();
        results = results.filter((company) =>
          company.name.toLowerCase().includes(searchTerm)
        );
      }

      // Filter by domain
      if (query.domain) {
        const searchDomain = query.domain.toLowerCase();
        results = results.filter((company) =>
          company.domain.toLowerCase().includes(searchDomain)
        );
      }

      // Filter by industry
      if (query.industry) {
        const searchIndustry = query.industry.toLowerCase();
        results = results.filter((company) =>
          company.industry.toLowerCase().includes(searchIndustry)
        );
      }

      logger.info('Company data retrieved:', {
        resultsCount: results.length,
        query,
      });

      return results;
    } catch (error: any) {
      logger.error('Failed to get company data:', error);
      throw new Error(`Failed to get company data: ${error.message}`);
    }
  }

  /**
   * Get all available industries
   */
  getIndustries(): string[] {
    const industries = new Set(COMPANY_DATABASE.map((c) => c.industry));
    return Array.from(industries).sort();
  }

  /**
   * Get company count
   */
  getCompanyCount(): number {
    return COMPANY_DATABASE.length;
  }
}
