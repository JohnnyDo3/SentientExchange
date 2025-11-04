#!/usr/bin/env node

/**
 * Seed script to register the Sentiment Analyzer service in AgentMarket database
 */

import { Database } from '../dist/registry/database.js';
import { ServiceRegistry } from '../dist/registry/ServiceRegistry.js';

async function seedSentimentAnalyzer() {
  console.log('🌱 Seeding Sentiment Analyzer service...\n');

  const dbPath = process.env.DATABASE_PATH || './data/agentmarket.db';
  const db = new Database(dbPath);

  try {
    // Initialize database
    await db.initialize();
    console.log('✅ Database initialized\n');

    // Create service registry
    const registry = new ServiceRegistry(db);

    // Define sentiment analyzer service
    const service = {
      name: 'Sentiment Analyzer',
      description: 'Production-grade AI sentiment analysis service powered by Claude API with multi-dimensional emotion detection, polarity scoring, and context-aware analysis. Handles modern slang, sarcasm, and evolving language.',
      provider: '0x6316859C0be28Bc67995F1EC6Add6cEC1bff8123',
      endpoint: 'http://localhost:3001',
      capabilities: [
        'sentiment-analysis',
        'emotion-detection',
        'llm-powered',
        'multi-dimensional-analysis',
        'slang-aware',
        'sarcasm-detection',
        'context-aware',
        'batch-processing'
      ],
      pricing: {
        perRequest: '$0.01',
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
        maxPayload: '100KB'
      }
    };

    // Register service
    const registered = await registry.registerService(service);

    console.log('✅ Service registered successfully!\n');
    console.log('📋 Service Details:');
    console.log(`   ID: ${registered.id}`);
    console.log(`   Name: ${registered.name}`);
    console.log(`   Endpoint: ${registered.endpoint}`);
    console.log(`   Price: ${registered.pricing.perRequest} ${registered.pricing.currency}`);
    console.log(`   Provider: ${registered.provider}`);
    console.log(`   Capabilities: ${registered.capabilities.length} capabilities`);
    console.log('\n');

    // Verify registration
    const verified = await registry.getService(registered.id);
    if (verified) {
      console.log('✅ Verification successful - service exists in database\n');

      // Show discovery test
      console.log('🔍 Testing service search...');
      const found = await registry.searchServices({
        capabilities: ['sentiment-analysis']
      });
      console.log(`   Found ${found.length} service(s) with sentiment-analysis capability\n`);

      if (found.length > 0) {
        console.log('✅ Service discoverable via MCP tools\n');
      }
    }

    await db.close();
    console.log('✅ Seed completed successfully!\n');
    console.log('Next steps:');
    console.log('  1. Start the sentiment analyzer service: cd examples/sentiment-analyzer && npm start');
    console.log('  2. Start the AgentMarket MCP server: npm start');
    console.log('  3. Configure Claude Desktop to use the MCP server');
    console.log('  4. Test end-to-end: discover_services → purchase_service\n');

  } catch (error: any) {
    console.error('❌ Seed failed:', error.message);
    console.error(error.stack);
    await db.close();
    process.exit(1);
  }
}

// Run seed
seedSentimentAnalyzer().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
