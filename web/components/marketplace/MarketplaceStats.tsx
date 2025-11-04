'use client';

import { motion } from 'framer-motion';
import { MarketplaceStats as StatsType } from '@/lib/types';
import { Activity, Package, Star, Database } from 'lucide-react';
import AnimatedCounter from '../ui/AnimatedCounter';
import { soundManager } from '@/lib/sound';

interface MarketplaceStatsProps {
  stats: StatsType;
  useMockData: boolean;
  onToggleDataSource: () => void;
  isBackendAvailable: boolean;
}

export default function MarketplaceStats({
  stats,
  useMockData,
  onToggleDataSource,
  isBackendAvailable
}: MarketplaceStatsProps) {
  return (
    <div className="glass rounded-xl md:rounded-2xl p-4 md:p-6 mb-6 md:mb-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 flex-1">
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

        {/* Data Source Toggle */}
        <div className="flex items-center gap-2 md:gap-3 pt-4 md:pt-0 border-t md:border-t-0 md:border-l border-gray-800 md:pl-6">
          <div className="text-left md:text-right flex-1 md:flex-none">
            <div className="text-xs md:text-sm text-gray-400">Data Source</div>
            <div className="text-sm md:text-base text-white font-semibold">
              {useMockData ? 'Mock Data' : 'Live Backend'}
            </div>
          </div>
          <button
            onClick={() => {
              soundManager.playClick();
              onToggleDataSource();
            }}
            disabled={!useMockData && !isBackendAvailable}
            className={`relative inline-flex h-8 w-16 md:h-10 md:w-20 items-center rounded-full transition-colors ${
              useMockData ? 'bg-gray-700' : 'bg-gradient-to-r from-purple to-pink'
            } ${!isBackendAvailable && !useMockData ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <motion.span
              layout
              className={`inline-block h-6 w-6 md:h-8 md:w-8 transform rounded-full bg-white shadow-lg ${
                useMockData ? 'translate-x-1' : 'translate-x-8 md:translate-x-11'
              }`}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          </button>
        </div>
      </div>

      {/* Backend Status Warning */}
      {!isBackendAvailable && !useMockData && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-3 md:mt-4 p-2 md:p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg"
        >
          <p className="text-xs md:text-sm text-yellow-400">
            ⚠️ Backend API not available. Using mock data as fallback.
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
