#!/usr/bin/env ts-node

/**
 * Demo: Master Orchestrator in Action
 *
 * Showcases the "impossible task" demo:
 * User requests a complex task → Orchestrator spawns agents → Agents hire services → Complete orchestration
 */

import { Database } from '../src/registry/database.js';
import { ServiceRegistry } from '../src/registry/ServiceRegistry.js';
import { MasterOrchestrator } from '../src/orchestrator/MasterOrchestrator.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '..', 'data', 'agentmarket.db');

async function runDemo() {
  console.log('🎬 AgentMarket Master Orchestrator Demo\n');
  console.log('=' .repeat(70));
  console.log('\n');

  // Initialize registry
  console.log('📚 Initializing AgentMarket Registry...');
  const db = new Database(DB_PATH);
  await db.initialize();

  const registry = new ServiceRegistry(db);
  await registry.initialize();

  const availableServices = registry.getAllServices();
  console.log(`✅ Registry loaded with ${availableServices.length} services\n`);

  // Initialize Master Orchestrator
  console.log('🎯 Initializing Master Orchestrator...\n');
  const orchestrator = new MasterOrchestrator(registry);

  // The "impossible" task
  const complexTask = 'Generate a complete investor pitch deck for an AI coding assistant startup';

  console.log('💬 User Request:');
  console.log(`   "${complexTask}"\n`);
  console.log('=' .repeat(70));
  console.log('\n');

  // Execute orchestration
  console.log('🚀 Starting Orchestration...\n');

  const result = await orchestrator.executeComplexTask(complexTask);

  // Display results
  console.log('\n');
  console.log('=' .repeat(70));
  console.log('📊 ORCHESTRATION COMPLETE');
  console.log('=' .repeat(70));
  console.log('\n');

  console.log('✅ Status: SUCCESS\n');

  console.log('📈 Metadata:');
  console.log(`   Total Time: ${result.metadata.totalTime}ms`);
  console.log(`   Total Cost: $${result.metadata.totalCost.toFixed(2)} USDC`);
  console.log(`   Services Used: ${result.metadata.servicesUsed}`);
  console.log(`   Agents Spawned: ${result.metadata.agentsSpawned}`);
  console.log(`   Tasks Completed: ${result.metadata.tasksCompleted}\n`);

  console.log('🤖 Agent Summary:');
  for (const agent of result.agents) {
    console.log(`\n   ${agent.name} (${agent.role})`);
    console.log(`   ├─ Tasks: ${agent.tasks.filter(t => t.status === 'completed').length}/${agent.tasks.length} completed`);
    console.log(`   ├─ Services Hired: ${agent.servicesHired.join(', ')}`);
    console.log(`   └─ Cost: $${agent.totalCost.toFixed(2)} USDC`);
  }

  console.log('\n');
  console.log('📜 Timeline:');
  const majorEvents = result.timeline.filter(e =>
    ['orchestration-started', 'services-discovered', 'agent-spawned', 'service-hired', 'orchestration-completed'].includes(e.event)
  );

  for (const event of majorEvents) {
    const time = (event.timestamp / 1000).toFixed(2);
    let message = '';

    switch (event.event) {
      case 'orchestration-started':
        message = '🎯 Orchestration started';
        break;
      case 'services-discovered':
        message = '🔍 Discovered services in marketplace';
        break;
      case 'agent-spawned':
        message = `🤖 Spawned ${event.agent}`;
        break;
      case 'service-hired':
        message = `💰 ${event.agent} hired ${event.service} ($${event.cost})`;
        break;
      case 'orchestration-completed':
        message = '✅ Orchestration completed';
        break;
    }

    console.log(`   [+${time}s] ${message}`);
  }

  console.log('\n');
  console.log('🎉 Demo Complete!\n');
  console.log('This orchestration demonstrated:');
  console.log('   • Autonomous task decomposition');
  console.log('   • Service discovery from AgentMarket registry');
  console.log('   • Multi-agent coordination');
  console.log('   • Automatic service hiring with x402 payments');
  console.log('   • Result aggregation across agents');
  console.log('\n');

  process.exit(0);
}

// Run demo
runDemo().catch((error) => {
  console.error('\n❌ Demo failed:', error);
  process.exit(1);
});
