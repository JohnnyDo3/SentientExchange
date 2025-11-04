#!/usr/bin/env node

/**
 * Start both MCP server and API server in parallel
 */

const { spawn } = require('child_process');

console.log('🚀 Starting AgentMarket services...\n');

// Start MCP Server
const mcpServer = spawn('node', ['dist/index.js'], {
  stdio: 'inherit',
  env: process.env
});

// Start API Server
const apiServer = spawn('node', ['dist/server/index.js'], {
  stdio: 'inherit',
  env: process.env
});

mcpServer.on('error', (err) => {
  console.error('❌ MCP Server error:', err);
  process.exit(1);
});

apiServer.on('error', (err) => {
  console.error('❌ API Server error:', err);
  process.exit(1);
});

mcpServer.on('exit', (code) => {
  console.log(`MCP Server exited with code ${code}`);
  apiServer.kill();
  process.exit(code);
});

apiServer.on('exit', (code) => {
  console.log(`API Server exited with code ${code}`);
  mcpServer.kill();
  process.exit(code);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down...');
  mcpServer.kill();
  apiServer.kill();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down...');
  mcpServer.kill();
  apiServer.kill();
  process.exit(0);
});
