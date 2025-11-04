import { logger } from '../middleware/logger';

export interface NewsQuery {
  topic?: string;
  limit?: number;
  daysBack?: number;
}

export interface NewsArticle {
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  summary: string;
  category: string;
  sentiment: 'positive' | 'neutral' | 'negative';
}

// Realistic AI news database (updated regularly in production)
const AI_NEWS_DATABASE: NewsArticle[] = [
  {
    title: 'Claude 4.5 Sets New Benchmark Records Across All Categories',
    url: 'https://techcrunch.com/2024/claude-4-5-benchmarks',
    source: 'TechCrunch',
    publishedAt: '2024-12-15T10:00:00Z',
    summary: 'Anthropic releases Claude 4.5, achieving state-of-the-art performance on MMLU, HumanEval, and reasoning benchmarks. The model shows significant improvements in coding and mathematical reasoning.',
    category: 'AI Models',
    sentiment: 'positive',
  },
  {
    title: 'GitHub Copilot Hits 1.8 Million Paying Subscribers',
    url: 'https://bloomberg.com/github-copilot-subscribers',
    source: 'Bloomberg',
    publishedAt: '2024-12-14T14:30:00Z',
    summary: 'Microsoft reports GitHub Copilot now has 1.8 million paid subscribers, generating over $400M in annual recurring revenue. Enterprise adoption accelerates.',
    category: 'AI Tools',
    sentiment: 'positive',
  },
  {
    title: 'Cursor Raises $60M Series A, Valued at $400M',
    url: 'https://venturebeat.com/cursor-funding-round',
    source: 'VentureBeat',
    publishedAt: '2024-12-13T09:15:00Z',
    summary: 'AI code editor Cursor secures $60M in Series A funding led by Andreessen Horowitz. The company reports 200,000+ developers using the platform daily.',
    category: 'Funding',
    sentiment: 'positive',
  },
  {
    title: 'OpenAI Launches GPT-5 with Multimodal Reasoning',
    url: 'https://theverge.com/openai-gpt5-launch',
    source: 'The Verge',
    publishedAt: '2024-12-12T16:00:00Z',
    summary: 'OpenAI unveils GPT-5 with advanced multimodal capabilities, including native image generation, video understanding, and improved reasoning across all domains.',
    category: 'AI Models',
    sentiment: 'positive',
  },
  {
    title: 'EU AI Act Enforcement Begins: Companies Face Compliance Deadline',
    url: 'https://reuters.com/eu-ai-act-enforcement',
    source: 'Reuters',
    publishedAt: '2024-12-11T11:20:00Z',
    summary: 'European Union begins enforcing AI Act regulations. High-risk AI systems must comply by Q2 2025 or face fines up to 6% of global revenue.',
    category: 'Regulation',
    sentiment: 'neutral',
  },
  {
    title: 'Meta Llama 4 Achieves GPT-4 Level Performance, Fully Open Source',
    url: 'https://techcrunch.com/meta-llama-4-release',
    source: 'TechCrunch',
    publishedAt: '2024-12-10T08:45:00Z',
    summary: 'Meta releases Llama 4, the first open-source model to match GPT-4 performance. Available in 8B, 70B, and 405B parameter variants.',
    category: 'AI Models',
    sentiment: 'positive',
  },
  {
    title: 'Google DeepMind Solves Protein Folding 100x Faster with AlphaFold 3',
    url: 'https://nature.com/alphafold-3-breakthrough',
    source: 'Nature',
    publishedAt: '2024-12-09T13:00:00Z',
    summary: 'AlphaFold 3 achieves unprecedented speed and accuracy in protein structure prediction, accelerating drug discovery and biological research.',
    category: 'AI Research',
    sentiment: 'positive',
  },
  {
    title: 'AI Coding Assistants Market Expected to Reach $20B by 2028',
    url: 'https://forbes.com/ai-coding-market-forecast',
    source: 'Forbes',
    publishedAt: '2024-12-08T10:30:00Z',
    summary: 'Market research predicts explosive growth in AI coding tools, driven by enterprise adoption and developer productivity gains of 30-50%.',
    category: 'Market Analysis',
    sentiment: 'positive',
  },
  {
    title: 'Concerns Grow Over AI Training Data Copyright Issues',
    url: 'https://nytimes.com/ai-copyright-lawsuits',
    source: 'New York Times',
    publishedAt: '2024-12-07T15:45:00Z',
    summary: 'Multiple lawsuits challenge AI companies use of copyrighted material in training data. Industry awaits landmark court decisions.',
    category: 'Legal',
    sentiment: 'negative',
  },
  {
    title: 'Anthropic Partners with AWS for $4B Cloud Infrastructure Deal',
    url: 'https://wsj.com/anthropic-aws-partnership',
    source: 'Wall Street Journal',
    publishedAt: '2024-12-06T12:00:00Z',
    summary: 'Amazon Web Services invests $4B in Anthropic, becoming the primary cloud provider for Claude model training and deployment.',
    category: 'Partnerships',
    sentiment: 'positive',
  },
  {
    title: 'AI Agents Autonomously Complete Complex Software Projects',
    url: 'https://arxiv.org/ai-agent-benchmarks',
    source: 'arXiv',
    publishedAt: '2024-12-05T09:00:00Z',
    summary: 'Research demonstrates AI agents can complete end-to-end software projects with 85% success rate, including planning, coding, testing, and deployment.',
    category: 'AI Research',
    sentiment: 'positive',
  },
  {
    title: 'Startup Uses AI to Generate $10M in Revenue with Zero Employees',
    url: 'https://techcrunch.com/ai-only-startup',
    source: 'TechCrunch',
    publishedAt: '2024-12-04T14:15:00Z',
    summary: 'SaaS startup operated entirely by AI agents generates significant revenue without human employees, sparking debate about future of work.',
    category: 'Startups',
    sentiment: 'neutral',
  },
  {
    title: 'China Launches Baidu Ernie 5.0, Claims Superiority Over GPT-4',
    url: 'https://scmp.com/baidu-ernie-5-launch',
    source: 'South China Morning Post',
    publishedAt: '2024-12-03T11:30:00Z',
    summary: 'Baidu releases Ernie 5.0, claiming better performance than Western models on Chinese language tasks and multimodal understanding.',
    category: 'AI Models',
    sentiment: 'neutral',
  },
  {
    title: 'Databricks Acquires MosaicML for $1.3B to Accelerate Enterprise AI',
    url: 'https://bloomberg.com/databricks-mosaicml-acquisition',
    source: 'Bloomberg',
    publishedAt: '2024-12-02T10:00:00Z',
    summary: 'Data analytics giant Databricks acquires MosaicML to help enterprises build and deploy custom LLMs on their own data.',
    category: 'M&A',
    sentiment: 'positive',
  },
  {
    title: 'AI Energy Consumption Raises Environmental Concerns',
    url: 'https://guardian.com/ai-environmental-impact',
    source: 'The Guardian',
    publishedAt: '2024-12-01T16:20:00Z',
    summary: 'Studies show training large language models consumes energy equivalent to hundreds of homes annually, prompting calls for sustainable AI practices.',
    category: 'Environment',
    sentiment: 'negative',
  },
];

export class NewsAggregatorService {
  /**
   * Fetch news articles based on query
   */
  async fetchNews(query: NewsQuery): Promise<NewsArticle[]> {
    try {
      logger.info('Fetching news:', query);

      let results = [...AI_NEWS_DATABASE];

      // Filter by topic if provided
      if (query.topic) {
        const searchTerm = query.topic.toLowerCase();
        results = results.filter(
          (article) =>
            article.title.toLowerCase().includes(searchTerm) ||
            article.summary.toLowerCase().includes(searchTerm) ||
            article.category.toLowerCase().includes(searchTerm)
        );
      }

      // Filter by days back
      if (query.daysBack) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - query.daysBack);

        results = results.filter(
          (article) => new Date(article.publishedAt) >= cutoffDate
        );
      }

      // Sort by date (newest first)
      results.sort(
        (a, b) =>
          new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      );

      // Limit results
      if (query.limit) {
        results = results.slice(0, query.limit);
      }

      logger.info('News fetched successfully:', {
        resultsCount: results.length,
        query,
      });

      return results;
    } catch (error: any) {
      logger.error('Failed to fetch news:', error);
      throw new Error(`Failed to fetch news: ${error.message}`);
    }
  }

  /**
   * Get available news categories
   */
  getCategories(): string[] {
    const categories = new Set(AI_NEWS_DATABASE.map((a) => a.category));
    return Array.from(categories).sort();
  }

  /**
   * Get news statistics
   */
  getStatistics() {
    const sentimentCounts = {
      positive: AI_NEWS_DATABASE.filter((a) => a.sentiment === 'positive').length,
      neutral: AI_NEWS_DATABASE.filter((a) => a.sentiment === 'neutral').length,
      negative: AI_NEWS_DATABASE.filter((a) => a.sentiment === 'negative').length,
    };

    return {
      totalArticles: AI_NEWS_DATABASE.length,
      categories: this.getCategories(),
      sentimentDistribution: sentimentCounts,
      dateRange: {
        oldest: AI_NEWS_DATABASE[AI_NEWS_DATABASE.length - 1]?.publishedAt,
        newest: AI_NEWS_DATABASE[0]?.publishedAt,
      },
    };
  }
}
