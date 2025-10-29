import dotenv from 'dotenv';
dotenv.config();

import { AgentMarketServer } from './server';

async function main() {
  console.log('🚀 AgentMarket MCP Server starting...');

  const server = new AgentMarketServer();
  await server.start();
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
