import Anthropic from '@anthropic-ai/sdk';
import { logger } from '../middleware/logger.js';

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

export class LLMSentimentAnalyzer {
  private client: Anthropic | null = null;
  private costPerRequest: number = 0;
  private requestCount: number = 0;
  private totalCost: number = 0;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (apiKey) {
      this.client = new Anthropic({ apiKey });
      logger.info('LLM Sentiment Analyzer initialized with Claude API');
    } else {
      logger.warn('ANTHROPIC_API_KEY not set - LLM analyzer disabled');
    }
  }

  /**
   * Check if LLM analyzer is available
   */
  isAvailable(): boolean {
    return this.client !== null;
  }

  /**
   * Analyze sentiment using Claude API
   */
  async analyze(text: string): Promise<SentimentResult> {
    if (!this.client) {
      throw new Error('LLM analyzer not available - ANTHROPIC_API_KEY not set');
    }

    if (!text || text.trim().length === 0) {
      throw new Error('Text cannot be empty');
    }

    const startTime = Date.now();

    try {
      const prompt = this.buildPrompt(text);

      const response = await this.client.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 1024,
        temperature: 0.3, // Lower temperature for more consistent analysis
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      const analysisTime = Date.now() - startTime;

      // Calculate cost (approximate)
      const inputTokens = response.usage.input_tokens;
      const outputTokens = response.usage.output_tokens;
      const cost = this.calculateCost(inputTokens, outputTokens);

      this.requestCount++;
      this.totalCost += cost;
      this.costPerRequest = this.totalCost / this.requestCount;

      logger.info('LLM sentiment analysis complete', {
        analysisTimeMs: analysisTime,
        inputTokens,
        outputTokens,
        cost: `$${cost.toFixed(4)}`,
        avgCost: `$${this.costPerRequest.toFixed(4)}`
      });

      // Extract text content from response
      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Claude API');
      }

      // Parse JSON response
      const result = this.parseResponse(content.text);

      return result;

    } catch (error: any) {
      logger.error('LLM sentiment analysis failed:', error);
      throw new Error(`LLM analysis failed: ${error.message}`);
    }
  }

  /**
   * Build structured prompt for Claude
   */
  private buildPrompt(text: string): string {
    return `You are an expert sentiment analysis system. Analyze the following text and provide a comprehensive multi-dimensional sentiment analysis.

**Text to analyze:**
"${text}"

**Instructions:**
1. Detect all emotions present: joy, sadness, anger, fear, surprise, disgust
2. Determine overall sentiment polarity (-1 to +1, where -1 is very negative, 0 is neutral, +1 is very positive)
3. Assess intensity (0-1, how strong the sentiment is)
4. Identify if there are mixed emotions (conflicting sentiments)
5. Extract key positive, negative, and neutral keywords
6. Measure subjectivity (0 = objective, 1 = subjective)
7. Provide confidence score (0-1)

**Important:**
- Handle modern slang, internet speak, emojis, and evolving language
- Detect sarcasm, irony, and subtle nuances
- Consider context and cultural references
- Account for intensifiers (very, extremely) and diminishers (slightly, somewhat)
- Recognize negations and how they flip sentiment

Return your analysis as a JSON object with this exact structure:
{
  "overall": {
    "polarity": <number between -1 and 1>,
    "category": "<string: Very negative/Negative/Slightly negative/Neutral/Slightly positive/Positive/Very positive/Mixed emotions>",
    "confidence": <number between 0 and 1>
  },
  "emotions": [
    {
      "emotion": "<joy|sadness|anger|fear|surprise|disgust>",
      "score": <number between 0 and 1>,
      "intensity": "<low|medium|high>"
    }
  ],
  "intensity": <number between 0 and 1>,
  "mixed": <boolean>,
  "keywords": {
    "positive": [<array of strings>],
    "negative": [<array of strings>],
    "neutral": [<array of strings>]
  },
  "subjectivity": <number between 0 and 1>
}

Return ONLY the JSON object, no additional text.`;
  }

  /**
   * Parse Claude's JSON response
   */
  private parseResponse(responseText: string): SentimentResult {
    try {
      // Extract JSON from response (Claude might wrap it in markdown code blocks)
      let jsonText = responseText.trim();

      // Remove markdown code blocks if present
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.replace(/```json\n?/, '').replace(/\n?```$/, '');
      } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/```\n?/, '').replace(/\n?```$/, '');
      }

      const result = JSON.parse(jsonText);

      // Validate structure
      if (!result.overall || !result.emotions || !result.keywords) {
        throw new Error('Invalid response structure from Claude');
      }

      // Ensure emotions is sorted by score
      result.emotions.sort((a: any, b: any) => b.score - a.score);

      return result as SentimentResult;

    } catch (error: any) {
      logger.error('Failed to parse LLM response:', { error: error.message, responseText });
      throw new Error('Failed to parse LLM response');
    }
  }

  /**
   * Calculate API cost
   * Claude 3.5 Sonnet pricing (as of Oct 2024):
   * - Input: $3 per million tokens
   * - Output: $15 per million tokens
   */
  private calculateCost(inputTokens: number, outputTokens: number): number {
    const inputCost = (inputTokens / 1_000_000) * 3;
    const outputCost = (outputTokens / 1_000_000) * 15;
    return inputCost + outputCost;
  }

  /**
   * Get usage statistics
   */
  getStats() {
    return {
      requestCount: this.requestCount,
      totalCost: this.totalCost,
      averageCostPerRequest: this.costPerRequest,
      profitMargin: this.costPerRequest > 0 ? ((0.01 - this.costPerRequest) / 0.01) * 100 : 0
    };
  }
}
