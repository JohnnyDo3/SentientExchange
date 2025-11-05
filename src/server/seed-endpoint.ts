/**
 * Admin endpoint to seed the database with example services
 */
import { ServiceRegistry } from '../registry/ServiceRegistry.js';
import type { Service } from '../types/index.js';

export async function seedDatabase(registry: ServiceRegistry): Promise<Service[]> {
  const exampleServices: Omit<Service, 'serviceId' | 'createdAt' | 'updatedAt'>[] = [
    {
      name: 'Sentiment Analyzer',
      description: 'Advanced AI-powered sentiment analysis for text, social media, and customer feedback',
      endpoint: 'https://sentiment-analyzer.example.com/analyze',
      capabilities: ['sentiment-analysis', 'emotion-detection', 'text-processing'],
      pricing: {
        model: 'per-request',
        amount: '0.05',
        currency: 'USDC'
      },
      provider: {
        name: 'SentimentAI',
        did: 'did:key:sentiment-ai'
      },
      reputation: {
        rating: 4.8,
        totalTransactions: 1250,
        successRate: 98.5,
        reviews: []
      },
      metadata: {
        version: '2.1.0',
        documentation: 'https://docs.sentimentai.com',
        supportedLanguages: ['en', 'es', 'fr', 'de', 'ja', 'zh'],
        tags: ['nlp', 'ai', 'sentiment', 'text-analysis']
      }
    },
    {
      name: 'Image Analyzer',
      description: 'Computer vision service for object detection, image classification, and visual content analysis',
      endpoint: 'https://image-analyzer.example.com/analyze',
      capabilities: ['image-classification', 'object-detection', 'visual-analysis'],
      pricing: {
        model: 'per-request',
        amount: '0.10',
        currency: 'USDC'
      },
      provider: {
        name: 'VisionLabs',
        did: 'did:key:vision-labs'
      },
      reputation: {
        rating: 4.7,
        totalTransactions: 890,
        successRate: 97.2,
        reviews: []
      },
      metadata: {
        version: '3.0.1',
        documentation: 'https://docs.visionlabs.ai',
        supportedFormats: ['jpg', 'png', 'webp', 'gif'],
        tags: ['computer-vision', 'ai', 'image-processing']
      }
    },
    {
      name: 'Text Summarizer',
      description: 'AI text summarization service for documents, articles, and long-form content',
      endpoint: 'https://text-summarizer.example.com/summarize',
      capabilities: ['text-summarization', 'document-processing', 'content-extraction'],
      pricing: {
        model: 'per-request',
        amount: '0.08',
        currency: 'USDC'
      },
      provider: {
        name: 'SummaryBot',
        did: 'did:key:summary-bot'
      },
      reputation: {
        rating: 4.6,
        totalTransactions: 670,
        successRate: 96.8,
        reviews: []
      },
      metadata: {
        version: '1.5.2',
        documentation: 'https://docs.summarybot.io',
        maxLength: 50000,
        tags: ['nlp', 'summarization', 'text-processing']
      }
    },
    {
      name: 'Data Processor',
      description: 'High-performance data transformation and ETL service for structured and unstructured data',
      endpoint: 'https://data-processor.example.com/process',
      capabilities: ['data-transformation', 'etl', 'data-cleaning'],
      pricing: {
        model: 'per-request',
        amount: '0.15',
        currency: 'USDC'
      },
      provider: {
        name: 'DataFlow Inc',
        did: 'did:key:dataflow'
      },
      reputation: {
        rating: 4.9,
        totalTransactions: 2100,
        successRate: 99.1,
        reviews: []
      },
      metadata: {
        version: '4.2.0',
        documentation: 'https://docs.dataflow.com',
        supportedFormats: ['json', 'csv', 'xml', 'parquet'],
        tags: ['data', 'etl', 'transformation', 'pipeline']
      }
    },
    {
      name: 'Code Analyzer',
      description: 'Static code analysis and vulnerability scanning for multiple programming languages',
      endpoint: 'https://code-analyzer.example.com/analyze',
      capabilities: ['code-analysis', 'security-scanning', 'linting'],
      pricing: {
        model: 'per-request',
        amount: '0.12',
        currency: 'USDC'
      },
      provider: {
        name: 'SecureCode',
        did: 'did:key:secure-code'
      },
      reputation: {
        rating: 4.8,
        totalTransactions: 1540,
        successRate: 98.7,
        reviews: []
      },
      metadata: {
        version: '2.8.5',
        documentation: 'https://docs.securecode.dev',
        supportedLanguages: ['javascript', 'typescript', 'python', 'java', 'go', 'rust'],
        tags: ['security', 'code-quality', 'static-analysis']
      }
    }
  ];

  const seededServices: Service[] = [];

  for (const serviceData of exampleServices) {
    try {
      const service = await registry.registerService(serviceData);
      seededServices.push(service);
      console.log(`✓ Seeded service: ${service.name}`);
    } catch (error) {
      console.error(`✗ Failed to seed service ${serviceData.name}:`, error);
    }
  }

  return seededServices;
}
