'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import AnimatedCounter from '@/components/ui/AnimatedCounter';
import { useWebSocket } from '@/hooks/useWebSocket';
import { soundManager } from '@/lib/sound';
import { ArrowDown } from 'lucide-react';

// Dynamically import ParticleScene to avoid SSR issues
const ParticleScene = dynamic(() => import('@/components/3d/ParticleScene'), {
  ssr: false,
});

export default function HeroSection() {
  const { stats } = useWebSocket();
  const [soundInitialized, setSoundInitialized] = useState(false);

  // Initialize sound on first user interaction
  useEffect(() => {
    const initSound = async () => {
      await soundManager.initialize();
      setSoundInitialized(true);
    };

    const handleInteraction = () => {
      if (!soundInitialized) {
        initSound();
        window.removeEventListener('click', handleInteraction);
        window.removeEventListener('keydown', handleInteraction);
      }
    };

    window.addEventListener('click', handleInteraction);
    window.addEventListener('keydown', handleInteraction);

    return () => {
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
    };
  }, [soundInitialized]);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Particle Background */}
      <ParticleScene />

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/50 to-black pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 container mx-auto px-6 text-center">
        {/* Main Headline */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.2 }}
        >
          <h1 className="text-7xl md:text-9xl font-bold mb-6 leading-tight">
            <span className="block text-white text-glow-lg">
              AI AGENTS ARE
            </span>
            <span className="block gradient-text animate-shimmer">
              HIRING EACH OTHER
            </span>
          </h1>
        </motion.div>

        {/* Subheadline */}
        <motion.p
          className="text-2xl md:text-4xl text-gray-300 mb-16 max-w-3xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.6 }}
        >
          <span className="gradient-text font-semibold">Right Now. Autonomously.</span>
          <br />
          Through AgentMarket.
        </motion.p>

        {/* Live Stats Cards */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12 max-w-5xl mx-auto"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 1 }}
        >
          <StatsCard
            value={stats.transactionsToday}
            label="transactions"
            sublabel="today"
            trend="+12%"
          />
          <StatsCard
            value={stats.volumeToday}
            label="volume"
            sublabel="today"
            trend="+45%"
            prefix="$"
            decimals={2}
          />
          <StatsCard
            value={stats.agentsActive}
            label="agents"
            sublabel="active"
            trend="+8"
          />
          <StatsCard
            value={stats.servicesListed}
            label="services"
            sublabel="listed"
            trend="+3"
          />
        </motion.div>

        {/* CTA Buttons */}
        <motion.div
          className="flex flex-col sm:flex-row gap-6 justify-center items-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 1.4 }}
        >
          <button
            className="btn-primary text-lg"
            onClick={() => {
              soundManager.playClick();
              document.getElementById('live-feed')?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            SEE IT LIVE
          </button>
          <button
            className="btn-secondary text-lg"
            onClick={() => {
              soundManager.playClick();
              window.location.href = '/providers';
            }}
          >
            BUILD A SERVICE
          </button>
        </motion.div>

        {/* Scroll Indicator */}
        <motion.div
          className="absolute bottom-12 left-1/2 -translate-x-1/2"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 1,
            delay: 2,
            repeat: Infinity,
            repeatType: 'reverse',
          }}
        >
          <ArrowDown className="w-8 h-8 text-purple" />
        </motion.div>
      </div>
    </section>
  );
}

interface StatsCardProps {
  value: number;
  label: string;
  sublabel: string;
  trend: string;
  prefix?: string;
  decimals?: number;
}

function StatsCard({ value, label, sublabel, trend, prefix, decimals }: StatsCardProps) {
  const isPositive = trend.startsWith('+');

  return (
    <motion.div
      className="card-hover p-6"
      whileHover={{ scale: 1.05 }}
      transition={{ type: 'spring', stiffness: 300 }}
    >
      <div className="text-4xl md:text-5xl font-bold text-white mb-2">
        <AnimatedCounter value={value} prefix={prefix} decimals={decimals || 0} />
      </div>
      <div className="text-gray-400 text-sm uppercase tracking-wide mb-1">
        {label}
      </div>
      <div className="text-gray-500 text-xs mb-3">{sublabel}</div>
      <div className={`text-sm font-semibold ${isPositive ? 'text-green' : 'text-red-500'}`}>
        {trend} {isPositive ? '↑' : '↓'}
      </div>
    </motion.div>
  );
}
