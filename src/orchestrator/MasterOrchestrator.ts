/**
 * Master Orchestrator Agent
 *
 * The star of the SentientExchange demo! This autonomous agent:
 * 1. Takes in "impossible" complex tasks
 * 2. Decomposes them into subtasks
 * 3. Discovers available services from the SentientExchange registry
 * 4. Spawns specialist agents to complete each subtask
 * 5. Coordinates data flow between agents
 * 6. Aggregates results into final output
 * 7. Tracks all costs and transactions
 *
 * Example: "Generate a complete investor pitch deck for an AI coding assistant startup"
 */

import { ServiceRegistry } from '../registry/ServiceRegistry.js';
import { Service } from '../types/index.js';
import { logger } from '../utils/logger.js';

export interface Task {
  id: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  assignedTo?: string;
  result?: unknown;
  cost?: number;
  startTime?: number;
  endTime?: number;
}

export interface SpecialistAgent {
  id: string;
  name: string;
  role: string;
  capabilities: string[];
  tasks: Task[];
  servicesHired: string[];
  totalCost: number;
}

export interface OrchestrationResult {
  success: boolean;
  finalOutput: unknown;
  metadata: {
    totalTime: number;
    totalCost: number;
    servicesUsed: number;
    agentsSpawned: number;
    tasksCompleted: number;
  };
  agents: SpecialistAgent[];
  timeline: Array<{
    timestamp: number;
    event: string;
    agent?: string;
    service?: string;
    cost?: number;
  }>;
}

export class MasterOrchestrator {
  private registry: ServiceRegistry;
  private agents: Map<string, SpecialistAgent> = new Map();
  private timeline: Array<{
    timestamp: number;
    event: string;
    agent?: string;
    service?: string;
    cost?: number;
  }> = [];
  private startTime: number = 0;
  private totalCost: number = 0;

  constructor(registry: ServiceRegistry) {
    this.registry = registry;
  }

  /**
   * Execute a complex task by orchestrating multiple agents and services
   */
  async executeComplexTask(userRequest: string): Promise<OrchestrationResult> {
    this.startTime = Date.now();
    this.timeline = [];
    this.agents.clear();
    this.totalCost = 0;

    logger.info('🎯 Master Orchestrator starting:', { userRequest });
    this.logEvent('orchestration-started', undefined, undefined, 0);

    try {
      // Step 1: Decompose the user request into subtasks
      const subtasks = await this.decomposeTask(userRequest);
      logger.info(`📋 Task decomposed into ${subtasks.length} subtasks`);

      // Step 2: Discover available services from registry
      const availableServices = this.registry.getAllServices();
      logger.info(`🔍 Discovered ${availableServices.length} services in marketplace`);
      this.logEvent('services-discovered', undefined, undefined, 0);

      // Step 3: Spawn specialist agents based on task requirements
      const specialists = await this.spawnSpecialistAgents(subtasks, availableServices);
      logger.info(`🤖 Spawned ${specialists.length} specialist agents`);

      // Step 4: Execute subtasks through specialist agents
      const results = await this.executeSubtasks(specialists, subtasks, availableServices);

      // Step 5: Aggregate results into final output
      const finalOutput = await this.aggregateResults(results, userRequest);

      const totalTime = Date.now() - this.startTime;

      logger.info('✅ Orchestration completed successfully', {
        totalTime: `${totalTime}ms`,
        totalCost: `$${this.totalCost.toFixed(2)}`,
        agentsSpawned: this.agents.size,
      });

      this.logEvent('orchestration-completed', undefined, undefined, 0);

      return {
        success: true,
        finalOutput,
        metadata: {
          totalTime,
          totalCost: this.totalCost,
          servicesUsed: this.countServicesUsed(),
          agentsSpawned: this.agents.size,
          tasksCompleted: subtasks.length,
        },
        agents: Array.from(this.agents.values()),
        timeline: this.timeline,
      };
    } catch (error: unknown) {
      logger.error('❌ Orchestration failed:', error);
      this.logEvent('orchestration-failed', undefined, undefined, 0);

      throw error;
    }
  }

  /**
   * Decompose a complex task into manageable subtasks
   */
  private async decomposeTask(userRequest: string): Promise<Task[]> {
    // For demo: Intelligent task decomposition based on request type
    // In production: Use Claude API to intelligently decompose tasks

    const subtasks: Task[] = [];

    // Check if it's a pitch deck generation request
    if (userRequest.toLowerCase().includes('pitch deck') || userRequest.toLowerCase().includes('investor')) {
      subtasks.push(
        {
          id: 'research-1',
          description: 'Research target market and competitors',
          status: 'pending',
        },
        {
          id: 'analysis-1',
          description: 'Analyze market size and growth trends',
          status: 'pending',
        },
        {
          id: 'analysis-2',
          description: 'Generate pricing strategy',
          status: 'pending',
        },
        {
          id: 'strategy-1',
          description: 'Develop go-to-market strategy',
          status: 'pending',
        },
        {
          id: 'creative-1',
          description: 'Write compelling marketing copy',
          status: 'pending',
        },
        {
          id: 'creative-2',
          description: 'Generate data visualizations',
          status: 'pending',
        },
        {
          id: 'final-1',
          description: 'Build complete pitch deck presentation',
          status: 'pending',
        }
      );
    } else {
      // Generic task decomposition
      subtasks.push(
        {
          id: 'task-1',
          description: 'Gather and aggregate relevant data',
          status: 'pending',
        },
        {
          id: 'task-2',
          description: 'Analyze and extract insights',
          status: 'pending',
        },
        {
          id: 'task-3',
          description: 'Generate final report',
          status: 'pending',
        }
      );
    }

    this.logEvent('task-decomposed', undefined, undefined, 0);
    return subtasks;
  }

  /**
   * Spawn specialist agents based on task requirements
   */
  private async spawnSpecialistAgents(tasks: Task[], _services: Service[]): Promise<SpecialistAgent[]> {
    const specialists: SpecialistAgent[] = [];

    // Research Agent
    const researchAgent: SpecialistAgent = {
      id: 'research-agent-1',
      name: 'Research Agent',
      role: 'Data Collection & Research',
      capabilities: ['company-research', 'news-aggregation', 'market-data', 'web-scraping'],
      tasks: tasks.filter(t => t.id.startsWith('research-')),
      servicesHired: [],
      totalCost: 0,
    };
    specialists.push(researchAgent);
    this.agents.set(researchAgent.id, researchAgent);
    this.logEvent('agent-spawned', researchAgent.id, undefined, 0);

    // Market Analysis Agent
    const analysisAgent: SpecialistAgent = {
      id: 'analysis-agent-1',
      name: 'Market Analysis Agent',
      role: 'Market Analysis & Forecasting',
      capabilities: ['market-analysis', 'trend-forecasting', 'pricing-strategy', 'sentiment-analysis'],
      tasks: tasks.filter(t => t.id.startsWith('analysis-')),
      servicesHired: [],
      totalCost: 0,
    };
    specialists.push(analysisAgent);
    this.agents.set(analysisAgent.id, analysisAgent);
    this.logEvent('agent-spawned', analysisAgent.id, undefined, 0);

    // Strategy Agent
    const strategyAgent: SpecialistAgent = {
      id: 'strategy-agent-1',
      name: 'Strategy Agent',
      role: 'Business Strategy & Planning',
      capabilities: ['gtm-strategy', 'channel-planning', 'competitive-analysis'],
      tasks: tasks.filter(t => t.id.startsWith('strategy-')),
      servicesHired: [],
      totalCost: 0,
    };
    specialists.push(strategyAgent);
    this.agents.set(strategyAgent.id, strategyAgent);
    this.logEvent('agent-spawned', strategyAgent.id, undefined, 0);

    // Creative Agent
    const creativeAgent: SpecialistAgent = {
      id: 'creative-agent-1',
      name: 'Creative Agent',
      role: 'Content Creation & Visualization',
      capabilities: ['copywriting', 'data-visualization', 'presentation-building', 'pdf-generation'],
      tasks: tasks.filter(t => t.id.startsWith('creative-') || t.id.startsWith('final-')),
      servicesHired: [],
      totalCost: 0,
    };
    specialists.push(creativeAgent);
    this.agents.set(creativeAgent.id, creativeAgent);
    this.logEvent('agent-spawned', creativeAgent.id, undefined, 0);

    return specialists;
  }

  /**
   * Execute subtasks by having agents discover and hire appropriate services
   */
  private async executeSubtasks(
    agents: SpecialistAgent[],
    tasks: Task[],
    services: Service[]
  ): Promise<Map<string, unknown>> {
    const results = new Map<string, unknown>();

    for (const agent of agents) {
      logger.info(`🤖 ${agent.name} starting work on ${agent.tasks.length} tasks`);

      for (const task of agent.tasks) {
        task.status = 'in-progress';
        task.startTime = Date.now();
        task.assignedTo = agent.id;

        logger.info(`   📌 Task: ${task.description}`);

        // Agent discovers and hires appropriate services
        const service = await this.discoverService(agent, task, services);

        if (service) {
          const cost = parseFloat((service.pricing.perRequest || service.pricing.amount || "0").replace('$', ''));
          logger.info(`   💰 Hiring: ${service.name} ($${cost} USDC)`);
          this.logEvent('service-hired', agent.id, service.name, cost);

          // Execute service (mock for demo)
          const result = await this.executeService(service, task, agent);

          agent.servicesHired.push(service.name);
          agent.totalCost += cost;
          this.totalCost += cost;

          task.result = result;
          task.cost = cost;
          task.endTime = Date.now();
          task.status = 'completed';

          results.set(task.id, result);

          logger.info(`   ✅ Task completed in ${task.endTime - task.startTime!}ms`);
        } else {
          logger.warn(`   ⚠️  No suitable service found for task`);
          task.status = 'failed';
        }
      }
    }

    return results;
  }

  /**
   * Agent discovers appropriate service for a task
   */
  private async discoverService(
    agent: SpecialistAgent,
    task: Task,
    services: Service[]
  ): Promise<Service | null> {
    // Find service that matches agent's capabilities
    for (const service of services) {
      const hasMatchingCapability = service.capabilities.some(cap =>
        agent.capabilities.some(agentCap => cap.includes(agentCap) || agentCap.includes(cap))
      );

      if (hasMatchingCapability) {
        return service;
      }
    }

    return null;
  }

  /**
   * Execute a service (mock for demo - in production would make real x402 payment request)
   */
  private async executeService(service: Service, _task: Task, _agent: SpecialistAgent): Promise<Record<string, unknown>> {
    // For demo: Return mock realistic data based on service type
    await this.simulateProcessingTime();

    if (service.name.includes('Company Data')) {
      return {
        company: 'AI Coding Assistant Inc.',
        industry: 'Developer Tools',
        funding: '$60M Series A',
        team: '20-50 employees',
      };
    } else if (service.name.includes('News')) {
      return {
        articles: 5,
        topTrend: 'AI coding assistants gaining 300% adoption',
      };
    } else if (service.name.includes('Market Research')) {
      return {
        marketSize: '$2.5B',
        growthRate: '45% CAGR',
        keyPlayers: ['GitHub Copilot', 'Cursor', 'Codeium'],
      };
    } else if (service.name.includes('Trend')) {
      return {
        forecast: '5-year outlook positive',
        confidence: 87,
        trends: ['AI pair programming', 'Context-aware assistance'],
      };
    } else if (service.name.includes('Pricing')) {
      return {
        tiers: ['Free', 'Pro $20/mo', 'Enterprise Custom'],
        roi: '15x productivity increase',
      };
    } else if (service.name.includes('Channel')) {
      return {
        channels: ['Product-Led Growth', 'Developer Communities', 'Content Marketing'],
        budget: { plg: 40, community: 30, content: 30 },
      };
    } else if (service.name.includes('Copywriter')) {
      return {
        headline: 'Ship Code 10x Faster with AI',
        cta: 'Start Coding with AI Today',
      };
    } else if (service.name.includes('Chart')) {
      return {
        chartType: 'line',
        dataPoints: 12,
      };
    } else if (service.name.includes('Presentation')) {
      return {
        slides: 12,
        format: 'pptx',
        downloadUrl: '/pitch-deck.pptx',
      };
    }

    return { success: true };
  }

  /**
   * Aggregate results from all agents into final output
   */
  private async aggregateResults(results: Map<string, unknown>, originalRequest: string): Promise<Record<string, unknown>> {
    logger.info('📦 Aggregating results from all agents...');

    const aggregated: Record<string, unknown> = {
      request: originalRequest,
      timestamp: new Date().toISOString(),
      results: {},
    };

    // Group results by agent
    const resultsObj = aggregated.results as Record<string, unknown>;
    for (const [_agent, agentData] of this.agents) {
      resultsObj[agentData.name] = {
        role: agentData.role,
        tasksCompleted: agentData.tasks.filter(t => t.status === 'completed').length,
        servicesHired: agentData.servicesHired,
        cost: `$${agentData.totalCost.toFixed(2)}`,
        outputs: agentData.tasks.map(t => ({
          task: t.description,
          result: t.result,
        })),
      };
    }

    return aggregated;
  }

  /**
   * Count unique services used across all agents
   */
  private countServicesUsed(): number {
    const uniqueServices = new Set<string>();
    for (const agent of this.agents.values()) {
      agent.servicesHired.forEach(service => uniqueServices.add(service));
    }
    return uniqueServices.size;
  }

  /**
   * Log an event to the timeline
   */
  private logEvent(event: string, agent?: string, service?: string, cost?: number): void {
    this.timeline.push({
      timestamp: Date.now() - this.startTime,
      event,
      agent,
      service,
      cost,
    });
  }

  /**
   * Simulate processing time (for demo realism)
   */
  private async simulateProcessingTime(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
  }

  /**
   * Get current orchestration state (for real-time dashboard)
   */
  getState(): { agents: SpecialistAgent[]; timeline: Array<{ timestamp: number; event: string; agent?: string; service?: string; cost?: number }>; totalCost: number; elapsedTime: number } {
    return {
      agents: Array.from(this.agents.values()),
      timeline: this.timeline,
      totalCost: this.totalCost,
      elapsedTime: Date.now() - this.startTime,
    };
  }

  /**
   * Get the service registry instance (for WebSocket server to query services/transactions)
   */
  getRegistry(): ServiceRegistry {
    return this.registry;
  }
}
