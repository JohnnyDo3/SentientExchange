/**
 * Entry point for AgentMarket API Server
 */

import { startAPIServer } from './api.js';

startAPIServer(3333).catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
