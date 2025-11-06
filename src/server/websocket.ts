/**
 * WebSocket Server for Real-Time Orchestration Updates
 *
 * Broadcasts orchestration events to connected clients:
 * - Agent spawning
 * - Service hiring
 * - Cost updates
 * - Timeline events
 */

import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { logger } from '../utils/logger.js';
import { MasterOrchestrator } from '../orchestrator/MasterOrchestrator.js';
import { getErrorMessage } from '../types';

export class OrchestrationWebSocket {
  private io: SocketIOServer;
  private orchestrator: MasterOrchestrator | null = null;
  private updateInterval: NodeJS.Timeout | null = null;

  constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: [
          'http://localhost:3000',
          'http://localhost:3001',
          'https://www.sentientexchange.com',
          'https://sentientexchange.com',
        ],
        methods: ['GET', 'POST'],
        credentials: true,
      },
    });

    this.setupEventHandlers();
    logger.info('🔌 WebSocket server initialized');
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket) => {
      logger.info(`✅ Client connected: ${socket.id}`);

      // Handle stats request
      socket.on('stats:request', async () => {
        try {
          const stats = await this.getMarketStats();
          socket.emit('stats:update', stats);
        } catch (error) {
          logger.error('Failed to get stats:', error);
        }
      });

      // Handle recent transactions request
      socket.on('transactions:recent', async (data: { limit?: number }) => {
        try {
          const transactions = await this.getRecentTransactions(
            data.limit || 20
          );
          transactions.forEach((tx) => socket.emit('transaction:new', tx));
        } catch (error) {
          logger.error('Failed to get transactions:', error);
        }
      });

      socket.on('start-orchestration', async (data: { query: string }) => {
        logger.info(`🎯 Starting orchestration for: "${data.query}"`);

        try {
          // Broadcast that orchestration is starting
          this.io.emit('orchestration-started', {
            query: data.query,
            timestamp: Date.now(),
          });

          // Start real-time updates
          this.startRealTimeUpdates();

          // Execute orchestration (mock for now - will connect to real orchestrator)
          await this.mockOrchestration(data.query);
        } catch (error: unknown) {
          logger.error('❌ Orchestration failed:', error);
          const message = getErrorMessage(error);
          this.io.emit('orchestration-error', {
            error: message,
            timestamp: Date.now(),
          });
        }
      });

      socket.on('disconnect', () => {
        logger.info(`❌ Client disconnected: ${socket.id}`);
      });
    });
  }

  /**
   * Start broadcasting real-time state updates
   */
  private startRealTimeUpdates() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    // Send state updates every 500ms
    this.updateInterval = setInterval(() => {
      if (this.orchestrator) {
        const state = this.orchestrator.getState();
        this.io.emit('orchestration-update', state);
      }
    }, 500);
  }

  /**
   * Stop real-time updates
   */
  private stopRealTimeUpdates() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  /**
   * Mock orchestration for demo (simulates the real flow)
   */
  private async mockOrchestration(query: string) {
    const startTime = Date.now();

    // Simulate task decomposition
    await this.sleep(500);
    this.io.emit('task-decomposed', {
      subtasks: [
        'Research target market and competitors',
        'Analyze market size and growth trends',
        'Generate pricing strategy',
        'Develop go-to-market strategy',
        'Write compelling marketing copy',
        'Generate data visualizations',
        'Build complete pitch deck presentation',
      ],
      timestamp: Date.now() - startTime,
    });

    // Simulate service discovery
    await this.sleep(300);
    this.io.emit('services-discovered', {
      count: 15,
      timestamp: Date.now() - startTime,
    });

    // Simulate spawning 4 agents
    const agents = [
      {
        id: 'research-agent-1',
        name: 'Research Agent',
        role: 'Data Collection & Research',
      },
      {
        id: 'analysis-agent-1',
        name: 'Market Analysis Agent',
        role: 'Market Analysis & Forecasting',
      },
      {
        id: 'strategy-agent-1',
        name: 'Strategy Agent',
        role: 'Business Strategy & Planning',
      },
      {
        id: 'creative-agent-1',
        name: 'Creative Agent',
        role: 'Content Creation & Visualization',
      },
    ];

    for (const agent of agents) {
      await this.sleep(400);
      this.io.emit('agent-spawned', {
        ...agent,
        timestamp: Date.now() - startTime,
      });
    }

    // Simulate agents hiring services (micropayment pricing) - FASTER for better demo
    const hires = [
      { agent: 'Research Agent', service: 'Company Data API', cost: 0.08 },
      { agent: 'Research Agent', service: 'News Aggregator', cost: 0.1 },
      {
        agent: 'Market Analysis Agent',
        service: 'Market Research',
        cost: 0.35,
      },
      {
        agent: 'Market Analysis Agent',
        service: 'Trend Forecaster',
        cost: 0.45,
      },
      {
        agent: 'Market Analysis Agent',
        service: 'Pricing Optimizer',
        cost: 0.28,
      },
      {
        agent: 'Strategy Agent',
        service: 'Channel Specialist Agent',
        cost: 0.65,
      },
      { agent: 'Creative Agent', service: 'Copywriter', cost: 0.3 },
      { agent: 'Creative Agent', service: 'Chart Generator', cost: 0.15 },
      {
        agent: 'Creative Agent',
        service: 'Presentation Builder Agent',
        cost: 0.95,
      },
    ];

    let totalCost = 0;
    for (const hire of hires) {
      await this.sleep(500); // Faster - 500ms instead of 800ms
      totalCost += hire.cost;

      this.io.emit('service-hired', {
        ...hire,
        totalCost,
        timestamp: Date.now() - startTime,
      });
    }

    // Simulate completion with final output
    await this.sleep(1000);

    const finalOutput = {
      request: query,
      timestamp: new Date().toISOString(),
      deliverable: {
        title: 'AI Coding Assistant Startup - Investor Pitch Deck',
        slides: [
          {
            title: 'Problem',
            content:
              'Developers spend 60% of their time debugging and searching for solutions instead of writing code.',
            data: { timeSaved: '60%', marketSize: '$50B' },
          },
          {
            title: 'Solution',
            content:
              'SentientExchange: AI-powered coding assistant that understands context, writes code, and debugs in real-time.',
            features: [
              'Context-aware completions',
              'Real-time debugging',
              'Multi-language support',
            ],
          },
          {
            title: 'Market Opportunity',
            content: 'TAM: $50B+ developer tools market growing at 22% CAGR',
            data: {
              tam: '$50B+',
              growth: '22% CAGR',
              developers: '27M+ developers worldwide',
            },
          },
          {
            title: 'Business Model',
            content:
              'Freemium with enterprise plans: $0 (Free) → $20/mo (Pro) → Custom (Enterprise)',
            pricing: { free: '$0', pro: '$20/mo', enterprise: 'Custom' },
          },
          {
            title: 'Go-to-Market Strategy',
            content:
              'Developer community → Product-led growth → Enterprise sales',
            channels: [
              'GitHub/GitLab integration',
              'VS Code Marketplace',
              'Developer communities',
              'Enterprise partnerships',
            ],
          },
          {
            title: 'Traction',
            content:
              'Early beta with 1,000+ developers, 4.8/5 rating, 85% daily active usage',
            metrics: { users: '1,000+', rating: '4.8/5', dau: '85%' },
          },
          {
            title: 'Team',
            content:
              'Ex-Google/Meta engineers with 20+ years combined experience in AI/ML and developer tools',
            team: [
              'CEO: AI Research (Ex-Google)',
              'CTO: Infrastructure (Ex-Meta)',
              'CPO: Product (Ex-GitHub)',
            ],
          },
          {
            title: 'The Ask',
            content:
              'Raising $2M seed round to scale product, grow team, and expand market reach',
            ask: {
              amount: '$2M',
              use: [
                'Product development 40%',
                'Team expansion 35%',
                'Marketing 25%',
              ],
            },
          },
        ],
      },
      agentOutputs: {
        'Research Agent': {
          tasks: ['Market research', 'Competitor analysis'],
          findings:
            '27M developers worldwide, $50B TAM, key competitors: GitHub Copilot, Tabnine, Codeium',
        },
        'Market Analysis Agent': {
          tasks: ['Market sizing', 'Pricing strategy'],
          findings:
            'Optimal pricing: $20/mo with 30% conversion from free tier',
        },
        'Strategy Agent': {
          tasks: ['GTM strategy', 'Channel planning'],
          findings:
            'Product-led growth through VS Code marketplace, target 10K users in 6 months',
        },
        'Creative Agent': {
          tasks: ['Copywriting', 'Visualizations', 'Deck assembly'],
          findings:
            '8-slide narrative arc with data visualizations and compelling story',
        },
      },
    };

    this.io.emit('orchestration-completed', {
      success: true,
      totalCost,
      totalTime: Date.now() - startTime,
      servicesUsed: hires.length,
      agentsSpawned: agents.length,
      timestamp: Date.now() - startTime,
      finalOutput, // ← Add the actual deliverable
    });

    this.stopRealTimeUpdates();
  }

  /**
   * Get real market stats from database
   */
  private async getMarketStats() {
    // Get real data from orchestrator's registry
    const services = this.orchestrator?.getRegistry().getAllServices() || [];
    const db = this.orchestrator?.getRegistry().getDatabase();

    // Query database for real transaction stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = today.toISOString();

    let transactionsToday = 0;
    let volumeToday = 0;

    if (db) {
      try {
        const result = await db.get<{ count: number; volume: number }>(
          `
          SELECT COUNT(*) as count, SUM(CAST(amount AS REAL)) as volume
          FROM transactions
          WHERE timestamp >= ? AND status = 'completed'
        `,
          [todayTimestamp]
        );

        transactionsToday = result?.count || 0;
        volumeToday = result?.volume || 0;
      } catch (error) {
        logger.error('Failed to query transaction stats:', error);
      }
    }

    return {
      servicesListed: services.length,
      agentsActive: Math.floor(services.length * 0.4), // Estimate based on services
      transactionsToday,
      volumeToday: parseFloat(volumeToday.toFixed(2)),
    };
  }

  /**
   * Get recent transactions from database
   */
  private async getRecentTransactions(limit: number = 20) {
    const db = this.orchestrator?.getRegistry().getDatabase();

    interface TransactionRow {
      id: string;
      serviceId: string;
      agent: string | null;
      service: string | null;
      price: string;
      status: string;
      timestamp: string;
    }

    const transactions: Array<{
      id: string;
      agent: string;
      service: string;
      price: number;
      timestamp: string;
      status: string;
    }> = [];

    if (db) {
      try {
        const rows = await db.all<TransactionRow>(
          `
          SELECT
            t.id,
            t.serviceId,
            t.buyer as agent,
            s.name as service,
            t.amount as price,
            t.status,
            t.timestamp as timestamp
          FROM transactions t
          LEFT JOIN services s ON t.serviceId = s.id
          ORDER BY t.timestamp DESC
          LIMIT ?
        `,
          [limit]
        );

        return rows.map((row) => ({
          id: row.id,
          agent: row.agent?.substring(0, 8) + '...' || 'Anonymous',
          service: row.service || 'Unknown Service',
          price: parseFloat(row.price) || 0,
          timestamp: row.timestamp,
          status: row.status,
        }));
      } catch (error) {
        logger.error('Failed to query transactions:', error);
      }
    }

    return transactions;
  }

  /**
   * Connect a Master Orchestrator instance for real orchestration
   */
  public connectOrchestrator(orchestrator: MasterOrchestrator) {
    this.orchestrator = orchestrator;
    logger.info('🔗 Master Orchestrator connected to WebSocket');

    // Start broadcasting real stats every 30 seconds
    setInterval(() => {
      void (async () => {
        const stats = await this.getMarketStats();
        this.io.emit('stats:update', stats);
      })();
    }, 30000);
  }

  /**
   * Helper to sleep for async delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get Socket.IO server instance
   */
  public getIO(): SocketIOServer {
    return this.io;
  }
}
