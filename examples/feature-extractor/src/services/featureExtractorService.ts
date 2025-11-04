import { logger } from '../middleware/logger';

export interface FeatureExtractionRequest {
  text: string;
  url?: string;
  extractionType?: 'product-features' | 'technical-specs' | 'benefits' | 'all';
}

export interface ExtractedFeatures {
  productFeatures: string[];
  technicalSpecs: Record<string, string>;
  benefits: string[];
  categories: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
}

export class FeatureExtractorService {
  async extractFeatures(request: FeatureExtractionRequest): Promise<ExtractedFeatures> {
    try {
      logger.info('Extracting features from text:', {
        textLength: request.text.length,
        hasUrl: !!request.url,
      });

      const text = request.text.toLowerCase();

      // Extract product features (simple keyword matching for demo)
      const productFeatures = this.extractProductFeatures(text);
      const technicalSpecs = this.extractTechnicalSpecs(text);
      const benefits = this.extractBenefits(text);
      const categories = this.categorizeFeatures(productFeatures);
      const sentiment = this.analyzeSentiment(text);

      const result = {
        productFeatures,
        technicalSpecs,
        benefits,
        categories,
        sentiment,
      };

      logger.info('Feature extraction complete:', {
        featuresCount: productFeatures.length,
        specsCount: Object.keys(technicalSpecs).length,
        benefitsCount: benefits.length,
      });

      return result;
    } catch (error: any) {
      logger.error('Failed to extract features:', error);
      throw new Error(`Failed to extract features: ${error.message}`);
    }
  }

  private extractProductFeatures(text: string): string[] {
    const features: string[] = [];
    const featurePatterns = [
      /(?:features?|includes?|offers?|provides?):?\s*([^.!?]+)/gi,
      /(?:with|has|supports?):?\s+([a-z\s]{3,50})/gi,
    ];

    featurePatterns.forEach((pattern) => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        if (match[1]) {
          features.push(match[1].trim());
        }
      }
    });

    // Add common AI features if mentioned
    const commonFeatures = {
      'code completion': /code\s*complet/i,
      'ai-powered': /ai[\s-]powered/i,
      'real-time collaboration': /real[\s-]time.*collaborat/i,
      'multi-language support': /multi[\s-]language/i,
      'inline suggestions': /inline\s*suggest/i,
      'context-aware': /context[\s-]aware/i,
    };

    Object.entries(commonFeatures).forEach(([feature, pattern]) => {
      if (pattern.test(text)) {
        features.push(feature);
      }
    });

    return [...new Set(features)].slice(0, 15);
  }

  private extractTechnicalSpecs(text: string): Record<string, string> {
    const specs: Record<string, string> = {};

    // Extract common technical specifications
    const specPatterns: Record<string, RegExp> = {
      'API Version': /api\s*(?:version|v)[:\s]*([0-9.]+)/i,
      'Models Supported': /models?[:\s]*([a-z0-9\s,.-]+)/i,
      'Languages': /languages?[:\s]*([a-z\s,]+)/i,
      'Response Time': /response\s*time[:\s]*([0-9]+\s*(?:ms|milliseconds?|seconds?))/i,
      'Accuracy': /accuracy[:\s]*([0-9]{1,3}%)/i,
    };

    Object.entries(specPatterns).forEach(([spec, pattern]) => {
      const match = text.match(pattern);
      if (match && match[1]) {
        specs[spec] = match[1].trim();
      }
    });

    return specs;
  }

  private extractBenefits(text: string): string[] {
    const benefits: string[] = [];
    const benefitKeywords = [
      'faster', 'improve', 'increase', 'reduce', 'save', 'enhance',
      'boost', 'optimize', 'streamline', 'simplify'
    ];

    benefitKeywords.forEach((keyword) => {
      const pattern = new RegExp(`${keyword}[s]?\\s+([a-z\\s]{5,50})`, 'gi');
      let match;
      while ((match = pattern.exec(text)) !== null) {
        if (match[1]) {
          benefits.push(`${keyword}s ${match[1].trim()}`);
        }
      }
    });

    return [...new Set(benefits)].slice(0, 10);
  }

  private categorizeFeatures(features: string[]): string[] {
    const categories = new Set<string>();

    features.forEach((feature) => {
      const lower = feature.toLowerCase();
      if (/code|programming|syntax/.test(lower)) categories.add('Development');
      if (/ai|machine learning|ml/.test(lower)) categories.add('AI/ML');
      if (/security|safe|encrypt/.test(lower)) categories.add('Security');
      if (/collaborat|team|share/.test(lower)) categories.add('Collaboration');
      if (/perform|speed|fast/.test(lower)) categories.add('Performance');
    });

    return Array.from(categories);
  }

  private analyzeSentiment(text: string): 'positive' | 'neutral' | 'negative' {
    const positiveWords = ['great', 'excellent', 'amazing', 'best', 'love', 'perfect'];
    const negativeWords = ['bad', 'poor', 'worst', 'hate', 'terrible', 'slow'];

    let score = 0;
    positiveWords.forEach((word) => {
      if (text.includes(word)) score++;
    });
    negativeWords.forEach((word) => {
      if (text.includes(word)) score--;
    });

    if (score > 0) return 'positive';
    if (score < 0) return 'negative';
    return 'neutral';
  }
}
