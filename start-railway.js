#!/usr/bin/env node

/**
 * Railway-specific start script
 * Runs both API server and Next.js web app
 * MCP server (stdio) is not needed on Railway
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting AgentMarket for Railway...\n');

// Start API Server (backend on port 8080)
const apiServer = spawn('node', ['dist/server/index.js'], {
  stdio: 'inherit',
  env: { ...process.env, PORT: '8080' }
});

// Start Next.js Web App (frontend - Railway will assign PORT)
const webApp = spawn('npm', ['run', 'start'], {
  cwd: path.join(__dirname, 'web'),
  stdio: 'inherit',
  env: process.env,
  shell: true
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
