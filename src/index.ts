#!/usr/bin/env node

/**
 * SentientExchange MCP Server - Entry Point
 *
 * Starts the Model Context Protocol server for AI service marketplace.
 * Connects to Claude Desktop via stdio transport.
 */

import { SentientExchangeServer } from './server.js';
import { logger } from './utils/logger.js';

// Environment variables passed via MCP config (no dotenv needed for stdio transport)
// Payment execution is client-side, server only coordinates
logger.info('SentientExchange MCP Server - Environment loaded from MCP config');

/**
 * Main entry point
 */
async function main() {
  let server: SentientExchangeServer | null = null;

  try {
    logger.info('🚀 SentientExchange MCP Server starting...');

    // Create server instance
    server = new SentientExchangeServer();

    // Initialize all components
    await server.initialize();

    // Start the MCP server
    await server.start();

    logger.info('');
    logger.info('═══════════════════════════════════════════════════════════');
    logger.info('  SentientExchange MCP Server Running');
    logger.info('═══════════════════════════════════════════════════════════');
    logger.info('');
    logger.info('✓ Server Status: ONLINE');
    logger.info('✓ Protocol: Model Context Protocol (MCP)');
    logger.info('✓ Transport: stdio');
    logger.info('✓ Tools Available: 7 (including submit_payment)');
    logger.info('✓ Network: Solana', process.env.NETWORK || 'devnet');
    logger.info('✓ Payment: Client-side execution');
    logger.info('');
    logger.info('Ready to accept connections from Claude Desktop!');
    logger.info('');
    logger.info('To connect:');
    logger.info('1. Open Claude Desktop settings');
    logger.info('2. Add this server to MCP configuration');
    logger.info('3. Restart Claude Desktop');
    logger.info('');
    logger.info('═══════════════════════════════════════════════════════════');
    logger.info('');

    // Handle graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`\n\nReceived ${signal}, shutting down gracefully...`);
      if (server) {
        await server.shutdown();
      }
      process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

    // Keep process alive
    process.stdin.resume();
  } catch (error: any) {
    logger.error('\n❌ Fatal Error:', error.message);
    logger.error('Fatal error during startup:', error);

    if (server) {
      try {
        await server.shutdown();
      } catch (shutdownError) {
        logger.error('Error during emergency shutdown:', shutdownError);
      }
    }

    process.exit(1);
  }
}

// Run the server
main().catch((error) => {
  logger.error('Unhandled error:', error);
  process.exit(1);
});
