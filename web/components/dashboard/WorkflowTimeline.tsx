'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  ChevronRight,
  DollarSign,
  Clock,
  ExternalLink,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';

interface WorkflowTimelineProps {
  events: any[];
}

export function WorkflowTimeline({ events }: WorkflowTimelineProps) {
  const [expandedEvents, setExpandedEvents] = useState<Set<number>>(new Set());

  const toggleEvent = (index: number) => {
    const newExpanded = new Set(expandedEvents);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedEvents(newExpanded);
  };

  const getEventIcon = (event: any) => {
    switch (event.event) {
      case 'orchestration-started':
        return '🎯';
      case 'task-decomposed':
        return '🧩';
      case 'services-discovered':
        return '🔍';
      case 'agent-spawned':
        return '🤖';
      case 'service-hired':
        return '💰';
      case 'orchestration-completed':
        return '✅';
      case 'orchestration-error':
        return '❌';
      default:
        return '📌';
    }
  };

  const getEventTitle = (event: any) => {
    switch (event.event) {
      case 'orchestration-started':
        return 'Orchestration Started';
      case 'task-decomposed':
        return `Task Decomposed into ${event.subtasks?.length || 0} Subtasks`;
      case 'services-discovered':
        return `Discovered ${event.services?.length || 0} Services`;
      case 'agent-spawned':
        return `Agent Spawned: ${event.name || event.agent}`;
      case 'service-hired':
        return `Service Hired: ${event.service}`;
      case 'orchestration-completed':
        return 'Orchestration Completed';
      case 'orchestration-error':
        return 'Orchestration Error';
      default:
        return event.event;
    }
  };

  const hasDetails = (event: any) => {
    return event.request || event.response || event.subtasks || event.services || event.error;
  };

  return (
    <div className="space-y-3">
      {events.map((event, index) => {
        const isExpanded = expandedEvents.has(index);
        const showDetails = hasDetails(event);

        return (
          <motion.div
            key={index}
            className="glass-light rounded-xl overflow-hidden"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            {/* Event Header */}
            <div
              className={`flex items-center gap-4 p-4 ${
                showDetails ? 'cursor-pointer hover:bg-white/5' : ''
              } transition-colors`}
              onClick={() => showDetails && toggleEvent(index)}
            >
              {/* Timeline Indicator */}
              <div className="flex flex-col items-center">
                <div className="text-2xl">{getEventIcon(event)}</div>
                {index < events.length - 1 && (
                  <div className="w-0.5 h-8 bg-gradient-to-b from-purple/50 to-transparent mt-2" />
                )}
              </div>

              {/* Event Info */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-white">{getEventTitle(event)}</h3>
                  {event.cost && (
                    <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full font-bold flex items-center gap-1">
                      <DollarSign className="w-3 h-3" />
                      ${event.cost.toFixed(2)}
                    </span>
                  )}
                </div>

                {event.agent && event.event !== 'agent-spawned' && (
                  <p className="text-xs text-gray-400">By: {event.agent}</p>
                )}

                {event.timestamp && (
                  <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                    <Clock className="w-3 h-3" />
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </p>
                )}
              </div>

              {/* Expand Button */}
              {showDetails && (
                <motion.div
                  animate={{ rotate: isExpanded ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                </motion.div>
              )}
            </div>

            {/* Event Details */}
            <AnimatePresence>
              {isExpanded && showDetails && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="border-t border-gray-700"
                >
                  <div className="p-4 space-y-4 bg-black/20">
                    {/* Subtasks */}
                    {event.subtasks && (
                      <div>
                        <p className="text-xs text-gray-400 uppercase font-semibold mb-2">
                          Subtasks
                        </p>
                        <div className="space-y-2">
                          {event.subtasks.map((task: string, i: number) => (
                            <div
                              key={i}
                              className="flex items-start gap-2 text-sm text-gray-300 bg-black/30 rounded-lg p-2"
                            >
                              <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                              <span>{task}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Services Discovered */}
                    {event.services && (
                      <div>
                        <p className="text-xs text-gray-400 uppercase font-semibold mb-2">
                          Available Services
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          {event.services.slice(0, 6).map((service: any, i: number) => (
                            <div
                              key={i}
                              className="text-sm text-gray-300 bg-black/30 rounded-lg p-2"
                            >
                              <p className="font-semibold">{service.name || service}</p>
                              {service.price && (
                                <p className="text-xs text-green-400">${service.price}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Request Payload */}
                    {event.request && (
                      <div>
                        <p className="text-xs text-gray-400 uppercase font-semibold mb-2">
                          📤 Request Sent
                        </p>
                        <pre className="text-xs text-gray-300 bg-black/50 rounded-lg p-3 overflow-x-auto border border-blue-500/30">
                          {typeof event.request === 'string'
                            ? event.request
                            : JSON.stringify(event.request, null, 2)}
                        </pre>
                      </div>
                    )}

                    {/* Response Data */}
                    {event.response && (
                      <div>
                        <p className="text-xs text-gray-400 uppercase font-semibold mb-2">
                          📥 Response Received
                        </p>
                        <pre className="text-xs text-gray-300 bg-black/50 rounded-lg p-3 overflow-x-auto border border-green-500/30">
                          {typeof event.response === 'string'
                            ? event.response
                            : JSON.stringify(event.response, null, 2)}
                        </pre>
                      </div>
                    )}

                    {/* Error */}
                    {event.error && (
                      <div>
                        <p className="text-xs text-red-400 uppercase font-semibold mb-2 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4" />
                          Error Details
                        </p>
                        <pre className="text-xs text-red-300 bg-red-500/10 rounded-lg p-3 overflow-x-auto border border-red-500/30">
                          {typeof event.error === 'string'
                            ? event.error
                            : JSON.stringify(event.error, null, 2)}
                        </pre>
                      </div>
                    )}

                    {/* Transaction Link */}
                    {event.transactionId && (
                      <div>
                        <a
                          href={`https://explorer.solana.com/tx/${event.transactionId}?cluster=devnet`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" />
                          View Transaction on Solana Explorer
                        </a>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}
