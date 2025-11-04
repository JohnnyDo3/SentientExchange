'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Service } from '@/lib/types';
import { Star, DollarSign, Clock, CheckCircle } from 'lucide-react';

interface ServiceTooltipProps {
  service: Service | null;
  position: { x: number; y: number };
}

export default function ServiceTooltip({ service, position }: ServiceTooltipProps) {
  if (!service) return null;

  const price = parseFloat(service.pricing.perRequest.replace('$', ''));

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.15 }}
        className="fixed z-50 pointer-events-none"
        style={{
          left: position.x + 20,
          top: position.y + 20
        }}
      >
        <div className="glass rounded-xl p-4 min-w-[280px] border border-purple/30">
          {/* Service name */}
          <h4 className="text-lg font-bold text-white mb-2">{service.name}</h4>

          {/* Quick stats */}
          <div className="space-y-2">
            {/* Price */}
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-green" />
              <span className="text-green font-semibold">${price.toFixed(3)}</span>
              <span className="text-gray-400 text-sm">per request</span>
            </div>

            {/* Rating */}
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
              <span className="text-white font-semibold">{service.reputation.rating.toFixed(1)}</span>
              <span className="text-gray-400 text-sm">({service.reputation.reviews} reviews)</span>
            </div>

            {/* Response time */}
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-400" />
              <span className="text-gray-300">{service.reputation.avgResponseTime}</span>
            </div>

            {/* Success rate */}
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green" />
              <span className="text-green font-semibold">{service.reputation.successRate}%</span>
              <span className="text-gray-400 text-sm">success rate</span>
            </div>
          </div>

          {/* Capabilities preview */}
          <div className="mt-3 pt-3 border-t border-gray-800">
            <div className="flex flex-wrap gap-1">
              {service.capabilities.slice(0, 3).map((cap, index) => (
                <span
                  key={index}
                  className="text-xs px-2 py-1 bg-purple/20 text-purple rounded"
                >
                  {cap}
                </span>
              ))}
              {service.capabilities.length > 3 && (
                <span className="text-xs px-2 py-1 text-gray-400">
                  +{service.capabilities.length - 3} more
                </span>
              )}
            </div>
          </div>

          {/* Click hint */}
          <div className="mt-3 text-center text-xs text-gray-500">
            Click for details
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
