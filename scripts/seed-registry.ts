#!/usr/bin/env ts-node

/**
 * Seed AgentMarket Registry with All 15 Services
 *
 * This script populates the AgentMarket registry database with all available services
 * so the Master Orchestrator can discover and hire them.
 */

import { Database } from '../src/registry/database.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '..', 'data', 'agentmarket.db');

interface ServiceData {
  id: string;
  name: string;
  description: string;
  provider: string;
  endpoint: string;
  capabilities: string[];
  pricing: {
    amount: string;
    currency: string;
    billingModel: string;
  };
  reputation: {
    rating: number;
    totalTransactions: number;
    successRate: number;
  };
  metadata: {
    category: string;
    tags: string[];
    responseTime: string;
    availability: string;
  };
}

const SERVICES: ServiceData[] = [
  // Data Services
  {
    id: 'sentiment-analyzer-001',
    name: 'Sentiment Analyzer',
    description: 'Claude-powered sentiment analysis for text, product reviews, and social media',
    provider: 'AgentMarket',
    endpoint: 'http://localhost:3000/analyze',
    capabilities: ['sentiment-analysis', 'text-processing', 'nlp', 'emotion-detection'],
    pricing: { amount: '0.50', currency: 'USDC', billingModel: 'per-request' },
    reputation: { rating: 4.9, totalTransactions: 1250, successRate: 99.2 },
    metadata: {
      category: 'data',
      tags: ['ai', 'nlp', 'claude', 'analysis'],
      responseTime: '1-3s',
      availability: '99.9%'
    }
  },
  {
    id: 'web-scraper-002',
    name: 'Web Scraper',
    description: 'Extract structured data from any website with intelligent parsing',
    provider: 'AgentMarket',
    endpoint: 'http://localhost:3001/scrape',
    capabilities: ['web-scraping', 'data-extraction', 'html-parsing', 'content-extraction'],
    pricing: { amount: '1.00', currency: 'USDC', billingModel: 'per-request' },
    reputation: { rating: 4.7, totalTransactions: 890, successRate: 97.5 },
    metadata: {
      category: 'data',
      tags: ['scraping', 'cheerio', 'data-extraction'],
      responseTime: '2-5s',
      availability: '99.5%'
    }
  },
  {
    id: 'company-data-api-003',
    name: 'Company Data API',
    description: 'Comprehensive company information database with funding, team, and market data',
    provider: 'AgentMarket',
    endpoint: 'http://localhost:3004/query',
    capabilities: ['company-research', 'market-data', 'funding-info', 'competitive-intelligence'],
    pricing: { amount: '0.75', currency: 'USDC', billingModel: 'per-request' },
    reputation: { rating: 4.8, totalTransactions: 670, successRate: 98.8 },
    metadata: {
      category: 'data',
      tags: ['company-data', 'research', 'funding', 'market-intelligence'],
      responseTime: '500ms-1s',
      availability: '99.8%'
    }
  },
  {
    id: 'news-aggregator-004',
    name: 'News Aggregator',
    description: 'Real-time AI industry news aggregation with filtering and categorization',
    provider: 'AgentMarket',
    endpoint: 'http://localhost:3005/fetch',
    capabilities: ['news-aggregation', 'content-filtering', 'trend-tracking', 'real-time-data'],
    pricing: { amount: '0.80', currency: 'USDC', billingModel: 'per-request' },
    reputation: { rating: 4.6, totalTransactions: 1120, successRate: 99.0 },
    metadata: {
      category: 'data',
      tags: ['news', 'aggregation', 'ai-industry', 'real-time'],
      responseTime: '1-2s',
      availability: '99.7%'
    }
  },

  // Analysis Services
  {
    id: 'market-research-005',
    name: 'Market Research',
    description: 'Comprehensive market analysis with size, growth rates, and competitive landscape',
    provider: 'AgentMarket',
    endpoint: 'http://localhost:3006/research',
    capabilities: ['market-analysis', 'industry-research', 'competitive-analysis', 'forecasting'],
    pricing: { amount: '1.50', currency: 'USDC', billingModel: 'per-request' },
    reputation: { rating: 4.9, totalTransactions: 450, successRate: 99.5 },
    metadata: {
      category: 'analysis',
      tags: ['market-research', 'analysis', 'forecasting'],
      responseTime: '1-2s',
      availability: '99.9%'
    }
  },
  {
    id: 'feature-extractor-006',
    name: 'Feature Extractor',
    description: 'NLP-based extraction of features, specifications, and benefits from text',
    provider: 'AgentMarket',
    endpoint: 'http://localhost:3007/extract',
    capabilities: ['feature-extraction', 'nlp', 'text-analysis', 'specification-parsing'],
    pricing: { amount: '0.75', currency: 'USDC', billingModel: 'per-request' },
    reputation: { rating: 4.7, totalTransactions: 780, successRate: 98.2 },
    metadata: {
      category: 'analysis',
      tags: ['nlp', 'extraction', 'features', 'parsing'],
      responseTime: '1-3s',
      availability: '99.6%'
    }
  },
  {
    id: 'trend-forecaster-007',
    name: 'Trend Forecaster',
    description: 'Claude-powered trend prediction and forecasting for industries',
    provider: 'AgentMarket',
    endpoint: 'http://localhost:3008/forecast',
    capabilities: ['trend-forecasting', 'prediction', 'ai-analysis', 'future-planning'],
    pricing: { amount: '2.00', currency: 'USDC', billingModel: 'per-request' },
    reputation: { rating: 4.8, totalTransactions: 320, successRate: 97.8 },
    metadata: {
      category: 'analysis',
      tags: ['claude', 'forecasting', 'trends', 'prediction'],
      responseTime: '3-5s',
      availability: '99.4%'
    }
  },
  {
    id: 'pricing-optimizer-008',
    name: 'Pricing Optimizer',
    description: 'Strategic pricing optimization with competitive analysis and ROI calculations',
    provider: 'AgentMarket',
    endpoint: 'http://localhost:3009/optimize',
    capabilities: ['pricing-strategy', 'optimization', 'competitive-analysis', 'roi-calculation'],
    pricing: { amount: '1.25', currency: 'USDC', billingModel: 'per-request' },
    reputation: { rating: 4.9, totalTransactions: 560, successRate: 99.1 },
    metadata: {
      category: 'analysis',
      tags: ['pricing', 'optimization', 'strategy', 'roi'],
      responseTime: '1-2s',
      availability: '99.8%'
    }
  },

  // Creative Services
  {
    id: 'chart-generator-009',
    name: 'Chart Generator',
    description: 'Create beautiful Chart.js visualizations with embed code',
    provider: 'AgentMarket',
    endpoint: 'http://localhost:3014/generate',
    capabilities: ['data-visualization', 'chart-generation', 'chartjs', 'embed-code'],
    pricing: { amount: '1.00', currency: 'USDC', billingModel: 'per-request' },
    reputation: { rating: 4.7, totalTransactions: 890, successRate: 98.5 },
    metadata: {
      category: 'creative',
      tags: ['visualization', 'charts', 'chartjs', 'graphics'],
      responseTime: '500ms-1s',
      availability: '99.7%'
    }
  },
  {
    id: 'copywriter-010',
    name: 'Copywriter',
    description: 'Claude-powered marketing copy generation for landing pages, ads, and emails',
    provider: 'AgentMarket',
    endpoint: 'http://localhost:3015/write',
    capabilities: ['copywriting', 'marketing-copy', 'content-creation', 'ai-writing'],
    pricing: { amount: '1.50', currency: 'USDC', billingModel: 'per-request' },
    reputation: { rating: 4.9, totalTransactions: 1340, successRate: 99.3 },
    metadata: {
      category: 'creative',
      tags: ['claude', 'copywriting', 'marketing', 'content'],
      responseTime: '3-5s',
      availability: '99.8%'
    }
  },
  {
    id: 'pdf-generator-011',
    name: 'PDF Generator',
    description: 'Generate structured PDF documents from content blocks',
    provider: 'AgentMarket',
    endpoint: 'http://localhost:3016/generate',
    capabilities: ['pdf-generation', 'document-creation', 'formatting', 'export'],
    pricing: { amount: '1.00', currency: 'USDC', billingModel: 'per-request' },
    reputation: { rating: 4.6, totalTransactions: 720, successRate: 98.0 },
    metadata: {
      category: 'creative',
      tags: ['pdf', 'documents', 'export', 'generation'],
      responseTime: '2-4s',
      availability: '99.5%'
    }
  },

  // Agent Services (Can autonomously hire other services!)
  {
    id: 'data-aggregator-agent-012',
    name: 'Data Aggregator Agent',
    description: 'Autonomous agent that aggregates data from multiple sources and generates insights',
    provider: 'AgentMarket',
    endpoint: 'http://localhost:3010/aggregate',
    capabilities: ['data-aggregation', 'insight-generation', 'autonomous-agent', 'multi-source'],
    pricing: { amount: '2.50', currency: 'USDC', billingModel: 'per-request' },
    reputation: { rating: 4.8, totalTransactions: 280, successRate: 98.9 },
    metadata: {
      category: 'agent',
      tags: ['agent', 'aggregation', 'autonomous', 'insights'],
      responseTime: '5-10s',
      availability: '99.6%'
    }
  },
  {
    id: 'report-writer-agent-013',
    name: 'Report Writer Agent',
    description: 'Autonomous agent that generates comprehensive reports by hiring visualization and writing services',
    provider: 'AgentMarket',
    endpoint: 'http://localhost:3011/generate',
    capabilities: ['report-generation', 'autonomous-agent', 'service-orchestration', 'document-creation'],
    pricing: { amount: '3.00', currency: 'USDC', billingModel: 'per-request' },
    reputation: { rating: 4.9, totalTransactions: 210, successRate: 99.2 },
    metadata: {
      category: 'agent',
      tags: ['agent', 'reports', 'orchestration', 'autonomous'],
      responseTime: '10-15s',
      availability: '99.7%'
    }
  },
  {
    id: 'channel-specialist-agent-014',
    name: 'Channel Specialist Agent',
    description: 'Autonomous agent for go-to-market strategy, customer segmentation, and distribution planning',
    provider: 'AgentMarket',
    endpoint: 'http://localhost:3012/strategy',
    capabilities: ['gtm-strategy', 'customer-segmentation', 'autonomous-agent', 'channel-planning'],
    pricing: { amount: '2.75', currency: 'USDC', billingModel: 'per-request' },
    reputation: { rating: 4.7, totalTransactions: 190, successRate: 98.5 },
    metadata: {
      category: 'agent',
      tags: ['agent', 'strategy', 'gtm', 'channels'],
      responseTime: '8-12s',
      availability: '99.5%'
    }
  },
  {
    id: 'presentation-builder-agent-015',
    name: 'Presentation Builder Agent',
    description: 'Autonomous agent that builds pitch decks by hiring copywriting, data visualization, and design services',
    provider: 'AgentMarket',
    endpoint: 'http://localhost:3013/build',
    capabilities: ['presentation-building', 'pitch-deck-generation', 'autonomous-agent', 'service-orchestration'],
    pricing: { amount: '5.00', currency: 'USDC', billingModel: 'per-request' },
    reputation: { rating: 5.0, totalTransactions: 150, successRate: 99.8 },
    metadata: {
      category: 'agent',
      tags: ['agent', 'presentations', 'pitch-deck', 'orchestration'],
      responseTime: '15-20s',
      availability: '99.9%'
    }
  }
];

async function seedRegistry() {
  console.log('🌱 Seeding AgentMarket Registry...\n');

  const db = new Database(DB_PATH);
  await db.initialize();

  let successCount = 0;
  let errorCount = 0;

  for (const service of SERVICES) {
    try {
      const now = new Date().toISOString();

      await db.createService({
        id: service.id,
        name: service.name,
        description: service.description,
        provider: service.provider,
        endpoint: service.endpoint,
        capabilities: service.capabilities,
        pricing: service.pricing,
        reputation: service.reputation,
        metadata: service.metadata,
        createdAt: now,
        updatedAt: now
      });

      console.log(`✅ ${service.name} (${service.id})`);
      successCount++;
    } catch (error: any) {
      console.error(`❌ ${service.name}: ${error.message}`);
      errorCount++;
    }
  }

  console.log(`\n📊 Seed Summary:`);
  console.log(`   Total services: ${SERVICES.length}`);
  console.log(`   Successful: ${successCount}`);
  console.log(`   Failed: ${errorCount}`);
  console.log(`\n🎉 Registry seeding complete!`);

  process.exit(0);
}

// Run seeding
seedRegistry().catch((error) => {
  console.error('❌ Seeding failed:', error);
  process.exit(1);
});
