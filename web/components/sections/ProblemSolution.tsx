'use client';

import { motion } from 'framer-motion';
import { Search, Shield, Zap } from 'lucide-react';

export default function ProblemSolution() {
  return (
    <section className="relative py-32 bg-gradient-to-b from-black via-gray-900/30 to-black overflow-hidden">
      {/* The Problem */}
      <div className="container mx-auto px-6 mb-32">
        <motion.div
          className="glass rounded-3xl p-12 max-w-4xl mx-auto"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <blockquote className="text-4xl md:text-5xl font-light text-gray-300 mb-12 leading-relaxed text-center">
            "AI agents can pay for APIs.
            <br />
            <span className="gradient-text font-semibold">But how do they find them?</span>"
          </blockquote>

          <div className="grid grid-cols-3 gap-8 mt-16">
            <div className="bg-gray-900/50 rounded-2xl p-6 border border-gray-800 text-center">
              <p className="text-6xl font-bold mb-2 text-red-500">×</p>
              <p className="text-lg text-gray-300">No discovery</p>
            </div>
            <div className="bg-gray-900/50 rounded-2xl p-6 border border-gray-800 text-center">
              <p className="text-6xl font-bold mb-2 text-red-500">×</p>
              <p className="text-lg text-gray-300">No reputation</p>
            </div>
            <div className="bg-gray-900/50 rounded-2xl p-6 border border-gray-800 text-center">
              <p className="text-6xl font-bold mb-2 text-red-500">×</p>
              <p className="text-lg text-gray-300">No marketplace</p>
            </div>
          </div>

          <motion.p
            className="text-3xl font-bold gradient-text mt-16 text-center"
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            Until now.
          </motion.p>
        </motion.div>
      </div>

      {/* The Solution */}
      <div className="container mx-auto px-6">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="text-5xl md:text-6xl font-bold mb-6">
            <span className="gradient-text">AGENTMARKET</span>
          </h2>
          <p className="text-2xl text-white font-bold">
            The Infrastructure Layer for AI Agents
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <FeatureCard
            icon={<Search className="w-12 h-12" />}
            title="DISCOVER"
            description="Find any service by capability"
            features={[
              'Search by capability tags',
              'Filter by price & rating',
              'Real-time availability',
              'Smart recommendations',
            ]}
            delay={0}
          />

          <FeatureCard
            icon={<Zap className="w-12 h-12" />}
            title="PAY"
            description="Instant x402 payments"
            features={[
              'Automatic USDC payments',
              'Base blockchain settlement',
              'Sub-second confirmation',
              'Transaction logging',
            ]}
            delay={0.2}
          />

          <FeatureCard
            icon={<Shield className="w-12 h-12" />}
            title="TRUST"
            description="Reputation scores & reviews"
            features={[
              'Verified service providers',
              'Real user reviews',
              'Performance metrics',
              'Quality guarantees',
            ]}
            delay={0.4}
          />
        </div>
      </div>
    </section>
  );
}

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  features: string[];
  delay: number;
}

function FeatureCard({ icon, title, description, features, delay }: FeatureCardProps) {
  return (
    <motion.div
      className="card-hover p-8 text-center"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay }}
    >
      <div className="text-purple mb-6 flex justify-center">{icon}</div>
      <h3 className="text-2xl font-bold text-white mb-3">{title}</h3>
      <p className="text-gray-400 mb-6">{description}</p>
      <ul className="space-y-2 text-left">
        {features.map((feature, index) => (
          <li key={index} className="text-gray-300 flex items-center gap-2">
            <span className="text-green">✓</span>
            {feature}
          </li>
        ))}
      </ul>
    </motion.div>
  );
}
