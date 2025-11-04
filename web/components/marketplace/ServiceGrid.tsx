'use client';

import { motion } from 'framer-motion';
import { Service } from '@/lib/types';
import { Star, DollarSign, Clock, CheckCircle, Zap } from 'lucide-react';
import { soundManager } from '@/lib/sound';

interface ServiceGridProps {
  services: Service[];
  onServiceClick: (service: Service) => void;
}

export default function ServiceGrid({ services, onServiceClick }: ServiceGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
      {services.map((service, index) => (
        <ServiceCard
          key={service.id}
          service={service}
          index={index}
          onClick={() => onServiceClick(service)}
        />
      ))}
    </div>
  );
}

function ServiceCard({
  service,
  index,
  onClick
}: {
  service: Service;
  index: number;
  onClick: () => void;
}) {
  const price = parseFloat(service.pricing.perRequest.replace('$', ''));

  // Get rating color
  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return 'text-green';
    if (rating >= 3.5) return 'text-yellow-400';
    return 'text-orange-500';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: Math.min(index * 0.05, 1) }}
      whileHover={{ scale: 1.02, y: -5 }}
      className="glass rounded-2xl p-4 md:p-6 cursor-pointer border border-transparent hover:border-purple/50 transition-all group"
      onClick={() => {
        soundManager.playServiceClick();
        onClick();
      }}
    >
      {/* Header with icon and rating */}
      <div className="flex items-start gap-3 md:gap-4 mb-4">
        {/* Service Icon */}
        <div
          className="flex-shrink-0 w-12 h-12 md:w-16 md:h-16 rounded-xl flex items-center justify-center text-2xl md:text-3xl"
          style={{
            background: `linear-gradient(135deg, ${service.color || '#a855f7'}20, ${service.color || '#a855f7'}40)`,
            border: `2px solid ${service.color || '#a855f7'}60`
          }}
        >
          {service.image || '🔮'}
        </div>

        {/* Name and Description */}
        <div className="flex-1 min-w-0">
          <h3 className="text-lg md:text-xl font-bold text-white mb-1 group-hover:gradient-text transition-all line-clamp-1">
            {service.name}
          </h3>
          <p className="text-xs md:text-sm text-gray-400 line-clamp-2">
            {service.description}
          </p>
        </div>

        {/* Rating */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <Star className={`w-4 h-4 md:w-5 md:h-5 ${getRatingColor(service.reputation.rating)} fill-current`} />
          <span className={`text-base md:text-lg font-bold ${getRatingColor(service.reputation.rating)}`}>
            {service.reputation.rating.toFixed(1)}
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-2 md:gap-3 mb-4">
        <StatBadge
          icon={<DollarSign className="w-3 h-3 md:w-4 md:h-4 text-green" />}
          label="Price"
          value={`$${price.toFixed(3)}`}
        />
        <StatBadge
          icon={<Clock className="w-3 h-3 md:w-4 md:h-4 text-blue-400" />}
          label="Speed"
          value={service.reputation.avgResponseTime}
        />
        <StatBadge
          icon={<CheckCircle className="w-3 h-3 md:w-4 md:h-4 text-green" />}
          label="Success"
          value={`${service.reputation.successRate}%`}
        />
        <StatBadge
          icon={<Zap className="w-3 h-3 md:w-4 md:h-4 text-yellow-400" />}
          label="Jobs"
          value={service.reputation.totalJobs > 1000
            ? `${(service.reputation.totalJobs / 1000).toFixed(1)}K`
            : service.reputation.totalJobs.toString()
          }
        />
      </div>

      {/* Capabilities */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-1 h-4 bg-purple rounded-full" />
          <span className="text-xs text-gray-400 uppercase tracking-wider">Capabilities</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {service.capabilities.slice(0, 4).map((cap, idx) => (
            <span
              key={idx}
              className="text-xs px-2 py-1 bg-purple/20 text-purple rounded border border-purple/30"
            >
              {cap}
            </span>
          ))}
          {service.capabilities.length > 4 && (
            <span className="text-xs px-2 py-1 text-gray-500">
              +{service.capabilities.length - 4} more
            </span>
          )}
        </div>
      </div>

      {/* Reviews */}
      <div className="pt-3 border-t border-gray-800">
        <p className="text-xs text-gray-500">
          {service.reputation.reviews} review{service.reputation.reviews !== 1 ? 's' : ''} • {service.reputation.totalJobs.toLocaleString()} completed
        </p>
      </div>

      {/* Hover effect glow */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple/0 via-purple/5 to-pink/0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
    </motion.div>
  );
}

function StatBadge({
  icon,
  label,
  value
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-gray-900/50 rounded-lg p-2 md:p-3 border border-gray-800">
      <div className="flex items-center gap-1 md:gap-1.5 mb-1">
        {icon}
        <span className="text-xs text-gray-400">{label}</span>
      </div>
      <div className="text-xs md:text-sm font-semibold text-white truncate">{value}</div>
    </div>
  );
}
