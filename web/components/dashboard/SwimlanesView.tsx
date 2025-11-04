'use client';

import { motion } from 'framer-motion';
import { DollarSign } from 'lucide-react';
import { useMemo } from 'react';

interface SwimlanesViewProps {
  events: any[];
}

export function SwimlanesView({ events }: SwimlanesViewProps) {
  // Group events by agent
  const lanes = useMemo(() => {
    const agentLanes = new Map<string, any[]>();

    // Add orchestrator lane
    agentLanes.set('Master Orchestrator', []);

    for (const event of events) {
      if (event.event === 'agent-spawned') {
        const agentName = event.name || event.agent;
        if (!agentLanes.has(agentName)) {
          agentLanes.set(agentName, []);
        }
      }

      if (event.event === 'service-hired') {
        const agentName = event.agent || 'Master Orchestrator';
        if (!agentLanes.has(agentName)) {
          agentLanes.set(agentName, []);
        }
        agentLanes.get(agentName)!.push(event);
      }
    }

    return agentLanes;
  }, [events]);

  if (events.length === 0) {
    return (
      <div className="glass rounded-2xl p-12 text-center">
        <p className="text-gray-400">Orchestration flow will appear here...</p>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl p-6">
      <h3 className="text-xl font-bold text-white mb-6">Agent Workflow</h3>

      <div className="space-y-6">
        {Array.from(lanes.entries()).map(([agentName, agentEvents], laneIndex) => (
          <motion.div
            key={agentName}
            className="relative"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: laneIndex * 0.1 }}
          >
            {/* Agent Header */}
            <div className="flex items-center gap-3 mb-3">
              <div
                className={`w-3 h-3 rounded-full ${
                  agentName === 'Master Orchestrator'
                    ? 'bg-purple-500'
                    : 'bg-pink-500'
                }`}
              />
              <span className="font-semibold text-white">{agentName}</span>
              {agentEvents.length > 0 && (
                <span className="text-xs text-gray-400">
                  ({agentEvents.length} service{agentEvents.length !== 1 ? 's' : ''})
                </span>
              )}
            </div>

            {/* Timeline of services hired */}
            <div className="ml-6 border-l-2 border-gray-700 pl-6 space-y-3">
              {agentEvents.length === 0 ? (
                <div className="text-sm text-gray-500 italic">No services hired yet</div>
              ) : (
                agentEvents.map((event, eventIndex) => (
                  <motion.div
                    key={eventIndex}
                    className="relative"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: (laneIndex * 0.1) + (eventIndex * 0.05) }}
                  >
                    {/* Timeline dot */}
                    <div className="absolute -left-[27px] w-4 h-4 rounded-full bg-blue-500 border-2 border-gray-900" />

                    {/* Service card */}
                    <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg p-3 border border-blue-500/30">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-semibold text-white text-sm">
                            ⚡ {event.service}
                          </p>
                          {event.timestamp && (
                            <p className="text-xs text-gray-400 mt-1">
                              +{(event.timestamp / 1000).toFixed(1)}s
                            </p>
                          )}
                        </div>
                        {event.cost && (
                          <div className="flex items-center gap-1 bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-xs font-bold">
                            <DollarSign className="w-3 h-3" />
                            {event.cost.toFixed(2)}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Summary Stats */}
      <div className="mt-6 pt-6 border-t border-gray-700 grid grid-cols-3 gap-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-purple-400">{lanes.size}</p>
          <p className="text-xs text-gray-400 mt-1">AGENTS</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-blue-400">
            {Array.from(lanes.values()).reduce((sum, events) => sum + events.length, 0)}
          </p>
          <p className="text-xs text-gray-400 mt-1">SERVICES</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-green-400">
            $
            {Array.from(lanes.values())
              .flat()
              .reduce((sum, event) => sum + (event.cost || 0), 0)
              .toFixed(2)}
          </p>
          <p className="text-xs text-gray-400 mt-1">TOTAL COST</p>
        </div>
      </div>
    </div>
  );
}
