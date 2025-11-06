import Anthropic from '@anthropic-ai/sdk';
import { logger } from '../../../utils/logger.js';

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
      logger.info('Text Summarizer initialized with Claude API');
    } else {
      logger.warn('ANTHROPIC_API_KEY not set - using mock responses');
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
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      // Track costs
      const cost = this.calculateCost(
        response.usage.input_tokens,
        response.usage.output_tokens
      );
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
            compressionRatio: Math.round(
              (1 - result.summary.length / originalLength) * 100
            ),
            readingTimeOriginal,
            readingTimeSummary,
          },
        },
        metadata: {
          style,
          length,
          processingTimeMs: Date.now() - startTime,
          model: 'claude-3-5-sonnet',
          tokensUsed:
            response.usage.input_tokens + response.usage.output_tokens,
          cost,
        },
      };
    } catch (error: any) {
      logger.error('Summarization failed:', error.message);
      throw new Error(`Summarization failed: ${error.message}`);
    }
  }

  private buildPrompt(request: SummarizationRequest): string {
    const { text, length, style, focus, extractKeyPoints, includeTags } =
      request;

    // Length specifications with word/sentence targets
    let lengthSpec = '';
    switch (length) {
      case 'brief':
        lengthSpec =
          style === 'bullets'
            ? '3-5 concise bullet points'
            : '2-3 sentences (40-60 words)';
        break;
      case 'medium':
        lengthSpec =
          style === 'bullets'
            ? '5-8 well-structured bullet points'
            : '1-2 paragraphs (100-150 words)';
        break;
      case 'detailed':
        lengthSpec =
          style === 'bullets'
            ? '8-12 comprehensive bullet points with sub-points'
            : '2-3 detailed paragraphs (200-300 words)';
        break;
    }

    // Build specialized prompt based on style
    let prompt = '';

    switch (style) {
      case 'bullets':
        prompt = `You are an expert information synthesizer. Create a ${lengthSpec} summary of the text below.

**INSTRUCTIONS:**
- Start each bullet with •
- Make each point self-contained and actionable
- Prioritize key facts, decisions, and insights
- Use parallel structure across bullets
- ${length === 'detailed' ? 'Include sub-bullets for important details' : 'Keep each bullet under 20 words'}
${focus ? `- FOCUS AREA: ${focus} (prioritize information related to this)` : ''}

**QUALITY CRITERIA:**
- Accuracy: Preserve core meaning without distortion
- Clarity: Use precise, unambiguous language
- Completeness: Cover all major themes
- Conciseness: No redundancy or filler`;
        break;

      case 'executive':
        prompt = `You are a C-suite executive assistant. Create an executive summary in this format:

**OVERVIEW:** (${length === 'brief' ? '1-2 sentences' : length === 'medium' ? '2-3 sentences' : '3-4 sentences'})
High-level synthesis answering: What is this about and why does it matter?

**KEY POINTS:** (${length === 'brief' ? '3 points' : length === 'medium' ? '4-5 points' : '5-7 points'})
Most critical information, decisions, or findings

${
  length !== 'brief'
    ? `**IMPLICATIONS:**
Strategic significance, next steps, or business impact
`
    : ''
}
${focus ? `**FOCUS:** Emphasize ${focus} throughout all sections.` : ''}

**TONE:** Professional, decisive, action-oriented
**AUDIENCE:** Senior leadership (assume domain knowledge)`;
        break;

      case 'paragraph':
      default:
        prompt = `You are a professional content synthesizer. Create a ${lengthSpec} summary that captures the essence of the text below.

**WRITING GUIDELINES:**
- Lead with the most important information (inverted pyramid)
- Use topic sentences to structure paragraphs
- Connect ideas with smooth transitions
- Maintain author's intent and tone
- Eliminate redundancy and filler
- ${length === 'detailed' ? 'Include supporting details and context' : 'Focus on core message only'}
${focus ? `\n**FOCUS AREA:** ${focus} - prioritize and expand on this aspect` : ''}

**QUALITY STANDARDS:**
- Accuracy: No misrepresentation of source material
- Coherence: Logical flow between ideas
- Completeness: All key themes addressed
- Conciseness: Every word earns its place`;
        break;
    }

    prompt += `\n\n**TEXT TO SUMMARIZE:**\n\n${text}\n\n`;

    // Add structured output requirements
    if (extractKeyPoints || includeTags) {
      prompt += '**AFTER YOUR SUMMARY, PROVIDE:**\n\n';
      if (extractKeyPoints) {
        prompt += `KEY POINTS:
- Extract the ${length === 'brief' ? '3' : length === 'medium' ? '4-5' : '5-7'} most critical takeaways
- Make each point specific and actionable
- Prioritize insights over obvious facts\n\n`;
      }
      if (includeTags) {
        prompt += `TAGS:
- Generate 5-7 precise topic tags
- Use specific terminology (not generic categories)
- Format: #technology #ai #business-strategy
- Include both industry and functional tags\n\n`;
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
      const keyPointsMatch = text.match(
        /KEY POINTS?:?\s*\n([\s\S]*?)(?=\n\nTAGS:|$)/i
      );
      if (keyPointsMatch) {
        summary = text.substring(0, text.indexOf('KEY POINTS')).trim();
        keyPoints = keyPointsMatch[1]
          .split('\n')
          .map((p) => p.replace(/^[-•*]\s*/, '').trim())
          .filter((p) => p.length > 0);
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
          .map((t) => t.replace(/^#/, '').trim())
          .filter((t) => t.length > 0)
          .map((t) => `#${t}`);
      }
    }

    return { summary, keyPoints, tags };
  }

  private getMockSummary(
    request: SummarizationRequest,
    startTime: number
  ): SummarizationResult {
    const mockSummary = `Mock summary of ${request.text.substring(0, 50)}... (API key not configured)`;

    return {
      success: true,
      summary: {
        text: mockSummary,
        keyPoints: request.extractKeyPoints
          ? ['Mock key point 1', 'Mock key point 2']
          : undefined,
        tags: request.includeTags ? ['#mock', '#test', '#demo'] : undefined,
        statistics: {
          originalLength: request.text.length,
          summaryLength: mockSummary.length,
          compressionRatio: 95,
          readingTimeOriginal: '1 min',
          readingTimeSummary: '5 sec',
        },
      },
      metadata: {
        style: request.style || 'paragraph',
        length: request.length || 'medium',
        processingTimeMs: Date.now() - startTime,
        model: 'mock',
        tokensUsed: 0,
        cost: 0,
      },
    };
  }

  private getMaxTokensForLength(length: string): number {
    switch (length) {
      case 'brief':
        return 256;
      case 'medium':
        return 512;
      case 'detailed':
        return 1024;
      default:
        return 512;
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
      averageCost:
        this.requestCount > 0 ? this.totalCost / this.requestCount : 0,
      priceUSDC: parseFloat(process.env.PRICE_USDC || '0.015'),
      profitPerRequest:
        parseFloat(process.env.PRICE_USDC || '0.015') -
        this.totalCost / Math.max(this.requestCount, 1),
    };
  }
}
