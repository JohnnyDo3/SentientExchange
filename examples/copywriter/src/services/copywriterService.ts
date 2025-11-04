import Anthropic from '@anthropic-ai/sdk';
import { logger } from '../middleware/logger';

export interface CopywritingRequest {
  type: 'landing-page' | 'product-description' | 'email' | 'ad-copy' | 'blog-post';
  product: string;
  targetAudience?: string;
  tone?: 'professional' | 'casual' | 'technical' | 'persuasive';
  length?: 'short' | 'medium' | 'long';
}

export interface CopywritingResult {
  headline: string;
  body: string;
  cta: string;
  keywords: string[];
  tone: string;
}

export class CopywriterService {
  private client: Anthropic | null = null;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (apiKey) {
      this.client = new Anthropic({ apiKey });
      logger.info('Copywriter initialized with Claude API');
    } else {
      logger.warn('ANTHROPIC_API_KEY not set - using mock copy');
    }
  }

  async generateCopy(request: CopywritingRequest): Promise<CopywritingResult> {
    try {
      logger.info('Generating copy:', request);

      if (!this.client) {
        return this.getMockCopy(request);
      }

      const prompt = `You are an expert copywriter. Write ${request.type} copy for: ${request.product}

Target audience: ${request.targetAudience || 'general'}
Tone: ${request.tone || 'professional'}
Length: ${request.length || 'medium'}

Return JSON:
{
  "headline": "compelling headline",
  "body": "full copy text",
  "cta": "call to action",
  "keywords": ["keyword1", "keyword2"],
  "tone": "${request.tone || 'professional'}"
}

Return ONLY the JSON object.`;

      const response = await this.client.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 1500,
        temperature: 0.8,
        messages: [{ role: 'user', content: prompt }],
      });

      const content = response.content[0];
      if (content.type !== 'text') throw new Error('Unexpected response');

      let jsonText = content.text.trim();
      if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/```json\n?/, '').replace(/\n?```$/, '');
      }

      return JSON.parse(jsonText);
    } catch (error: any) {
      logger.error('Failed to generate copy:', error);
      throw new Error(`Failed to generate copy: ${error.message}`);
    }
  }

  private getMockCopy(request: CopywritingRequest): CopywritingResult {
    return {
      headline: `Transform Your Workflow with ${request.product}`,
      body: `Discover the power of ${request.product} - the tool that helps you work smarter, not harder. Built for ${request.targetAudience || 'modern teams'}, our solution delivers results that matter.`,
      cta: 'Start Your Free Trial Today',
      keywords: ['productivity', 'innovation', 'efficiency', 'growth'],
      tone: request.tone || 'professional',
    };
  }
}
