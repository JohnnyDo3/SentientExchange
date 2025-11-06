import Anthropic from '@anthropic-ai/sdk';
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
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
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
        avgCost: `$${this.costPerRequest.toFixed(4)}`,
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
    return `You are a state-of-the-art sentiment analysis system with PhD-level expertise in natural language understanding, psychology, and computational linguistics.

**TEXT TO ANALYZE:**
"${text}"

**YOUR TASK:**
Perform comprehensive multi-dimensional sentiment analysis using advanced psycholinguistic models.

**ANALYSIS FRAMEWORK:**

1. **EMOTIONAL DETECTION (Plutchik's Wheel)**
   - Primary emotions: joy, trust, fear, surprise, sadness, disgust, anger, anticipation
   - Detect intensity levels for each emotion
   - Identify emotion blending (e.g., joy + trust = love)

2. **SENTIMENT POLARITY** (-1.0 to +1.0)
   - Very Negative: -1.0 to -0.6
   - Negative: -0.6 to -0.3
   - Slightly Negative: -0.3 to -0.1
   - Neutral: -0.1 to +0.1
   - Slightly Positive: +0.1 to +0.3
   - Positive: +0.3 to +0.6
   - Very Positive: +0.6 to +1.0
   - Calculate precise decimal value based on emotional aggregate

3. **LINGUISTIC ANALYSIS**
   - Modern slang, gen-z speak, internet culture (fr, no cap, bussin, etc.)
   - Emojis and emoticons (decode semantic meaning)
   - Regional dialects and AAVE
   - Technical jargon and domain-specific language
   - ALL CAPS (intensity marker)
   - Repeated letters (excitement/emphasis)

4. **ADVANCED DETECTION**
   - **Sarcasm & Irony**: Context-based inference (e.g., "Great, another meeting" = negative despite "great")
   - **Negation Handling**: "not bad" ≠ "good", "not good" ≠ "bad"
   - **Double Negatives**: "can't complain" = slightly positive
   - **Intensifiers**: very, extremely, absolutely, totally → amplify sentiment
   - **Diminishers**: somewhat, slightly, kind of, a bit → reduce sentiment
   - **Temporal Shifts**: "used to love" vs "love" (past vs present sentiment)

5. **CONTEXTUAL FACTORS**
   - Cultural references and memes
   - Rhetorical questions (often sarcastic)
   - Hyperbole vs literal meaning
   - Passive-aggressive undertones
   - Backhanded compliments

6. **MIXED SENTIMENT DETECTION**
   - Identify contradictory emotions (e.g., "I'm happy but also sad")
   - Bittersweet, ambivalent, or conflicted expressions
   - Set mixed=true if polarity uncertainty > 0.3

7. **SUBJECTIVITY ASSESSMENT** (0.0 to 1.0)
   - 0.0-0.3: Objective (facts, data, neutral reporting)
   - 0.4-0.6: Semi-subjective (opinions with facts)
   - 0.7-1.0: Highly subjective (personal feelings, opinions, beliefs)

8. **KEYWORD EXTRACTION**
   - Positive keywords: terms contributing to positive sentiment
   - Negative keywords: terms contributing to negative sentiment
   - Neutral keywords: factual/descriptive terms without sentiment
   - Extract 3-7 most impactful terms per category

9. **CONFIDENCE SCORING** (0.0 to 1.0)
   - High confidence (0.8-1.0): Clear, unambiguous sentiment
   - Medium confidence (0.5-0.7): Some ambiguity or mixed signals
   - Low confidence (0.0-0.4): Highly ambiguous, ironic, or context-dependent

**OUTPUT FORMAT:**
Return a JSON object with this EXACT structure (no markdown, no explanation, just valid JSON):

{
  "overall": {
    "polarity": <precise decimal -1 to +1>,
    "category": "<Very negative|Negative|Slightly negative|Neutral|Slightly positive|Positive|Very positive>",
    "confidence": <decimal 0 to 1>
  },
  "emotions": [
    {
      "emotion": "<joy|trust|fear|surprise|sadness|disgust|anger|anticipation>",
      "score": <decimal 0 to 1>,
      "intensity": "<low|medium|high>"
    }
  ],
  "intensity": <decimal 0 to 1>,
  "mixed": <boolean>,
  "keywords": {
    "positive": [<array of impactful positive terms>],
    "negative": [<array of impactful negative terms>],
    "neutral": [<array of neutral descriptive terms>]
  },
  "subjectivity": <decimal 0 to 1>
}`;
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
      logger.error('Failed to parse LLM response:', {
        error: error.message,
        responseText,
      });
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
      profitMargin:
        this.costPerRequest > 0
          ? ((0.01 - this.costPerRequest) / 0.01) * 100
          : 0,
    };
  }
}
