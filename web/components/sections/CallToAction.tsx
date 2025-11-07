'use client';

import { motion } from 'framer-motion';
import { Code, Bot, BookOpen, ArrowRight } from 'lucide-react';
import { soundManager } from '@/lib/sound';

export default function CallToAction() {
  return (
    <section className="relative py-32 bg-gradient-to-b from-black via-purple/10 to-black">
      <div className="container mx-auto px-6">
        {/* Header */}
        <motion.div
          className="text-center mb-16 glass rounded-3xl p-12 max-w-4xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="text-5xl md:text-7xl font-bold mb-6 gradient-text">
            START USING SERVICES
          </h2>
          <p className="text-2xl text-white font-semibold max-w-2xl mx-auto">
            Or list your own and start earning
          </p>
        </motion.div>

        {/* CTA Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-16">
          <CTACard
            icon={<Bot className="w-12 h-12" />}
            title="FOR AI AGENTS"
            description="Connect your agent to the marketplace"
            stats={["23+ services ready to use", "Pay-per-use pricing", "Instant access via MCP"]}
            buttonText="Browse Marketplace"
            buttonHref="/marketplace"
            gradient="from-pink to-purple"
            delay={0}
          />

          <CTACard
            icon={<Code className="w-12 h-12" />}
            title="FOR SERVICE PROVIDERS"
            description="List your API and earn revenue"
            stats={["Simple x402 integration", "Automatic payments in USDC", "Built-in reputation system"]}
            buttonText="Register Service"
            buttonHref="/providers/register"
            gradient="from-purple to-pink"
            delay={0.2}
          />
        </div>

        {/* Documentation Link */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <button
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            onClick={() => {
              soundManager.playClick();
              window.location.href = '/docs';
            }}
          >
            <BookOpen className="w-5 h-5" />
            <span>Read Documentation</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>
      </div>

      {/* Background Elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple/10 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink/10 rounded-full blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.5, 0.3, 0.5],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </div>
    </section>
  );
}

interface CTACardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  stats: string[];
  buttonText: string;
  buttonHref: string;
  gradient: string;
  delay: number;
}

function CTACard({
  icon,
  title,
  description,
  stats,
  buttonText,
  buttonHref,
  gradient,
  delay,
}: CTACardProps) {
  return (
    <motion.div
      className="group relative glass rounded-3xl p-8 overflow-hidden cursor-pointer"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay }}
      whileHover={{ scale: 1.02, y: -5 }}
      onClick={() => {
        soundManager.playClick();
        window.location.href = buttonHref;
      }}
    >
      {/* Gradient Background on Hover */}
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />

      {/* Content */}
      <div className="relative z-10">
        <div className="text-purple mb-6">{icon}</div>

        <h3 className="text-3xl font-bold text-white mb-3">{title}</h3>
        <p className="text-gray-400 mb-6">{description}</p>

        <ul className="space-y-2 mb-8">
          {stats.map((stat, index) => (
            <li key={index} className="flex items-center gap-2 text-gray-300">
              <span className="text-green text-sm">✓</span>
              {stat}
            </li>
          ))}
        </ul>

        <div className={`inline-flex items-center gap-2 bg-gradient-to-r ${gradient} px-6 py-3 rounded-lg font-semibold text-white group-hover:scale-105 transition-transform`}>
          {buttonText}
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </motion.div>
  );
}
