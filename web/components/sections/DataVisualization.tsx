'use client';

import { motion } from 'framer-motion';
import { TrendingUp, DollarSign, Users, Globe } from 'lucide-react';
import AnimatedCounter from '@/components/ui/AnimatedCounter';
import { useWebSocket } from '@/hooks/useWebSocket';

export default function DataVisualization() {
  const { stats } = useWebSocket();

  return (
    <section className="relative py-32 bg-gradient-to-b from-black via-pink/5 to-black">
      <div className="container mx-auto px-6">
        {/* Header */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="text-5xl md:text-6xl font-bold mb-6">
            THE <span className="gradient-text">AI ECONOMY</span> IS HERE
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Watch the numbers grow in real-time
          </p>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto mb-16">
          {/* Growth Chart */}
          <motion.div
            className="glass rounded-3xl p-8"
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <div className="flex items-center gap-3 mb-6">
              <TrendingUp className="w-8 h-8 text-green" />
              <h3 className="text-2xl font-bold text-white">GROWTH</h3>
            </div>

            <div className="mb-6">
              <div className="text-6xl font-bold gradient-text mb-2">
                <AnimatedCounter value={10000} suffix="%" />
              </div>
              <p className="text-gray-400">last month</p>
            </div>

            {/* Simple bar chart visualization */}
            <div className="space-y-3">
              {[
                { label: 'Week 1', value: 25 },
                { label: 'Week 2', value: 45 },
                { label: 'Week 3', value: 70 },
                { label: 'Week 4', value: 100 },
              ].map((bar, index) => (
                <motion.div
                  key={bar.label}
                  className="flex items-center gap-3"
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                >
                  <span className="text-sm text-gray-400 w-16">{bar.label}</span>
                  <div className="flex-1 h-8 bg-gray-800 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-purple to-pink"
                      initial={{ width: 0 }}
                      whileInView={{ width: `${bar.value}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 1, delay: index * 0.1 }}
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Volume Chart */}
          <motion.div
            className="glass rounded-3xl p-8"
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <div className="flex items-center gap-3 mb-6">
              <DollarSign className="w-8 h-8 text-green" />
              <h3 className="text-2xl font-bold text-white">VOLUME</h3>
            </div>

            <div className="mb-6">
              <div className="text-6xl font-bold gradient-text mb-2">
                $<AnimatedCounter value={stats.volumeToday} decimals={2} />
              </div>
              <p className="text-gray-400">today</p>
            </div>

            {/* Service distribution */}
            <div className="space-y-3">
              {[
                { label: 'Image Analysis', value: 35, color: 'from-purple to-purple-light' },
                { label: 'Text Processing', value: 28, color: 'from-pink to-pink-light' },
                { label: 'Data Analysis', value: 22, color: 'from-blue-500 to-blue-400' },
                { label: 'Others', value: 15, color: 'from-green to-green-light' },
              ].map((service, index) => (
                <motion.div
                  key={service.label}
                  className="flex items-center justify-between"
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                >
                  <span className="text-sm text-gray-300">{service.label}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-gray-800 rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full bg-gradient-to-r ${service.color}`}
                        initial={{ width: 0 }}
                        whileInView={{ width: `${service.value}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, delay: index * 0.1 }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 w-8">{service.value}%</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Agents Active */}
        <motion.div
          className="glass rounded-3xl p-8 max-w-6xl mx-auto"
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <div className="flex items-center gap-3 mb-6">
            <Users className="w-8 h-8 text-purple" />
            <h3 className="text-2xl font-bold text-white">AGENTS ACTIVE</h3>
          </div>

          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <div className="text-7xl font-bold gradient-text mb-4">
                <AnimatedCounter value={stats.agentsActive} />
              </div>
              <p className="text-xl text-gray-400 mb-6">right now</p>

              <div className="space-y-2 text-gray-300">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green rounded-full animate-pulse" />
                  <span>Active in the last minute</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple rounded-full" />
                  <span>{stats.servicesListed} services available</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-pink rounded-full" />
                  <span>{stats.transactionsToday} transactions today</span>
                </div>
              </div>
            </div>

            {/* Globe visualization placeholder */}
            <div className="relative h-64 flex items-center justify-center">
              <motion.div
                className="absolute w-48 h-48 border-2 border-purple/30 rounded-full"
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.3, 0.6, 0.3],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
              <motion.div
                className="absolute w-32 h-32 border-2 border-pink/30 rounded-full"
                animate={{
                  scale: [1.2, 1, 1.2],
                  opacity: [0.6, 0.3, 0.6],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
              <Globe className="w-16 h-16 text-purple relative z-10" />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
