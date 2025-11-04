'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Zap, DollarSign, CheckCircle } from 'lucide-react';
import { useMemo } from 'react';

interface OrchestrationGraphProps {
  events: any[];
}

export function OrchestrationGraph({ events }: OrchestrationGraphProps) {
  const { agents, services, activeConnections } = useMemo(() => {
    const agentsMap = new Map<string, any>();
    const servicesMap = new Map<string, any>();
    const connections: any[] = [];

    for (const event of events) {
      if (event.event === 'agent-spawned') {
        const agentName = event.name || event.agent;
        agentsMap.set(agentName, {
          name: agentName,
          role: event.role,
          active: true,
        });
      }

      if (event.event === 'service-hired') {
        const serviceId = event.service;
        const agentName = event.agent;

        if (!servicesMap.has(serviceId)) {
          servicesMap.set(serviceId, {
            name: event.service,
            cost: event.cost,
            agent: agentName,
          });
        }

        connections.push({
          from: agentName || 'Master Orchestrator',
          to: serviceId,
          cost: event.cost,
        });
      }
    }

    return {
      agents: Array.from(agentsMap.values()),
      services: Array.from(servicesMap.values()),
      activeConnections: connections,
    };
  }, [events]);

  const totalCost = services.reduce((sum, s) => sum + (s.cost || 0), 0);
  const isActive = events.some(e => e.event !== 'orchestration-completed');

  return (
    <div className="relative glass rounded-2xl p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xl font-bold text-white">Live Orchestration</h3>
          <div className="flex items-center gap-2">
            {isActive && (
              <div className="flex items-center gap-2 px-3 py-1 bg-green-500/20 rounded-full">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-xs text-green-400 font-semibold">ACTIVE</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-4 text-sm">
          <span className="text-gray-400">
            <span className="text-purple-400 font-bold">{agents.length}</span> Agents
          </span>
          <span className="text-gray-400">•</span>
          <span className="text-gray-400">
            <span className="text-blue-400 font-bold">{services.length}</span> Services
          </span>
          <span className="text-gray-400">•</span>
          <span className="text-gray-400">
            <span className="text-green-400 font-bold">${totalCost.toFixed(2)}</span> Total
          </span>
        </div>
      </div>

      {/* Orchestration Visualization */}
      <div className="relative">
        {/* Orchestrator - Top Center */}
        <div className="flex justify-center mb-12">
          <motion.div
            className="relative"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', damping: 20 }}
          >
            <div className="w-40 h-20 rounded-xl bg-gradient-to-br from-purple-600 to-purple-800 border-2 border-purple-400 flex items-center justify-center shadow-lg shadow-purple-500/50">
              <div className="text-center">
                <div className="text-2xl mb-1">🎯</div>
                <div className="text-white font-bold text-sm">Master</div>
                <div className="text-purple-200 text-xs">Orchestrator</div>
              </div>
            </div>

            {/* Pulsing ring effect */}
            {isActive && (
              <motion.div
                className="absolute inset-0 rounded-xl border-2 border-purple-400"
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.5, 0, 0.5],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
            )}
          </motion.div>
        </div>

        {/* Agents - Middle Row */}
        {agents.length > 0 && (
          <div className="grid grid-cols-4 gap-4 mb-12">
            {agents.map((agent, index) => (
              <motion.div
                key={agent.name}
                className="relative"
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: index * 0.2, type: 'spring' }}
              >
                {/* Connection line to orchestrator */}
                <svg className="absolute -top-12 left-1/2 -translate-x-1/2 w-1 h-12 z-0">
                  <motion.line
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="48"
                    stroke="url(#gradient-purple)"
                    strokeWidth="2"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ delay: index * 0.2, duration: 0.5 }}
                  />
                  <defs>
                    <linearGradient id="gradient-purple" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#a78bfa" />
                      <stop offset="100%" stopColor="#ec4899" />
                    </linearGradient>
                  </defs>
                </svg>

                <div className="relative z-10 bg-gradient-to-br from-pink-600 to-pink-800 border-2 border-pink-400 rounded-lg p-3 shadow-lg shadow-pink-500/30">
                  <div className="text-center">
                    <div className="text-xl mb-1">🤖</div>
                    <div className="text-white font-semibold text-xs leading-tight mb-1">
                      {agent.name.replace(' Agent', '')}
                    </div>
                    {agent.active && (
                      <div className="flex items-center justify-center gap-1">
                        <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                        <span className="text-green-300 text-[10px]">WORKING</span>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Services - Bottom Grid */}
        {services.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            <AnimatePresence mode="popLayout">
              {services.map((service, index) => {
                const agentIndex = agents.findIndex(a => a.name === service.agent);
                const delay = index * 0.15;

                return (
                  <motion.div
                    key={service.name}
                    className="relative"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay, type: 'spring', damping: 15 }}
                    layout
                  >
                    <div className="relative z-10 bg-gradient-to-br from-blue-600 to-cyan-600 border-2 border-blue-400 rounded-lg p-3 shadow-lg shadow-blue-500/30">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <Zap className="w-4 h-4 text-yellow-300 flex-shrink-0" />
                        <div className="flex items-center gap-1 bg-green-500/30 px-2 py-0.5 rounded-full">
                          <DollarSign className="w-3 h-3 text-green-300" />
                          <span className="text-green-300 text-xs font-bold">
                            {service.cost?.toFixed(2)}
                          </span>
                        </div>
                      </div>
                      <div className="text-white font-semibold text-xs leading-tight">
                        {service.name}
                      </div>
                    </div>

                    {/* Animated connection to agent */}
                    {agentIndex >= 0 && (
                      <motion.div
                        className="absolute bottom-full left-1/2 -translate-x-1/2 w-0.5 bg-gradient-to-b from-pink-400 to-blue-400"
                        initial={{ height: 0 }}
                        animate={{ height: '3rem' }}
                        transition={{ delay: delay + 0.2, duration: 0.3 }}
                      />
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {/* Empty State */}
        {agents.length === 0 && services.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Zap className="w-16 h-16 mx-auto mb-4 opacity-50" />
            </motion.div>
            <p>Waiting for orchestration to begin...</p>
          </div>
        )}
      </div>

      {/* Activity Stats at Bottom */}
      {services.length > 0 && (
        <motion.div
          className="mt-6 pt-6 border-t border-gray-700"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-400">{agents.length}</div>
              <div className="text-xs text-gray-400 mt-1">PARALLEL AGENTS</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">{services.length}</div>
              <div className="text-xs text-gray-400 mt-1">SERVICES HIRED</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">${totalCost.toFixed(2)}</div>
              <div className="text-xs text-gray-400 mt-1">MICROPAYMENTS</div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
