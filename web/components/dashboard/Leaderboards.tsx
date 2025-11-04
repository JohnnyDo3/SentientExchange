'use client';

import { motion } from 'framer-motion';
import { Trophy, Zap, Star, TrendingUp } from 'lucide-react';
import { Service } from '@/lib/types';

interface TopServicesListProps {
  services: Service[];
  limit?: number;
}

export function TopServicesList({ services, limit = 5 }: TopServicesListProps) {
  const topServices = services
    .sort((a, b) => b.reputation.totalJobs - a.reputation.totalJobs)
    .slice(0, limit);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="glass rounded-xl md:rounded-2xl p-4 md:p-6 border border-gray-800"
    >
      {/* Header */}
      <h3 className="text-lg md:text-xl font-bold text-white mb-4 flex items-center gap-2">
        <Trophy className="w-5 h-5 text-yellow-400" />
        Top Services
      </h3>

      {/* List */}
      <div className="space-y-3">
        {topServices.map((service, index) => (
          <motion.div
            key={service.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.1 * index }}
            className="flex items-center gap-3 p-3 bg-gray-900/50 rounded-lg hover:bg-gray-800/50 transition-all group cursor-pointer"
          >
            {/* Rank */}
            <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
              index === 0 ? 'bg-yellow-400/20 text-yellow-400' :
              index === 1 ? 'bg-gray-400/20 text-gray-400' :
              index === 2 ? 'bg-orange-400/20 text-orange-400' :
              'bg-gray-700 text-gray-400'
            }`}>
              {index + 1}
            </div>

            {/* Icon */}
            <div
              className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-lg"
              style={{
                background: `linear-gradient(135deg, ${service.color || '#a855f7'}20, ${service.color || '#a855f7'}40)`,
                border: `1px solid ${service.color || '#a855f7'}60`
              }}
            >
              {service.image || '🔮'}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-white text-sm truncate group-hover:text-purple transition-colors">
                {service.name}
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  {service.reputation.totalJobs.toLocaleString()} uses
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                  {service.reputation.rating.toFixed(1)}
                </span>
              </div>
            </div>

            {/* Badge */}
            {index === 0 && (
              <div className="flex-shrink-0 px-2 py-1 bg-yellow-400/20 text-yellow-400 text-xs font-semibold rounded">
                #1
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

interface AgentActivity {
  id: string;
  name: string;
  requestsToday: number;
  lastSeen: string;
  favoriteService?: string;
}

interface TrendingAgentsProps {
  agents: AgentActivity[];
  limit?: number;
}

export function TrendingAgents({ agents, limit = 5 }: TrendingAgentsProps) {
  const topAgents = agents
    .sort((a, b) => b.requestsToday - a.requestsToday)
    .slice(0, limit);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="glass rounded-xl md:rounded-2xl p-4 md:p-6 border border-gray-800"
    >
      {/* Header */}
      <h3 className="text-lg md:text-xl font-bold text-white mb-4 flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-green" />
        Trending Agents
      </h3>

      {/* List */}
      <div className="space-y-3">
        {topAgents.map((agent, index) => (
          <motion.div
            key={agent.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.1 * index }}
            className="flex items-center gap-3 p-3 bg-gray-900/50 rounded-lg hover:bg-gray-800/50 transition-all group cursor-pointer"
          >
            {/* Avatar */}
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-purple to-pink flex items-center justify-center text-white font-bold text-sm">
              {agent.name.slice(0, 2).toUpperCase()}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-white text-sm truncate group-hover:text-purple transition-colors">
                {agent.name}
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  {agent.requestsToday} requests today
                </span>
              </div>
            </div>

            {/* Status */}
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green rounded-full animate-pulse" />
                <span className="text-xs text-gray-500">Active</span>
              </div>
              {agent.favoriteService && (
                <span className="text-xs text-purple truncate max-w-[100px]">
                  {agent.favoriteService}
                </span>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

// Helper function to generate mock agent data
export function generateMockAgents(): AgentActivity[] {
  const agentNames = [
    'ResearchBot_Alpha',
    'DataAnalyzer_Pro',
    'ContentCurator_v2',
    'InsightEngine_AI',
    'QueryMaster_Plus',
    'InfoSeeker_3000',
    'AnalyticsBot_X',
    'SmartAgent_Prime'
  ];

  const services = ['vision-pro', 'sentiment-ai', 'summarizer', 'translator'];

  return agentNames.map((name, i) => ({
    id: `agent-${i + 1}`,
    name,
    requestsToday: Math.floor(Math.random() * 50) + 10,
    lastSeen: '2 min ago',
    favoriteService: services[Math.floor(Math.random() * services.length)]
  }));
}
