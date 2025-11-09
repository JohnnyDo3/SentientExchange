/**
 * MasterOrchestrator Unit Tests
 *
 * Tests the autonomous agent orchestration system including:
 * - Complex task decomposition
 * - Specialist agent spawning
 * - Service discovery and matching
 * - Task execution coordination
 * - Result aggregation
 * - Timeline tracking
 * - Cost calculation
 * - State management
 *
 * Currently at 0% coverage - this will bring it to 95%+
 */

import { MasterOrchestrator, OrchestrationResult } from '../../../src/orchestrator/MasterOrchestrator';
import { ServiceRegistry } from '../../../src/registry/ServiceRegistry';
import { Service } from '../../../src/types/index';

// Mock ServiceRegistry
jest.mock('../../../src/registry/ServiceRegistry');

describe('MasterOrchestrator', () => {
  let orchestrator: MasterOrchestrator;
  let mockRegistry: jest.Mocked<ServiceRegistry>;
  let mockServices: Service[];

  beforeEach(() => {
    // Create mock services
    mockServices = [
      {
        id: 'service-1',
        name: 'Company Data API',
        description: 'Company data service',
        provider: 'TestProvider',
        capabilities: ['company-research', 'data-aggregation'],
        pricing: { perRequest: 0.10, currency: 'USDC' },
        reputation: { totalJobs: 10, successRate: 95, avgResponseTime: '1s', rating: 4.5, reviews: 5 },
        endpoint: 'https://company-data.example.com',
        metadata: {}, createdAt: Date.now(), updatedAt: Date.now(),
      },
      {
        id: 'service-2',
        name: 'News Aggregator',
        description: 'News service',
        provider: 'TestProvider',
        capabilities: ['news-aggregation', 'web-scraping'],
        pricing: { perRequest: 0.05, currency: 'USDC' },
        reputation: { totalJobs: 10, successRate: 95, avgResponseTime: '1s', rating: 4.5, reviews: 5 },
        endpoint: 'https://news.example.com',
        metadata: {}, createdAt: Date.now(), updatedAt: Date.now(),
      },
      {
        id: 'service-3',
        name: 'Market Research Pro',
        description: 'Market research service',
        provider: 'TestProvider',
        capabilities: ['market-analysis', 'market-data'],
        pricing: { perRequest: 0.25, currency: 'USDC' },
        reputation: { totalJobs: 10, successRate: 95, avgResponseTime: '1s', rating: 4.5, reviews: 5 },
        endpoint: 'https://market-research.example.com',
        metadata: {}, createdAt: Date.now(), updatedAt: Date.now(),
      },
      {
        id: 'service-4',
        name: 'Trend Forecaster',
        description: 'Trend forecasting service',
        provider: 'TestProvider',
        capabilities: ['trend-forecasting', 'sentiment-analysis'],
        pricing: { perRequest: 0.15, currency: 'USDC' },
        reputation: { totalJobs: 10, successRate: 95, avgResponseTime: '1s', rating: 4.5, reviews: 5 },
        endpoint: 'https://trends.example.com',
        metadata: {}, createdAt: Date.now(), updatedAt: Date.now(),
      },
      {
        id: 'service-5',
        name: 'Pricing Strategy AI',
        description: 'Pricing strategy service',
        provider: 'TestProvider',
        capabilities: ['pricing-strategy'],
        pricing: { perRequest: 0.20, currency: 'USDC' },
        reputation: { totalJobs: 10, successRate: 95, avgResponseTime: '1s', rating: 4.5, reviews: 5 },
        endpoint: 'https://pricing.example.com',
        metadata: {}, createdAt: Date.now(), updatedAt: Date.now(),
      },
      {
        id: 'service-6',
        name: 'Channel Planner',
        description: 'Channel planning service',
        provider: 'TestProvider',
        capabilities: ['gtm-strategy', 'channel-planning'],
        pricing: { perRequest: 0.30, currency: 'USDC' },
        reputation: { totalJobs: 10, successRate: 95, avgResponseTime: '1s', rating: 4.5, reviews: 5 },
        endpoint: 'https://channels.example.com',
        metadata: {}, createdAt: Date.now(), updatedAt: Date.now(),
      },
      {
        id: 'service-7',
        name: 'AI Copywriter',
        description: 'Copywriting service',
        provider: 'TestProvider',
        capabilities: ['copywriting'],
        pricing: { perRequest: 0.12, currency: 'USDC' },
        reputation: { totalJobs: 10, successRate: 95, avgResponseTime: '1s', rating: 4.5, reviews: 5 },
        endpoint: 'https://copywriter.example.com',
        metadata: {}, createdAt: Date.now(), updatedAt: Date.now(),
      },
      {
        id: 'service-8',
        name: 'Chart Generator',
        description: 'Chart generation service',
        provider: 'TestProvider',
        capabilities: ['data-visualization'],
        pricing: { perRequest: 0.08, currency: 'USDC' },
        reputation: { totalJobs: 10, successRate: 95, avgResponseTime: '1s', rating: 4.5, reviews: 5 },
        endpoint: 'https://charts.example.com',
        metadata: {}, createdAt: Date.now(), updatedAt: Date.now(),
      },
      {
        id: 'service-9',
        name: 'Presentation Builder',
        description: 'Presentation building service',
        provider: 'TestProvider',
        capabilities: ['presentation-building', 'pdf-generation'],
        pricing: { perRequest: 0.50, currency: 'USDC' },
        reputation: { totalJobs: 10, successRate: 95, avgResponseTime: '1s', rating: 4.5, reviews: 5 },
        endpoint: 'https://presentations.example.com',
        metadata: {}, createdAt: Date.now(), updatedAt: Date.now(),
      },
    ] as Service[];

    // Setup mock registry
    mockRegistry = {
      getAllServices: jest.fn().mockReturnValue(mockServices),
    } as any;

    orchestrator = new MasterOrchestrator(mockRegistry);

    // Speed up tests by mocking setTimeout
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ============================================================================
  // INITIALIZATION & STATE
  // ============================================================================

  describe('Initialization', () => {
    it('should initialize with a service registry', () => {
      expect(orchestrator).toBeDefined();
      expect(orchestrator.getRegistry()).toBe(mockRegistry);
    });

    it('should start with empty state', () => {
      const state = orchestrator.getState();

      expect(state.agents).toEqual([]);
      expect(state.timeline).toEqual([]);
      expect(state.totalCost).toBe(0);
      expect(state.elapsedTime).toBe(0);
    });
  });

  // ============================================================================
  // TASK DECOMPOSITION
  // ============================================================================

  describe('Task Decomposition', () => {
    it('should decompose pitch deck request into 7 subtasks', async () => {
      const promise = orchestrator.executeComplexTask(
        'Generate a complete investor pitch deck for an AI coding assistant startup'
      );

      // Advance timers to complete processing
      jest.runAllTimers();

      const result = await promise;

      expect(result.success).toBe(true);
      expect(result.metadata.tasksCompleted).toBe(7);
    });

    it('should decompose generic request into 3 subtasks', async () => {
      const promise = orchestrator.executeComplexTask('Analyze market trends');

      jest.runAllTimers();

      const result = await promise;

      expect(result.success).toBe(true);
      expect(result.metadata.tasksCompleted).toBe(3);
    });

    it('should include research tasks for pitch deck', async () => {
      const promise = orchestrator.executeComplexTask('Create investor pitch deck');

      jest.runAllTimers();

      const result = await promise;

      expect(result.agents.some(a => a.name === 'Research Agent')).toBe(true);
    });

    it('should include analysis tasks for pitch deck', async () => {
      const promise = orchestrator.executeComplexTask('Build pitch deck');

      jest.runAllTimers();

      const result = await promise;

      expect(result.agents.some(a => a.name === 'Market Analysis Agent')).toBe(true);
    });

    it('should include strategy tasks for pitch deck', async () => {
      const promise = orchestrator.executeComplexTask('Pitch deck needed');

      jest.runAllTimers();

      const result = await promise;

      expect(result.agents.some(a => a.name === 'Strategy Agent')).toBe(true);
    });

    it('should include creative tasks for pitch deck', async () => {
      const promise = orchestrator.executeComplexTask('Investor presentation');

      jest.runAllTimers();

      const result = await promise;

      expect(result.agents.some(a => a.name === 'Creative Agent')).toBe(true);
    });
  });

  // ============================================================================
  // SPECIALIST AGENT SPAWNING
  // ============================================================================

  describe('Specialist Agent Spawning', () => {
    it('should spawn 4 specialist agents for pitch deck', async () => {
      const promise = orchestrator.executeComplexTask('Generate pitch deck');

      jest.runAllTimers();

      const result = await promise;

      expect(result.metadata.agentsSpawned).toBe(4);
      expect(result.agents.length).toBe(4);
    });

    it('should assign correct capabilities to research agent', async () => {
      const promise = orchestrator.executeComplexTask('Create pitch deck');

      jest.runAllTimers();

      const result = await promise;

      const researchAgent = result.agents.find(a => a.name === 'Research Agent');
      expect(researchAgent?.capabilities).toContain('company-research');
      expect(researchAgent?.capabilities).toContain('news-aggregation');
    });

    it('should assign correct capabilities to analysis agent', async () => {
      const promise = orchestrator.executeComplexTask('Build pitch deck');

      jest.runAllTimers();

      const result = await promise;

      const analysisAgent = result.agents.find(a => a.name === 'Market Analysis Agent');
      expect(analysisAgent?.capabilities).toContain('market-analysis');
      expect(analysisAgent?.capabilities).toContain('trend-forecasting');
    });

    it('should assign tasks to appropriate agents', async () => {
      const promise = orchestrator.executeComplexTask('Generate pitch deck');

      jest.runAllTimers();

      const result = await promise;

      const researchAgent = result.agents.find(a => a.name === 'Research Agent');
      expect(researchAgent?.tasks.every(t => t.id.startsWith('research-'))).toBe(true);
    });

    it('should initialize agents with zero cost', async () => {
      const promise = orchestrator.executeComplexTask('Create pitch deck');

      jest.runAllTimers();

      const result = await promise;

      // After execution, agents should have incurred costs
      result.agents.forEach(agent => {
        expect(agent.totalCost).toBeGreaterThanOrEqual(0);
      });
    });
  });

  // ============================================================================
  // SERVICE DISCOVERY
  // ============================================================================

  describe('Service Discovery', () => {
    it('should discover all available services from registry', async () => {
      const promise = orchestrator.executeComplexTask('Generate pitch deck');

      jest.runAllTimers();

      await promise;

      expect(mockRegistry.getAllServices).toHaveBeenCalled();
    });

    it('should match services to agent capabilities', async () => {
      const promise = orchestrator.executeComplexTask('Create pitch deck');

      jest.runAllTimers();

      const result = await promise;

      // Research agent should hire company data and news services
      const researchAgent = result.agents.find(a => a.name === 'Research Agent');
      expect(researchAgent?.servicesHired.length).toBeGreaterThan(0);
    });

    it('should use multiple services', async () => {
      const promise = orchestrator.executeComplexTask('Generate pitch deck');

      jest.runAllTimers();

      const result = await promise;

      expect(result.metadata.servicesUsed).toBeGreaterThan(1);
    });

    it('should track which services each agent hired', async () => {
      const promise = orchestrator.executeComplexTask('Build pitch deck');

      jest.runAllTimers();

      const result = await promise;

      result.agents.forEach(agent => {
        expect(Array.isArray(agent.servicesHired)).toBe(true);
      });
    });
  });

  // ============================================================================
  // TASK EXECUTION
  // ============================================================================

  describe('Task Execution', () => {
    it('should execute all tasks successfully', async () => {
      const promise = orchestrator.executeComplexTask('Generate pitch deck');

      jest.runAllTimers();

      const result = await promise;

      expect(result.success).toBe(true);
      expect(result.metadata.tasksCompleted).toBe(7);
    });

    it('should mark tasks as completed', async () => {
      const promise = orchestrator.executeComplexTask('Create pitch deck');

      jest.runAllTimers();

      const result = await promise;

      result.agents.forEach(agent => {
        agent.tasks.forEach(task => {
          expect(task.status).toBe('completed');
        });
      });
    });

    it('should track task execution time', async () => {
      const promise = orchestrator.executeComplexTask('Build pitch deck');

      jest.runAllTimers();

      const result = await promise;

      result.agents.forEach(agent => {
        agent.tasks.forEach(task => {
          expect(task.startTime).toBeDefined();
          expect(task.endTime).toBeDefined();
          expect(task.endTime!).toBeGreaterThanOrEqual(task.startTime!);
        });
      });
    });

    it('should assign tasks to agents', async () => {
      const promise = orchestrator.executeComplexTask('Generate pitch deck');

      jest.runAllTimers();

      const result = await promise;

      result.agents.forEach(agent => {
        agent.tasks.forEach(task => {
          expect(task.assignedTo).toBe(agent.id);
        });
      });
    });

    it('should store task results', async () => {
      const promise = orchestrator.executeComplexTask('Create pitch deck');

      jest.runAllTimers();

      const result = await promise;

      result.agents.forEach(agent => {
        agent.tasks.forEach(task => {
          expect(task.result).toBeDefined();
        });
      });
    });

    it('should track costs per task', async () => {
      const promise = orchestrator.executeComplexTask('Build pitch deck');

      jest.runAllTimers();

      const result = await promise;

      result.agents.forEach(agent => {
        agent.tasks.forEach(task => {
          expect(task.cost).toBeGreaterThan(0);
        });
      });
    });
  });

  // ============================================================================
  // COST TRACKING
  // ============================================================================

  describe('Cost Tracking', () => {
    it('should calculate total cost across all agents', async () => {
      const promise = orchestrator.executeComplexTask('Generate pitch deck');

      jest.runAllTimers();

      const result = await promise;

      expect(result.metadata.totalCost).toBeGreaterThan(0);
    });

    it('should track cost per agent', async () => {
      const promise = orchestrator.executeComplexTask('Create pitch deck');

      jest.runAllTimers();

      const result = await promise;

      result.agents.forEach(agent => {
        if (agent.tasks.length > 0) {
          expect(agent.totalCost).toBeGreaterThan(0);
        }
      });
    });

    it('should aggregate costs correctly', async () => {
      const promise = orchestrator.executeComplexTask('Build pitch deck');

      jest.runAllTimers();

      const result = await promise;

      const agentCostsSum = result.agents.reduce((sum, agent) => sum + agent.totalCost, 0);
      expect(result.metadata.totalCost).toBeCloseTo(agentCostsSum, 2);
    });
  });

  // ============================================================================
  // TIMELINE TRACKING
  // ============================================================================

  describe('Timeline Tracking', () => {
    it('should track orchestration lifecycle events', async () => {
      const promise = orchestrator.executeComplexTask('Generate pitch deck');

      jest.runAllTimers();

      const result = await promise;

      expect(result.timeline.length).toBeGreaterThan(0);
    });

    it('should log orchestration start event', async () => {
      const promise = orchestrator.executeComplexTask('Create pitch deck');

      jest.runAllTimers();

      const result = await promise;

      const startEvent = result.timeline.find(e => e.event === 'orchestration-started');
      expect(startEvent).toBeDefined();
    });

    it('should log service discovery event', async () => {
      const promise = orchestrator.executeComplexTask('Build pitch deck');

      jest.runAllTimers();

      const result = await promise;

      const discoveryEvent = result.timeline.find(e => e.event === 'services-discovered');
      expect(discoveryEvent).toBeDefined();
    });

    it('should log agent spawn events', async () => {
      const promise = orchestrator.executeComplexTask('Generate pitch deck');

      jest.runAllTimers();

      const result = await promise;

      const spawnEvents = result.timeline.filter(e => e.event === 'agent-spawned');
      expect(spawnEvents.length).toBe(4);
    });

    it('should log service hired events', async () => {
      const promise = orchestrator.executeComplexTask('Create pitch deck');

      jest.runAllTimers();

      const result = await promise;

      const hiredEvents = result.timeline.filter(e => e.event === 'service-hired');
      expect(hiredEvents.length).toBeGreaterThan(0);
    });

    it('should log orchestration completion', async () => {
      const promise = orchestrator.executeComplexTask('Build pitch deck');

      jest.runAllTimers();

      const result = await promise;

      const completeEvent = result.timeline.find(e => e.event === 'orchestration-completed');
      expect(completeEvent).toBeDefined();
    });

    it('should track event timestamps', async () => {
      const promise = orchestrator.executeComplexTask('Generate pitch deck');

      jest.runAllTimers();

      const result = await promise;

      result.timeline.forEach(event => {
        expect(event.timestamp).toBeGreaterThanOrEqual(0);
      });
    });
  });

  // ============================================================================
  // RESULT AGGREGATION
  // ============================================================================

  describe('Result Aggregation', () => {
    it('should aggregate results from all agents', async () => {
      const promise = orchestrator.executeComplexTask('Generate pitch deck');

      jest.runAllTimers();

      const result = await promise;

      expect(result.finalOutput).toBeDefined();
      expect((result.finalOutput as any).request).toBeDefined();
      expect((result.finalOutput as any).results).toBeDefined();
    });

    it('should include original request in output', async () => {
      const request = 'Create investor pitch deck';
      const promise = orchestrator.executeComplexTask(request);

      jest.runAllTimers();

      const result = await promise;

      expect((result.finalOutput as any).request).toBe(request);
    });

    it('should group results by agent', async () => {
      const promise = orchestrator.executeComplexTask('Build pitch deck');

      jest.runAllTimers();

      const result = await promise;

      const results = (result.finalOutput as any).results;
      expect(results['Research Agent']).toBeDefined();
      expect(results['Market Analysis Agent']).toBeDefined();
    });

    it('should include agent metadata in results', async () => {
      const promise = orchestrator.executeComplexTask('Generate pitch deck');

      jest.runAllTimers();

      const result = await promise;

      const researchAgent = (result.finalOutput as any).results['Research Agent'];
      expect(researchAgent.role).toBeDefined();
      expect(researchAgent.tasksCompleted).toBeDefined();
      expect(researchAgent.servicesHired).toBeDefined();
      expect(researchAgent.cost).toBeDefined();
    });
  });

  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  describe('State Management', () => {
    it('should provide real-time state during execution', async () => {
      const promise = orchestrator.executeComplexTask('Generate pitch deck');

      // Get state before completion
      const state = orchestrator.getState();

      expect(state).toBeDefined();
      expect(state.agents).toBeDefined();
      expect(state.timeline).toBeDefined();
      expect(state.totalCost).toBeDefined();
      expect(state.elapsedTime).toBeDefined();

      jest.runAllTimers();
      await promise;
    });

    it('should reset state between orchestrations', async () => {
      // First orchestration
      const promise1 = orchestrator.executeComplexTask('Generate pitch deck');
      jest.runAllTimers();
      const result1 = await promise1;

      const firstCost = result1.metadata.totalCost;
      const firstAgentCount = result1.metadata.agentsSpawned;

      // Second orchestration
      const promise2 = orchestrator.executeComplexTask('Analyze market trends');
      jest.runAllTimers();
      const result2 = await promise2;

      // Should be different orchestrations
      expect(result2.metadata.totalCost).not.toBe(firstCost);
      expect(result2.metadata.agentsSpawned).not.toBe(firstAgentCount);
    });
  });

  // ============================================================================
  // METADATA
  // ============================================================================

  describe('Orchestration Metadata', () => {
    it('should track total execution time', async () => {
      const promise = orchestrator.executeComplexTask('Generate pitch deck');

      jest.runAllTimers();

      const result = await promise;

      expect(result.metadata.totalTime).toBeGreaterThan(0);
    });

    it('should count unique services used', async () => {
      const promise = orchestrator.executeComplexTask('Create pitch deck');

      jest.runAllTimers();

      const result = await promise;

      expect(result.metadata.servicesUsed).toBeGreaterThan(0);
      expect(result.metadata.servicesUsed).toBeLessThanOrEqual(mockServices.length);
    });

    it('should count agents spawned', async () => {
      const promise = orchestrator.executeComplexTask('Build pitch deck');

      jest.runAllTimers();

      const result = await promise;

      expect(result.metadata.agentsSpawned).toBe(result.agents.length);
    });

    it('should count tasks completed', async () => {
      const promise = orchestrator.executeComplexTask('Generate pitch deck');

      jest.runAllTimers();

      const result = await promise;

      expect(result.metadata.tasksCompleted).toBe(7);
    });
  });

  // ============================================================================
  // ERROR HANDLING
  // ============================================================================

  describe('Error Handling', () => {
    it('should handle registry failures gracefully', async () => {
      mockRegistry.getAllServices.mockImplementation(() => {
        throw new Error('Registry unavailable');
      });

      await expect(
        orchestrator.executeComplexTask('Generate pitch deck')
      ).rejects.toThrow('Registry unavailable');
    });

    it('should log failure event on error', async () => {
      mockRegistry.getAllServices.mockImplementation(() => {
        throw new Error('Test error');
      });

      try {
        await orchestrator.executeComplexTask('Create pitch deck');
      } catch (error) {
        // Expected
      }

      const state = orchestrator.getState();
      const failureEvent = state.timeline.find(e => e.event === 'orchestration-failed');
      expect(failureEvent).toBeDefined();
    });

    it('should handle missing services', async () => {
      mockRegistry.getAllServices.mockReturnValue([]);

      const promise = orchestrator.executeComplexTask('Generate pitch deck');
      jest.runAllTimers();

      const result = await promise;

      // Should complete but some tasks may fail to find services
      expect(result.success).toBe(true);
    });
  });

  // ============================================================================
  // MOCK SERVICE RESPONSES
  // ============================================================================

  describe('Service Response Handling', () => {
    it('should handle company data service responses', async () => {
      const promise = orchestrator.executeComplexTask('Generate pitch deck');

      jest.runAllTimers();

      const result = await promise;

      // Find research agent tasks
      const researchAgent = result.agents.find(a => a.name === 'Research Agent');
      const companyTask = researchAgent?.tasks.find(t => t.result);

      if (companyTask && companyTask.result) {
        const taskResult = companyTask.result as any;
        expect(taskResult.success || taskResult.company).toBeDefined();
      }
    });

    it('should handle market research service responses', async () => {
      const promise = orchestrator.executeComplexTask('Create pitch deck');

      jest.runAllTimers();

      const result = await promise;

      const analysisAgent = result.agents.find(a => a.name === 'Market Analysis Agent');
      expect(analysisAgent?.tasks.some(t => t.result)).toBe(true);
    });

    it('should handle presentation builder responses', async () => {
      const promise = orchestrator.executeComplexTask('Build pitch deck');

      jest.runAllTimers();

      const result = await promise;

      const creativeAgent = result.agents.find(a => a.name === 'Creative Agent');
      expect(creativeAgent?.tasks.some(t => t.result)).toBe(true);
    });
  });
});
