#!/usr/bin/env node

/**
 * Railway-specific start script
 * Runs both API server and Next.js web app
 * MCP server (stdio) is not needed on Railway
 */

const { spawn } = require('child_process');
const path = require('path');

// Railway provides PORT env var - we use it for the web app
// API server runs on a different internal port
const WEB_PORT = process.env.PORT || '3000';
const API_PORT = process.env.API_PORT || '8081';

console.log('🚀 Starting AgentMarket on Railway...');
console.log(`📡 Web app will bind to port: ${WEB_PORT} (Railway public port)`);
console.log(`🔧 API server running internally on port: ${API_PORT}`);

// Detect database type
if (process.env.DATABASE_URL && (process.env.DATABASE_URL.startsWith('postgres://') || process.env.DATABASE_URL.startsWith('postgresql://'))) {
  console.log('🐘 Using PostgreSQL database (production)');
} else if (process.env.DATABASE_PATH) {
  console.log(`💾 Using SQLite database: ${process.env.DATABASE_PATH}`);
} else {
  console.log('💾 Using SQLite database: ./data/agentmarket.db (default)');
}
console.log('');

// Start API Server on internal port (merged marketplace + orchestration API)
const apiServer = spawn('node', ['dist/api/apiServer.js'], {
  stdio: 'inherit',
  env: { ...process.env, PORT: API_PORT }
});

// Start Next.js Web App on Railway PORT (no longer using standalone)
const webApp = spawn('node', ['node_modules/.bin/next', 'start', '-p', WEB_PORT], {
  cwd: path.join(__dirname, 'web'),
  stdio: 'inherit',
  env: { ...process.env, PORT: WEB_PORT, API_PORT: API_PORT, API_URL: `http://localhost:${API_PORT}` }
});

apiServer.on('error', (err) => {
  console.error('❌ API Server error:', err);
  webApp.kill();
  process.exit(1);
});

webApp.on('error', (err) => {
  console.error('❌ Web App error:', err);
  apiServer.kill();
  process.exit(1);
});

apiServer.on('exit', (code) => {
  console.log(`API Server exited with code ${code}`);
  webApp.kill();
  process.exit(code);
});

webApp.on('exit', (code) => {
  console.log(`Web App exited with code ${code}`);
  apiServer.kill();
  process.exit(code);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down...');
  apiServer.kill();
  webApp.kill();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down...');
  apiServer.kill();
  webApp.kill();
  process.exit(0);
});
