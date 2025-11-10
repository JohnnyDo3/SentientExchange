import type { ServiceRegistry } from '../registry/ServiceRegistry.js';
import type { Service } from '../types/service.js';
import { logger } from '../utils/logger.js';

/**
 * Dynamic service discovery and matching
 * Matches user queries to available marketplace services using semantic analysis
 */
export class DynamicServiceMatcher {
  private registry: ServiceRegistry;
  private serviceCache: Service[] = [];
  private lastCacheUpdate: number = 0;
  private readonly CACHE_TTL = 60000; // 1 minute cache

  constructor(registry: ServiceRegistry) {
    this.registry = registry;
  }

  /**
   * Match user query to available services
   * Returns array of matching service IDs with relevance scores
   */
  async matchServices(
    userQuery: string
  ): Promise<
    Array<{
      serviceId: string;
      serviceName: string;
      score: number;
      matchedCapabilities: string[];
    }>
  > {
    await this.refreshCache();

    const query = userQuery.toLowerCase();
    const matches: Array<{
      serviceId: string;
      serviceName: string;
      score: number;
      matchedCapabilities: string[];
    }> = [];

    for (const service of this.serviceCache) {
      const result = this.scoreService(service, query);
      if (result.score > 0) {
        matches.push({
          serviceId: service.id,
          serviceName: service.name,
          score: result.score,
          matchedCapabilities: result.matchedCapabilities,
        });
      }
    }

    // Sort by score (highest first)
    matches.sort((a, b) => b.score - a.score);

    if (matches.length > 0) {
      logger.info(
        `✓ Matched ${matches.length} services for query "${userQuery.substring(0, 50)}..."`
      );
      logger.debug(
        `Top matches: ${matches
          .slice(0, 3)
          .map((m) => `${m.serviceName} (${m.score})`)
          .join(', ')}`
      );
    }

    return matches;
  }

  /**
   * Detect if query requires multiple services
   * Returns array of service IDs that should be used together
   */
  async detectMultiServiceWorkflow(userQuery: string): Promise<string[]> {
    const matches = await this.matchServices(userQuery);

    // If multiple high-confidence matches, check for pipeline patterns
    const highConfidenceMatches = matches.filter((m) => m.score > 50);

    if (highConfidenceMatches.length > 1) {
      // Detect common pipelines
      const capabilities = highConfidenceMatches.flatMap(
        (m) => m.matchedCapabilities
      );

      // Search → Sentiment pipeline
      if (
        capabilities.includes('web-search') &&
        capabilities.some((c) =>
          ['sentiment-analysis', 'emotion-detection'].includes(c)
        )
      ) {
        logger.info(
          '✓ Detected multi-service pipeline: web-search → sentiment-analysis'
        );
        return ['web-search', 'sentiment-analysis'];
      }

      // Search → Summarization pipeline
      if (
        capabilities.includes('web-search') &&
        capabilities.includes('text-summarization')
      ) {
        logger.info(
          '✓ Detected multi-service pipeline: web-search → text-summarization'
        );
        return ['web-search', 'text-summarization'];
      }

      // Image → Text pipeline
      if (
        capabilities.some((c) =>
          ['image-classification', 'object-detection', 'ocr'].includes(c)
        ) &&
        capabilities.some((c) =>
          ['text-summarization', 'sentiment-analysis'].includes(c)
        )
      ) {
        logger.info(
          '✓ Detected multi-service pipeline: image-analysis → text-processing'
        );
        return highConfidenceMatches.slice(0, 2).map((m) => m.serviceId);
      }
    }

    // Return all high-confidence matches if no specific pipeline detected
    return highConfidenceMatches.map((m) => m.serviceId);
  }

  /**
   * Get best service for a specific capability
   */
  async getBestServiceForCapability(
    capability: string
  ): Promise<Service | null> {
    await this.refreshCache();

    const matches = this.serviceCache.filter((s) =>
      s.capabilities.includes(capability)
    );

    if (matches.length === 0) return null;

    // Score by reputation and price
    const scored = matches.map((service) => ({
      service,
      score: this.calculateQualityScore(service),
    }));

    scored.sort((a, b) => b.score - a.score);
    return scored[0].service;
  }

  /**
   * Score a service against user query
   * Returns score 0-100 and matched capabilities
   */
  private scoreService(
    service: Service,
    query: string
  ): { score: number; matchedCapabilities: string[] } {
    let score = 0;
    const matchedCapabilities: string[] = [];

    // 1. Exact capability match (highest weight)
    for (const capability of service.capabilities) {
      if (query.includes(capability.replace(/-/g, ' '))) {
        score += 40;
        matchedCapabilities.push(capability);
      }

      // Partial capability match
      const capWords = capability.split('-');
      const matchedWords = capWords.filter((word) => query.includes(word));
      if (matchedWords.length > 0) {
        score += 20 * (matchedWords.length / capWords.length);
        if (!matchedCapabilities.includes(capability)) {
          matchedCapabilities.push(capability);
        }
      }
    }

    // 2. Service name match
    const nameWords = service.name.toLowerCase().split(' ');
    const matchedNameWords = nameWords.filter((word) => query.includes(word));
    if (matchedNameWords.length > 0) {
      score += 15 * (matchedNameWords.length / nameWords.length);
    }

    // 3. Description keyword match
    const description = service.description.toLowerCase();
    const queryWords = query.split(' ').filter((w) => w.length > 3); // Filter short words

    const matchedDescWords = queryWords.filter((word) =>
      description.includes(word)
    );
    if (matchedDescWords.length > 0) {
      score += 10 * (matchedDescWords.length / queryWords.length);
    }

    // 4. Semantic keywords
    const semanticMatches = this.checkSemanticMatches(query, service);
    if (semanticMatches.length > 0) {
      score += 15 * semanticMatches.length;
      matchedCapabilities.push(...semanticMatches);
    }

    // 5. Quality bonus (reputation-based)
    if (score > 0) {
      const qualityBonus = this.calculateQualityScore(service) / 10;
      score += qualityBonus;
    }

    return {
      score: Math.min(100, Math.round(score)),
      matchedCapabilities: [...new Set(matchedCapabilities)], // Remove duplicates
    };
  }

  /**
   * Check for semantic matches using synonym/related term mappings
   */
  private checkSemanticMatches(query: string, service: Service): string[] {
    const matches: string[] = [];

    // Sentiment analysis synonyms
    if (
      service.capabilities.some((c) =>
        ['sentiment-analysis', 'emotion-detection'].includes(c)
      )
    ) {
      const sentimentKeywords = [
        'feeling',
        'opinion',
        'mood',
        'tone',
        'emotion',
        'positive',
        'negative',
        'attitude',
      ];
      if (sentimentKeywords.some((kw) => query.includes(kw))) {
        matches.push('sentiment-analysis');
      }
    }

    // Image analysis synonyms
    if (
      service.capabilities.some((c) =>
        [
          'image-classification',
          'object-detection',
          'visual-analysis',
        ].includes(c)
      )
    ) {
      const imageKeywords = [
        'picture',
        'photo',
        'visual',
        'see',
        'look',
        'recognize',
        'identify',
      ];
      if (imageKeywords.some((kw) => query.includes(kw))) {
        matches.push('image-classification');
      }
    }

    // Text summarization synonyms
    if (service.capabilities.includes('text-summarization')) {
      const summaryKeywords = [
        'summarize',
        'summary',
        'brief',
        'tldr',
        'overview',
        'key points',
        'main ideas',
      ];
      if (summaryKeywords.some((kw) => query.includes(kw))) {
        matches.push('text-summarization');
      }
    }

    // Web search synonyms
    if (service.capabilities.includes('web-search')) {
      const searchKeywords = [
        'search',
        'find',
        'look up',
        'google',
        'news',
        'latest',
        'current',
      ];
      if (searchKeywords.some((kw) => query.includes(kw))) {
        matches.push('web-search');
      }
    }

    return matches;
  }

  /**
   * Calculate quality score based on reputation
   */
  private calculateQualityScore(service: Service): number {
    let score = 0;

    // Rating (0-5) → 0-40 points
    score += (service.reputation.rating / 5) * 40;

    // Success rate (0-100%) → 0-30 points
    score += (service.reputation.successRate / 100) * 30;

    // Total jobs (experience) → 0-20 points
    const jobScore = Math.min(service.reputation.totalJobs / 100, 1) * 20;
    score += jobScore;

    // Response time bonus (faster = better) → 0-10 points
    // avgResponseTime is stored as string like "3.2s", parse it
    const responseTimeMs =
      parseFloat(service.reputation.avgResponseTime) * 1000;
    if (responseTimeMs < 1000) {
      score += 10;
    } else if (responseTimeMs < 3000) {
      score += 5;
    }

    return Math.round(score);
  }

  /**
   * Refresh service cache if stale
   */
  private async refreshCache(): Promise<void> {
    const now = Date.now();
    if (now - this.lastCacheUpdate > this.CACHE_TTL) {
      this.serviceCache = await this.registry.searchServices({});
      this.lastCacheUpdate = now;
      logger.debug(
        `Service cache refreshed: ${this.serviceCache.length} services`
      );
    }
  }

  /**
   * Get all cached services (for AI analysis)
   */
  async getAllServices(): Promise<Service[]> {
    await this.refreshCache();
    return this.serviceCache;
  }
}
