import axios from 'axios';
import * as cheerio from 'cheerio';
import { logger } from '../middleware/logger';

export interface ScrapeOptions {
  url: string;
  selectors?: {
    title?: string;
    description?: string;
    pricing?: string;
    features?: string;
    contactEmail?: string;
    metadata?: Record<string, string>;
  };
  timeout?: number;
}

export interface ScrapeResult {
  url: string;
  title: string;
  description: string;
  pricing: string[];
  features: string[];
  contactEmail?: string;
  metadata: {
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: string;
    keywords?: string;
    author?: string;
  };
  links: {
    internal: string[];
    external: string[];
  };
  scrapedAt: string;
}

export class WebScraperService {
  private userAgent: string;
  private timeout: number;

  constructor() {
    this.userAgent =
      process.env.USER_AGENT || 'AgentMarket-WebScraper/1.0';
    this.timeout =
      parseInt(process.env.MAX_SCRAPE_TIMEOUT_MS || '30000', 10);
  }

  /**
   * Scrape a website and extract structured data
   */
  async scrape(options: ScrapeOptions): Promise<ScrapeResult> {
    const { url, selectors, timeout } = options;

    try {
      logger.info('Starting web scrape:', { url });

      // Fetch HTML content
      const response = await axios.get(url, {
        timeout: timeout || this.timeout,
        headers: {
          'User-Agent': this.userAgent,
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          Connection: 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
      });

      const html = response.data;
      const $ = cheerio.load(html);

      // Extract data using selectors or smart defaults
      const result: ScrapeResult = {
        url,
        title: this.extractTitle($, selectors?.title),
        description: this.extractDescription($, selectors?.description),
        pricing: this.extractPricing($, selectors?.pricing),
        features: this.extractFeatures($, selectors?.features),
        contactEmail: this.extractEmail($, selectors?.contactEmail),
        metadata: this.extractMetadata($),
        links: this.extractLinks($, url),
        scrapedAt: new Date().toISOString(),
      };

      logger.info('Web scrape completed successfully:', {
        url,
        titleLength: result.title.length,
        featuresFound: result.features.length,
        pricingFound: result.pricing.length,
      });

      return result;
    } catch (error: any) {
      logger.error('Web scrape failed:', {
        url,
        error: error.message,
      });

      if (error.code === 'ENOTFOUND') {
        throw new Error(`Website not found: ${url}`);
      } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
        throw new Error(`Request timeout: ${url}`);
      } else if (error.response?.status === 403) {
        throw new Error(`Access denied (403): ${url}`);
      } else if (error.response?.status === 404) {
        throw new Error(`Page not found (404): ${url}`);
      } else {
        throw new Error(`Failed to scrape website: ${error.message}`);
      }
    }
  }

  /**
   * Extract page title
   */
  private extractTitle($: cheerio.CheerioAPI, selector?: string): string {
    if (selector) {
      return $(selector).first().text().trim();
    }

    // Try multiple sources
    return (
      $('meta[property="og:title"]').attr('content') ||
      $('meta[name="twitter:title"]').attr('content') ||
      $('title').text().trim() ||
      $('h1').first().text().trim() ||
      'No title found'
    );
  }

  /**
   * Extract page description
   */
  private extractDescription($: cheerio.CheerioAPI, selector?: string): string {
    if (selector) {
      return $(selector).first().text().trim();
    }

    return (
      $('meta[property="og:description"]').attr('content') ||
      $('meta[name="twitter:description"]').attr('content') ||
      $('meta[name="description"]').attr('content') ||
      $('p').first().text().trim() ||
      'No description found'
    );
  }

  /**
   * Extract pricing information
   */
  private extractPricing($: cheerio.CheerioAPI, selector?: string): string[] {
    const pricing: string[] = [];

    if (selector) {
      $(selector).each((_, el) => {
        const text = $(el).text().trim();
        if (text) pricing.push(text);
      });
      return pricing;
    }

    // Look for common pricing patterns
    const priceRegex = /\$[\d,]+(?:\.\d{2})?(?:\/(?:mo|month|yr|year))?/gi;
    const bodyText = $('body').text();
    const matches = bodyText.match(priceRegex);

    if (matches) {
      // Deduplicate
      return [...new Set(matches)].slice(0, 10);
    }

    // Look for price-related elements
    $('.price, .pricing, [class*="price"], [class*="cost"]').each((_, el) => {
      const text = $(el).text().trim();
      if (text && pricing.length < 10) {
        pricing.push(text);
      }
    });

    return pricing;
  }

  /**
   * Extract product features
   */
  private extractFeatures($: cheerio.CheerioAPI, selector?: string): string[] {
    const features: string[] = [];

    if (selector) {
      $(selector).each((_, el) => {
        const text = $(el).text().trim();
        if (text) features.push(text);
      });
      return features;
    }

    // Look for common feature patterns
    $('ul li, .feature, [class*="feature"]').each((_, el) => {
      const text = $(el).text().trim();
      // Filter out nav items and short text
      if (text && text.length > 10 && text.length < 200 && features.length < 20) {
        features.push(text);
      }
    });

    return features;
  }

  /**
   * Extract contact email
   */
  private extractEmail($: cheerio.CheerioAPI, selector?: string): string | undefined {
    if (selector) {
      return $(selector).first().text().trim() || undefined;
    }

    // Look for mailto links
    const mailto = $('a[href^="mailto:"]').first().attr('href');
    if (mailto) {
      return mailto.replace('mailto:', '');
    }

    // Look for email patterns in text
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    const bodyText = $('body').text();
    const match = bodyText.match(emailRegex);

    return match ? match[0] : undefined;
  }

  /**
   * Extract metadata
   */
  private extractMetadata($: cheerio.CheerioAPI) {
    return {
      ogTitle: $('meta[property="og:title"]').attr('content'),
      ogDescription: $('meta[property="og:description"]').attr('content'),
      ogImage: $('meta[property="og:image"]').attr('content'),
      keywords: $('meta[name="keywords"]').attr('content'),
      author: $('meta[name="author"]').attr('content'),
    };
  }

  /**
   * Extract links (internal and external)
   */
  private extractLinks($: cheerio.CheerioAPI, baseUrl: string): {
    internal: string[];
    external: string[];
  } {
    const internal: Set<string> = new Set();
    const external: Set<string> = new Set();

    const baseDomain = new URL(baseUrl).hostname;

    $('a[href]').each((_, el) => {
      const href = $(el).attr('href');
      if (!href) return;

      try {
        // Handle relative URLs
        const fullUrl = new URL(href, baseUrl).href;
        const linkDomain = new URL(fullUrl).hostname;

        if (linkDomain === baseDomain) {
          if (internal.size < 20) internal.add(fullUrl);
        } else {
          if (external.size < 20) external.add(fullUrl);
        }
      } catch (e) {
        // Invalid URL, skip
      }
    });

    return {
      internal: Array.from(internal),
      external: Array.from(external),
    };
  }
}
