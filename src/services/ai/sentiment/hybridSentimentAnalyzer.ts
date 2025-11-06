import { LLMSentimentAnalyzer } from './llmSentimentAnalyzer.js';
import { MLSentimentAnalyzer } from './mlSentimentAnalyzer.js';
import { SentimentAnalyzer as LexiconAnalyzer } from './sentimentAnalyzer.js';
import { logger } from '../../../utils/logger.js';

interface SentimentResult {
  overall: {
    polarity: number;
    category: string;
    confidence: number;
  };
  emotions: Array<{
    emotion: string;
    score: number;
    intensity: 'low' | 'medium' | 'high';
  }>;
  intensity: number;
  mixed: boolean;
  keywords: {
    positive: string[];
    negative: string[];
    neutral: string[];
  };
  subjectivity: number;
}

interface CachedResult {
  result: SentimentResult;
  timestamp: number;
  method: 'llm' | 'ml' | 'lexicon';
}

export class HybridSentimentAnalyzer {
  private llmAnalyzer: LLMSentimentAnalyzer;
  private mlAnalyzer: MLSentimentAnalyzer;
  private lexiconAnalyzer: LexiconAnalyzer;
  private cache: Map<string, CachedResult> = new Map();
  private cacheTTL: number = 3600000; // 1 hour
  private stats = {
    llm: 0,
    ml: 0,
    lexicon: 0,
    cache: 0,
    errors: { llm: 0, ml: 0, lexicon: 0 },
  };

  constructor() {
    this.llmAnalyzer = new LLMSentimentAnalyzer();
    this.mlAnalyzer = new MLSentimentAnalyzer();
    this.lexiconAnalyzer = new LexiconAnalyzer();

    logger.info('Hybrid Sentiment Analyzer initialized', {
      llmAvailable: this.llmAnalyzer.isAvailable(),
      cacheTTL: `${this.cacheTTL / 1000}s`,
    });

    // Start ML model initialization in background
    this.mlAnalyzer.isReady().then((ready) => {
      if (ready) {
        logger.info('ML fallback analyzer ready');
      }
    });

    // Periodic cache cleanup
    setInterval(() => this.cleanCache(), 300000); // Every 5 minutes
  }

  /**
   * Analyze sentiment using best available method
   * Tier 1: LLM (best quality)
   * Tier 2: Local ML (fast fallback)
   * Tier 3: Lexicon (offline fallback)
   */
  async analyze(
    text: string
  ): Promise<SentimentResult & { method: string; cached: boolean }> {
    if (!text || text.trim().length === 0) {
      throw new Error('Text cannot be empty');
    }

    // Check cache first
    const cacheKey = this.getCacheKey(text);
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      this.stats.cache++;
      logger.debug('Returning cached result', { method: cached.method });
      return {
        ...cached.result,
        method: `${cached.method} (cached)`,
        cached: true,
      };
    }

    // Try LLM first (best quality)
    if (this.llmAnalyzer.isAvailable()) {
      try {
        const result = await this.llmAnalyzer.analyze(text);
        this.stats.llm++;
        this.cacheResult(cacheKey, result, 'llm');
        logger.info('Used LLM analyzer', {
          confidence: result.overall.confidence,
        });
        return { ...result, method: 'llm', cached: false };
      } catch (error: any) {
        this.stats.errors.llm++;
        logger.warn('LLM analyzer failed, falling back to ML', {
          error: error.message,
        });
      }
    }

    // Try local ML model (fast fallback)
    try {
      if (await this.mlAnalyzer.isReady()) {
        const result = await this.mlAnalyzer.analyze(text);
        this.stats.ml++;
        this.cacheResult(cacheKey, result, 'ml');
        logger.info('Used ML analyzer', {
          confidence: result.overall.confidence,
        });
        return { ...result, method: 'ml', cached: false };
      }
    } catch (error: any) {
      this.stats.errors.ml++;
      logger.warn('ML analyzer failed, falling back to lexicon', {
        error: error.message,
      });
    }

    // Final fallback: Lexicon-based
    try {
      const result = this.lexiconAnalyzer.analyze(text);
      this.stats.lexicon++;
      this.cacheResult(cacheKey, result, 'lexicon');
      logger.info('Used lexicon analyzer', {
        confidence: result.overall.confidence,
      });
      return { ...result, method: 'lexicon', cached: false };
    } catch (error: any) {
      this.stats.errors.lexicon++;
      logger.error('All analyzers failed', { error: error.message });
      throw new Error('Sentiment analysis failed: all methods unavailable');
    }
  }

  /**
   * Generate cache key from text
   */
  private getCacheKey(text: string): string {
    // Simple hash function for cache key
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36);
  }

  /**
   * Cache result
   */
  private cacheResult(
    key: string,
    result: SentimentResult,
    method: 'llm' | 'ml' | 'lexicon'
  ): void {
    this.cache.set(key, {
      result,
      timestamp: Date.now(),
      method,
    });
  }

  /**
   * Clean expired cache entries
   */
  private cleanCache(): void {
    const now = Date.now();
    let removed = 0;

    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.cacheTTL) {
        this.cache.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      logger.debug('Cache cleanup', {
        entriesRemoved: removed,
        cacheSize: this.cache.size,
      });
    }
  }

  /**
   * Get analyzer statistics
   */
  getStats() {
    const total = this.stats.llm + this.stats.ml + this.stats.lexicon;
    const llmStats = this.llmAnalyzer.isAvailable()
      ? this.llmAnalyzer.getStats()
      : null;

    return {
      usage: {
        llm: this.stats.llm,
        ml: this.stats.ml,
        lexicon: this.stats.lexicon,
        cache: this.stats.cache,
        total,
      },
      percentages:
        total > 0
          ? {
              llm: ((this.stats.llm / total) * 100).toFixed(1) + '%',
              ml: ((this.stats.ml / total) * 100).toFixed(1) + '%',
              lexicon: ((this.stats.lexicon / total) * 100).toFixed(1) + '%',
              cache:
                ((this.stats.cache / (total + this.stats.cache)) * 100).toFixed(
                  1
                ) + '%',
            }
          : null,
      errors: this.stats.errors,
      cache: {
        size: this.cache.size,
        ttl: `${this.cacheTTL / 1000}s`,
      },
      llm: llmStats,
      capabilities: {
        llm: this.llmAnalyzer.isAvailable(),
        ml: this.mlAnalyzer.isReady(),
        lexicon: true,
      },
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    const size = this.cache.size;
    this.cache.clear();
    logger.info('Cache cleared', { entriesRemoved: size });
  }
}
