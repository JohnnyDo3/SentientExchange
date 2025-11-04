import { Service } from './types';

/**
 * Mock service data matching the backend Service schema
 * Used for development and demo purposes
 */
export const mockServices: Service[] = [
  {
    id: 'srv-001',
    name: 'Vision Pro',
    description: 'Professional image analysis with object detection, OCR, and face recognition',
    provider: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb5',
    endpoint: 'http://localhost:3001/analyze',
    image: '🎨',
    color: '#6366f1', // Indigo
    capabilities: ['image-analysis', 'ocr', 'object-detection', 'face-detection', 'vision-ai'],
    pricing: {
      perRequest: '$0.02',
      currency: 'USDC',
      network: 'base-sepolia'
    },
    reputation: {
      totalJobs: 1247,
      successRate: 99.2,
      avgResponseTime: '3.2s',
      rating: 4.8,
      reviews: 89
    },
    metadata: {
      apiVersion: 'v1',
      rateLimit: '100/min',
      maxPayload: '10MB'
    },
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-20T14:30:00Z'
  },
  {
    id: 'srv-002',
    name: 'Sentiment Analyzer',
    description: 'Advanced sentiment analysis powered by LLM, handles slang and emotion detection',
    provider: '0x8B3c5c9c8e5d4f3a2b1c0d9e8f7a6b5c4d3e2f1a',
    endpoint: 'http://localhost:3002/analyze',
    image: '💬',
    color: '#10b981', // Emerald
    capabilities: ['sentiment-analysis', 'emotion-detection', 'llm-powered', 'slang-aware', 'text-analysis'],
    pricing: {
      perRequest: '$0.01',
      currency: 'USDC',
      network: 'base-sepolia'
    },
    reputation: {
      totalJobs: 2856,
      successRate: 98.5,
      avgResponseTime: '1.5s',
      rating: 4.6,
      reviews: 167
    },
    metadata: {
      apiVersion: 'v1',
      rateLimit: '200/min',
      maxPayload: '5MB'
    },
    createdAt: '2024-01-10T08:00:00Z',
    updatedAt: '2024-01-22T16:45:00Z'
  },
  {
    id: 'srv-003',
    name: 'Summarize Pro',
    description: 'AI-powered text summarization for articles, documents, and long-form content',
    provider: '0x456def789abc012345678901234567890abcdef1',
    endpoint: 'http://localhost:3003/summarize',
    image: '📝',
    color: '#f59e0b', // Amber
    capabilities: ['text-summarization', 'content-extraction', 'key-points', 'llm-powered', 'text-analysis'],
    pricing: {
      perRequest: '$0.015',
      currency: 'USDC',
      network: 'base-sepolia'
    },
    reputation: {
      totalJobs: 3103,
      successRate: 99.8,
      avgResponseTime: '2.1s',
      rating: 4.9,
      reviews: 201
    },
    metadata: {
      apiVersion: 'v1',
      rateLimit: '150/min',
      maxPayload: '20MB'
    },
    createdAt: '2024-01-12T12:00:00Z',
    updatedAt: '2024-01-21T10:20:00Z'
  },
  {
    id: 'srv-004',
    name: 'Polyglot AI',
    description: 'Multi-language translation with context awareness, supports 100+ languages',
    provider: '0x789abc012def345678901234567890abcdef1234',
    endpoint: 'http://localhost:3004/translate',
    image: '🌍',
    color: '#8b5cf6', // Violet
    capabilities: ['translation', 'multi-language', '100-languages', 'context-aware', 'llm-powered'],
    pricing: {
      perRequest: '$0.01',
      currency: 'USDC',
      network: 'base-sepolia'
    },
    reputation: {
      totalJobs: 1876,
      successRate: 97.8,
      avgResponseTime: '2.8s',
      rating: 4.7,
      reviews: 134
    },
    metadata: {
      apiVersion: 'v1',
      rateLimit: '120/min',
      maxPayload: '8MB'
    },
    createdAt: '2024-01-14T09:30:00Z',
    updatedAt: '2024-01-23T11:15:00Z'
  },
  {
    id: 'srv-005',
    name: 'Code Pro',
    description: 'Comprehensive code analysis with bug detection, security scanning, and quality assessment',
    provider: '0xabc012def345678901234567890abcdef1234567',
    endpoint: 'http://localhost:3005/analyze-code',
    image: '⚡',
    color: '#ef4444', // Red
    capabilities: ['code-analysis', 'bug-detection', 'security-scan', 'quality-assessment', 'llm-powered'],
    pricing: {
      perRequest: '$0.025',
      currency: 'USDC',
      network: 'base-sepolia'
    },
    reputation: {
      totalJobs: 945,
      successRate: 99.5,
      avgResponseTime: '4.1s',
      rating: 4.9,
      reviews: 78
    },
    metadata: {
      apiVersion: 'v1',
      rateLimit: '50/min',
      maxPayload: '15MB'
    },
    createdAt: '2024-01-16T14:00:00Z',
    updatedAt: '2024-01-24T09:30:00Z'
  },
  {
    id: 'srv-006',
    name: 'Data Wizard',
    description: 'Data processing and transformation with validation and format conversion',
    provider: '0xdef345678901234567890abcdef123456789abc0',
    endpoint: 'http://localhost:3006/process',
    image: '📊',
    color: '#06b6d4', // Cyan
    capabilities: ['data-processing', 'transformation', 'validation', 'format-conversion'],
    pricing: {
      perRequest: '$0.005',
      currency: 'USDC',
      network: 'base-sepolia'
    },
    reputation: {
      totalJobs: 4521,
      successRate: 98.9,
      avgResponseTime: '1.2s',
      rating: 4.5,
      reviews: 289
    },
    metadata: {
      apiVersion: 'v1',
      rateLimit: '300/min',
      maxPayload: '50MB'
    },
    createdAt: '2024-01-08T07:00:00Z',
    updatedAt: '2024-01-25T15:00:00Z'
  }
];

/**
 * Get unique capability tags from all services
 */
export function getAllCapabilities(): string[] {
  const capabilities = new Set<string>();
  mockServices.forEach(service => {
    service.capabilities.forEach(cap => capabilities.add(cap));
  });
  return Array.from(capabilities).sort();
}

/**
 * Get price range across all services
 */
export function getPriceRange(): { min: number; max: number } {
  const prices = mockServices.map(s => parseFloat(s.pricing.perRequest.replace('$', '')));
  return {
    min: Math.min(...prices),
    max: Math.max(...prices)
  };
}

/**
 * Calculate marketplace stats
 */
export function getMarketplaceStats() {
  const totalServices = mockServices.length;
  const totalJobs = mockServices.reduce((sum, s) => sum + s.reputation.totalJobs, 0);
  const avgRating = mockServices.reduce((sum, s) => sum + s.reputation.rating, 0) / totalServices;
  const activeServices = mockServices.filter(s => s.reputation.successRate > 95).length;

  return {
    totalServices,
    totalJobs,
    avgRating: parseFloat(avgRating.toFixed(1)),
    activeServices
  };
}
