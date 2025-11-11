'use client';

import { motion } from 'framer-motion';

export function MessageSkeleton() {
  return (
    <div className="flex gap-3 animate-pulse">
      <div className="w-10 h-10 rounded-full bg-gray-800" />
      <div className="flex flex-col max-w-[70%] flex-1">
        <div className="rounded-2xl px-4 py-3 bg-gray-800/50 backdrop-blur-xl">
          <div className="space-y-2">
            <div className="h-4 bg-gray-700 rounded w-3/4" />
            <div className="h-4 bg-gray-700 rounded w-1/2" />
          </div>
        </div>
        <div className="h-3 bg-gray-800 rounded w-20 mt-1" />
      </div>
    </div>
  );
}

export function ChatHistorySkeleton() {
  return (
    <div className="space-y-2 p-2 animate-pulse">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="p-3 rounded-lg bg-gray-900/30 border border-gray-800/30">
          <div className="flex items-start gap-3">
            <div className="w-4 h-4 bg-gray-800 rounded flex-shrink-0 mt-1" />
            <div className="flex-1 min-w-0 space-y-2">
              <div className="h-4 bg-gray-800 rounded w-3/4" />
              <div className="h-3 bg-gray-800 rounded w-full" />
              <div className="flex items-center gap-2 mt-2">
                <div className="h-3 bg-gray-800 rounded w-16" />
                <div className="h-3 bg-gray-800 rounded w-24" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ServiceCardSkeleton() {
  return (
    <div className="bg-gray-800/30 border border-gray-700 rounded-lg p-4 animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gray-700 rounded" />
          <div className="space-y-2">
            <div className="h-4 bg-gray-700 rounded w-32" />
            <div className="h-3 bg-gray-700 rounded w-20" />
          </div>
        </div>
      </div>
      <div className="space-y-2 mb-3">
        <div className="h-3 bg-gray-700 rounded w-full" />
        <div className="h-3 bg-gray-700 rounded w-3/4" />
      </div>
      <div className="flex gap-1 mb-3">
        <div className="h-6 bg-gray-700 rounded w-16" />
        <div className="h-6 bg-gray-700 rounded w-20" />
        <div className="h-6 bg-gray-700 rounded w-14" />
      </div>
      <div className="flex items-center justify-between pt-3 border-t border-gray-700">
        <div className="h-4 bg-gray-700 rounded w-24" />
        <div className="w-4 h-4 bg-gray-700 rounded" />
      </div>
    </div>
  );
}

export function TypingIndicatorSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-3"
    >
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple/20 to-blue/20 flex items-center justify-center">
        <div className="w-5 h-5 bg-purple/30 rounded-full animate-pulse" />
      </div>
      <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl px-4 py-3">
        <div className="flex items-center gap-2">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 bg-purple rounded-full"
              animate={{
                opacity: [0.3, 1, 0.3],
                scale: [0.8, 1.2, 0.8],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: i * 0.15,
              }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

export function ServiceBrowserLoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <ServiceCardSkeleton key={i} />
      ))}
    </div>
  );
}
