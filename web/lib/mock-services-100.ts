import { Service } from './types';

/**
 * 100 Mock services for scale testing
 */

const serviceCategories = [
  { name: 'Vision AI', emoji: '👁️', color: '#6366f1', caps: ['image-analysis', 'vision-ai', 'object-detection'] },
  { name: 'Text Analysis', emoji: '📝', color: '#f59e0b', caps: ['text-analysis', 'nlp', 'llm-powered'] },
  { name: 'Speech', emoji: '🎤', color: '#ec4899', caps: ['speech-recognition', 'audio', 'voice-ai'] },
  { name: 'Translation', emoji: '🌍', color: '#8b5cf6', caps: ['translation', 'multi-language', 'llm-powered'] },
  { name: 'Data Processing', emoji: '📊', color: '#06b6d4', caps: ['data-processing', 'transformation', 'analytics'] },
  { name: 'Code Analysis', emoji: '⚡', color: '#ef4444', caps: ['code-analysis', 'security-scan', 'llm-powered'] },
  { name: 'Sentiment', emoji: '💬', color: '#10b981', caps: ['sentiment-analysis', 'emotion-detection', 'nlm'] },
  { name: 'Search', emoji: '🔍', color: '#f97316', caps: ['search', 'indexing', 'retrieval'] },
  { name: 'Generation', emoji: '✨', color: '#a855f7', caps: ['generation', 'creative-ai', 'llm-powered'] },
  { name: 'Recommendation', emoji: '🎯', color: '#14b8a6', caps: ['recommendation', 'personalization', 'ml'] },
];

const adjectives = ['Smart', 'Fast', 'Pro', 'Elite', 'Premium', 'Ultra', 'Quantum', 'Neural', 'Turbo', 'Advanced'];
const suffixes = ['AI', 'Hub', 'Engine', 'Lab', 'Studio', 'Cloud', 'API', 'Pro', 'Plus', 'Max'];

export const mockServices100: Service[] = Array.from({ length: 100 }, (_, i) => {
  const category = serviceCategories[i % serviceCategories.length];
  const adjective = adjectives[Math.floor(i / 10) % adjectives.length];
  const suffix = suffixes[i % suffixes.length];

  const basePrice = 0.001 + (Math.random() * 0.05);
  const totalJobs = Math.floor(100 + Math.random() * 5000);
  const successRate = 95 + Math.random() * 4.9;
  const rating = 3.5 + Math.random() * 1.5;
  const reviews = Math.floor(10 + Math.random() * 300);
  const responseTime = (0.5 + Math.random() * 4).toFixed(1);

  return {
    id: `srv-${String(i + 1).padStart(3, '0')}`,
    name: `${adjective} ${category.name} ${suffix}`,
    description: `${adjective} ${category.name.toLowerCase()} service with cutting-edge AI capabilities`,
    provider: `0x${Math.random().toString(16).substring(2, 42)}`,
    endpoint: `http://localhost:${3001 + (i % 50)}/api`,
    image: category.emoji,
    color: category.color,
    capabilities: [
      ...category.caps,
      ...(Math.random() > 0.5 ? ['real-time'] : []),
      ...(Math.random() > 0.7 ? ['batch-processing'] : []),
      ...(Math.random() > 0.8 ? ['custom-models'] : [])
    ],
    pricing: {
      perRequest: `$${basePrice.toFixed(3)}`,
      currency: 'USDC',
      network: 'base-sepolia'
    },
    reputation: {
      totalJobs,
      successRate: parseFloat(successRate.toFixed(1)),
      avgResponseTime: `${responseTime}s`,
      rating: parseFloat(rating.toFixed(1)),
      reviews
    },
    metadata: {
      apiVersion: 'v1',
      rateLimit: `${Math.floor(50 + Math.random() * 200)}/min`,
      maxPayload: `${Math.floor(5 + Math.random() * 45)}MB`
    },
    createdAt: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
  };
});

/**
 * Get unique capability tags from all services
 */
export function getAllCapabilities100(): string[] {
  const capabilities = new Set<string>();
  mockServices100.forEach(service => {
    service.capabilities.forEach(cap => capabilities.add(cap));
  });
  return Array.from(capabilities).sort();
}

/**
 * Get price range across all services
 */
export function getPriceRange100(): { min: number; max: number } {
  const prices = mockServices100.map(s => parseFloat(s.pricing.perRequest.replace('$', '')));
  return {
    min: Math.min(...prices),
    max: Math.max(...prices)
  };
}

/**
 * Calculate marketplace stats
 */
export function getMarketplaceStats100() {
  const totalServices = mockServices100.length;
  const totalJobs = mockServices100.reduce((sum, s) => sum + s.reputation.totalJobs, 0);
  const avgRating = mockServices100.reduce((sum, s) => sum + s.reputation.rating, 0) / totalServices;
  const activeServices = mockServices100.filter(s => s.reputation.successRate > 95).length;

  return {
    totalServices,
    totalJobs,
    avgRating: parseFloat(avgRating.toFixed(1)),
    activeServices
  };
}
