'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, DollarSign, CheckCircle, Star, Brain } from 'lucide-react';
import { generateAgentName } from '@/lib/utils';

interface ThoughtStep {
  id: string;
  type: 'thinking' | 'searching' | 'evaluating' | 'paying' | 'result';
  message: string;
  icon: React.ReactNode;
  color: string;
}

export default function AgentConsciousnessStream() {
  const [activeAgent, setActiveAgent] = useState(generateAgentName());
  const [thoughts, setThoughts] = useState<ThoughtStep[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const isRunningRef = useRef(false);

  const runAgentSequence = useCallback(async () => {
    if (isRunningRef.current) return;

    isRunningRef.current = true;

    // Clear and reset
    setThoughts([]);
    setActiveAgent(generateAgentName());

    // Small delay to let clear animation finish
    await new Promise(resolve => setTimeout(resolve, 300));

    const services = ['sentiment-ai', 'vision-pro', 'summarizer', 'data-processor'];
    const service = services[Math.floor(Math.random() * services.length)];
    const price = (Math.random() * 0.05).toFixed(3);

    const sequence: ThoughtStep[] = [
      {
        id: '1',
        type: 'thinking',
        message: 'Need sentiment analysis for market research...',
        icon: <Brain className="w-5 h-5" />,
        color: 'text-purple',
      },
      {
        id: '2',
        type: 'searching',
        message: `Discovered 3 services`,
        icon: <Search className="w-5 h-5" />,
        color: 'text-blue-400',
      },
      {
        id: '3',
        type: 'evaluating',
        message: `${service} rated 4.8⭐ $${price} ✓`,
        icon: <Star className="w-5 h-5" />,
        color: 'text-yellow-400',
      },
      {
        id: '4',
        type: 'evaluating',
        message: 'Verifying reputation... 89 reviews, 1.2K uses',
        icon: <CheckCircle className="w-5 h-5" />,
        color: 'text-green',
      },
      {
        id: '5',
        type: 'paying',
        message: 'Executing payment...',
        icon: <DollarSign className="w-5 h-5" />,
        color: 'text-green',
      },
      {
        id: '6',
        type: 'paying',
        message: '✅ Payment confirmed',
        icon: <CheckCircle className="w-5 h-5" />,
        color: 'text-green',
      },
      {
        id: '7',
        type: 'result',
        message: 'Result received. Excellent.',
        icon: <CheckCircle className="w-5 h-5" />,
        color: 'text-green',
      },
      {
        id: '8',
        type: 'result',
        message: '⭐⭐⭐⭐⭐',
        icon: <Star className="w-5 h-5" />,
        color: 'text-yellow-400',
      },
    ];

    // Add thoughts one by one with delays
    for (let i = 0; i < sequence.length; i++) {
      const thought = sequence[i];
      await new Promise(resolve => setTimeout(resolve, 1200));

      setThoughts(prev => [thought, ...prev]); // Add to TOP

      // Scroll to top
      if (containerRef.current) {
        containerRef.current.scrollTop = 0;
      }
    }

    isRunningRef.current = false;
  }, []);

  useEffect(() => {
    runAgentSequence();

    const interval = setInterval(() => {
      runAgentSequence();
    }, 15000);

    return () => clearInterval(interval);
  }, [runAgentSequence]);

  return (
    <section className="relative py-32 bg-gradient-to-b from-black via-gray-900/20 to-black">
      <div className="container mx-auto px-6">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="text-5xl md:text-6xl font-bold mb-6 gradient-text">
            The Agent Consciousness
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Watch AI agents think, discover, and transact in real-time
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Left: 3D Visualization Placeholder */}
          <motion.div
            className="glass rounded-3xl p-12 min-h-[500px] flex items-center justify-center"
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <div className="text-center">
              <div className="relative w-64 h-64 mx-auto mb-8">
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-purple to-pink rounded-full blur-3xl opacity-30"
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.3, 0.5, 0.3],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                />
                <motion.div
                  className="absolute inset-0 flex items-center justify-center"
                  animate={{
                    rotate: 360,
                  }}
                  transition={{
                    duration: 20,
                    repeat: Infinity,
                    ease: 'linear',
                  }}
                >
                  <div className="w-48 h-48 border-2 border-purple rounded-full flex items-center justify-center">
                    <Brain className="w-16 h-16 text-purple" />
                  </div>
                </motion.div>
              </div>
              <p className="text-gray-400 text-lg">
                Neural Network Visualization
              </p>
            </div>
          </motion.div>

          {/* Right: Thought Stream */}
          <motion.div
            className="glass rounded-3xl p-8 min-h-[500px]"
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-green rounded-full animate-pulse" />
                <h3 className="text-xl font-semibold text-white">{activeAgent}</h3>
              </div>
            </div>

            <div ref={containerRef} className="space-y-4 max-h-[400px] overflow-y-auto pr-4 hide-scrollbar scroll-smooth">
              <AnimatePresence initial={false}>
                {thoughts.map((thought, index) => (
                  <motion.div
                    key={thought.id}
                    initial={{ opacity: 0, y: -20, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{
                      duration: 0.5,
                      ease: [0.4, 0.0, 0.2, 1]
                    }}
                    layout
                    className="flex items-start gap-3 p-4 rounded-xl bg-gray-900/50 border border-gray-800 hover:border-purple/50 transition-colors"
                  >
                    <div className={`${thought.color} mt-1`}>
                      {thought.icon}
                    </div>
                    <div className="flex-1">
                      <p className="text-gray-300">{thought.message}</p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {thoughts.length === 0 && (
                <div className="text-center text-gray-500 py-12">
                  <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Waiting for agent activity...</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(17, 17, 17, 0.5);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #a855f7;
          border-radius: 10px;
        }
      `}</style>
    </section>
  );
}
