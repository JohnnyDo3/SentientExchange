'use client';

import { motion } from 'framer-motion';
import { Users, Package, Activity, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import AnimatedCounter from '../ui/AnimatedCounter';

export interface DashboardStats {
  agentsActive: number;
  servicesListed: number;
  transactionsToday: number;
  volumeToday: number;
  agentsTrend?: number;
  servicesTrend?: number;
  transactionsTrend?: number;
  volumeTrend?: number;
}

interface AnalyticsOverviewProps {
  stats: DashboardStats;
}

export default function AnalyticsOverview({ stats }: AnalyticsOverviewProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
      <StatCard
        icon={<Users className="w-6 h-6 md:w-8 md:h-8 text-purple" />}
        label="Agents Active"
        value={stats.agentsActive}
        trend={stats.agentsTrend}
        color="purple"
      />

      <StatCard
        icon={<Package className="w-6 h-6 md:w-8 md:h-8 text-blue-400" />}
        label="Services Listed"
        value={stats.servicesListed}
        trend={stats.servicesTrend}
        color="blue"
      />

      <StatCard
        icon={<Activity className="w-6 h-6 md:w-8 md:h-8 text-green" />}
        label="Transactions Today"
        value={stats.transactionsToday}
        trend={stats.transactionsTrend}
        color="green"
      />

      <StatCard
        icon={<DollarSign className="w-6 h-6 md:w-8 md:h-8 text-yellow-400" />}
        label="Volume Today"
        value={stats.volumeToday}
        format="currency"
        decimals={2}
        trend={stats.volumeTrend}
        color="yellow"
      />
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  format = 'number',
  decimals = 0,
  trend,
  color = 'purple'
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  format?: 'number' | 'currency';
  decimals?: number;
  trend?: number;
  color?: 'purple' | 'blue' | 'green' | 'yellow';
}) {
  const isPositive = trend !== undefined && trend > 0;
  const isNegative = trend !== undefined && trend < 0;

  const colorClasses = {
    purple: 'from-purple/20 to-purple/5 border-purple/30',
    blue: 'from-blue-400/20 to-blue-400/5 border-blue-400/30',
    green: 'from-green/20 to-green/5 border-green/30',
    yellow: 'from-yellow-400/20 to-yellow-400/5 border-yellow-400/30'
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={`glass rounded-xl md:rounded-2xl p-4 md:p-6 border bg-gradient-to-br ${colorClasses[color]} hover:scale-105 transition-all`}
    >
      {/* Icon and Trend */}
      <div className="flex items-start justify-between mb-3 md:mb-4">
        <div className="p-2 md:p-3 bg-gray-900/50 rounded-lg">
          {icon}
        </div>

        {trend !== undefined && (
          <div className={`flex items-center gap-1 px-2 py-1 rounded ${
            isPositive ? 'bg-green/20 text-green' :
            isNegative ? 'bg-red-400/20 text-red-400' :
            'bg-gray-700 text-gray-400'
          }`}>
            {isPositive && <TrendingUp className="w-3 h-3" />}
            {isNegative && <TrendingDown className="w-3 h-3" />}
            <span className="text-xs font-semibold">
              {isPositive && '+'}
              {trend}
              {Math.abs(trend) >= 1 && '%'}
            </span>
          </div>
        )}
      </div>

      {/* Value */}
      <div className="text-2xl md:text-4xl font-bold text-white mb-1">
        {format === 'currency' && '$'}
        <AnimatedCounter
          from={0}
          to={value}
          decimals={decimals}
        />
      </div>

      {/* Label */}
      <div className="text-xs md:text-sm text-gray-400">{label}</div>

      {/* Glow Effect */}
      <div className={`absolute inset-0 rounded-xl md:rounded-2xl bg-gradient-to-r ${
        color === 'purple' ? 'from-purple/10 via-transparent to-pink/10' :
        color === 'blue' ? 'from-blue-400/10 via-transparent to-cyan-400/10' :
        color === 'green' ? 'from-green/10 via-transparent to-emerald-400/10' :
        'from-yellow-400/10 via-transparent to-orange-400/10'
      } opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none`} />
    </motion.div>
  );
}
