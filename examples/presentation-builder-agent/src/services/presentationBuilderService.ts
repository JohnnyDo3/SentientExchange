import { logger } from '../middleware/logger';

export interface PresentationSlide {
  type: 'title' | 'content' | 'data' | 'conclusion';
  heading?: string;
  content?: string;
  data?: any;
}

export interface PresentationRequest {
  title: string;
  slides: PresentationSlide[];
  theme?: 'professional' | 'modern' | 'minimal';
  includeCharts?: boolean;
}

export interface PresentationResult {
  slides: Array<{
    slideNumber: number;
    type: string;
    heading: string;
    content: string;
    visualElements?: any[];
  }>;
  metadata: {
    totalSlides: number;
    theme: string;
    generatedAt: string;
  };
  downloadFormats: {
    pdf: string;
    pptx: string;
    html: string;
  };
  servicesUsed: string[];
}

export class PresentationBuilderService {
  async buildPresentation(request: PresentationRequest): Promise<PresentationResult> {
    try {
      logger.info('Building presentation:', {
        title: request.title,
        slidesCount: request.slides.length,
        theme: request.theme,
      });

      // In production: This agent would discover and use data-visualization, copywriter, and pdf-generator services
      const processedSlides = this.processSlides(request);
      const metadata = this.generateMetadata(request);
      const downloadFormats = this.prepareDownloadFormats(request.title);

      const result: PresentationResult = {
        slides: processedSlides,
        metadata,
        downloadFormats,
        servicesUsed: [
          'chart-generator',
          'copywriter',
          'pdf-generator',
          'image-optimizer',
        ],
      };

      logger.info('Presentation built successfully:', {
        totalSlides: processedSlides.length,
      });

      return result;
    } catch (error: any) {
      logger.error('Failed to build presentation:', error);
      throw new Error(`Failed to build presentation: ${error.message}`);
    }
  }

  private processSlides(request: PresentationRequest): PresentationResult['slides'] {
    return request.slides.map((slide, index) => {
      const slideNumber = index + 1;

      switch (slide.type) {
        case 'title':
          return this.createTitleSlide(slideNumber, request.title, slide);
        case 'content':
          return this.createContentSlide(slideNumber, slide);
        case 'data':
          return this.createDataSlide(slideNumber, slide, request.includeCharts);
        case 'conclusion':
          return this.createConclusionSlide(slideNumber, slide);
        default:
          return this.createGenericSlide(slideNumber, slide);
      }
    });
  }

  private createTitleSlide(slideNumber: number, title: string, slide: any): any {
    return {
      slideNumber,
      type: 'title',
      heading: title,
      content: slide.content || 'Investor Pitch Deck',
      visualElements: [
        { type: 'logo', position: 'center' },
        { type: 'background', style: 'gradient' },
      ],
    };
  }

  private createContentSlide(slideNumber: number, slide: any): any {
    return {
      slideNumber,
      type: 'content',
      heading: slide.heading || `Slide ${slideNumber}`,
      content: slide.content || 'Content goes here',
      visualElements: [
        { type: 'bullet-points', style: 'modern' },
      ],
    };
  }

  private createDataSlide(slideNumber: number, slide: any, includeCharts?: boolean): any {
    const visualElements: any[] = [];

    if (includeCharts && slide.data) {
      // In production: Call chart-generator service here
      visualElements.push({
        type: 'chart',
        chartType: this.determineChartType(slide.data),
        data: slide.data,
      });
    }

    visualElements.push({
      type: 'data-table',
      data: slide.data,
    });

    return {
      slideNumber,
      type: 'data',
      heading: slide.heading || 'Data & Metrics',
      content: this.summarizeData(slide.data),
      visualElements,
    };
  }

  private createConclusionSlide(slideNumber: number, slide: any): any {
    return {
      slideNumber,
      type: 'conclusion',
      heading: slide.heading || 'Next Steps',
      content: slide.content || 'Ready to transform your business?',
      visualElements: [
        { type: 'cta-button', text: 'Get Started' },
        { type: 'contact-info' },
      ],
    };
  }

  private createGenericSlide(slideNumber: number, slide: any): any {
    return {
      slideNumber,
      type: 'generic',
      heading: slide.heading || `Slide ${slideNumber}`,
      content: slide.content || '',
      visualElements: [],
    };
  }

  private determineChartType(data: any): string {
    if (data?.marketShare || data?.shares) return 'pie';
    if (data?.timeline || data?.trends) return 'line';
    if (data?.comparison || data?.metrics) return 'bar';
    return 'bar';
  }

  private summarizeData(data: any): string {
    if (!data) return 'No data available';

    if (typeof data === 'object') {
      const keys = Object.keys(data);
      return `Data includes ${keys.length} key metrics: ${keys.slice(0, 3).join(', ')}${keys.length > 3 ? ', and more' : ''}`;
    }

    return 'Data visualization';
  }

  private generateMetadata(request: PresentationRequest): PresentationResult['metadata'] {
    return {
      totalSlides: request.slides.length,
      theme: request.theme || 'professional',
      generatedAt: new Date().toISOString(),
    };
  }

  private prepareDownloadFormats(title: string): PresentationResult['downloadFormats'] {
    const sanitizedTitle = title.replace(/[^a-z0-9]/gi, '-').toLowerCase();

    return {
      pdf: `/downloads/${sanitizedTitle}.pdf`,
      pptx: `/downloads/${sanitizedTitle}.pptx`,
      html: `/preview/${sanitizedTitle}.html`,
    };
  }

  /**
   * Generate a complete investor pitch deck
   */
  async generateInvestorPitchDeck(companyData: any): Promise<PresentationResult> {
    const pitchDeckSlides: PresentationSlide[] = [
      { type: 'title' as const, content: companyData.tagline },
      { type: 'content' as const, heading: 'Problem', content: companyData.problem },
      { type: 'content' as const, heading: 'Solution', content: companyData.solution },
      { type: 'data' as const, heading: 'Market Opportunity', data: companyData.marketData },
      { type: 'content' as const, heading: 'Product', content: companyData.productDescription },
      { type: 'data' as const, heading: 'Business Model', data: companyData.pricingData },
      { type: 'data' as const, heading: 'Traction', data: companyData.tractionMetrics },
      { type: 'content' as const, heading: 'Competitive Advantage', content: companyData.advantages },
      { type: 'data' as const, heading: 'Go-to-Market Strategy', data: companyData.channelStrategy },
      { type: 'data' as const, heading: 'Financial Projections', data: companyData.financials },
      { type: 'content' as const, heading: 'Team', content: companyData.teamInfo },
      { type: 'conclusion' as const, heading: 'The Ask', content: companyData.fundingRequest },
    ];

    return this.buildPresentation({
      title: companyData.companyName || 'Investor Pitch Deck',
      slides: pitchDeckSlides,
      theme: 'professional',
      includeCharts: true,
    });
  }
}
