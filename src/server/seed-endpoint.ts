/**
 * Admin endpoint to seed the database with example services
 */
import { ServiceRegistry } from '../registry/ServiceRegistry.js';
import type { Service } from '../types/index.js';

export async function seedDatabase(
  registry: ServiceRegistry
): Promise<Service[]> {
  const exampleServices: Omit<Service, 'id' | 'createdAt' | 'updatedAt'>[] = [
    {
      name: 'Sentiment Analyzer',
      description:
        'State-of-the-art sentiment analysis with PhD-level expertise in psycholinguistics, emotion detection, and sarcasm understanding',
      endpoint: 'https://www.sentientexchange.com/api/ai/sentiment',
      capabilities: [
        'sentiment-analysis',
        'emotion-detection',
        'text-processing',
        'sarcasm-detection',
        'gen-z-slang',
      ],
      provider: 'did:key:sentientexchange',
      pricing: {
        perRequest: '0.01',
        currency: 'USDC',
        network: 'base-sepolia',
        billingModel: 'per-request',
      },
      reputation: {
        totalJobs: 0,
        successRate: 100,
        avgResponseTime: '1.5s',
        rating: 5.0,
        reviews: 0,
      },
      metadata: {
        apiVersion: 'v1.0.0',
        rateLimit: '1000/min',
        maxPayload: '1MB',
        image: '😊',
        color: '#10b981',
      },
    },
    {
      name: 'Image Analyzer',
      description:
        'Professional computer vision with Claude Vision API for objects, OCR, faces, and comprehensive image analysis',
      endpoint: 'https://www.sentientexchange.com/api/ai/image',
      capabilities: [
        'image-classification',
        'object-detection',
        'visual-analysis',
        'ocr',
        'face-detection',
      ],
      provider: 'did:key:sentientexchange',
      pricing: {
        perRequest: '0.02',
        currency: 'USDC',
        network: 'base-sepolia',
        billingModel: 'per-request',
      },
      reputation: {
        totalJobs: 0,
        successRate: 100,
        avgResponseTime: '2.5s',
        rating: 5.0,
        reviews: 0,
      },
      metadata: {
        apiVersion: 'v1.0.0',
        rateLimit: '500/min',
        maxPayload: '25MB',
        image: '👁️',
        color: '#3b82f6',
      },
    },
    {
      name: 'Text Summarizer',
      description:
        'Executive-grade text summarization with multiple formats (bullets, paragraph, executive), key point extraction, and topic tags',
      endpoint: 'https://www.sentientexchange.com/api/ai/text',
      capabilities: [
        'text-summarization',
        'document-processing',
        'content-extraction',
        'key-points',
        'topic-tags',
      ],
      provider: 'did:key:sentientexchange',
      pricing: {
        perRequest: '0.015',
        currency: 'USDC',
        network: 'base-sepolia',
        billingModel: 'per-request',
      },
      reputation: {
        totalJobs: 0,
        successRate: 100,
        avgResponseTime: '2.0s',
        rating: 5.0,
        reviews: 0,
      },
      metadata: {
        apiVersion: 'v1.0.0',
        rateLimit: '750/min',
        maxPayload: '5MB',
        image: '📝',
        color: '#f59e0b',
      },
    },
    {
      name: 'Data Processor',
      description:
        'High-performance data transformation and ETL service for structured and unstructured data',
      endpoint: 'https://data-processor.example.com/process',
      capabilities: ['data-transformation', 'etl', 'data-cleaning'],
      provider: 'did:key:dataflow',
      pricing: {
        perRequest: '0.15',
        currency: 'USDC',
        network: 'base-sepolia',
        billingModel: 'per-request',
      },
      reputation: {
        totalJobs: 2100,
        successRate: 99.1,
        avgResponseTime: '1.8s',
        rating: 4.9,
        reviews: 142,
      },
      metadata: {
        apiVersion: 'v4.2.0',
        rateLimit: '200/min',
        maxPayload: '50MB',
        image: '⚙️',
        color: '#8b5cf6',
      },
    },
    {
      name: 'Code Analyzer',
      description:
        'Static code analysis and vulnerability scanning for multiple programming languages',
      endpoint: 'https://code-analyzer.example.com/analyze',
      capabilities: ['code-analysis', 'security-scanning', 'linting'],
      provider: 'did:key:secure-code',
      pricing: {
        perRequest: '0.12',
        currency: 'USDC',
        network: 'base-sepolia',
        billingModel: 'per-request',
      },
      reputation: {
        totalJobs: 1540,
        successRate: 98.7,
        avgResponseTime: '5.3s',
        rating: 4.8,
        reviews: 97,
      },
      metadata: {
        apiVersion: 'v2.8.5',
        rateLimit: '30/min',
        maxPayload: '15MB',
        image: '🔍',
        color: '#ef4444',
      },
    },
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
