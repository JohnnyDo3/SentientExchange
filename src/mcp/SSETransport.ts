/**
 * SSE Transport for MCP Server
 *
 * Provides Server-Sent Events (SSE) transport for remote MCP connections.
 * Allows Claude Desktop (or other MCP clients) to connect to Railway-deployed server via HTTPS.
 *
 * Architecture:
 * - GET /mcp/sse: Establishes SSE stream (server → client)
 * - POST /mcp/message?sessionId=X: Receives client messages (client → server)
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { ServiceRegistry } from '../registry/ServiceRegistry.js';
import { Database } from '../registry/database.js';
import { SolanaVerifier } from '../payment/SolanaVerifier.js';
import { SpendingLimitManager } from '../payment/SpendingLimitManager.js';
import { logger } from '../utils/logger.js';
import { Request, Response } from 'express';

// Import all tool functions (same as server.ts)
import { discoverServices } from '../tools/discover.js';
import { getServiceDetails } from '../tools/details.js';
import { purchaseService } from '../tools/purchase.js';
import { executePayment } from '../tools/execute-payment.js';
import { submitPayment } from '../tools/submit-payment.js';
import { rateService } from '../tools/rate.js';
import { listAllServices } from '../tools/list.js';
import { getTransaction } from '../tools/transaction.js';
import { setSpendingLimits, checkSpending, resetSpendingLimits } from '../tools/spending-limits.js';
import { discoverAndPrepareService } from '../tools/smart-discover-prepare.js';
import { completeServiceWithPayment } from '../tools/smart-execute-complete.js';

import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

/**
 * SSE Transport Manager for MCP
 *
 * Manages SSE connections from remote MCP clients (Claude Desktop).
 * Shares database and registry instances with the main API server.
 */
export class SSETransportManager {
  private mcpServer: Server;
  private transports: Map<string, SSEServerTransport> = new Map();

  constructor(
    private registry: ServiceRegistry,
    private db: Database,
    private solanaVerifier: SolanaVerifier,
    private spendingLimitManager: SpendingLimitManager
  ) {
    // Create MCP server instance (same configuration as server.ts)
    this.mcpServer = new Server(
      {
        name: 'agentmarket-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
        instructions: `SentientExchange MCP Server - AI Service Marketplace on Solana

This server provides tools for discovering, purchasing, and rating AI services with x402 payment protocol using USDC on Solana blockchain.

Available Tools:
1. discover_services - Search for AI services by capability, price, or rating
2. get_service_details - Get detailed information about a specific service
3. purchase_service - Request service (returns payment instruction if 402)
4. execute_payment - Execute payment locally with your Solana wallet
5. submit_payment - Complete purchase with transaction signature
6. rate_service - Submit ratings and reviews for completed transactions
7. list_all_services - List all available services with pagination
8. get_transaction - Retrieve transaction details by ID
9. set_spending_limits - Configure your spending limits (per-transaction, daily, monthly)
10. check_spending - View your current spending and remaining budget
11. reset_spending_limits - Remove all spending limits

SMART TOOLS (Reduce workflow from 5 calls to 3):
12. discover_and_prepare_service - Discover best service + health check + prepare payment (replaces discover + details + purchase)
13. complete_service_with_payment - Verify payment + submit + auto-retry with backups (replaces submit_payment with retry logic)

Payment Flow:
- Client manages their own Solana wallet (configured in MCP client)
- purchase_service returns payment instructions when needed (402 response)
- Client calls execute_payment which uses local SOLANA_PRIVATE_KEY
- execute_payment returns transaction signature
- Client calls submit_payment with signature to complete purchase
- Server verifies payment on-chain via SolanaVerifier

The system uses the x402 payment protocol for autonomous agent-to-agent payments on Solana.`,
      }
    );

    this.setupToolHandlers();
    logger.info('✓ SSE Transport Manager initialized');
  }

  /**
   * Set up tool handlers (same as server.ts)
   */
  private setupToolHandlers(): void {
    // List available tools
    this.mcpServer.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'discover_services',
          description: 'Search for AI services by capability, price range, or minimum rating',
          inputSchema: {
            type: 'object',
            properties: {
              capabilities: { type: 'array', items: { type: 'string' }, description: 'Required capabilities' },
              maxPrice: { type: 'string', description: 'Maximum price (e.g., "$0.10")' },
              minRating: { type: 'number', description: 'Minimum rating (1-5)' },
              limit: { type: 'number', description: 'Maximum results', default: 10 },
            },
          },
        },
        {
          name: 'get_service_details',
          description: 'Get detailed information about a specific service',
          inputSchema: {
            type: 'object',
            properties: {
              serviceId: { type: 'string', description: 'Service ID' },
            },
            required: ['serviceId'],
          },
        },
        {
          name: 'purchase_service',
          description: 'Request a service (returns 402 payment instructions if payment needed)',
          inputSchema: {
            type: 'object',
            properties: {
              serviceId: { type: 'string', description: 'Service ID' },
              requestData: { type: 'object', description: 'Service request data' },
            },
            required: ['serviceId', 'requestData'],
          },
        },
        {
          name: 'execute_payment',
          description: 'Execute Solana payment using your local wallet (CLIENT-SIDE)',
          inputSchema: {
            type: 'object',
            properties: {
              recipientAddress: { type: 'string', description: 'Recipient Solana address' },
              amount: { type: 'number', description: 'Amount in USDC' },
              transactionId: { type: 'string', description: 'Transaction ID for tracking' },
            },
            required: ['recipientAddress', 'amount', 'transactionId'],
          },
        },
        {
          name: 'submit_payment',
          description: 'Submit payment transaction signature to complete service purchase',
          inputSchema: {
            type: 'object',
            properties: {
              transactionId: { type: 'string', description: 'Transaction ID' },
              signature: { type: 'string', description: 'Solana transaction signature' },
            },
            required: ['transactionId', 'signature'],
          },
        },
        {
          name: 'rate_service',
          description: 'Rate a service after completing a transaction',
          inputSchema: {
            type: 'object',
            properties: {
              transactionId: { type: 'string', description: 'Transaction ID' },
              score: { type: 'number', description: 'Rating (1-5)', minimum: 1, maximum: 5 },
              review: { type: 'string', description: 'Optional review text' },
            },
            required: ['transactionId', 'score'],
          },
        },
        {
          name: 'list_all_services',
          description: 'List all available services with pagination',
          inputSchema: {
            type: 'object',
            properties: {
              limit: { type: 'number', description: 'Results per page', default: 20 },
              offset: { type: 'number', description: 'Pagination offset', default: 0 },
            },
          },
        },
        {
          name: 'get_transaction',
          description: 'Get transaction details by ID',
          inputSchema: {
            type: 'object',
            properties: {
              transactionId: { type: 'string', description: 'Transaction ID' },
            },
            required: ['transactionId'],
          },
        },
        {
          name: 'set_spending_limits',
          description: 'Configure spending limits to protect your budget',
          inputSchema: {
            type: 'object',
            properties: {
              userId: { type: 'string', description: 'User ID (wallet address)' },
              perTransaction: { type: 'string', description: 'Max per transaction (e.g., "$1.00")' },
              daily: { type: 'string', description: 'Daily spending limit' },
              monthly: { type: 'string', description: 'Monthly spending limit' },
            },
            required: ['userId'],
          },
        },
        {
          name: 'check_spending',
          description: 'View your current spending and remaining budget',
          inputSchema: {
            type: 'object',
            properties: {
              userId: { type: 'string', description: 'User ID (wallet address)' },
            },
            required: ['userId'],
          },
        },
        {
          name: 'reset_spending_limits',
          description: 'Remove all spending limits',
          inputSchema: {
            type: 'object',
            properties: {
              userId: { type: 'string', description: 'User ID (wallet address)' },
            },
            required: ['userId'],
          },
        },
        {
          name: 'discover_and_prepare_service',
          description: 'SMART TOOL: Discover best service + health check + prepare payment in one call',
          inputSchema: {
            type: 'object',
            properties: {
              capability: { type: 'string', description: 'Required capability' },
              requestData: { type: 'object', description: 'Service request data' },
              requirements: {
                type: 'object',
                properties: {
                  maxPrice: { type: 'string' },
                  minRating: { type: 'number' },
                },
              },
              checkHealth: { type: 'boolean', description: 'Health check services before selection', default: true },
              userId: { type: 'string', description: 'User ID for spending limits' },
              maxRetries: { type: 'number', description: 'Max backup services', default: 2 },
            },
            required: ['capability', 'requestData'],
          },
        },
        {
          name: 'complete_service_with_payment',
          description: 'SMART TOOL: Verify payment + submit + auto-retry with backups',
          inputSchema: {
            type: 'object',
            properties: {
              sessionId: { type: 'string', description: 'Session ID from discover_and_prepare' },
              signature: { type: 'string', description: 'Solana transaction signature' },
              retryOnFailure: { type: 'boolean', description: 'Auto-retry with backup services', default: true },
            },
            required: ['sessionId', 'signature'],
          },
        },
      ],
    }));

    // Handle tool calls
    this.mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'discover_services':
            return await discoverServices(this.registry, args as any);
          case 'get_service_details':
            return await getServiceDetails(this.registry, args as any);
          case 'purchase_service':
            return await purchaseService(this.registry, args as any, this.spendingLimitManager);
          case 'execute_payment':
            return await executePayment(args as any);
          case 'submit_payment':
            return await submitPayment(this.registry, this.solanaVerifier, this.db, args as any);
          case 'rate_service':
            return await rateService(this.registry, this.db, args as any);
          case 'list_all_services':
            return await listAllServices(this.registry, args as any);
          case 'get_transaction':
            return await getTransaction(this.db, args as any);
          case 'set_spending_limits': {
            const { userId, ...limitsArgs } = args as any;
            return await setSpendingLimits(this.spendingLimitManager, userId, limitsArgs);
          }
          case 'check_spending': {
            const { userId } = args as any;
            return await checkSpending(this.spendingLimitManager, userId);
          }
          case 'reset_spending_limits': {
            const { userId } = args as any;
            return await resetSpendingLimits(this.spendingLimitManager, userId);
          }
          case 'discover_and_prepare_service':
            return await discoverAndPrepareService(this.registry, args as any, this.spendingLimitManager);
          case 'complete_service_with_payment':
            return await completeServiceWithPayment(this.registry, this.solanaVerifier, this.db, args as any);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error: any) {
        logger.error(`Tool execution error [${name}]:`, error);
        return {
          content: [{
            type: 'text',
            text: `Error: ${error.message}`,
          }],
          isError: true,
        };
      }
    });
  }

  /**
   * Handle GET /mcp/sse - Establish SSE stream
   */
  async handleSSEConnection(req: Request, res: Response): Promise<void> {
    logger.info('Received SSE connection request');

    try {
      // Create SSE transport
      const transport = new SSEServerTransport('/mcp/message', res);
      const sessionId = transport.sessionId;

      // Store transport
      this.transports.set(sessionId, transport);

      // Set up close handler
      transport.onclose = () => {
        logger.info(`SSE transport closed for session ${sessionId}`);
        this.transports.delete(sessionId);
      };

      // Connect transport to MCP server
      await this.mcpServer.connect(transport);

      logger.info(`✓ Established SSE stream with session ID: ${sessionId}`);
    } catch (error) {
      logger.error('Error establishing SSE stream:', error);
      if (!res.headersSent) {
        res.status(500).send('Error establishing SSE stream');
      }
    }
  }

  /**
   * Handle POST /mcp/message?sessionId=X - Receive client messages
   */
  async handleMessage(req: Request, res: Response): Promise<void> {
    const sessionId = req.query.sessionId as string;

    if (!sessionId) {
      logger.error('No session ID provided in message request');
      res.status(400).send('Missing sessionId parameter');
      return;
    }

    const transport = this.transports.get(sessionId);
    if (!transport) {
      logger.error(`No active transport found for session ID: ${sessionId}`);
      res.status(404).send('Session not found');
      return;
    }

    try {
      // handlePostMessage expects (req, res, parsedBody)
      await transport.handlePostMessage(req as any, res as any, req.body);
    } catch (error) {
      logger.error(`Error handling message for session ${sessionId}:`, error);
      if (!res.headersSent) {
        res.status(500).send('Error handling message');
      }
    }
  }

  /**
   * Get active session count (for monitoring)
   */
  getActiveSessionCount(): number {
    return this.transports.size;
  }

  /**
   * Close all transports (for graceful shutdown)
   */
  async closeAll(): Promise<void> {
    logger.info(`Closing ${this.transports.size} active SSE transports...`);
    for (const transport of this.transports.values()) {
      try {
        await transport.close();
      } catch (error) {
        logger.error('Error closing transport:', error);
      }
    }
    this.transports.clear();
    logger.info('✓ All SSE transports closed');
  }
}
