import { AIReasoningEngine } from './AIReasoningEngine.js';
import { PatternMatcher } from './PatternMatcher.js';
import { QueryExtractor } from './QueryExtractor.js';
import { ServiceRegistry } from '../registry/ServiceRegistry.js';
import { Database } from '../registry/database.js';
import type { ChatMessage, ChatSession, ToolCall } from './types.js';
import { randomUUID } from 'crypto';
import { logger } from '../utils/logger.js';
import { BraveSearchClient } from '../search/BraveSearchClient.js';
import { UniversalX402Client } from '../payment/UniversalX402Client.js';
import { SolanaPaymentCoordinator } from '../payment/SolanaPaymentCoordinator.js';
import { SpendingLimitManager } from '../payment/SpendingLimitManager.js';

export class ChatOrchestrator {
  private aiEngine: AIReasoningEngine;
  private registry: ServiceRegistry;
  private db: Database;
  private searchClient: BraveSearchClient;
  private x402Client: UniversalX402Client;
  private spendingLimitManager: SpendingLimitManager;

  constructor(
    anthropicApiKey: string,
    registry: ServiceRegistry,
    db: Database,
    spendingLimitManager: SpendingLimitManager
  ) {
    this.aiEngine = new AIReasoningEngine(anthropicApiKey);
    this.registry = registry;
    this.db = db;
    this.spendingLimitManager = spendingLimitManager;

    // Initialize search client
    this.searchClient = new BraveSearchClient();

    // Initialize x402 client with payment coordinator
    const paymentCoordinator = new SolanaPaymentCoordinator(
      process.env.SOLANA_RPC_URL,
      process.env.SOLANA_NETWORK || 'devnet'
    );
    this.x402Client = new UniversalX402Client(
      paymentCoordinator,
      'web-chat', // userId for web chat sessions
      spendingLimitManager
    );

    logger.info(
      'ChatOrchestrator initialized with web search + x402 autopay superpowers'
    );
  }

  /**
   * Process user message and stream response
   */
  async *processMessage(
    sessionId: string,
    userMessage: string
  ): AsyncIterable<ChatEvent> {
    // Load conversation history
    const history = await this.loadConversationHistory(sessionId);

    // Save user message
    await this.saveMessage(sessionId, 'user', userMessage);

    // Analyze intent (try pattern matching first for instant detection)
    yield { type: 'thinking', data: {} };

    // Try pattern matching first (instant, <1ms)
    const patternIntent = PatternMatcher.detectIntent(userMessage);

    // Fall back to AI analysis if no pattern matched
    const intent =
      patternIntent ||
      (await this.aiEngine.analyzeIntent(
        userMessage,
        history.map((m) => ({ role: m.role, content: m.content }))
      ));

    // Log which method was used for transparency
    if (patternIntent) {
      logger.info(`✓ Pattern match: ${patternIntent.reasoning} (instant)`);
    } else {
      logger.info(`AI analysis: ${intent.reasoning} (1-2s)`);
    }

    if (intent.needsService && intent.serviceType) {
      // Use marketplace services
      yield {
        type: 'intent',
        data: {
          needsService: true,
          reasoning: intent.reasoning,
          serviceTypes: intent.serviceType,
        },
      };

      const toolCalls: ToolCall[] = [];

      for (const serviceType of intent.serviceType) {
        // Handle marketplace discovery
        if (serviceType === 'marketplace-discovery') {
          try {
            const allServices = await this.registry.searchServices({});

            const serviceList = allServices.map((s) => ({
              name: s.name,
              description: s.description,
              price: s.pricing.perRequest,
              rating: s.reputation.rating,
              capabilities: s.capabilities.slice(0, 3),
              endpoint: s.endpoint,
            }));

            toolCalls.push({
              tool: 'marketplace-discovery',
              arguments: {},
              result: {
                services: serviceList,
                count: allServices.length,
              },
              cost: '$0.00',
              status: 'completed',
              startTime: Date.now(),
              endTime: Date.now(),
            });

            logger.info(
              `Discovered ${allServices.length} marketplace services`
            );
          } catch (error: any) {
            logger.error('Marketplace discovery failed:', error.message);
          }
          continue;
        }

        // Handle web search
        if (serviceType === 'web-search') {
          // Extract clean search query
          const extractedQuery = QueryExtractor.extractSearchQuery(userMessage);

          yield {
            type: 'service_status',
            data: {
              serviceName: 'Web Search',
              status: 'executing',
              icon: '🔍',
              message: 'Searching the web...',
            },
          };

          try {
            let searchResult = await this.searchClient.search(extractedQuery, {
              count: 5,
            });

            // Smart retry if no results
            if (searchResult.results.length === 0) {
              logger.info(
                `No results for "${extractedQuery}", trying refined query...`
              );

              yield {
                type: 'service_status',
                data: {
                  serviceName: 'Web Search',
                  status: 'retrying',
                  icon: '🔄',
                  message: 'No results found, trying refined query...',
                },
              };

              const refinedQuery =
                QueryExtractor.refineSearchQuery(extractedQuery);
              searchResult = await this.searchClient.search(refinedQuery, {
                count: 5,
              });

              if (searchResult.results.length > 0) {
                logger.info(
                  `✓ Refined query "${refinedQuery}" found ${searchResult.results.length} results`
                );
              }
            }

            yield {
              type: 'service_status',
              data: {
                serviceName: 'Web Search',
                status: 'completed',
                icon: '✅',
                message: `Found ${searchResult.results.length} results`,
                cost: searchResult.apiCallCost,
              },
            };

            yield {
              type: 'search_results',
              data: {
                query: searchResult.query,
                results: searchResult.results,
                totalResults: searchResult.totalResults,
                healthCheckPassed: searchResult.healthCheckPassed,
                cost: searchResult.apiCallCost,
                endTime: new Date().toISOString(),
              },
            };

            toolCalls.push({
              tool: 'web-search',
              arguments: { query: extractedQuery },
              result: searchResult,
              cost: searchResult.apiCallCost,
              status: 'completed',
              startTime: Date.now(),
              endTime: Date.now(),
            });
          } catch (error: any) {
            logger.error('Web search failed:', error.message);
            yield {
              type: 'service_status',
              data: {
                serviceName: 'Web Search',
                status: 'failed',
                icon: '❌',
                message: 'Search failed - using AI knowledge instead',
              },
            };
            yield {
              type: 'search_results',
              data: {
                error: error.message,
                healthCheckPassed: false,
                endTime: new Date().toISOString(),
              },
            };
          }
          continue;
        }

        // Handle x402 fetch
        if (serviceType === 'x402-fetch') {
          const url = this.extractUrlFromMessage(userMessage);

          if (!url) {
            logger.error('No URL found in message for x402 fetch');
            continue;
          }

          yield {
            type: 'payment_request',
            data: {
              url,
              status: 'checking_health',
              startTime: new Date().toISOString(),
            },
          };

          try {
            const fetchResult = await this.x402Client.fetchWithAutopay(url, {
              autopayThreshold: '0.50', // TODO: Get from user settings
            });

            if (fetchResult.needsUserApproval) {
              yield {
                type: 'payment_approval_needed',
                data: {
                  url,
                  amount: fetchResult.paymentAmount,
                  recipient: fetchResult.paymentRecipient,
                  threshold: '0.50',
                },
              };
              continue;
            }

            yield {
              type: 'payment_complete',
              data: {
                url,
                success: fetchResult.success,
                paymentExecuted: fetchResult.paymentExecuted,
                amount: fetchResult.paymentAmount,
                signature: fetchResult.paymentSignature,
                healthCheckPassed: fetchResult.healthCheckPassed,
                endTime: new Date().toISOString(),
              },
            };

            toolCalls.push({
              tool: 'x402-fetch',
              arguments: { url },
              result: fetchResult,
              cost: fetchResult.paymentAmount || '$0.00',
              status: fetchResult.success ? 'completed' : 'failed',
              startTime: Date.now(),
              endTime: Date.now(),
            });
          } catch (error: any) {
            logger.error('x402 fetch failed:', error.message);
            yield {
              type: 'payment_complete',
              data: {
                url,
                success: false,
                error: error.message,
                healthCheckPassed: false,
                endTime: new Date().toISOString(),
              },
            };
          }
          continue;
        }

        // Handle marketplace services (existing logic)
        yield {
          type: 'service_call',
          data: {
            serviceName: serviceType,
            status: 'pending',
            cost: '$0.00',
            startTime: new Date().toISOString(),
          },
        };

        const services = await this.registry.searchServices({
          capabilities: [serviceType],
        });

        if (services.length === 0) {
          yield {
            type: 'service_call',
            data: {
              serviceName: serviceType,
              status: 'failed',
              error: 'No matching service found',
              endTime: new Date().toISOString(),
            },
          };
          continue;
        }

        const service = services[0];

        // Execute purchase with session wallet
        yield {
          type: 'service_call',
          data: {
            serviceName: service.name,
            status: 'executing',
            cost:
              service.pricing.perRequest || service.pricing.amount || '$0.00',
          },
        };

        try {
          const result = await this.executeService(
            sessionId,
            service.id,
            intent.taskDescription || userMessage
          );

          toolCalls.push({
            tool: service.name,
            arguments: { query: userMessage },
            result,
            cost: service.pricing.perRequest,
            status: 'completed',
            startTime: Date.now(),
            endTime: Date.now(),
          });

          yield {
            type: 'service_call',
            data: {
              serviceName: service.name,
              status: 'completed',
              result: JSON.stringify(result),
              endTime: new Date().toISOString(),
            },
          };

          // Update session balance
          const session = await this.getSession(sessionId);
          yield {
            type: 'balance_update',
            data: { balance: session.currentBalance },
          };
        } catch (error: any) {
          yield {
            type: 'service_call',
            data: {
              serviceName: service.name,
              status: 'failed',
              error: error.message,
              endTime: new Date().toISOString(),
            },
          };
        }
      }

      // Format service results into response
      const responseStream = await this.aiEngine.formatServiceResponse(
        userMessage,
        toolCalls
      );

      let fullResponse = '';
      for await (const token of responseStream) {
        fullResponse += token;
        yield { type: 'token', data: { token } };
      }

      // Save assistant message
      await this.saveMessage(sessionId, 'assistant', fullResponse, toolCalls);
    } else {
      // Native response
      yield {
        type: 'intent',
        data: {
          needsService: false,
          reasoning: intent.reasoning,
        },
      };

      const responseStream = await this.aiEngine.generateNativeResponse(
        userMessage,
        history.map((m) => ({ role: m.role, content: m.content }))
      );

      let fullResponse = '';
      for await (const token of responseStream) {
        fullResponse += token;
        yield { type: 'token', data: { token } };
      }

      // Save assistant message
      await this.saveMessage(sessionId, 'assistant', fullResponse);
    }

    yield { type: 'done', data: {} };
  }

  private async executeService(
    sessionId: string,
    serviceId: string,
    query: string
  ): Promise<any> {
    // Get service details from registry
    const service = await this.registry.getService(serviceId);
    if (!service) {
      throw new Error(`Service not found: ${serviceId}`);
    }

    logger.info(`Executing service: ${service.name} for session ${sessionId}`);

    // For Phase 4: Call service directly (same server, no x402 needed for now)
    // In production, this would use SessionWalletManager + x402 payment flow
    try {
      const axios = (await import('axios')).default;

      // Map service endpoint to actual service
      let endpoint = service.endpoint;
      let requestBody: any = {};

      // Handle different service types
      if (service.capabilities.includes('sentiment-analysis')) {
        endpoint = '/api/ai/sentiment/analyze';
        requestBody = { text: query };
      } else if (service.capabilities.includes('image-analysis')) {
        endpoint = '/api/ai/image/analyze';
        // For images, query should contain image URL
        requestBody = { imageUrl: query };
      } else if (service.capabilities.includes('text-summarization')) {
        endpoint = '/api/ai/text/summarize';
        requestBody = { text: query };
      }

      // Call service on same server (localhost for now)
      const response = await axios.post(
        `http://localhost:3333${endpoint}`,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
          },
          // Skip x402 auth for internal calls
          validateStatus: () => true,
        }
      );

      if (response.status === 200) {
        logger.info(`✓ Service ${service.name} completed successfully`);
        return response.data;
      } else {
        logger.error(`Service ${service.name} failed: ${response.status}`);
        throw new Error(
          `Service returned ${response.status}: ${response.data?.error || 'Unknown error'}`
        );
      }
    } catch (error: any) {
      logger.error(`Service execution failed:`, error.message);
      throw error;
    }
  }

  private async loadConversationHistory(
    sessionId: string
  ): Promise<ChatMessage[]> {
    const rows = await this.db.all<any>(
      `SELECT * FROM chat_messages WHERE session_id = ? ORDER BY timestamp ASC`,
      [sessionId]
    );

    return rows.map((row) => ({
      id: row.id,
      sessionId: row.session_id,
      role: row.role,
      content: row.content,
      timestamp: row.timestamp,
      toolCalls: row.tool_calls ? JSON.parse(row.tool_calls) : undefined,
    }));
  }

  private async saveMessage(
    sessionId: string,
    role: 'user' | 'assistant',
    content: string,
    toolCalls?: ToolCall[]
  ): Promise<void> {
    await this.db.run(
      `INSERT INTO chat_messages (id, session_id, role, content, tool_calls, timestamp)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        randomUUID(),
        sessionId,
        role,
        content,
        toolCalls ? JSON.stringify(toolCalls) : null,
        Date.now(),
      ]
    );
  }

  private async getSession(sessionId: string): Promise<ChatSession> {
    const row = await this.db.get<any>(
      `SELECT * FROM chat_sessions WHERE id = ?`,
      [sessionId]
    );

    if (!row) throw new Error('Session not found');

    return {
      id: row.id,
      pdaAddress: row.pda_address,
      walletAddress: row.wallet_address,
      initialBalance: row.initial_balance,
      currentBalance: row.current_balance,
      createdAt: row.created_at,
      lastActivity: row.last_activity,
      nonceAccounts: row.nonce_accounts ? JSON.parse(row.nonce_accounts) : [],
    };
  }

  /**
   * Extract URL from user message
   */
  private extractUrlFromMessage(message: string): string | null {
    // Match HTTP/HTTPS URLs
    const urlRegex = /(https?:\/\/[^\s]+)/gi;
    const matches = message.match(urlRegex);

    if (matches && matches.length > 0) {
      return matches[0];
    }

    return null;
  }
}

export interface ChatEvent {
  type:
    | 'thinking'
    | 'intent'
    | 'service_call'
    | 'service_status'
    | 'search_query'
    | 'search_results'
    | 'payment_request'
    | 'payment_approval_needed'
    | 'payment_complete'
    | 'token'
    | 'balance_update'
    | 'done'
    | 'error';
  data: any;
}
