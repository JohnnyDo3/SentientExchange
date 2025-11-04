#!/usr/bin/env node

import dotenv from 'dotenv';
import app from './server';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 3002;
const SERVICE_NAME = process.env.SERVICE_NAME || 'vision-pro';
const PRICE_USDC = process.env.PRICE_USDC || '0.02';
const WALLET_ADDRESS = process.env.WALLET_ADDRESS || '0x6316859C0be28Bc67995F1EC6Add6cEC1bff8123';
const NETWORK = process.env.NETWORK || 'base-sepolia';

// Start server
app.listen(PORT, () => {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(`  ${SERVICE_NAME} - Image Analysis Service`);
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`💰 Price: $${PRICE_USDC} USDC per analysis`);
  console.log(`📡 Network: ${NETWORK}`);
  console.log(`💳 Wallet: ${WALLET_ADDRESS}`);
  console.log('\n📊 Endpoints:');
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   Info:   http://localhost:${PORT}/info`);
  console.log(`   Stats:  http://localhost:${PORT}/stats`);
  console.log(`   Analyze: POST http://localhost:${PORT}/analyze (requires payment)`);
  console.log('\n═══════════════════════════════════════════════════════════\n');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n🛑 Shutting down gracefully...');
  process.exit(0);
});
