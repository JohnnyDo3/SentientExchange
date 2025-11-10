'use client';

import { motion } from 'framer-motion';

interface ServiceIndicatorProps {
  serviceName: string;
  status: 'executing' | 'retrying' | 'completed' | 'failed';
  icon: string;
  message: string;
  cost?: string;
}

export default function ServiceIndicator({
  serviceName,
  status,
  icon,
  message,
  cost,
}: ServiceIndicatorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="flex items-center gap-3 px-4 py-2.5 bg-dark-card border border-gray-800 rounded-lg mb-2"
    >
      {/* Animated Icon */}
      <motion.span
        className="text-lg"
        animate={
          status === 'executing' || status === 'retrying'
            ? {
                scale: [1, 1.15, 1],
                rotate: status === 'retrying' ? [0, 360] : 0,
              }
            : {}
        }
        transition={{
          duration: status === 'retrying' ? 1.5 : 1.2,
          repeat: status === 'executing' || status === 'retrying' ? Infinity : 0,
          ease: 'easeInOut',
        }}
      >
        {icon}
      </motion.span>

      {/* Message */}
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-200">
            {serviceName}
          </span>
          {status === 'executing' && (
            <span className="text-xs text-gray-500">executing...</span>
          )}
          {status === 'retrying' && (
            <span className="text-xs text-yellow-500">retrying...</span>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-0.5">{message}</p>
      </div>

      {/* Cost Badge */}
      {cost && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="text-xs font-mono text-purple bg-purple/10 px-2 py-1 rounded"
        >
          {cost}
        </motion.span>
      )}

      {/* Status Indicator */}
      {(status === 'executing' || status === 'retrying') && (
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-1.5 h-1.5 bg-purple rounded-full"
              animate={{
                opacity: [0.3, 1, 0.3],
                scale: [0.8, 1, 0.8],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: i * 0.2,
              }}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}
