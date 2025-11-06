import { Service } from '../../../src/types/service';
import { v4 as uuidv4 } from 'uuid';

/**
 * Factory for creating realistic Service objects for testing
 */
export class ServiceFactory {
  /**
   * Create a basic service with default values
   */
  static create(overrides: Partial<Service> = {}): Service {
    const now = new Date().toISOString();
    const id = overrides.id || uuidv4();

    const defaults: Service = {
      id,
      name: 'Test Service',
      description: 'A test service for automated testing',
      provider: '0x1234567890123456789012345678901234567890',
      endpoint: `https://api.example.com/service/${id}`,
      capabilities: ['test-capability'],
      pricing: {
        perRequest: '$0.10',
        amount: '0.10',
        currency: 'USDC',
        network: 'base-sepolia',
        billingModel: 'per-request',
      },
      reputation: {
        totalJobs: 100,
        successRate: 95.5,
        avgResponseTime: '2.5s',
        rating: 4.5,
        reviews: 50,
      },
      metadata: {
        apiVersion: 'v1',
        rateLimit: '100/min',
        maxPayload: '10MB',
        walletAddress: '0x1234567890123456789012345678901234567890',
        paymentAddresses: {
          'base-sepolia': '0x1234567890123456789012345678901234567890',
        },
        image: '🤖',
        color: '#3B82F6',
      },
      createdAt: now,
      updatedAt: now,
    };

    return { ...defaults, ...overrides };
  }

  /**
   * Create an image analysis service
   */
  static createImageAnalyzer(overrides: Partial<Service> = {}): Service {
    return ServiceFactory.create({
      name: 'Image Analyzer Pro',
      description: 'Advanced AI-powered image analysis and OCR',
      capabilities: ['image-analysis', 'ocr', 'object-detection'],
      pricing: {
        perRequest: '$0.05',
        amount: '0.05',
        currency: 'USDC',
        network: 'base-sepolia',
        billingModel: 'per-request',
      },
      metadata: {
        apiVersion: 'v1',
        rateLimit: '50/min',
        maxPayload: '20MB',
        image: '📷',
        color: '#8B5CF6',
      },
      ...overrides,
    });
  }

  /**
   * Create a sentiment analysis service
   */
  static createSentimentAnalyzer(overrides: Partial<Service> = {}): Service {
    return ServiceFactory.create({
      name: 'Sentiment Analyzer',
      description: 'Real-time sentiment analysis for text content',
      capabilities: ['sentiment-analysis', 'text-processing', 'nlp'],
      pricing: {
        perRequest: '$0.02',
        amount: '0.02',
        currency: 'USDC',
        network: 'base-sepolia',
        billingModel: 'per-request',
      },
      metadata: {
        apiVersion: 'v1',
        rateLimit: '200/min',
        maxPayload: '5MB',
        image: '💭',
        color: '#10B981',
      },
      ...overrides,
    });
  }

  /**
   * Create a text summarization service
   */
  static createTextSummarizer(overrides: Partial<Service> = {}): Service {
    return ServiceFactory.create({
      name: 'Text Summarizer',
      description: 'Intelligent text summarization with AI',
      capabilities: ['summarization', 'text-processing', 'nlp'],
      pricing: {
        perRequest: '$0.03',
        amount: '0.03',
        currency: 'USDC',
        network: 'base-sepolia',
        billingModel: 'per-request',
      },
      metadata: {
        apiVersion: 'v1',
        rateLimit: '150/min',
        maxPayload: '15MB',
        image: '📝',
        color: '#F59E0B',
      },
      ...overrides,
    });
  }

  /**
   * Create a high-rated premium service
   */
  static createPremiumService(overrides: Partial<Service> = {}): Service {
    return ServiceFactory.create({
      name: 'Premium AI Service',
      description: 'Top-rated premium AI service',
      pricing: {
        perRequest: '$0.50',
        amount: '0.50',
        currency: 'USDC',
        network: 'base-sepolia',
        billingModel: 'per-request',
      },
      reputation: {
        totalJobs: 10000,
        successRate: 99.9,
        avgResponseTime: '0.5s',
        rating: 5.0,
        reviews: 500,
      },
      ...overrides,
    });
  }

  /**
   * Create a new service with zero reputation
   */
  static createNewService(overrides: Partial<Service> = {}): Service {
    return ServiceFactory.create({
      name: 'Brand New Service',
      description: 'Newly launched service',
      reputation: {
        totalJobs: 0,
        successRate: 0,
        avgResponseTime: 'N/A',
        rating: 0,
        reviews: 0,
      },
      ...overrides,
    });
  }

  /**
   * Create a cheap service (low price)
   */
  static createCheapService(overrides: Partial<Service> = {}): Service {
    return ServiceFactory.create({
      name: 'Budget Service',
      description: 'Affordable service for testing',
      pricing: {
        perRequest: '$0.01',
        amount: '0.01',
        currency: 'USDC',
        network: 'base-sepolia',
        billingModel: 'per-request',
      },
      ...overrides,
    });
  }

  /**
   * Create an expensive service (high price)
   */
  static createExpensiveService(overrides: Partial<Service> = {}): Service {
    return ServiceFactory.create({
      name: 'Premium Service',
      description: 'High-end premium service',
      pricing: {
        perRequest: '$5.00',
        amount: '5.00',
        currency: 'USDC',
        network: 'base-sepolia',
        billingModel: 'per-request',
      },
      ...overrides,
    });
  }

  /**
   * Create multiple services with sequential IDs
   */
  static createMany(count: number, factory?: (index: number) => Partial<Service>): Service[] {
    const services: Service[] = [];
    for (let i = 0; i < count; i++) {
      const overrides = factory ? factory(i) : {};
      services.push(ServiceFactory.create(overrides));
    }
    return services;
  }

  /**
   * Create a set of diverse services for testing search/filtering
   */
  static createDiverseSet(): Service[] {
    return [
      ServiceFactory.createImageAnalyzer({
        pricing: { ...ServiceFactory.createImageAnalyzer().pricing, perRequest: '$0.05', amount: '0.05' },
        reputation: { ...ServiceFactory.createImageAnalyzer().reputation, rating: 4.5 }
      }),
      ServiceFactory.createSentimentAnalyzer({
        pricing: { ...ServiceFactory.createSentimentAnalyzer().pricing, perRequest: '$0.02', amount: '0.02' },
        reputation: { ...ServiceFactory.createSentimentAnalyzer().reputation, rating: 4.8 }
      }),
      ServiceFactory.createTextSummarizer({
        pricing: { ...ServiceFactory.createTextSummarizer().pricing, perRequest: '$0.03', amount: '0.03' },
        reputation: { ...ServiceFactory.createTextSummarizer().reputation, rating: 4.2 }
      }),
      ServiceFactory.createPremiumService({
        pricing: { ...ServiceFactory.createPremiumService().pricing, perRequest: '$0.50', amount: '0.50' },
        reputation: { ...ServiceFactory.createPremiumService().reputation, rating: 5.0 }
      }),
      ServiceFactory.createNewService({
        pricing: { ...ServiceFactory.createNewService().pricing, perRequest: '$0.10', amount: '0.10' },
        reputation: { ...ServiceFactory.createNewService().reputation, rating: 0 }
      }),
      ServiceFactory.createCheapService({
        pricing: { ...ServiceFactory.createCheapService().pricing, perRequest: '$0.01', amount: '0.01' },
        reputation: { ...ServiceFactory.createCheapService().reputation, rating: 3.5 }
      }),
    ];
  }
}
