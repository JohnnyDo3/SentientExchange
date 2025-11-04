import Anthropic from '@anthropic-ai/sdk';

export interface ImageAnalysisRequest {
  image: string; // Base64-encoded image or URL
  analysisType?: 'full' | 'objects' | 'text' | 'faces' | 'description';
  detailLevel?: 'basic' | 'detailed';
}

export interface ImageAnalysisResult {
  success: boolean;
  analysis: {
    description: string;
    objects?: string[];
    text?: string;
    faces?: number;
    colors?: string[];
    quality?: string;
    dimensions?: { width: number; height: number };
  };
  metadata: {
    analysisType: string;
    detailLevel: string;
    processingTimeMs: number;
    model: string;
    cost: number;
  };
}

export class ImageAnalyzer {
  private client: Anthropic | null = null;
  private costPerRequest: number = 0;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (apiKey) {
      this.client = new Anthropic({ apiKey });
      console.log('✓ Image Analyzer initialized with Claude Vision API');
    } else {
      console.warn('⚠ ANTHROPIC_API_KEY not set - using mock responses');
    }
  }

  async analyze(request: ImageAnalysisRequest): Promise<ImageAnalysisResult> {
    const startTime = Date.now();
    const analysisType = request.analysisType || 'full';
    const detailLevel = request.detailLevel || 'detailed';

    // If no API key, return mock response
    if (!this.client) {
      return this.getMockAnalysis(analysisType, startTime);
    }

    try {
      // Build prompt based on analysis type
      const prompt = this.buildPrompt(analysisType, detailLevel);

      // Call Claude Vision API
      const response = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: this.detectMediaType(request.image),
                  data: this.extractBase64(request.image),
                },
              },
              {
                type: 'text',
                text: prompt,
              },
            ],
          },
        ],
      });

      // Calculate cost (approximate)
      const inputTokens = response.usage.input_tokens;
      const outputTokens = response.usage.output_tokens;
      const cost = this.calculateCost(inputTokens, outputTokens);
      this.costPerRequest = cost;

      // Parse response
      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type');
      }

      const analysis = this.parseAnalysis(content.text, analysisType);

      return {
        success: true,
        analysis,
        metadata: {
          analysisType,
          detailLevel,
          processingTimeMs: Date.now() - startTime,
          model: 'claude-3-5-sonnet (vision)',
          cost,
        },
      };
    } catch (error: any) {
      console.error('Image analysis failed:', error.message);
      throw new Error(`Image analysis failed: ${error.message}`);
    }
  }

  private buildPrompt(analysisType: string, detailLevel: string): string {
    const basePrompt = 'Analyze this image';

    switch (analysisType) {
      case 'objects':
        return `${basePrompt} and list all objects you can identify. Be specific and comprehensive.`;
      case 'text':
        return `${basePrompt} and extract all visible text. Preserve formatting and structure.`;
      case 'faces':
        return `${basePrompt} and count how many faces are visible. Describe their expressions and demographics if ${detailLevel === 'detailed' ? 'requested' : 'basic'}.`;
      case 'description':
        return `${basePrompt} and provide a ${detailLevel} description of what you see. Include composition, mood, and notable elements.`;
      case 'full':
      default:
        return `${basePrompt} comprehensively. Provide:
1. Overall description
2. List of objects/subjects
3. Any visible text
4. Number of people/faces
5. Color palette
6. Image quality assessment
7. Notable features or patterns

Be ${detailLevel === 'detailed' ? 'thorough and specific' : 'concise but informative'}.`;
    }
  }

  private parseAnalysis(text: string, analysisType: string): any {
    // Simple parsing - in production, could use structured output
    const analysis: any = {
      description: text,
    };

    // Extract structured data if possible
    if (analysisType === 'full') {
      // Try to extract objects
      const objectsMatch = text.match(/objects?[:\s]+([^\n]+)/i);
      if (objectsMatch) {
        analysis.objects = objectsMatch[1].split(',').map((s) => s.trim());
      }

      // Try to extract text
      const textMatch = text.match(/text[:\s]+"([^"]+)"/i);
      if (textMatch) {
        analysis.text = textMatch[1];
      }

      // Try to extract face count
      const facesMatch = text.match(/(\d+)\s+(face|person|people)/i);
      if (facesMatch) {
        analysis.faces = parseInt(facesMatch[1]);
      }

      // Try to extract colors
      const colorsMatch = text.match(/colors?[:\s]+([^\n]+)/i);
      if (colorsMatch) {
        analysis.colors = colorsMatch[1].split(',').map((s) => s.trim());
      }
    }

    return analysis;
  }

  private getMockAnalysis(analysisType: string, startTime: number): ImageAnalysisResult {
    return {
      success: true,
      analysis: {
        description: `Mock analysis (ANTHROPIC_API_KEY not configured). Analysis type: ${analysisType}`,
        objects: ['placeholder object'],
        text: 'Mock text extraction',
        faces: 0,
        colors: ['#CCCCCC'],
        quality: 'unknown',
      },
      metadata: {
        analysisType,
        detailLevel: 'basic',
        processingTimeMs: Date.now() - startTime,
        model: 'mock',
        cost: 0,
      },
    };
  }

  private detectMediaType(image: string): 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' {
    if (image.startsWith('data:')) {
      const match = image.match(/data:([^;]+);/);
      if (match) {
        return match[1] as any;
      }
    }
    // Default to JPEG
    return 'image/jpeg';
  }

  private extractBase64(image: string): string {
    if (image.startsWith('data:')) {
      // Remove data URI prefix
      return image.split(',')[1];
    }
    return image;
  }

  private calculateCost(inputTokens: number, outputTokens: number): number {
    // Claude 3.5 Sonnet pricing (as of 2024)
    // Input: $3 per million tokens
    // Output: $15 per million tokens
    const inputCost = (inputTokens / 1_000_000) * 3;
    const outputCost = (outputTokens / 1_000_000) * 15;
    return inputCost + outputCost;
  }

  isAvailable(): boolean {
    return this.client !== null;
  }

  getCostStats() {
    return {
      lastRequestCost: this.costPerRequest,
      priceUSDC: parseFloat(process.env.PRICE_USDC || '0.02'),
      profitMargin: parseFloat(process.env.PRICE_USDC || '0.02') - this.costPerRequest,
    };
  }
}
