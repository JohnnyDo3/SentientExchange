'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWebSocket, Transaction } from '@/hooks/useWebSocket';
import { formatCurrency, formatTimeAgo, generateMockTransaction } from '@/lib/utils';
import { soundManager } from '@/lib/sound';
import { Activity } from 'lucide-react';

export default function LiveTransactionFeed() {
  const { recentTransactions, isConnected } = useWebSocket();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (recentTransactions.length > 0) {
      setTransactions(recentTransactions);
    } else {
      // Generate mock transactions for demo
      const mockTransactions = Array.from({ length: 10 }, () => generateMockTransaction());
      setTransactions(mockTransactions);

      // Add new mock transactions periodically
      const interval = setInterval(() => {
        const newTransaction = generateMockTransaction();
        setTransactions(prev => {
          const updated = [newTransaction, ...prev].slice(0, 20); // Add to TOP, keep first 20
          // Smooth scroll to top when new transaction added
          setTimeout(() => {
            if (containerRef.current) {
              containerRef.current.scrollTo({
                top: 0,
                behavior: 'smooth'
              });
            }
          }, 100);
          return updated;
        });
        // Removed annoying repetitive sound
      }, 5000); // Slowed down to 5 seconds

      return () => clearInterval(interval);
    }
  }, [recentTransactions]);

  return (
    <section id="live-feed" className="relative py-32 bg-gradient-to-b from-black via-purple/5 to-black">
      <div className="container mx-auto px-6">
        {/* Header */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <div className="flex items-center justify-center gap-3 mb-6">
            <Activity className="w-8 h-8 text-green animate-pulse" />
            <h2 className="text-5xl md:text-6xl font-bold gradient-text">
              LIVE RIGHT NOW
            </h2>
          </div>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Real agents. Real payments. Real time.
          </p>
          {isConnected && (
            <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 glass rounded-full">
              <div className="w-2 h-2 bg-green rounded-full animate-pulse" />
              <span className="text-sm text-gray-300">Connected to live feed</span>
            </div>
          )}
        </motion.div>

        {/* Transaction Feed */}
        <motion.div
          className="max-w-4xl mx-auto glass rounded-3xl p-8"
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <div ref={containerRef} className="space-y-3 h-[500px] overflow-y-auto pr-4 scroll-smooth hide-scrollbar">
            <AnimatePresence initial={false}>
              {transactions.map((transaction) => (
                <motion.div
                  key={transaction.id}
                  initial={{ opacity: 0, y: -20, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{
                    duration: 0.5,
                    ease: [0.4, 0.0, 0.2, 1]
                  }}
                  layout
                  className="flex items-center gap-4 p-4 rounded-xl bg-gray-900/50 border border-gray-800 hover:border-purple/50 transition-all hover:scale-[1.02]"
                >
                  {/* Status Indicator */}
                  <div className="relative flex-shrink-0">
                    <div className="w-3 h-3 bg-green rounded-full" />
                    <div className="absolute inset-0 w-3 h-3 bg-green rounded-full animate-ping opacity-75" />
                  </div>

                  {/* Transaction Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-white font-medium">
                      <span className="truncate">{transaction.agent}</span>
                      <span className="text-gray-500">→</span>
                      <span className="text-purple truncate">{transaction.service}</span>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="flex-shrink-0">
                    <span className="text-green font-semibold">
                      {formatCurrency(transaction.price)}
                    </span>
                  </div>

                  {/* Time */}
                  <div className="flex-shrink-0">
                    <span className="text-gray-500 text-sm">
                      {formatTimeAgo(transaction.timestamp)}
                    </span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {transactions.length === 0 && (
            <div className="text-center text-gray-500 py-12">
              <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Waiting for transactions...</p>
            </div>
          )}
        </motion.div>

        {/* CTA */}
        <motion.div
          className="text-center mt-12"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <button
            className="btn-secondary"
            onClick={() => {
              soundManager.playClick();
              window.location.href = '/marketplace';
            }}
          >
            View Full Marketplace
          </button>
        </motion.div>
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
