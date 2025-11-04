'use client';

import { motion } from 'framer-motion';
import { DollarSign, Users, Wrench, Clock } from 'lucide-react';

interface LiveStatsProps {
  totalCost: number;
  agentsSpawned: number;
  servicesUsed: number;
  elapsedTime: number;
}

export function LiveStats({ totalCost, agentsSpawned, servicesUsed, elapsedTime }: LiveStatsProps) {
  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const stats = [
    {
      icon: DollarSign,
      label: 'Total Cost',
      value: `$${totalCost.toFixed(2)}`,
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
    },
    {
      icon: Users,
      label: 'Agents Spawned',
      value: agentsSpawned.toString(),
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
    },
    {
      icon: Wrench,
      label: 'Services Used',
      value: servicesUsed.toString(),
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
    },
    {
      icon: Clock,
      label: 'Elapsed Time',
      value: formatTime(elapsedTime),
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/10',
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          className={`glass rounded-xl p-4 ${stat.bgColor}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: index * 0.1 }}
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${stat.bgColor}`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <div>
              <p className="text-xs text-gray-400">{stat.label}</p>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
