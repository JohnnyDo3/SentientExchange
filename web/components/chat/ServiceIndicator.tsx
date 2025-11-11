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
  const isActive = status === 'executing' || status === 'retrying';

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{
        opacity: 1,
        x: 0,
        boxShadow: isActive
          ? [
              '0 0 10px rgba(168, 85, 247, 0.3)',
              '0 0 20px rgba(168, 85, 247, 0.5)',
              '0 0 10px rgba(168, 85, 247, 0.3)',
            ]
          : '0 0 0px rgba(168, 85, 247, 0)',
      }}
      exit={{ opacity: 0, x: 20 }}
      transition={{
        boxShadow: {
          duration: 2,
          repeat: isActive ? Infinity : 0,
          ease: 'easeInOut',
        },
      }}
      className={`flex items-center gap-3 px-4 py-2.5 backdrop-blur-xl rounded-lg mb-2 transition-all ${
        isActive
          ? 'bg-purple/10 border border-purple/50 shadow-lg'
          : 'bg-dark-card/80 border border-gray-800/50'
      }`}
    >
      {/* Animated Icon with Glow */}
      <motion.div className="relative">
        {isActive && (
          <motion.div
            className="absolute inset-0 blur-md bg-purple/30 rounded-full"
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        )}
        <motion.span
          className="relative text-lg z-10"
          animate={
            isActive
              ? {
                  scale: [1, 1.2, 1],
                  rotate: status === 'retrying' ? [0, 360] : 0,
                  filter: [
                    'brightness(1)',
                    'brightness(1.3)',
                    'brightness(1)',
                  ],
                }
              : {}
          }
          transition={{
            duration: status === 'retrying' ? 1.5 : 1.2,
            repeat: isActive ? Infinity : 0,
            ease: 'easeInOut',
          }}
        >
          {icon}
        </motion.span>
      </motion.div>

      {/* Message */}
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-200">
            {serviceName}
          </span>
          {status === 'executing' && (
            <motion.span
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="text-xs text-purple"
            >
              executing...
            </motion.span>
          )}
          {status === 'retrying' && (
            <motion.span
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="text-xs text-yellow"
            >
              retrying...
            </motion.span>
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

      {/* Status Indicator - Enhanced Pulsing Dots */}
      {isActive && (
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full relative"
              animate={{
                opacity: [0.3, 1, 0.3],
                scale: [0.7, 1.2, 0.7],
              }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                delay: i * 0.15,
                ease: 'easeInOut',
              }}
            >
              <div className="absolute inset-0 bg-purple rounded-full" />
              <motion.div
                className="absolute inset-0 bg-purple rounded-full blur-sm"
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.5, 0, 0.5],
                }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  delay: i * 0.15,
                  ease: 'easeInOut',
                }}
              />
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
