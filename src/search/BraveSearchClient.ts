import axios, { AxiosInstance } from 'axios';
import { logger } from '../utils/logger.js';

export interface SearchResult {
  title: string;
  url: string;
  description: string;
  age?: string;
  source?: string;
}

export interface SearchResponse {
  query: string;
  results: SearchResult[];
  totalResults?: number;
  healthCheckPassed: boolean;
  apiCallCost: string;
}

export class BraveSearchClient {
  private client: AxiosInstance;
  private apiKey: string;
  private healthCheckUrl = 'https://api.search.brave.com/res/v1/web/search';
  private lastHealthCheck: number = 0;
  private healthCheckCacheTTL = 60 * 1000; // 1 minute
  private isHealthy: boolean = false;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.BRAVE_API_KEY || '';

    if (!this.apiKey) {
      logger.warn('⚠️  BRAVE_API_KEY not configured - web search will be disabled');
    }

    this.client = axios.create({
      baseURL: 'https://api.search.brave.com/res/v1',
      headers: {
        'Accept': 'application/json',
        'X-Subscription-Token': this.apiKey
      },
      timeout: 10000 // 10 second timeout
    });
  }

  /**
   * Check if Brave Search API is healthy
   * Cached for 1 minute to avoid excessive health checks
   */
  async checkHealth(): Promise<boolean> {
    // Use cached result if recent
    const now = Date.now();
    if (now - this.lastHealthCheck < this.healthCheckCacheTTL && this.isHealthy) {
      logger.info('✓ Brave Search health check (cached): healthy');
      return true;
    }

    try {
      logger.info('🏥 Checking Brave Search API health...');

      // Make minimal search request to verify API is working
      const response = await this.client.get('/web/search', {
        params: {
          q: 'test',
          count: 1
        }
      });

      this.isHealthy = response.status === 200;
      this.lastHealthCheck = now;

      if (this.isHealthy) {
        logger.info('✓ Brave Search API is healthy');
      } else {
        logger.error(`✗ Brave Search API returned status ${response.status}`);
      }

      return this.isHealthy;

    } catch (error: any) {
      this.isHealthy = false;
      this.lastHealthCheck = now;
      logger.error('✗ Brave Search API health check failed:', error.message);
      return false;
    }
  }

  /**
   * Search the web using Brave Search API
   * ALWAYS performs health check before searching
   */
  async search(
    query: string,
    options: {
      count?: number;
      safesearch?: 'off' | 'moderate' | 'strict';
      freshness?: string;
    } = {}
  ): Promise<SearchResponse> {
    // MANDATORY health check before search
    const isHealthy = await this.checkHealth();

    if (!isHealthy) {
      logger.warn('⚠️  Brave Search API is unhealthy - skipping search');
      return {
        query,
        results: [],
        healthCheckPassed: false,
        apiCallCost: '$0.00'
      };
    }

    try {
      logger.info(`🔍 Searching Brave: "${query}"`);

      const response = await this.client.get('/web/search', {
        params: {
          q: query,
          count: options.count || 10,
          safesearch: options.safesearch || 'moderate',
          freshness: options.freshness
        }
      });

      const data = response.data;

      // Parse results
      const results: SearchResult[] = (data.web?.results || []).map((result: any) => ({
        title: result.title,
        url: result.url,
        description: result.description,
        age: result.age,
        source: result.meta_url?.hostname
      }));

      logger.info(`✓ Found ${results.length} results for "${query}"`);

      // Brave Search API costs:
      // Free tier: 2,500 queries/month ($0.00)
      // Paid tier: $5/1000 queries ($0.005 per query)
      const apiCallCost = this.apiKey ? '$0.005' : '$0.00';

      return {
        query,
        results,
        totalResults: data.web?.results?.length || 0,
        healthCheckPassed: true,
        apiCallCost
      };

    } catch (error: any) {
      logger.error('Search failed:', error.message);

      // Return empty results on error (graceful degradation)
      return {
        query,
        results: [],
        healthCheckPassed: true,
        apiCallCost: '$0.00'
      };
    }
  }

  /**
   * Get web page content (no payment needed for public pages)
   * Used for fetching non-paywalled content
   */
  async fetchPage(url: string): Promise<{ content: string; success: boolean }> {
    try {
      logger.info(`📄 Fetching page: ${url}`);

      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'AgentMarket/1.0 (AI Agent)'
        }
      });

      if (response.status === 200) {
        logger.info(`✓ Fetched ${url} successfully`);
        return {
          content: response.data,
          success: true
        };
      }

      return {
        content: '',
        success: false
      };

    } catch (error: any) {
      logger.error(`Failed to fetch ${url}:`, error.message);
      return {
        content: '',
        success: false
      };
    }
  }
}
