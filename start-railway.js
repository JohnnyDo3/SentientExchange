#!/usr/bin/env node

/**
 * Railway-specific start script - only runs the API server
 * The MCP server (stdio) is not needed on Railway
 */

const { spawn } = require('child_process');

console.log('🚀 Starting AgentMarket API Server for Railway...\n');

// Only start API Server for Railway
const apiServer = spawn('node', ['dist/server/index.js'], {
  stdio: 'inherit',
  env: process.env
});

apiServer.on('error', (err) => {
  console.error('❌ API Server error:', err);
  process.exit(1);
});

apiServer.on('exit', (code) => {
  console.log(`API Server exited with code ${code}`);
  process.exit(code);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down...');
  apiServer.kill();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down...');
  apiServer.kill();
  process.exit(0);
});
