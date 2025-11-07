'use client';

import { motion } from 'framer-motion';
import { MarketplaceStats as StatsType } from '@/lib/types';
import { Activity, Package, Star, Database } from 'lucide-react';
import AnimatedCounter from '../ui/AnimatedCounter';
import { soundManager } from '@/lib/sound';

interface MarketplaceStatsProps {
  stats: StatsType;
  isBackendAvailable: boolean;
}

export default function MarketplaceStats({
  stats,
  isBackendAvailable
}: MarketplaceStatsProps) {
  return (
    <div className="glass rounded-xl md:rounded-2xl p-4 md:p-6 mb-6 md:mb-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        <StatItem
          icon={<Package className="w-4 h-4 md:w-5 md:h-5 text-purple" />}
          label="Total Services"
          value={stats.totalServices}
        />
        <StatItem
          icon={<Activity className="w-4 h-4 md:w-5 md:h-5 text-green" />}
          label="Active Now"
          value={stats.activeServices}
        />
        <StatItem
          icon={<Star className="w-4 h-4 md:w-5 md:h-5 text-yellow-400 fill-yellow-400" />}
          label="Avg Rating"
          value={stats.avgRating}
          decimals={1}
        />
        <StatItem
          icon={<Database className="w-4 h-4 md:w-5 md:h-5 text-blue-400" />}
          label="Total Jobs"
          value={stats.totalJobs}
          format="short"
        />
      </div>

      {/* Backend Status Warning */}
      {!isBackendAvailable && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-3 md:mt-4 p-2 md:p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg"
        >
          <p className="text-xs md:text-sm text-yellow-400">
            ⚠️ Backend API not available. Please ensure the API server is running.
          </p>
        </motion.div>
      )}
    </div>
  );
}

function StatItem({
  icon,
  label,
  value,
  decimals,
  format = 'number'
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  decimals?: number;
  format?: 'number' | 'short';
}) {
  const formattedValue = format === 'short'
    ? value >= 1000
      ? `${(value / 1000).toFixed(1)}K`
      : value.toString()
    : value.toString();

  return (
    <div className="flex items-center gap-2 md:gap-3">
      <div className="p-1.5 md:p-2 bg-gray-900/50 rounded-lg">
        {icon}
      </div>
      <div>
        <div className="text-lg md:text-2xl font-bold text-white">
          <AnimatedCounter
            from={0}
            to={value}
            decimals={decimals}
          />
          {format === 'short' && value >= 1000 && 'K'}
        </div>
        <div className="text-xs md:text-sm text-gray-400">{label}</div>
      </div>
    </div>
  );
}
