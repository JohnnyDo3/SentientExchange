'use client';

import { motion } from 'framer-motion';
import { Loader2, CheckCircle, XCircle, DollarSign } from 'lucide-react';

interface ServiceCallCardProps {
  serviceName: string;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  cost: string;
  startTime: string;
  endTime?: string;
  result?: string;
  error?: string;
}

export default function ServiceCallCard({
  serviceName,
  status,
  cost,
  startTime,
  endTime,
  result,
  error
}: ServiceCallCardProps) {
  const statusConfig = {
    pending: {
      icon: Loader2,
      color: 'text-yellow',
      bg: 'bg-yellow/10',
      border: 'border-yellow/30',
      label: 'Discovering...'
    },
    executing: {
      icon: Loader2,
      color: 'text-blue',
      bg: 'bg-blue/10',
      border: 'border-blue/30',
      label: 'Executing...'
    },
    completed: {
      icon: CheckCircle,
      color: 'text-green',
      bg: 'bg-green/10',
      border: 'border-green/30',
      label: 'Completed'
    },
    failed: {
      icon: XCircle,
      color: 'text-red',
      bg: 'bg-red/10',
      border: 'border-red/30',
      label: 'Failed'
    }
  };

  const config = statusConfig[status];
  const Icon = config.icon;
  const isAnimating = status === 'pending' || status === 'executing';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`rounded-lg border ${config.bg} ${config.border} p-4 my-2`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Icon
            className={`w-5 h-5 ${config.color} ${isAnimating ? 'animate-spin' : ''}`}
          />
          <div>
            <p className="font-semibold text-white">{serviceName}</p>
            <p className={`text-sm ${config.color}`}>{config.label}</p>
          </div>
        </div>

        <div className="flex items-center gap-1 text-gray-400">
          <DollarSign className="w-4 h-4" />
          <span className="text-sm">{cost}</span>
        </div>
      </div>

      {result && status === 'completed' && (
        <div className="mt-3 pt-3 border-t border-gray-800">
          <p className="text-sm text-gray-300">{result}</p>
        </div>
      )}

      {error && status === 'failed' && (
        <div className="mt-3 pt-3 border-t border-gray-800">
          <p className="text-sm text-red">{error}</p>
        </div>
      )}

      <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
        <span>Started: {startTime}</span>
        {endTime && <span>Completed: {endTime}</span>}
      </div>
    </motion.div>
  );
}
