import Anthropic from '@anthropic-ai/sdk';

export interface SummarizationRequest {
  text: string;
  length?: 'brief' | 'medium' | 'detailed'; // Target summary length
  style?: 'bullets' | 'paragraph' | 'executive'; // Output format
  focus?: string; // Optional focus area (e.g., "technical details", "business impact")
  extractKeyPoints?: boolean; // Extract key takeaways
  includeTags?: boolean; // Add topic tags
}

export interface SummarizationResult {
  success: boolean;
  summary: {
    text: string;
    keyPoints?: string[];
    tags?: string[];
    statistics: {
      originalLength: number;
      summaryLength: number;
      compressionRatio: number;
      readingTimeOriginal: string;
      readingTimeSummary: string;
    };
  };
  metadata: {
    style: string;
    length: string;
    processingTimeMs: number;
    model: string;
    tokensUsed: number;
    cost: number;
  };
}

export class TextSummarizer {
  private client: Anthropic | null = null;
  private requestCount: number = 0;
  private totalCost: number = 0;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (apiKey) {
      this.client = new Anthropic({ apiKey });
      console.log('✓ Text Summarizer initialized with Claude API');
    } else {
      console.warn('⚠ ANTHROPIC_API_KEY not set - using mock responses');
    }
  }

  async summarize(request: SummarizationRequest): Promise<SummarizationResult> {
    const startTime = Date.now();
    const length = request.length || 'medium';
    const style = request.style || 'paragraph';

    // Calculate original text statistics
    const originalLength = request.text.length;
    const originalWords = request.text.split(/\s+/).length;
    const readingTimeOriginal = this.calculateReadingTime(originalWords);

    // If no API key, return mock
    if (!this.client) {
      return this.getMockSummary(request, startTime);
    }

    try {
      // Build sophisticated prompt
      const prompt = this.buildPrompt(request);

      // Call Claude API
      const response = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: this.getMaxTokensForLength(length),
        temperature: 0.3, // Lower temperature for more focused summaries
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      // Track costs
      const cost = this.calculateCost(response.usage.input_tokens, response.usage.output_tokens);
      this.totalCost += cost;
      this.requestCount++;

      // Parse response
      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type');
      }

      const result = this.parseResponse(content.text, request);
      const summaryWords = result.summary.split(/\s+/).length;
      const readingTimeSummary = this.calculateReadingTime(summaryWords);

      return {
        success: true,
        summary: {
          text: result.summary,
          keyPoints: result.keyPoints,
          tags: result.tags,
          statistics: {
            originalLength,
            summaryLength: result.summary.length,
            compressionRatio: Math.round((1 - result.summary.length / originalLength) * 100),
            readingTimeOriginal,
            readingTimeSummary
          }
        },
        metadata: {
          style,
          length,
          processingTimeMs: Date.now() - startTime,
          model: 'claude-3-5-sonnet',
          tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
          cost
        }
      };
    } catch (error: any) {
      console.error('Summarization failed:', error.message);
      throw new Error(`Summarization failed: ${error.message}`);
    }
  }

  private buildPrompt(request: SummarizationRequest): string {
    const { text, length, style, focus, extractKeyPoints, includeTags } = request;

    let lengthGuidance = '';
    switch (length) {
      case 'brief':
        lengthGuidance = 'very concise (2-3 sentences or 3-5 bullet points)';
        break;
      case 'medium':
        lengthGuidance = 'moderate length (1-2 paragraphs or 5-8 bullet points)';
        break;
      case 'detailed':
        lengthGuidance = 'comprehensive (2-3 paragraphs or 8-12 bullet points)';
        break;
    }

    let styleGuidance = '';
    switch (style) {
      case 'bullets':
        styleGuidance = 'Format as bullet points, each starting with •';
        break;
      case 'paragraph':
        styleGuidance = 'Write in flowing paragraph form';
        break;
      case 'executive':
        styleGuidance = 'Write in executive summary style with sections: Overview, Key Points, Implications';
        break;
    }

    let prompt = `Summarize the following text in a ${lengthGuidance} summary.\n\n${styleGuidance}\n\n`;

    if (focus) {
      prompt += `Focus on: ${focus}\n\n`;
    }

    prompt += `Text to summarize:\n\n${text}\n\n`;

    if (extractKeyPoints || includeTags) {
      prompt += '\nAfter the summary, provide:\n';
      if (extractKeyPoints) {
        prompt += '- KEY POINTS: List the 3-5 most important takeaways\n';
      }
      if (includeTags) {
        prompt += '- TAGS: 5-7 topic tags (e.g., #technology, #business)\n';
      }
    }

    return prompt;
  }

  private parseResponse(text: string, request: SummarizationRequest): any {
    // Extract summary (everything before KEY POINTS or TAGS)
    let summary = text;
    let keyPoints: string[] | undefined;
    let tags: string[] | undefined;

    // Extract key points if requested
    if (request.extractKeyPoints) {
      const keyPointsMatch = text.match(/KEY POINTS?:?\s*\n([\s\S]*?)(?=\n\nTAGS:|$)/i);
      if (keyPointsMatch) {
        summary = text.substring(0, text.indexOf('KEY POINTS')).trim();
        keyPoints = keyPointsMatch[1]
          .split('\n')
          .map(p => p.replace(/^[-•*]\s*/, '').trim())
          .filter(p => p.length > 0);
      }
    }

    // Extract tags if requested
    if (request.includeTags) {
      const tagsMatch = text.match(/TAGS?:?\s*\n?(.*)/i);
      if (tagsMatch) {
        if (!summary.includes('KEY POINTS')) {
          summary = text.substring(0, text.indexOf('TAGS')).trim();
        }
        tags = tagsMatch[1]
          .split(/[,\s]+/)
          .map(t => t.replace(/^#/, '').trim())
          .filter(t => t.length > 0)
          .map(t => `#${t}`);
      }
    }

    return { summary, keyPoints, tags };
  }

  private getMockSummary(request: SummarizationRequest, startTime: number): SummarizationResult {
    const mockSummary = `Mock summary of ${request.text.substring(0, 50)}... (API key not configured)`;

    return {
      success: true,
      summary: {
        text: mockSummary,
        keyPoints: request.extractKeyPoints ? ['Mock key point 1', 'Mock key point 2'] : undefined,
        tags: request.includeTags ? ['#mock', '#test', '#demo'] : undefined,
        statistics: {
          originalLength: request.text.length,
          summaryLength: mockSummary.length,
          compressionRatio: 95,
          readingTimeOriginal: '1 min',
          readingTimeSummary: '5 sec'
        }
      },
      metadata: {
        style: request.style || 'paragraph',
        length: request.length || 'medium',
        processingTimeMs: Date.now() - startTime,
        model: 'mock',
        tokensUsed: 0,
        cost: 0
      }
    };
  }

  private getMaxTokensForLength(length: string): number {
    switch (length) {
      case 'brief': return 256;
      case 'medium': return 512;
      case 'detailed': return 1024;
      default: return 512;
    }
  }

  private calculateReadingTime(words: number): string {
    const minutes = Math.ceil(words / 200); // Average reading speed
    return minutes === 1 ? '1 min' : `${minutes} min`;
  }

  private calculateCost(inputTokens: number, outputTokens: number): number {
    // Claude 3.5 Sonnet pricing
    const inputCost = (inputTokens / 1_000_000) * 3;
    const outputCost = (outputTokens / 1_000_000) * 15;
    return inputCost + outputCost;
  }

  isAvailable(): boolean {
    return this.client !== null;
  }

  getStats() {
    return {
      requestCount: this.requestCount,
      totalCost: this.totalCost,
      averageCost: this.requestCount > 0 ? this.totalCost / this.requestCount : 0,
      priceUSDC: parseFloat(process.env.PRICE_USDC || '0.015'),
      profitPerRequest: parseFloat(process.env.PRICE_USDC || '0.015') - (this.totalCost / Math.max(this.requestCount, 1))
    };
  }
}
