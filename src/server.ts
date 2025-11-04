/**
 * AgentMarket MCP Server
 *
 * Main server class that implements the Model Context Protocol.
 * Provides tools for AI agents to discover, purchase, and rate AI services
 * with x402 payment protocol using USDC on Solana blockchain.
 *
 * Payment execution is CLIENT-SIDE - this server only coordinates payments.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { ServiceRegistry } from './registry/ServiceRegistry.js';
import { Database } from './registry/database.js';
import { PaymentRouter } from './payment/PaymentRouter.js';
import { createPaymentRouter } from './payment/PaymentFactory.js';
import { logger } from './utils/logger.js';

// Import all tool functions
import { discoverServices } from './tools/discover.js';
import { getServiceDetails } from './tools/details.js';
import { purchaseService } from './tools/purchase.js';
import { submitPayment } from './tools/submit-payment.js';
import { rateService } from './tools/rate.js';
import { listAllServices } from './tools/list.js';
import { getTransaction } from './tools/transaction.js';

/**
 * AgentMarket MCP Server
 *
 * Integrates all components to provide a complete AI service marketplace:
 * - Service discovery and management
 * - x402 payment coordination (client-side execution)
 * - USDC transactions on Solana blockchain
 * - Reputation and rating system
 */
export class AgentMarketServer {
  private server: Server;
  private db: Database;
  private registry: ServiceRegistry;
  private paymentRouter: PaymentRouter;

  constructor() {
    // Create MCP server instance
    this.server = new Server(
      {
        name: 'agentmarket-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
        instructions: `AgentMarket MCP Server - AI Service Marketplace on Solana

This server provides tools for discovering, purchasing, and rating AI services with x402 payment protocol using USDC on Solana blockchain.

Available Tools:
1. discover_services - Search for AI services by capability, price, or rating
2. get_service_details - Get detailed information about a specific service
3. purchase_service - Request service (returns payment instruction if 402)
4. submit_payment - Complete purchase with transaction signature
5. rate_service - Submit ratings and reviews for completed transactions
6. list_all_services - List all available services with pagination
7. get_transaction - Retrieve transaction details by ID

Payment Flow:
- Client manages their own Solana wallet
- purchase_service returns payment instructions when needed
- Client executes payment using provided script or manual wallet
- submit_payment completes service request with tx signature

The system uses the x402 payment protocol for autonomous agent-to-agent payments on Solana.`,
      }
    );

    // Initialize database (will be set up in initialize())
    this.db = new Database(
      process.env.DATABASE_PATH || './data/agentmarket.db'
    );

    // Payment router will be initialized in initialize()
    this.paymentRouter = null as any;
    this.registry = null as any;

    this.setupToolHandlers();
  }

  /**
   * Initialize all server components
   */
  async initialize(): Promise<void> {
    try {
      logger.info('Initializing AgentMarket MCP Server...');

      // Initialize database
      logger.info('Initializing database...');
      await this.db.initialize();
      logger.info('Database initialized successfully');

      // Initialize service registry
      logger.info('Initializing service registry...');
      this.registry = new ServiceRegistry(this.db);
      await this.registry.initialize();
      logger.info('Service registry initialized');

      // Initialize payment router with x402 + fallback
      logger.info('Initializing payment router...');
      this.paymentRouter = await createPaymentRouter({
        network: process.env.NETWORK || 'devnet',
        rpcUrl: process.env.SOLANA_RPC_URL,
        secretKey: process.env.SOLANA_PRIVATE_KEY,
        paymentMode: (process.env.PAYMENT_MODE as any) || 'hybrid'
      });
      logger.info('Payment router initialized');

      const walletAddress = await this.paymentRouter.getWalletAddress();
      const paymentMode = process.env.PAYMENT_MODE || 'hybrid';

      logger.info('AgentMarket MCP Server initialized successfully!');
      logger.info(`Network: Solana ${process.env.NETWORK || 'devnet'}`);
      logger.info(`Payment Mode: ${paymentMode} (x402 + fallback)`);
      logger.info(`Wallet Address: ${walletAddress}`);
    } catch (error: any) {
      logger.error('Failed to initialize AgentMarket MCP Server:', error);
      throw error;
    }
  }

  /**
   * Set up handlers for all MCP tools
   */
  private setupToolHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'discover_services',
            description:
              'Search and discover AI services by capability, price range, or minimum rating. Returns a filtered list of available services.',
            inputSchema: {
              type: 'object',
              properties: {
                capability: {
                  type: 'string',
                  description:
                    'Filter by service capability (e.g., "image-analysis", "sentiment-analysis")',
                },
                maxPrice: {
                  type: 'string',
                  description:
                    'Maximum price per request in format $X.XX (e.g., "$1.00")',
                  pattern: '^\\$\\d+(\\.\\d{1,2})?$',
                },
                minRating: {
                  type: 'number',
                  description: 'Minimum average rating (1-5)',
                  minimum: 1,
                  maximum: 5,
                },
                limit: {
                  type: 'number',
                  description: 'Maximum number of results to return (1-100)',
                  minimum: 1,
                  maximum: 100,
                  default: 10,
                },
              },
            },
          },
          {
            name: 'get_service_details',
            description:
              'Get complete details about a specific service including pricing, reputation, capabilities, and API information.',
            inputSchema: {
              type: 'object',
              properties: {
                serviceId: {
                  type: 'string',
                  description: 'UUID of the service to retrieve',
                },
              },
              required: ['serviceId'],
            },
          },
          {
            name: 'purchase_service',
            description:
              'Request a service. Returns payment instructions if 402 Payment Required. Client then executes payment and calls submit_payment with transaction signature.',
            inputSchema: {
              type: 'object',
              properties: {
                serviceId: {
                  type: 'string',
                  description: 'UUID of the service to purchase',
                },
                data: {
                  type: 'object',
                  description:
                    'Request data to send to the service (service-specific)',
                },
                maxPayment: {
                  type: 'string',
                  description:
                    'Maximum acceptable payment in format $X.XX (defaults to service price)',
                  pattern: '^\\$\\d+(\\.\\d{1,2})?$',
                },
              },
              required: ['serviceId', 'data'],
            },
          },
          {
            name: 'submit_payment',
            description:
              'Complete service purchase after payment execution. Provide transaction signature from your Solana wallet. Server verifies payment on-chain and completes service request.',
            inputSchema: {
              type: 'object',
              properties: {
                serviceId: {
                  type: 'string',
                  description: 'Service ID from payment instruction',
                },
                transactionSignature: {
                  type: 'string',
                  description: 'Solana transaction signature (base58-encoded)',
                },
                requestData: {
                  type: 'object',
                  description: 'Original request data for the service',
                },
              },
              required: ['serviceId', 'transactionSignature', 'requestData'],
            },
          },
          {
            name: 'rate_service',
            description:
              'Submit a rating and optional review for a completed service transaction. Updates the service reputation.',
            inputSchema: {
              type: 'object',
              properties: {
                transactionId: {
                  type: 'string',
                  description: 'UUID of the transaction to rate',
                },
                score: {
                  type: 'number',
                  description: 'Rating score from 1 to 5',
                  minimum: 1,
                  maximum: 5,
                },
                review: {
                  type: 'string',
                  description: 'Optional written review',
                },
              },
              required: ['transactionId', 'score'],
            },
          },
          {
            name: 'list_all_services',
            description:
              'List all available services with pagination. Returns a simplified list of services.',
            inputSchema: {
              type: 'object',
              properties: {
                limit: {
                  type: 'number',
                  description:
                    'Maximum number of services to return (1-200, default: 50)',
                  minimum: 1,
                  maximum: 200,
                  default: 50,
                },
              },
            },
          },
          {
            name: 'get_transaction',
            description:
              'Retrieve complete details about a specific transaction including payment info, request/response data, and status.',
            inputSchema: {
              type: 'object',
              properties: {
                transactionId: {
                  type: 'string',
                  description: 'UUID of the transaction to retrieve',
                },
              },
              required: ['transactionId'],
            },
          },
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      logger.info(`Tool called: ${name}`);
      logger.debug('Tool arguments:', args);

      try {
        switch (name) {
          case 'discover_services':
            return await discoverServices(this.registry, args as any || {});

          case 'get_service_details':
            return await getServiceDetails(this.registry, args as any || {});

          case 'purchase_service':
            return await purchaseService(
              this.registry,
              this.paymentRouter,
              args as any || {}
            );

          case 'submit_payment':
            return await submitPayment(
              this.registry,
              this.paymentRouter,
              this.db,
              args as any || {}
            );

          case 'rate_service':
            return await rateService(this.registry, this.db, args as any || {});

          case 'list_all_services':
            return await listAllServices(this.registry, args as any || {});

          case 'get_transaction':
            return await getTransaction(this.db, args as any || {});

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error: any) {
        logger.error(`Error executing tool ${name}:`, error);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: error.message || 'Unknown error occurred',
              }),
            },
          ],
        };
      }
    });
  }

  /**
   * Start the MCP server with stdio transport
   */
  async start(): Promise<void> {
    try {
      logger.info('Starting MCP server with stdio transport...');

      const transport = new StdioServerTransport();
      await this.server.connect(transport);

      logger.info('✓ MCP server started successfully');
      logger.info('✓ Ready to accept connections from Claude Desktop');
      logger.info('✓ All 7 tools registered and ready');
    } catch (error: any) {
      logger.error('Failed to start MCP server:', error);
      throw error;
    }
  }

  /**
   * Gracefully shut down the server
   */
  async shutdown(): Promise<void> {
    try {
      logger.info('Shutting down AgentMarket MCP Server...');

      if (this.db) {
        await this.db.close();
        logger.info('Database closed');
      }

      await this.server.close();
      logger.info('MCP server closed');

      logger.info('✓ AgentMarket MCP Server shutdown complete');
    } catch (error: any) {
      logger.error('Error during shutdown:', error);
      throw error;
    }
  }
}
