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

export class MLSentimentAnalyzer {
  private classifier: any = null;
  private isInitialized: boolean = false;
  private initializationPromise: Promise<void> | null = null;

  constructor() {
    // Start initialization but don't await it
    this.initializationPromise = this.initialize();
  }

  /**
   * Initialize the ML model
   */
  private async initialize(): Promise<void> {
    try {
      logger.info('Initializing local ML sentiment model...');
      const startTime = Date.now();

      // Dynamic import for ES module compatibility
      const { pipeline } = await import('@xenova/transformers');

      // Load sentiment analysis pipeline
      // Using cardiffnlp/twitter-roberta-base-sentiment-latest
      // Trained on 124M tweets - excellent for modern language
      this.classifier = await pipeline(
        'sentiment-analysis',
        'Xenova/twitter-roberta-base-sentiment-latest'
      );

      const loadTime = Date.now() - startTime;
      this.isInitialized = true;

      logger.info('Local ML model loaded successfully', {
        loadTimeMs: loadTime,
        model: 'twitter-roberta-base-sentiment-latest',
      });
    } catch (error: any) {
      logger.error('Failed to load ML model:', error);
      this.isInitialized = false;
    }
  }

  /**
   * Check if ML analyzer is ready
   */
  async isReady(): Promise<boolean> {
    if (this.isInitialized) return true;
    if (this.initializationPromise) {
      await this.initializationPromise;
    }
    return this.isInitialized;
  }

  /**
   * Analyze sentiment using local ML model
   */
  async analyze(text: string): Promise<SentimentResult> {
    if (!text || text.trim().length === 0) {
      throw new Error('Text cannot be empty');
    }

    // Ensure model is loaded
    if (!(await this.isReady())) {
      throw new Error('ML model not initialized');
    }

    if (!this.classifier) {
      throw new Error('ML classifier not available');
    }

    const startTime = Date.now();

    try {
      // Run sentiment classification
      // Model outputs: [{ label: 'positive'|'negative'|'neutral', score: 0-1 }]
      const result = await this.classifier(text.slice(0, 512)); // Limit to 512 chars for performance
      const analysisTime = Date.now() - startTime;

      logger.info('ML sentiment analysis complete', {
        analysisTimeMs: analysisTime,
      });

      // Convert model output to our standard format
      const sentimentResult = this.convertToStandardFormat(result, text);

      return sentimentResult;
    } catch (error: any) {
      logger.error('ML sentiment analysis failed:', error);
      throw new Error(`ML analysis failed: ${error.message}`);
    }
  }

  /**
   * Convert ML model output to standard sentiment result format
   */
  private convertToStandardFormat(
    modelOutput: any,
    text: string
  ): SentimentResult {
    // Model returns array like: [{ label: 'positive', score: 0.95 }]
    const prediction = Array.isArray(modelOutput)
      ? modelOutput[0]
      : modelOutput;
    const label = prediction.label.toLowerCase();
    const confidence = prediction.score;

    // Map label to polarity
    let polarity = 0;
    if (label === 'positive') polarity = 0.7;
    else if (label === 'negative') polarity = -0.7;
    else polarity = 0;

    // Adjust polarity based on confidence
    polarity *= confidence;

    // Determine category
    let category = 'Neutral';
    if (Math.abs(polarity) < 0.2) category = 'Neutral';
    else if (polarity >= 0.6) category = 'Positive';
    else if (polarity >= 0.3) category = 'Slightly positive';
    else if (polarity <= -0.6) category = 'Negative';
    else if (polarity <= -0.3) category = 'Slightly negative';

    // Extract basic emotions based on polarity
    const emotions: Array<{
      emotion: string;
      score: number;
      intensity: 'low' | 'medium' | 'high';
    }> = [];

    if (polarity > 0.3) {
      emotions.push({
        emotion: 'joy',
        score: Math.min(1.0, Math.abs(polarity)),
        intensity: polarity > 0.7 ? 'high' : polarity > 0.5 ? 'medium' : 'low',
      });
    } else if (polarity < -0.3) {
      // Could be sadness, anger, or disgust - we don't know from this model
      emotions.push({
        emotion: 'sadness',
        score: Math.min(1.0, Math.abs(polarity)),
        intensity:
          Math.abs(polarity) > 0.7
            ? 'high'
            : Math.abs(polarity) > 0.5
              ? 'medium'
              : 'low',
      });
    }

    // Basic keyword extraction (simple approach)
    const keywords = this.extractKeywords(text, polarity);

    // Calculate intensity
    const intensity = Math.min(
      1.0,
      Math.abs(polarity) + (confidence > 0.9 ? 0.1 : 0)
    );

    // Calculate subjectivity (simple heuristic)
    const subjectivity = this.estimateSubjectivity(text);

    return {
      overall: {
        polarity: Math.round(polarity * 100) / 100,
        category,
        confidence: Math.round(confidence * 100) / 100,
      },
      emotions,
      intensity: Math.round(intensity * 100) / 100,
      mixed: false, // This model doesn't detect mixed emotions
      keywords,
      subjectivity: Math.round(subjectivity * 100) / 100,
    };
  }

  /**
   * Extract keywords from text based on sentiment
   */
  private extractKeywords(
    text: string,
    polarity: number
  ): {
    positive: string[];
    negative: string[];
    neutral: string[];
  } {
    const words = text
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 3);

    // Simple sentiment word lists
    const positiveWords = [
      'good',
      'great',
      'excellent',
      'amazing',
      'wonderful',
      'fantastic',
      'love',
      'best',
      'awesome',
      'perfect',
      'happy',
      'pleased',
      'satisfied',
      'helpful',
    ];
    const negativeWords = [
      'bad',
      'terrible',
      'awful',
      'horrible',
      'worst',
      'hate',
      'disappointed',
      'poor',
      'frustrating',
      'angry',
      'sad',
      'unhappy',
    ];

    const positive: string[] = [];
    const negative: string[] = [];
    const neutral: string[] = [];

    words.forEach((word) => {
      if (positiveWords.includes(word)) positive.push(word);
      else if (negativeWords.includes(word)) negative.push(word);
    });

    return {
      positive: positive.slice(0, 5),
      negative: negative.slice(0, 5),
      neutral: neutral.slice(0, 3),
    };
  }

  /**
   * Estimate subjectivity using simple heuristics
   */
  private estimateSubjectivity(text: string): number {
    const lowerText = text.toLowerCase();

    let subjectiveCount = 0;
    let objectiveCount = 0;

    // Subjective indicators
    const subjectiveIndicators = [
      'i think',
      'i feel',
      'in my opinion',
      'i believe',
      'personally',
      'i',
      'me',
      'my',
    ];
    subjectiveIndicators.forEach((indicator) => {
      if (lowerText.includes(indicator)) subjectiveCount++;
    });

    // Objective indicators
    const objectiveIndicators = [
      'research',
      'data',
      'study',
      'evidence',
      'proven',
      'fact',
    ];
    objectiveIndicators.forEach((indicator) => {
      if (lowerText.includes(indicator)) objectiveCount++;
    });

    const total = subjectiveCount + objectiveCount;
    if (total === 0) return 0.5; // Default to neutral

    return Math.min(1.0, subjectiveCount / total);
  }
}
