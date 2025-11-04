import Anthropic from '@anthropic-ai/sdk';
import { logger } from '../middleware/logger';

export interface TrendForecastRequest {
  industry: string;
  timeframe: '1-year' | '2-year' | '5-year';
  factors?: string[];
}

export interface TrendForecast {
  industry: string;
  timeframe: string;
  trends: Array<{
    trend: string;
    likelihood: 'high' | 'medium' | 'low';
    impact: 'high' | 'medium' | 'low';
    timeToRealization: string;
    description: string;
  }>;
  marketDrivers: string[];
  risks: string[];
  opportunities: string[];
  confidence: number;
}

export class TrendForecasterService {
  private client: Anthropic | null = null;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (apiKey) {
      this.client = new Anthropic({ apiKey });
      logger.info('Trend Forecaster initialized with Claude API');
    } else {
      logger.warn('ANTHROPIC_API_KEY not set - using mock forecasts');
    }
  }

  async forecastTrends(request: TrendForecastRequest): Promise<TrendForecast> {
    try {
      logger.info('Forecasting trends:', request);

      if (!this.client) {
        // Return mock forecast if no API key
        return this.getMockForecast(request);
      }

      const prompt = this.buildPrompt(request);

      const response = await this.client.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 2048,
        temperature: 0.7,
        messages: [{
          role: 'user',
          content: prompt,
        }],
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Claude API');
      }

      const forecast = this.parseResponse(content.text, request);

      logger.info('Trend forecast complete:', {
        industry: request.industry,
        trendsCount: forecast.trends.length,
      });

      return forecast;
    } catch (error: any) {
      logger.error('Failed to forecast trends:', error);
      throw new Error(`Failed to forecast trends: ${error.message}`);
    }
  }

  private buildPrompt(request: TrendForecastRequest): string {
    const factorsText = request.factors?.length
      ? `\n\nConsider these specific factors:\n${request.factors.map(f => `- ${f}`).join('\n')}`
      : '';

    return `You are an expert market analyst specializing in technology trends. Analyze the **${request.industry}** industry and forecast trends for the next ${request.timeframe}.${factorsText}

Provide a comprehensive forecast including:
1. Major trends (with likelihood and impact assessment)
2. Key market drivers
3. Potential risks
4. Emerging opportunities

Return your analysis as a JSON object with this structure:
{
  "trends": [
    {
      "trend": "Name of trend",
      "likelihood": "high|medium|low",
      "impact": "high|medium|low",
      "timeToRealization": "timeframe description",
      "description": "detailed description"
    }
  ],
  "marketDrivers": ["driver 1", "driver 2", ...],
  "risks": ["risk 1", "risk 2", ...],
  "opportunities": ["opportunity 1", "opportunity 2", ...],
  "confidence": 0.85
}

Be specific, data-driven, and realistic. Return ONLY the JSON object, no additional text.`;
  }

  private parseResponse(responseText: string, request: TrendForecastRequest): TrendForecast {
    try {
      let jsonText = responseText.trim();

      // Remove markdown code blocks if present
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.replace(/```json\n?/, '').replace(/\n?```$/, '');
      } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/```\n?/, '').replace(/\n?```$/, '');
      }

      const parsed = JSON.parse(jsonText);

      return {
        industry: request.industry,
        timeframe: request.timeframe,
        trends: parsed.trends || [],
        marketDrivers: parsed.marketDrivers || [],
        risks: parsed.risks || [],
        opportunities: parsed.opportunities || [],
        confidence: parsed.confidence || 0.75,
      };
    } catch (error: any) {
      logger.error('Failed to parse forecast response:', {
        error: error.message,
        responseText,
      });
      throw new Error('Failed to parse forecast response');
    }
  }

  private getMockForecast(request: TrendForecastRequest): TrendForecast {
    return {
      industry: request.industry,
      timeframe: request.timeframe,
      trends: [
        {
          trend: 'AI-native development workflows',
          likelihood: 'high',
          impact: 'high',
          timeToRealization: '6-12 months',
          description: 'Developer tools will increasingly use AI for code generation, testing, and deployment',
        },
        {
          trend: 'Autonomous AI agents',
          likelihood: 'high',
          impact: 'high',
          timeToRealization: '12-18 months',
          description: 'AI systems that can complete multi-step tasks autonomously with minimal human intervention',
        },
        {
          trend: 'Multimodal AI systems',
          likelihood: 'medium',
          impact: 'high',
          timeToRealization: '18-24 months',
          description: 'Integration of text, image, video, and audio capabilities in single models',
        },
      ],
      marketDrivers: [
        'Enterprise AI adoption accelerating',
        'Developer productivity demands increasing',
        'Cost of AI infrastructure decreasing',
      ],
      risks: [
        'Regulatory uncertainty',
        'Data privacy concerns',
        'Model hallucination issues',
      ],
      opportunities: [
        'New AI-native SaaS categories emerging',
        'Enterprise customization demand growing',
        'Edge AI deployment expanding',
      ],
      confidence: 0.75,
    };
  }
}
