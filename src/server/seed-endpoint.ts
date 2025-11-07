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
      status: 'approved',
      name: 'Sentiment Analyzer',
      description:
        'State-of-the-art sentiment analysis with PhD-level expertise in psycholinguistics, emotion detection, and sarcasm understanding',
      endpoint: 'https://www.sentientexchange.com/api/ai/sentiment/analyze',
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
        healthCheckUrl: 'https://www.sentientexchange.com/api/ai/health',
        image: '😊',
        color: '#10b981',
      },
    },
    {
      status: 'approved',
      name: 'Image Analyzer',
      description:
        'Professional computer vision with Claude Vision API for objects, OCR, faces, and comprehensive image analysis',
      endpoint: 'https://www.sentientexchange.com/api/ai/image/analyze',
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
        healthCheckUrl: 'https://www.sentientexchange.com/api/ai/health',
        image: '👁️',
        color: '#3b82f6',
      },
    },
    {
      status: 'approved',
      name: 'Text Summarizer',
      description:
        'Executive-grade text summarization with multiple formats (bullets, paragraph, executive), key point extraction, and topic tags',
      endpoint: 'https://www.sentientexchange.com/api/ai/text/summarize',
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
        healthCheckUrl: 'https://www.sentientexchange.com/api/ai/health',
        image: '📝',
        color: '#f59e0b',
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
