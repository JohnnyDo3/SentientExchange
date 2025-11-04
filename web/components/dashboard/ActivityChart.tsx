'use client';

import { motion } from 'framer-motion';
import { Activity } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ActivityChartProps {
  data: Array<{
    hour: string;
    transactions: number;
  }>;
  title?: string;
}

export default function ActivityChart({ data, title = "Activity Over Time" }: ActivityChartProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="glass rounded-xl md:rounded-2xl p-4 md:p-6 border border-gray-800"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <h3 className="text-lg md:text-2xl font-bold text-white flex items-center gap-2">
          <Activity className="w-5 h-5 md:w-6 md:h-6 text-purple" />
          {title}
        </h3>
        <span className="text-xs md:text-sm text-gray-500">Last 24 hours</span>
      </div>

      {/* Chart */}
      <div className="h-64 md:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorTransactions" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4}/>
                <stop offset="50%" stopColor="#ec4899" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#ec4899" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="hour"
              stroke="#9ca3af"
              style={{ fontSize: '11px' }}
              tick={{ fill: '#9ca3af' }}
              interval="preserveStartEnd"
            />
            <YAxis
              stroke="#9ca3af"
              style={{ fontSize: '11px' }}
              tick={{ fill: '#9ca3af' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#ffffff',
                fontSize: '12px'
              }}
              labelStyle={{ color: '#9ca3af', marginBottom: '4px' }}
              itemStyle={{ color: '#a855f7' }}
            />
            <Area
              type="monotone"
              dataKey="transactions"
              stroke="#a855f7"
              strokeWidth={2}
              fill="url(#colorTransactions)"
              activeDot={{ r: 6, fill: '#ec4899', stroke: '#ffffff', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Footer Stats */}
      <div className="grid grid-cols-3 gap-4 mt-4 md:mt-6 pt-4 md:pt-6 border-t border-gray-800">
        <div>
          <div className="text-xs text-gray-500 mb-1">Peak Hour</div>
          <div className="text-sm md:text-base font-semibold text-white">
            {data.reduce((max, item) => item.transactions > max.transactions ? item : max, data[0])?.hour || '—'}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-1">Total Transactions</div>
          <div className="text-sm md:text-base font-semibold text-white">
            {data.reduce((sum, item) => sum + item.transactions, 0).toLocaleString()}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-1">Average / Hour</div>
          <div className="text-sm md:text-base font-semibold text-white">
            {Math.round(data.reduce((sum, item) => sum + item.transactions, 0) / data.length)}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Helper function to generate mock data for last 24 hours
export function generateMockActivityData(): Array<{ hour: string; transactions: number }> {
  const data = [];
  const now = new Date();

  for (let i = 23; i >= 0; i--) {
    const hour = new Date(now.getTime() - i * 60 * 60 * 1000);
    data.push({
      hour: hour.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true }),
      transactions: Math.floor(Math.random() * 100) + 20
    });
  }

  return data;
}
