'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Target, FileText, Search, Bot, DollarSign, CheckCircle, XCircle } from 'lucide-react';

interface TimelineEvent {
  timestamp: number;
  event: string;
  agent?: string;
  service?: string;
  cost?: number;
  data?: any;
}

interface EventTimelineProps {
  events: TimelineEvent[];
}

export function EventTimeline({ events }: EventTimelineProps) {
  const getEventIcon = (event: string) => {
    if (event.includes('started')) return Target;
    if (event.includes('decomposed')) return FileText;
    if (event.includes('discovered')) return Search;
    if (event.includes('spawned')) return Bot;
    if (event.includes('hired')) return DollarSign;
    if (event.includes('completed')) return CheckCircle;
    if (event.includes('error')) return XCircle;
    return Target;
  };

  const getEventColor = (event: string) => {
    if (event.includes('started')) return 'text-blue-400';
    if (event.includes('spawned')) return 'text-purple-400';
    if (event.includes('hired')) return 'text-green-400';
    if (event.includes('completed')) return 'text-emerald-400';
    if (event.includes('error')) return 'text-red-400';
    return 'text-gray-400';
  };

  const getEventMessage = (e: TimelineEvent) => {
    if (e.event === 'orchestration-started') return '🎯 Orchestration started';
    if (e.event === 'task-decomposed') {
      const subtasks = (e.data as any)?.subtasks || (e as any).subtasks;
      return `📋 Task decomposed into ${subtasks?.length || 7} subtasks`;
    }
    if (e.event === 'services-discovered') {
      const count = (e.data as any)?.count || (e as any).count;
      return `🔍 Discovered ${count || 15} services`;
    }
    if (e.event === 'agent-spawned') {
      const agentName = (e as any).name || e.agent || 'Agent';
      return `🤖 Spawned ${agentName}`;
    }
    if (e.event === 'service-hired') return `💰 ${e.agent || 'Agent'} hired ${e.service} ($${e.cost?.toFixed(2) || '0.00'})`;
    if (e.event === 'orchestration-completed') {
      const totalCost = (e as any).totalCost || (e.data as any)?.totalCost;
      return `✅ Orchestration completed ($${totalCost?.toFixed(2) || 'N/A'})`;
    }
    return e.event;
  };

  return (
    <div className="glass rounded-xl p-6 h-[400px] overflow-y-auto custom-scrollbar">
      <h3 className="text-lg font-semibold text-white mb-4">Event Timeline</h3>

      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {events.map((event, index) => {
            const Icon = getEventIcon(event.event);
            const color = getEventColor(event.event);
            const time = (event.timestamp / 1000).toFixed(1);

            return (
              <motion.div
                key={index}
                className="flex items-start gap-3 p-3 glass-light rounded-lg"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                <div className={`p-2 rounded-lg bg-gray-800/50 ${color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-300">{getEventMessage(event)}</p>
                  <p className="text-xs text-gray-500 mt-1">+{time}s</p>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
