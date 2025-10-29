import dotenv from 'dotenv';
dotenv.config();

import { Database } from '../src/registry/database';
import { ServiceRegistry } from '../src/registry/ServiceRegistry';

/**
 * Seed Database Script
 *
 * Populates the database with 3 example services for testing and demo purposes.
 */

async function seedDatabase() {
  console.log('🌱 Seeding database with example services...\n');

  const dbPath = process.env.DATABASE_PATH || './data/agentmarket.db';
  const db = new Database(dbPath);
  await db.initialize();

  const registry = new ServiceRegistry(db);
  await registry.initialize();

  // Service 1: vision-pro (Image Analysis)
  const visionPro = await registry.registerService({
    name: 'vision-pro',
    description: 'Professional image analysis with object detection and OCR',
    provider: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb5',
    endpoint: 'http://localhost:3001/analyze',
    capabilities: ['image-analysis', 'ocr', 'object-detection'],
    pricing: {
      perRequest: '$0.02',
      currency: 'USDC',
      network: 'base-sepolia',
    },
    reputation: {
      totalJobs: 1247,
      successRate: 99.2,
      avgResponseTime: '3.2s',
      rating: 4.8,
      reviews: 89,
    },
    metadata: {
      apiVersion: 'v1',
      rateLimit: '100/min',
      maxPayload: '10MB',
    },
  });
  console.log(`✅ Created service: ${visionPro.name} (${visionPro.id})`);

  // Service 2: sentiment-analyzer (Sentiment Analysis)
  const sentimentAnalyzer = await registry.registerService({
    name: 'sentiment-analyzer',
    description: 'Advanced sentiment analysis for text and social media',
    provider: '0x8B3c5c9c8e5d4f3a2b1c0d9e8f7a6b5c4d3e2f1a',
    endpoint: 'http://localhost:3002/analyze',
    capabilities: ['sentiment-analysis', 'text-analysis'],
    pricing: {
      perRequest: '$0.01',
      currency: 'USDC',
      network: 'base-sepolia',
    },
    reputation: {
      totalJobs: 856,
      successRate: 98.5,
      avgResponseTime: '1.5s',
      rating: 4.6,
      reviews: 67,
    },
    metadata: {
      apiVersion: 'v1',
      rateLimit: '200/min',
      maxPayload: '1MB',
    },
  });
  console.log(`✅ Created service: ${sentimentAnalyzer.name} (${sentimentAnalyzer.id})`);

  // Service 3: text-summarizer (Text Summarization)
  const textSummarizer = await registry.registerService({
    name: 'text-summarizer',
    description: 'AI-powered text summarization for articles and documents',
    provider: '0x456def789abc012345678901234567890abcdef1',
    endpoint: 'http://localhost:3003/summarize',
    capabilities: ['summarization', 'text-analysis'],
    pricing: {
      perRequest: '$0.03',
      currency: 'USDC',
      network: 'base-sepolia',
    },
    reputation: {
      totalJobs: 2103,
      successRate: 99.8,
      avgResponseTime: '2.1s',
      rating: 4.9,
      reviews: 142,
    },
    metadata: {
      apiVersion: 'v1',
      rateLimit: '50/min',
      maxPayload: '5MB',
    },
  });
  console.log(`✅ Created service: ${textSummarizer.name} (${textSummarizer.id})`);

  await db.close();

  console.log('\n✨ Database seeded successfully!');
  console.log(`📍 Database location: ${dbPath}`);
  console.log(`📊 Total services: 3\n`);
}

// Run the seed script
seedDatabase().catch((error) => {
  console.error('❌ Seed failed:', error);
  process.exit(1);
});
