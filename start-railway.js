#!/usr/bin/env node

/**
 * Railway-specific start script
 * Runs both API server and Next.js web app
 * MCP server (stdio) is not needed on Railway
 */

const { spawn } = require('child_process');
const path = require('path');

const RAILWAY_PORT = process.env.PORT || '3000';
const API_PORT = '8080';

console.log('🚀 Starting AgentMarket on Railway...');
console.log(`📡 Web app will bind to Railway PORT: ${RAILWAY_PORT}`);
console.log(`🔧 API server running internally on: ${API_PORT}\n`);

// Start API Server on internal port
const apiServer = spawn('node', ['dist/server/index.js'], {
  stdio: 'inherit',
  env: { ...process.env, PORT: API_PORT }
});

// Start Next.js Web App on Railway PORT
const webApp = spawn('node_modules/.bin/next', ['start', '-p', RAILWAY_PORT], {
  cwd: path.join(__dirname, 'web'),
  stdio: 'inherit',
  env: { ...process.env, PORT: RAILWAY_PORT, API_URL: `http://localhost:${API_PORT}` }
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
