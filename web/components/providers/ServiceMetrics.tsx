'use client';

import { motion } from 'framer-motion';
import { DollarSign, TrendingUp, Star, Activity, ArrowUp, ArrowDown } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import AnimatedCounter from '../ui/AnimatedCounter';

interface ServiceMetricsProps {
  totalRevenue: number;
  totalRequests: number;
  avgRating: number;
  revenueTrend: number;  // Percentage change
  requestsTrend: number; // Number change today
  ratingTrend: number;   // Change in rating
}

export default function ServiceMetrics({
  totalRevenue,
  totalRequests,
  avgRating,
  revenueTrend,
  requestsTrend,
  ratingTrend
}: ServiceMetricsProps) {
  // Generate mock data for the chart (last 30 days)
  const chartData = Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (29 - i));
    return {
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      requests: Math.floor(Math.random() * 50) + Math.floor(totalRequests / 30)
    };
  });

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        <MetricCard
          icon={<DollarSign className="w-6 h-6 md:w-8 md:h-8 text-green" />}
          label="Total Revenue"
          value={totalRevenue}
          format="currency"
          trend={revenueTrend}
          trendLabel={`${revenueTrend > 0 ? '+' : ''}${revenueTrend}%`}
        />

        <MetricCard
          icon={<TrendingUp className="w-6 h-6 md:w-8 md:h-8 text-blue-400" />}
          label="Total Requests"
          value={totalRequests}
          format="number"
          trend={requestsTrend}
          trendLabel={`+${requestsTrend} today`}
        />

        <MetricCard
          icon={<Star className="w-6 h-6 md:w-8 md:h-8 text-yellow-400 fill-yellow-400" />}
          label="Average Rating"
          value={avgRating}
          format="decimal"
          decimals={1}
          trend={ratingTrend}
          trendLabel={`${ratingTrend > 0 ? '+' : ''}${ratingTrend.toFixed(1)}`}
        />
      </div>

      {/* Requests Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="glass rounded-xl md:rounded-2xl p-4 md:p-6"
      >
        <h3 className="text-lg md:text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-purple" />
          Requests Over Time
        </h3>

        <div className="h-64 md:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <defs>
                <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="date"
                stroke="#9ca3af"
                style={{ fontSize: '12px' }}
                tick={{ fill: '#9ca3af' }}
              />
              <YAxis
                stroke="#9ca3af"
                style={{ fontSize: '12px' }}
                tick={{ fill: '#9ca3af' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#ffffff'
                }}
              />
              <Line
                type="monotone"
                dataKey="requests"
                stroke="#a855f7"
                strokeWidth={2}
                fill="url(#colorRequests)"
                dot={{ fill: '#a855f7', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <p className="text-xs md:text-sm text-gray-500 mt-4">
          Last 30 days of request activity
        </p>
      </motion.div>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  format = 'number',
  decimals = 0,
  trend,
  trendLabel
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  format?: 'number' | 'currency' | 'decimal';
  decimals?: number;
  trend?: number;
  trendLabel?: string;
}) {
  const isPositive = trend !== undefined && trend > 0;
  const isNegative = trend !== undefined && trend < 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="glass rounded-xl md:rounded-2xl p-4 md:p-6 border border-gray-800 hover:border-purple/30 transition-all"
    >
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
            {isPositive && <ArrowUp className="w-3 h-3" />}
            {isNegative && <ArrowDown className="w-3 h-3" />}
            <span className="text-xs font-semibold">{trendLabel}</span>
          </div>
        )}
      </div>

      <div className="text-2xl md:text-3xl font-bold text-white mb-1">
        {format === 'currency' && '$'}
        <AnimatedCounter
          from={0}
          to={value}
          decimals={decimals}
        />
        {format === 'decimal' && value >= 1000 && 'K'}
      </div>

      <div className="text-xs md:text-sm text-gray-400">{label}</div>
    </motion.div>
  );
}
