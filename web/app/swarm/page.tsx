'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Sparkles, Play, RotateCcw } from 'lucide-react';
import { soundManager } from '@/lib/sound';
import { socketManager } from '@/lib/socket';
import { LiveStats } from '@/components/dashboard/LiveStats';
import { OrchestrationGraph } from '@/components/dashboard/OrchestrationGraph';
import { LiveDeliverable } from '@/components/dashboard/LiveDeliverable';
import Footer from '@/components/Footer';

interface Agent {
  id: string;
  name: string;
  role: string;
  servicesHired: string[];
  totalCost: number;
}

interface OrchestrationEvent {
  type: string;
  timestamp: string;
  agentId: string;
  message: string;
  data?: Record<string, unknown>;
}

interface OrchestrationResult {
  success: boolean;
  output?: string;
  error?: string;
  metadata?: Record<string, unknown>;
}

interface WebSocketEventData {
  type?: string;
  message?: string;
  timestamp?: string;
  agentId?: string;
  name?: string;
  agent?: string;
  cost?: number;
  totalCost?: number;
  output?: string;
  [key: string]: unknown;
}

interface OrchestrationState {
  isRunning: boolean;
  totalCost: number;
  agentsSpawned: number;
  servicesUsed: number;
  elapsedTime: number;
  agents: Agent[];
  events: OrchestrationEvent[];
  result: OrchestrationResult | null;
  finalOutput: string | null;
}

const DEMO_QUERIES = [
  "Generate a complete investor pitch deck for an AI coding assistant startup",
  "Create a comprehensive market analysis report for the AI developer tools industry",
  "Build a go-to-market strategy for a new AI-powered code review tool",
  "Analyze sentiment around AI coding assistants and generate a report",
];

export default function SwarmPage() {
  const [query, setQuery] = useState('');
  const [state, setState] = useState<OrchestrationState>({
    isRunning: false,
    totalCost: 0,
    agentsSpawned: 0,
    servicesUsed: 0,
    elapsedTime: 0,
    agents: [],
    events: [],
    result: null,
    finalOutput: null,
  });

  useEffect(() => {
    // Connect to WebSocket
    socketManager.connect();

    // Setup event listeners
    socketManager.on('orchestration-started', (data: WebSocketEventData) => {
      setState(prev => ({
        ...prev,
        isRunning: true,
        events: [...prev.events, { ...data, event: 'orchestration-started' }],
      }));
      soundManager.playAgentSound();
    });

    socketManager.on('task-decomposed', (data: WebSocketEventData) => {
      setState(prev => ({
        ...prev,
        events: [...prev.events, { ...data, event: 'task-decomposed' }],
      }));
    });

    socketManager.on('services-discovered', (data: WebSocketEventData) => {
      setState(prev => ({
        ...prev,
        events: [...prev.events, { ...data, event: 'services-discovered' }],
      }));
    });

    socketManager.on('agent-spawned', (data: WebSocketEventData) => {
      console.log('Agent spawned:', data);
      setState(prev => ({
        ...prev,
        agentsSpawned: prev.agentsSpawned + 1,
        events: [...prev.events, { ...data, event: 'agent-spawned', agent: data.name }],
      }));
      soundManager.playAgentSound();
    });

    socketManager.on('service-hired', (data: WebSocketEventData) => {
      setState(prev => ({
        ...prev,
        totalCost: data.totalCost || prev.totalCost + (data.cost || 0),
        servicesUsed: prev.servicesUsed + 1,
        events: [...prev.events, { ...data, event: 'service-hired' }],
      }));
      soundManager.playClick();
    });

    socketManager.on('orchestration-completed', (data: WebSocketEventData) => {
      console.log('Orchestration completed:', data);
      console.log('Final output received:', {
        hasFinalOutput: !!data.finalOutput,
        hasDeliverable: !!data.finalOutput?.deliverable,
        slideCount: data.finalOutput?.deliverable?.slides?.length || 0,
        slides: data.finalOutput?.deliverable?.slides
      });
      setState(prev => ({
        ...prev,
        isRunning: false,
        totalCost: data.totalCost || prev.totalCost,
        result: data,
        finalOutput: data.finalOutput, // ← Capture the final deliverable
        events: [...prev.events, { ...data, event: 'orchestration-completed' }],
      }));
      soundManager.playSuccessChord();
    });

    socketManager.on('orchestration-error', (data: WebSocketEventData) => {
      setState(prev => ({
        ...prev,
        isRunning: false,
        events: [...prev.events, { ...data, event: 'orchestration-error' }],
      }));
    });

    // Update elapsed time
    const interval = setInterval(() => {
      setState(prev => {
        if (!prev.isRunning) return prev;
        return { ...prev, elapsedTime: prev.elapsedTime + 100 };
      });
    }, 100);

    return () => {
      clearInterval(interval);
      socketManager.disconnect();
    };
  }, []);

  const handleSubmit = () => {
    if (!query.trim() || state.isRunning) return;

    // Reset state
    setState({
      isRunning: true,
      totalCost: 0,
      agentsSpawned: 0,
      servicesUsed: 0,
      elapsedTime: 0,
      agents: [],
      events: [],
      result: null,
      finalOutput: null, // Clear finalOutput to prevent stale data
    });

    // Start orchestration via WebSocket
    socketManager.startOrchestration(query);
  };

  const handleReset = () => {
    setState({
      isRunning: false,
      totalCost: 0,
      agentsSpawned: 0,
      servicesUsed: 0,
      elapsedTime: 0,
      agents: [],
      events: [],
      result: null,
      finalOutput: null,
    });
    soundManager.playClick();
  };

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Back Button */}
      <div className="fixed top-6 left-6 z-50">
        <button
          className="flex items-center gap-2 px-4 py-2 glass rounded-full text-gray-300 hover:text-white transition-colors"
          onClick={() => {
            soundManager.playClick();
            window.location.href = '/';
          }}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
      </div>

      <div className="container mx-auto px-6 pt-24 pb-12 flex-1">
        {/* Header */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <Sparkles className="w-8 h-8 text-purple" />
            <h1 className="text-5xl font-bold gradient-text">MASTER ORCHESTRATOR</h1>
          </div>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            AI agents autonomously discover, purchase, and coordinate services to complete complex tasks
          </p>
        </motion.div>

        {/* Query Input */}
        <motion.div
          className="max-w-5xl mx-auto mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <div className="glass rounded-2xl p-6">
            <label className="block text-sm text-gray-400 mb-3">ENTER YOUR TASK</label>
            <div className="flex gap-3">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder="Generate a complete investor pitch deck..."
                className="flex-1 px-4 py-3 bg-black/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple/50"
                disabled={state.isRunning}
              />
              <button
                onClick={handleSubmit}
                disabled={!query.trim() || state.isRunning}
                className="px-6 py-3 gradient-bg rounded-xl text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition-transform flex items-center gap-2"
              >
                <Play className="w-4 h-4" />
                Execute
              </button>
              {state.events.length > 0 && !state.isRunning && (
                <button
                  onClick={handleReset}
                  className="px-6 py-3 glass rounded-xl text-white hover:scale-105 transition-transform flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset
                </button>
              )}
            </div>

            {/* Sample Queries */}
            <div className="mt-4 flex flex-wrap gap-2">
              {DEMO_QUERIES.map((demoQuery, i) => (
                <button
                  key={i}
                  onClick={() => setQuery(demoQuery)}
                  disabled={state.isRunning}
                  className="px-3 py-1 text-xs glass-light rounded-full text-gray-400 hover:text-white hover:border-purple/50 transition-colors disabled:opacity-50"
                >
                  {demoQuery.substring(0, 40)}...
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Live Stats */}
        {state.events.length > 0 && (
          <motion.div
            className="max-w-5xl mx-auto mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <LiveStats
              totalCost={state.totalCost}
              agentsSpawned={state.agentsSpawned}
              servicesUsed={state.servicesUsed}
              elapsedTime={state.elapsedTime}
            />
          </motion.div>
        )}

        {/* Split-Screen Layout: Live Orchestration + Output */}
        {state.events.length > 0 && (
          <motion.div
            className="max-w-7xl mx-auto mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left: Live Orchestration Graph */}
              <div className="h-auto">
                <OrchestrationGraph events={state.events} />
              </div>

              {/* Right: Live Deliverable */}
              <div className="min-h-[500px] max-h-[700px]">
                <LiveDeliverable
                  events={state.events}
                  finalOutput={state.finalOutput}
                />
              </div>
            </div>
          </motion.div>
        )}

        {/* Status Indicator */}
        <AnimatePresence>
          {state.isRunning && (
            <motion.div
              className="fixed bottom-6 right-6 glass rounded-full px-6 py-3 z-50"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-sm text-gray-300">Orchestration in progress...</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}
