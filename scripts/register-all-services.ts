#!/usr/bin/env node
/**
 * Register all x402 services in AgentMarket database
 */

import { Database } from '../dist/registry/database.js';
import { ServiceRegistry } from '../dist/registry/ServiceRegistry.js';

const SERVICES = [
  {
    name: 'Sentiment Analyzer',
    brand: 'sentiment-analyzer',
    provider: '0x6316859C0be28Bc67995F1EC6Add6cEC1bff8123',
    endpoint: 'http://localhost:3001',
    price: '0.01',
    capabilities: ['sentiment-analysis', 'emotion-detection', 'llm-powered', 'slang-aware'],
    description: 'Production-grade AI sentiment analysis powered by Claude with multi-dimensional emotion detection'
  },
  {
    name: 'Vision Pro',
    brand: 'vision-pro',
    provider: '0x6316859C0be28Bc67995F1EC6Add6cEC1bff8123',
    endpoint: 'http://localhost:3002',
    price: '0.02',
    capabilities: ['image-analysis', 'object-detection', 'ocr', 'face-detection', 'vision-ai'],
    description: 'AI-powered image analysis with Claude Vision: objects, text, faces, and scene understanding'
  },
  {
    name: 'Summarize Pro',
    brand: 'summarize-pro',
    provider: '0x6316859C0be28Bc67995F1EC6Add6cEC1bff8123',
    endpoint: 'http://localhost:3003',
    price: '0.015',
    capabilities: ['text-summarization', 'content-extraction', 'key-points', 'llm-powered'],
    description: 'Intelligent text summarization with customizable length and style using Claude'
  },
  {
    name: 'Polyglot AI',
    brand: 'polyglot-ai',
    provider: '0x6316859C0be28Bc67995F1EC6Add6cEC1bff8123',
    endpoint: 'http://localhost:3004',
    price: '0.01',
    capabilities: ['translation', 'multi-language', '100-languages', 'context-aware', 'llm-powered'],
    description: 'Professional translation service supporting 100+ languages with context preservation'
  },
  {
    name: 'Code Pro',
    brand: 'code-pro',
    provider: '0x6316859C0be28Bc67995F1EC6Add6cEC1bff8123',
    endpoint: 'http://localhost:3005',
    price: '0.025',
    capabilities: ['code-analysis', 'bug-detection', 'security-scan', 'quality-assessment', 'llm-powered'],
    description: 'Comprehensive code analysis: bugs, security, performance, and best practices'
  },
  {
    name: 'Data Wizard',
    brand: 'data-wizard',
    provider: '0x6316859C0be28Bc67995F1EC6Add6cEC1bff8123',
    endpoint: 'http://localhost:3006',
    price: '0.005',
    capabilities: ['data-processing', 'transformation', 'validation', 'format-conversion'],
    description: 'Data transformation and processing: CSV, JSON, XML conversion and validation'
  }
];

async function registerAllServices() {
  console.log('🌱 Registering all AgentMarket services...\n');

  const db = new Database('./data/agentmarket.db');
  await db.initialize();

  const registry = new ServiceRegistry(db);
  await registry.initialize();

  let registered = 0;

  for (const svc of SERVICES) {
    try {
      const service = {
        name: svc.name,
        description: svc.description,
        provider: svc.provider,
        endpoint: svc.endpoint,
        capabilities: svc.capabilities,
        pricing: {
          perRequest: `$${svc.price}`,
          currency: 'USDC',
          network: 'base-sepolia'
        },
        reputation: {
          totalJobs: 0,
          successRate: 100,
          avgResponseTime: '1.5s',
          rating: 5.0,
          reviews: 0
        },
        metadata: {
          apiVersion: 'v1',
          rateLimit: '100/15min',
          maxPayload: '10MB'
        }
      };

      const result = await registry.registerService(service);
      console.log(`✓ ${svc.name} (${svc.brand}) registered - ID: ${result.id.substring(0, 8)}...`);
      registered++;
    } catch (error: any) {
      console.error(`✗ Failed to register ${svc.name}:`, error.message);
    }
  }

  await db.close();

  console.log(`\n✅ Registered ${registered}/${SERVICES.length} services!\n`);
  console.log('Next steps:');
  console.log('  1. Start all services (ports 3001-3006)');
  console.log('  2. Start MCP server: npm start');
  console.log('  3. Test with: node test-e2e-flow.js\n');
}

registerAllServices().catch(console.error);
