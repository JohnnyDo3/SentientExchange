'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import AnalyticsOverview, { DashboardStats } from '@/components/dashboard/AnalyticsOverview';
import ActivityChart, { generateMockActivityData } from '@/components/dashboard/ActivityChart';
import { TopServicesList, TrendingAgents, generateMockAgents } from '@/components/dashboard/Leaderboards';
import LiveTransactionFeed from '@/components/sections/LiveTransactionFeed';
import ParticleScene from '@/components/3d/ParticleScene';
import { mockServices100 } from '@/lib/mock-services-100';

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    agentsActive: 47,
    servicesListed: 100,
    transactionsToday: 1247,
    volumeToday: 24.94,
    agentsTrend: 8,
    servicesTrend: 3,
    transactionsTrend: 12,
    volumeTrend: 45
  });

  const [activityData, setActivityData] = useState(generateMockActivityData());
  const [agents, setAgents] = useState(generateMockAgents());

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setStats(prev => ({
        ...prev,
        agentsActive: prev.agentsActive + Math.floor(Math.random() * 3) - 1,
        transactionsToday: prev.transactionsToday + Math.floor(Math.random() * 10),
        volumeToday: prev.volumeToday + (Math.random() * 0.5)
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative min-h-screen bg-black text-white overflow-hidden">
      {/* Particle Background */}
      <div className="fixed inset-0 z-0 opacity-30">
        <ParticleScene />
      </div>

      {/* Main Content */}
      <div className="relative z-10">
        {/* Header */}
        <motion.div
          className="container mx-auto px-4 md:px-6 pt-24 md:pt-32 pb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          {/* Back Button */}
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </button>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold mb-4 gradient-text">
            LIVE ANALYTICS
          </h1>
          <p className="text-lg sm:text-xl md:text-2xl text-gray-400">
            Real-time marketplace insights and metrics
          </p>
        </motion.div>

        {/* Content */}
        <div className="container mx-auto px-4 md:px-6 pb-16 space-y-6 md:space-y-8">
          {/* Stats Overview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <AnalyticsOverview stats={stats} />
          </motion.div>

          {/* Activity Chart */}
          <ActivityChart data={activityData} />

          {/* Two Column Layout: Top Services + Trending Agents */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
            <TopServicesList services={mockServices100} limit={5} />
            <TrendingAgents agents={agents} limit={5} />
          </div>

          {/* Live Transaction Feed */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <div className="glass rounded-xl md:rounded-2xl p-4 md:p-6 border border-gray-800">
              <h3 className="text-lg md:text-2xl font-bold text-white mb-4">
                Recent Transactions
              </h3>
              <LiveTransactionFeed />
            </div>
          </motion.div>

          {/* Info Box */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="glass rounded-xl md:rounded-2xl p-6 border border-gray-800 text-center"
          >
            <p className="text-gray-400">
              <span className="text-white font-semibold">All data updates in real-time.</span>
              {' '}This dashboard shows live marketplace activity including agent requests, service usage, and transaction flow.
            </p>
          </motion.div>

          {/* Quick Links */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.7 }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-4"
          >
            <a
              href="/marketplace"
              className="glass rounded-xl p-6 border border-gray-800 hover:border-purple/50 transition-all text-center group"
            >
              <div className="text-3xl mb-2">🛒</div>
              <h4 className="font-semibold text-white mb-1 group-hover:gradient-text transition-all">
                Browse Marketplace
              </h4>
              <p className="text-sm text-gray-400">
                Discover all {stats.servicesListed} services
              </p>
            </a>

            <a
              href="/providers/register"
              className="glass rounded-xl p-6 border border-gray-800 hover:border-purple/50 transition-all text-center group"
            >
              <div className="text-3xl mb-2">🚀</div>
              <h4 className="font-semibold text-white mb-1 group-hover:gradient-text transition-all">
                Register Service
              </h4>
              <p className="text-sm text-gray-400">
                Join the marketplace as a provider
              </p>
            </a>

            <a
              href="/swarm"
              className="glass rounded-xl p-6 border border-gray-800 hover:border-purple/50 transition-all text-center group"
            >
              <div className="text-3xl mb-2">🤖</div>
              <h4 className="font-semibold text-white mb-1 group-hover:gradient-text transition-all">
                Agent Swarm Demo
              </h4>
              <p className="text-sm text-gray-400">
                Watch agents coordinate on complex tasks
              </p>
            </a>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
