/**
 * Admin endpoint to seed the database with example services
 */
import { ServiceRegistry } from '../registry/ServiceRegistry.js';
import type { Service } from '../types/index.js';

export async function seedDatabase(registry: ServiceRegistry): Promise<Service[]> {
  const exampleServices: Omit<Service, 'id' | 'createdAt' | 'updatedAt'>[] = [
    {
      name: 'Sentiment Analyzer',
      description: 'Advanced AI-powered sentiment analysis for text, social media, and customer feedback',
      endpoint: 'https://sentiment-analyzer.example.com/analyze',
      capabilities: ['sentiment-analysis', 'emotion-detection', 'text-processing'],
      provider: 'did:key:sentiment-ai',
      pricing: {
        perRequest: '0.05',
        currency: 'USDC',
        network: 'base-sepolia',
        billingModel: 'per-request'
      },
      reputation: {
        totalJobs: 1250,
        successRate: 98.5,
        avgResponseTime: '2.1s',
        rating: 4.8,
        reviews: 85
      },
      metadata: {
        apiVersion: 'v2.1.0',
        rateLimit: '100/min',
        maxPayload: '10MB',
        image: '😊',
        color: '#10b981'
      }
    },
    {
      name: 'Image Analyzer',
      description: 'Computer vision service for object detection, image classification, and visual content analysis',
      endpoint: 'https://image-analyzer.example.com/analyze',
      capabilities: ['image-classification', 'object-detection', 'visual-analysis'],
      provider: 'did:key:vision-labs',
      pricing: {
        perRequest: '0.10',
        currency: 'USDC',
        network: 'base-sepolia',
        billingModel: 'per-request'
      },
      reputation: {
        totalJobs: 890,
        successRate: 97.2,
        avgResponseTime: '3.5s',
        rating: 4.7,
        reviews: 62
      },
      metadata: {
        apiVersion: 'v3.0.1',
        rateLimit: '50/min',
        maxPayload: '25MB',
        image: '👁️',
        color: '#3b82f6'
      }
    },
    {
      name: 'Text Summarizer',
      description: 'AI text summarization service for documents, articles, and long-form content',
      endpoint: 'https://text-summarizer.example.com/summarize',
      capabilities: ['text-summarization', 'document-processing', 'content-extraction'],
      provider: 'did:key:summary-bot',
      pricing: {
        perRequest: '0.08',
        currency: 'USDC',
        network: 'base-sepolia',
        billingModel: 'per-request'
      },
      reputation: {
        totalJobs: 670,
        successRate: 96.8,
        avgResponseTime: '4.2s',
        rating: 4.6,
        reviews: 48
      },
      metadata: {
        apiVersion: 'v1.5.2',
        rateLimit: '75/min',
        maxPayload: '5MB',
        image: '📝',
        color: '#f59e0b'
      }
    },
    {
      name: 'Data Processor',
      description: 'High-performance data transformation and ETL service for structured and unstructured data',
      endpoint: 'https://data-processor.example.com/process',
      capabilities: ['data-transformation', 'etl', 'data-cleaning'],
      provider: 'did:key:dataflow',
      pricing: {
        perRequest: '0.15',
        currency: 'USDC',
        network: 'base-sepolia',
        billingModel: 'per-request'
      },
      reputation: {
        totalJobs: 2100,
        successRate: 99.1,
        avgResponseTime: '1.8s',
        rating: 4.9,
        reviews: 142
      },
      metadata: {
        apiVersion: 'v4.2.0',
        rateLimit: '200/min',
        maxPayload: '50MB',
        image: '⚙️',
        color: '#8b5cf6'
      }
    },
    {
      name: 'Code Analyzer',
      description: 'Static code analysis and vulnerability scanning for multiple programming languages',
      endpoint: 'https://code-analyzer.example.com/analyze',
      capabilities: ['code-analysis', 'security-scanning', 'linting'],
      provider: 'did:key:secure-code',
      pricing: {
        perRequest: '0.12',
        currency: 'USDC',
        network: 'base-sepolia',
        billingModel: 'per-request'
      },
      reputation: {
        totalJobs: 1540,
        successRate: 98.7,
        avgResponseTime: '5.3s',
        rating: 4.8,
        reviews: 97
      },
      metadata: {
        apiVersion: 'v2.8.5',
        rateLimit: '30/min',
        maxPayload: '15MB',
        image: '🔍',
        color: '#ef4444'
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
