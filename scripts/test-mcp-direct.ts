#!/usr/bin/env ts-node

/**
 * Direct MCP Tool Testing Script
 * Tests AgentMarket MCP tools without needing Claude Desktop
 */

import { ServiceRegistry } from './src/registry/ServiceRegistry';
import { Database } from './src/registry/database';
import { discoverServices } from './src/tools/discover';
import { getServiceDetails } from './src/tools/details';
import { listAllServices } from './src/tools/list';

async function testMCP() {
  console.log('🧪 Testing AgentMarket MCP Tools\n');

  // Initialize database and registry
  const db = new Database('./data/agentmarket.db');
  await db.initialize();

  const registry = new ServiceRegistry(db);
  await registry.initialize();

  console.log('✅ Database and Registry initialized\n');

  // Test 1: List all services
  console.log('📋 Test 1: List All Services');
  console.log('═'.repeat(50));
  const listResult = await listAllServices(registry, {});
  console.log(JSON.parse(listResult.content[0].text));
  console.log('\n');

  // Test 2: Discover services by capability
  console.log('🔍 Test 2: Discover Sentiment Analysis Services');
  console.log('═'.repeat(50));
  const discoverResult = await discoverServices(registry, {
    capability: 'sentiment-analysis'
  });
  console.log(JSON.parse(discoverResult.content[0].text));
  console.log('\n');

  // Test 3: Get service details
  console.log('📊 Test 3: Get Service Details');
  console.log('═'.repeat(50));

  // Get first service ID from list
  const services = JSON.parse(listResult.content[0].text).services;
  if (services && services.length > 0) {
    const firstService = services[0];
    const detailsResult = await getServiceDetails(registry, {
      serviceId: firstService.id
    });
    console.log(JSON.parse(detailsResult.content[0].text));
  } else {
    console.log('⚠️  No services found in database');
    console.log('Run: npm run seed-db to add example services');
  }

  console.log('\n✅ All tests completed!\n');

  await db.close();
  process.exit(0);
}

testMCP().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
