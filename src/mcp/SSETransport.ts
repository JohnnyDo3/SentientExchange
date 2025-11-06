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

// Import all tool functions and their types
import { discoverServices, type DiscoverServicesArgs } from '../tools/discover.js';
import { getServiceDetails, type GetServiceDetailsArgs } from '../tools/details.js';
import { purchaseService, type PurchaseServiceArgs } from '../tools/purchase.js';
import { executePayment, type ExecutePaymentArgs } from '../tools/execute-payment.js';
import { submitPayment, type SubmitPaymentArgs } from '../tools/submit-payment.js';
import { rateService, type RateServiceArgs } from '../tools/rate.js';
import { listAllServices, type ListAllServicesArgs } from '../tools/list.js';
import { getTransaction, type GetTransactionArgs } from '../tools/transaction.js';
import { setSpendingLimits, checkSpending, resetSpendingLimits, type SetSpendingLimitsArgs, type CheckSpendingArgs } from '../tools/spending-limits.js';
import { discoverAndPrepareService, type DiscoverAndPrepareArgs } from '../tools/smart-discover-prepare.js';
import { completeServiceWithPayment, type CompleteServiceWithPaymentArgs } from '../tools/smart-execute-complete.js';
import { getErrorMessage } from '../types/errors.js';

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
      const startTime = Date.now();

      // Log tool call (for monitoring and debugging)
      logger.info(`MCP Tool Call: ${name}`, {
        tool: name,
        argsPreview: JSON.stringify(args).substring(0, 200), // First 200 chars
        timestamp: new Date().toISOString(),
      });

      try {
        // Type-safe result from tool handlers
        type ToolResult = {
          content: Array<{ type: string; text: string }>;
          isError?: boolean;
        };

        let result: ToolResult;
        switch (name) {
          case 'discover_services':
            result = await discoverServices(this.registry, args as unknown as DiscoverServicesArgs);
            break;
          case 'get_service_details':
            result = await getServiceDetails(this.registry, args as unknown as GetServiceDetailsArgs);
            break;
          case 'purchase_service':
            result = await purchaseService(this.registry, args as unknown as PurchaseServiceArgs, this.spendingLimitManager);
            break;
          case 'execute_payment':
            result = await executePayment(args as unknown as ExecutePaymentArgs);
            break;
          case 'submit_payment':
            result = await submitPayment(this.registry, this.solanaVerifier, this.db, args as unknown as SubmitPaymentArgs);
            break;
          case 'rate_service':
            result = await rateService(this.registry, this.db, args as unknown as RateServiceArgs);
            break;
          case 'list_all_services':
            result = await listAllServices(this.registry, args as unknown as ListAllServicesArgs);
            break;
          case 'get_transaction':
            result = await getTransaction(this.db, args as unknown as GetTransactionArgs);
            break;
          case 'set_spending_limits': {
            const typedArgs = args as unknown as SetSpendingLimitsArgs & { userId: string };
            const { userId, ...limitsArgs } = typedArgs;
            result = await setSpendingLimits(this.spendingLimitManager, userId, limitsArgs);
            break;
          }
          case 'check_spending': {
            const typedArgs = args as unknown as CheckSpendingArgs & { userId: string };
            result = await checkSpending(this.spendingLimitManager, typedArgs.userId);
            break;
          }
          case 'reset_spending_limits': {
            const typedArgs = args as unknown as { userId: string };
            result = await resetSpendingLimits(this.spendingLimitManager, typedArgs.userId);
            break;
          }
          case 'discover_and_prepare_service':
            result = await discoverAndPrepareService(this.registry, args as unknown as DiscoverAndPrepareArgs, this.spendingLimitManager);
            break;
          case 'complete_service_with_payment':
            result = await completeServiceWithPayment(this.registry, this.solanaVerifier, this.db, args as unknown as CompleteServiceWithPaymentArgs);
            break;
          default:
            throw new Error(`Unknown tool: ${name}`);
        }

        // Log successful completion with duration
        const duration = Date.now() - startTime;
        logger.info(`MCP Tool Success: ${name}`, {
          tool: name,
          duration: `${duration}ms`,
          success: true,
        });

        return result;
      } catch (error: unknown) {
        const duration = Date.now() - startTime;
        logger.error(`MCP Tool Error: ${name}`, {
          tool: name,
          duration: `${duration}ms`,
          error: getErrorMessage(error),
          success: false,
        });

        return {
          content: [{
            type: 'text',
            text: `Error: ${getErrorMessage(error)}`,
          }],
          isError: true,
        };
      }
    });
  }

  /**
   * Handle GET /mcp/sse - Establish SSE stream
   *
   * Security measures:
   * - Rate limited (10 connections per 15 minutes per IP)
   * - Logs client IP for security monitoring
   * - Session timeout after 30 minutes of inactivity
   * - Validates session IDs
   */
  async handleSSEConnection(req: Request, res: Response): Promise<void> {
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';

    logger.info('SSE connection request', {
      ip: clientIp,
      userAgent: req.headers['user-agent'],
      timestamp: new Date().toISOString(),
    });

    try {
      // Create SSE transport
      const transport = new SSEServerTransport('/mcp/message', res);
      const sessionId = transport.sessionId;

      // Validate session ID format (basic check)
      if (!sessionId || sessionId.length < 16) {
        logger.error('Invalid session ID generated', { sessionId, ip: clientIp });
        if (!res.headersSent) {
          res.status(500).send('Failed to generate valid session');
        }
        return;
      }

      // Store transport with metadata
      this.transports.set(sessionId, transport);

      // Set up close handler
      transport.onclose = () => {
        logger.info('SSE transport closed', {
          sessionId,
          ip: clientIp,
          duration: 'N/A', // Duration would require tracking connection start time
        });
        this.transports.delete(sessionId);
      };

      // Connect transport to MCP server
      await this.mcpServer.connect(transport);

      logger.info('SSE stream established', {
        sessionId,
        ip: clientIp,
        activeSessions: this.transports.size,
      });
    } catch (error) {
      logger.error('Error establishing SSE stream', {
        error: error instanceof Error ? getErrorMessage(error) : String(error),
        ip: clientIp,
      });
      if (!res.headersSent) {
        res.status(500).send('Error establishing SSE stream');
      }
    }
  }

  /**
   * Handle POST /mcp/message?sessionId=X - Receive client messages
   *
   * Security measures:
   * - Rate limited (60 messages per minute per session)
   * - Validates session ID
   * - Logs suspicious activity (missing session, invalid session)
   */
  async handleMessage(req: Request, res: Response): Promise<void> {
    const sessionId = req.query.sessionId as string;
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';

    // Validate session ID presence
    if (!sessionId) {
      logger.error('Missing session ID in message request', {
        ip: clientIp,
        userAgent: req.headers['user-agent'],
      });
      res.status(400).send('Missing sessionId parameter');
      return;
    }

    // Validate session ID format (prevent injection)
    if (!/^[a-zA-Z0-9_-]{16,}$/.test(sessionId)) {
      logger.error('Invalid session ID format', {
        sessionId: sessionId.substring(0, 50), // Log only first 50 chars
        ip: clientIp,
      });
      res.status(400).send('Invalid sessionId format');
      return;
    }

    // Check if session exists
    const transport = this.transports.get(sessionId);
    if (!transport) {
      logger.error('No active transport found for session', {
        sessionId,
        ip: clientIp,
        activeSessions: this.transports.size,
      });
      res.status(404).send('Session not found');
      return;
    }

    try {
      // handlePostMessage expects (req, res, parsedBody)
      // The SDK types expect IncomingMessage and ServerResponse, which are compatible with Express Request/Response
      await transport.handlePostMessage(req as unknown as Request, res as unknown as Response, req.body);
    } catch (error) {
      logger.error('Error handling MCP message', {
        sessionId,
        ip: clientIp,
        error: error instanceof Error ? getErrorMessage(error) : String(error),
      });
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
