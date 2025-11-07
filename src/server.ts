/**
 * SentientExchange MCP Server
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
import { SolanaVerifier } from './payment/SolanaVerifier.js';
import { SpendingLimitManager } from './payment/SpendingLimitManager.js';
import { logger } from './utils/logger.js';
import { getErrorMessage } from './types/errors.js';

// Import all tool functions and their types
import { discoverServices, type DiscoverServicesArgs } from './tools/discover.js';
import { getServiceDetails, type GetServiceDetailsArgs } from './tools/details.js';
import { purchaseService, submitPayment, type PurchaseServiceArgs, type SubmitPaymentArgs } from './tools/purchase.js';
import { executePayment, type ExecutePaymentArgs } from './tools/execute-payment.js';
import { rateService, type RateServiceArgs } from './tools/rate.js';
import { listAllServices, type ListAllServicesArgs } from './tools/list.js';
import { getTransaction, type GetTransactionArgs } from './tools/transaction.js';
import { setSpendingLimits, checkSpending, resetSpendingLimits, type SetSpendingLimitsArgs, type CheckSpendingArgs } from './tools/spending-limits.js';
import { discoverAndPrepareService, type DiscoverAndPrepareArgs } from './tools/smart-discover-prepare.js';
import { completeServiceWithPayment, type CompleteServiceWithPaymentArgs } from './tools/smart-execute-complete.js';

/**
 * SentientExchange MCP Server
 *
 * Integrates all components to provide a complete AI service marketplace:
 * - Service discovery and management
 * - x402 payment coordination (client-side execution)
 * - USDC transactions on Solana blockchain
 * - Reputation and rating system
 */
export class SentientExchangeServer {
  private server: Server;
  private db: Database;
  private registry: ServiceRegistry;
  private solanaVerifier: SolanaVerifier;
  private spendingLimitManager: SpendingLimitManager;

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

    // Initialize database (will be set up in initialize())
    this.db = new Database(
      process.env.DATABASE_PATH || './data/agentmarket.db'
    );

    // Registry, verifier, and spending limit manager will be initialized in initialize()
    // Using null assertion as they're guaranteed to be initialized before use
    this.registry = null!;
    this.solanaVerifier = null!;
    this.spendingLimitManager = null!;

    this.setupToolHandlers();
  }

  /**
   * Initialize all server components
   */
  async initialize(): Promise<void> {
    try {
      logger.info('Initializing SentientExchange MCP Server...');

      // Initialize database
      logger.info('Initializing database...');
      await this.db.initialize();
      logger.info('Database initialized successfully');

      // Initialize service registry
      logger.info('Initializing service registry...');
      this.registry = new ServiceRegistry(this.db);
      await this.registry.initialize();
      logger.info('Service registry initialized');

      // Initialize Solana verifier for on-chain payment verification
      logger.info('Initializing Solana verifier...');
      this.solanaVerifier = new SolanaVerifier();
      logger.info('Solana verifier initialized');

      // Initialize spending limit manager
      logger.info('Initializing spending limit manager...');
      this.spendingLimitManager = new SpendingLimitManager(this.db);
      await this.spendingLimitManager.initialize();
      logger.info('Spending limit manager initialized');

      logger.info('SentientExchange MCP Server initialized successfully!');
      logger.info(`Network: Solana ${process.env.NETWORK || 'devnet'}`);
      logger.info(`Payment Protocol: x402 with client-side execution`);
      logger.info(`Verification: Direct on-chain via Solana RPC`);
      logger.info(`Spending Limits: Enabled`);
    } catch (error: unknown) {
      logger.error('Failed to initialize SentientExchange MCP Server:', error);
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
            name: 'execute_payment',
            description:
              'Execute payment locally using your configured wallet. Takes payment instructions from purchase_service and returns transaction signature. This tool runs CLIENT-SIDE with your local SOLANA_PRIVATE_KEY from MCP client environment.',
            inputSchema: {
              type: 'object',
              properties: {
                paymentInstructions: {
                  type: 'object',
                  description: 'Payment instructions from purchase_service 402 response',
                  properties: {
                    transactionId: {
                      type: 'string',
                      description: 'Transaction ID from payment instruction',
                    },
                    amount: {
                      type: 'string',
                      description: 'Amount in token base units (e.g., "1000000" for 1 USDC)',
                    },
                    currency: {
                      type: 'string',
                      description: 'Currency symbol (e.g., "USDC", "SOL")',
                    },
                    recipient: {
                      type: 'string',
                      description: 'Recipient wallet address (base58 public key)',
                    },
                    token: {
                      type: 'string',
                      description: 'Token mint address for SPL tokens (omit for native SOL)',
                    },
                    network: {
                      type: 'string',
                      description: 'Solana network (mainnet-beta, devnet, testnet)',
                      enum: ['mainnet-beta', 'devnet', 'testnet'],
                    },
                  },
                  required: ['transactionId', 'amount', 'currency', 'recipient', 'network'],
                },
              },
              required: ['paymentInstructions'],
            },
          },
          {
            name: 'submit_payment',
            description:
              'Complete service purchase after payment execution. Provide transaction signature from your Solana wallet. Server verifies payment on-chain and completes service request.',
            inputSchema: {
              type: 'object',
              properties: {
                transactionId: {
                  type: 'string',
                  description: 'Transaction ID from payment instruction',
                },
                signature: {
                  type: 'string',
                  description: 'Solana transaction signature from execute_payment (base58-encoded)',
                },
                serviceId: {
                  type: 'string',
                  description: 'Service ID from payment instruction',
                },
                requestData: {
                  type: 'object',
                  description: 'Original request data for the service',
                },
              },
              required: ['transactionId', 'signature', 'serviceId', 'requestData'],
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
          {
            name: 'set_spending_limits',
            description:
              'Set spending limits to control your AI agent\'s budget. You can set per-transaction, daily, and monthly limits. All limits are optional - only set what you want to control.',
            inputSchema: {
              type: 'object',
              properties: {
                perTransaction: {
                  type: 'string',
                  description: 'Maximum amount per single transaction (e.g., "$5.00")',
                },
                daily: {
                  type: 'string',
                  description: 'Maximum total spending per day (e.g., "$50.00")',
                },
                monthly: {
                  type: 'string',
                  description: 'Maximum total spending per month (e.g., "$500.00")',
                },
                enabled: {
                  type: 'boolean',
                  description: 'Enable or disable spending limits (default: true)',
                },
              },
            },
          },
          {
            name: 'check_spending',
            description:
              'Check your current spending statistics and remaining budget. Optionally test if a hypothetical transaction would be allowed.',
            inputSchema: {
              type: 'object',
              properties: {
                amount: {
                  type: 'string',
                  description: 'Optional: Test if this amount would be allowed (e.g., "$10.00")',
                },
              },
            },
          },
          {
            name: 'reset_spending_limits',
            description:
              'Remove all spending limits. After this, you can make unlimited purchases (until you set new limits).',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'discover_and_prepare_service',
            description:
              'SMART TOOL: Discover best service + health check + prepare payment in one call. Finds the best service matching your criteria, verifies it\'s healthy, checks spending limits, makes initial request to get payment details, and returns everything ready for payment execution. Use this instead of calling discover_services + get_service_details + purchase_service separately.',
            inputSchema: {
              type: 'object',
              properties: {
                capability: {
                  type: 'string',
                  description: 'Service capability to search for (e.g., "sentiment-analysis", "image-analysis")',
                },
                requestData: {
                  type: 'object',
                  description: 'Data to send to the service',
                },
                requirements: {
                  type: 'object',
                  description: 'Optional filtering requirements',
                  properties: {
                    maxPrice: {
                      type: 'string',
                      description: 'Maximum price (e.g., "$1.00")',
                    },
                    minRating: {
                      type: 'number',
                      description: 'Minimum rating (1-5)',
                    },
                    mustSupportBatch: {
                      type: 'boolean',
                      description: 'Must support batch processing',
                    },
                    preferredProviders: {
                      type: 'array',
                      items: { type: 'string' },
                      description: 'Preferred service providers',
                    },
                  },
                },
                checkHealth: {
                  type: 'boolean',
                  description: 'Health check services before selection (default: true)',
                  default: true,
                },
                maxPayment: {
                  type: 'string',
                  description: 'Maximum acceptable payment (e.g., "$1.00")',
                },
                userId: {
                  type: 'string',
                  description: 'Optional user ID for spending limit checks',
                },
                maxRetries: {
                  type: 'number',
                  description: 'Max backup services to try on failure (default: 2)',
                  default: 2,
                },
              },
              required: ['capability', 'requestData'],
            },
          },
          {
            name: 'complete_service_with_payment',
            description:
              'SMART TOOL: Complete service purchase with payment verification and automatic retry. After executing payment via execute_payment, use this to verify payment on-chain, submit to service, and get result. If primary service fails, automatically retries with backup services. Use this instead of submit_payment for better reliability.',
            inputSchema: {
              type: 'object',
              properties: {
                sessionId: {
                  type: 'string',
                  description: 'Session ID from discover_and_prepare_service',
                },
                signature: {
                  type: 'string',
                  description: 'Transaction signature from execute_payment',
                },
                retryOnFailure: {
                  type: 'boolean',
                  description: 'Retry with backup services if primary fails (default: true)',
                  default: true,
                },
              },
              required: ['sessionId', 'signature'],
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

      // Get user ID from environment (their Solana wallet address)
      // In MCP, each client provides their own wallet via SOLANA_PRIVATE_KEY
      // We derive the public key for tracking spending limits
      const userId = process.env.USER_WALLET_ADDRESS || 'default-user';

      try {
        switch (name) {
          case 'discover_services':
            return await discoverServices(this.registry, (args as unknown as DiscoverServicesArgs) || {});

          case 'get_service_details':
            return await getServiceDetails(this.registry, (args as unknown as GetServiceDetailsArgs) || {});

          case 'purchase_service':
            return await purchaseService(
              this.registry,
              (args as unknown as PurchaseServiceArgs) || {},
              this.spendingLimitManager,
              userId
            );

          case 'execute_payment':
            return await executePayment((args as unknown as ExecutePaymentArgs) || {});

          case 'submit_payment':
            return await submitPayment(
              this.registry,
              this.db,
              this.solanaVerifier,
              (args as unknown as SubmitPaymentArgs) || {},
              this.spendingLimitManager,
              userId
            );

          case 'rate_service':
            return await rateService(this.registry, this.db, (args as unknown as RateServiceArgs) || {});

          case 'list_all_services':
            return await listAllServices(this.registry, (args as unknown as ListAllServicesArgs) || {});

          case 'get_transaction':
            return await getTransaction(this.db, (args as unknown as GetTransactionArgs) || {});

          case 'set_spending_limits':
            return await setSpendingLimits(
              this.spendingLimitManager,
              userId,
              (args as unknown as SetSpendingLimitsArgs) || {}
            );

          case 'check_spending':
            return await checkSpending(
              this.spendingLimitManager,
              userId,
              (args as unknown as CheckSpendingArgs) || {}
            );

          case 'reset_spending_limits':
            return await resetSpendingLimits(
              this.spendingLimitManager,
              userId
            );

          case 'discover_and_prepare_service':
            return await discoverAndPrepareService(
              this.registry,
              args as unknown as DiscoverAndPrepareArgs,
              this.spendingLimitManager
            );

          case 'complete_service_with_payment':
            return await completeServiceWithPayment(
              this.registry,
              this.solanaVerifier,
              this.db,
              args as unknown as CompleteServiceWithPaymentArgs
            );

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error: unknown) {
        logger.error(`Error executing tool ${name}:`, error);
        const message = getErrorMessage(error);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: message || 'Unknown error occurred',
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
      logger.info('✓ All 8 tools registered and ready');
    } catch (error: unknown) {
      logger.error('Failed to start MCP server:', error);
      throw error;
    }
  }

  /**
   * Gracefully shut down the server
   */
  async shutdown(): Promise<void> {
    try {
      logger.info('Shutting down SentientExchange MCP Server...');

      if (this.db) {
        await this.db.close();
        logger.info('Database closed');
      }

      await this.server.close();
      logger.info('MCP server closed');

      logger.info('✓ SentientExchange MCP Server shutdown complete');
    } catch (error: unknown) {
      logger.error('Error during shutdown:', error);
      throw error;
    }
  }
}
