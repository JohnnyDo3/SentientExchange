/**
 * Entry point for AgentMarket API Server
 */

import { startAPIServer } from './api.js';

// Use Railway's PORT environment variable, or default to 3333 for local development
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3333;

startAPIServer(PORT).catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
