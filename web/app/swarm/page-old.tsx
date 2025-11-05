'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { soundManager } from '@/lib/sound';

// Dynamically import 3D components
const SwarmVisualization = dynamic(
  () => import('@/components/3d/SwarmVisualization'),
  { ssr: false }
);

const sampleQueries = [
  "Should I invest in Tesla stock?",
  "Compare crypto vs traditional stocks",
  "Analyze the sentiment around AI regulation",
  "What are the best growth stocks for 2025?",
];

export default function SwarmPage() {
  const [query, setQuery] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleSubmit = async () => {
    if (!query.trim() || isRunning) return;

    soundManager.playAgentSound();
    setIsRunning(true);
    setResult(null);

    // Simulate swarm execution
    setTimeout(() => {
      setResult({
        recommendation: 'BUY',
        confidence: 7.8,
        analysis: {
          financial: { score: 8, time: '2.1s', details: 'Revenue: $96.8B (+18% YoY), P/E: 52.3' },
          sentiment: { score: 68, time: '3.4s', details: '68% positive news coverage' },
          technical: { score: 7.5, time: '4.2s', details: 'Price above 50 & 200 day MA' },
          industry: { score: 8.5, time: '2.8s', details: '18% EV market share' },
        },
        cost: 0.85,
        time: '3m 12s',
      });
      soundManager.playSuccessChord();
      setIsRunning(false);
    }, 12000);
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Back Button */}
      <div className="fixed top-6 left-6 z-50">
        <button
          className="flex items-center gap-2 px-4 py-2 glass rounded-full text-gray-300 hover:text-white transition-colors"
          onClick={() => {
            soundManager.playClick();
            window.location.href = '/';
          }}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
      </div>

      {/* Header */}
      <div className="container mx-auto px-6 pt-24 pb-12">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="flex items-center justify-center gap-3 mb-6">
            <Sparkles className="w-8 h-8 text-purple" />
            <h1 className="text-6xl font-bold gradient-text">THE AGENT SWARM</h1>
          </div>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Watch AI agents coordinate to solve complex problems in real-time
          </p>
        </motion.div>

        {/* Query Input */}
        <motion.div
          className="max-w-3xl mx-auto mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <div className="glass rounded-2xl p-6">
            <label className="block text-sm text-gray-400 mb-3">ASK THE SWARM</label>
            <div className="flex gap-3">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder="Should I invest in Tesla stock?"
                className="flex-1 bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-white focus:border-purple focus:outline-none transition-colors"
                disabled={isRunning}
              />
              <button
                onClick={handleSubmit}
                disabled={isRunning || !query.trim()}
                className="btn-primary px-8 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRunning ? 'RUNNING...' : 'ASK SWARM'}
              </button>
            </div>

            {/* Sample Queries */}
            <div className="flex flex-wrap gap-2 mt-4">
              {sampleQueries.map((sample, index) => (
                <button
                  key={index}
                  onClick={() => setQuery(sample)}
                  className="text-xs px-3 py-1 rounded-full bg-gray-800 hover:bg-purple/20 hover:border-purple border border-gray-700 text-gray-300 transition-all"
                  disabled={isRunning}
                >
                  {sample}
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* 3D Visualization */}
      <div className="container mx-auto px-6">
        <div className="glass rounded-3xl overflow-hidden" style={{ height: '600px' }}>
          <SwarmVisualization isRunning={isRunning} query={query} />
        </div>
      </div>

      {/* Result Display */}
      <AnimatePresence>
        {result && (
          <motion.div
            className="container mx-auto px-6 mt-12 mb-24"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            transition={{ duration: 0.6 }}
          >
            <div className="max-w-4xl mx-auto glass rounded-3xl p-8">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                  📊 Analysis Complete
                </h2>
                <div className="text-sm text-gray-400">
                  Completed in {result.time} for ${result.cost.toFixed(2)}
                </div>
              </div>

              <div className="mb-8">
                <div className="flex items-center gap-4 mb-4">
                  <span className="text-5xl font-bold gradient-text">{result.recommendation}</span>
                  <span className="text-2xl text-gray-400">
                    {result.confidence}/10 confidence
                  </span>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6 mb-8">
                {Object.entries(result.analysis).map(([key, data]: [string, any]) => (
                  <div key={key} className="bg-gray-900/50 rounded-xl p-6 border border-gray-800">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-semibold text-white capitalize">{key}</h3>
                      <span className="text-green text-sm">✓ {data.time}</span>
                    </div>
                    <div className="text-2xl font-bold gradient-text mb-2">
                      {typeof data.score === 'number' ? `${data.score}/10` : `${data.score}%`}
                    </div>
                    <p className="text-sm text-gray-400">{data.details}</p>
                  </div>
                ))}
              </div>

              <div className="bg-purple/10 border border-purple/30 rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-400 mb-1">Compared to human analyst:</div>
                    <div className="text-2xl font-bold text-white">
                      95% faster, 99% cheaper
                    </div>
                  </div>
                  <div className="text-right text-gray-400">
                    <div>Traditional: $500, 4 hours</div>
                    <div className="text-green">Sentient Exchange: ${result.cost.toFixed(2)}, {result.time}</div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
