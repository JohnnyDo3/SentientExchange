'use client';

import { motion } from 'framer-motion';
import { FileText, TrendingUp, DollarSign, Users, Target, Sparkles } from 'lucide-react';

interface FinalDeliverableViewerProps {
  finalOutput: any;
}

export function FinalDeliverableViewer({ finalOutput }: FinalDeliverableViewerProps) {
  if (!finalOutput?.deliverable) {
    return (
      <div className="glass rounded-2xl p-12 text-center">
        <Sparkles className="w-16 h-16 mx-auto mb-4 text-gray-500 opacity-50" />
        <p className="text-gray-400">Final deliverable will appear here...</p>
      </div>
    );
  }

  const { deliverable } = finalOutput;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        className="glass rounded-2xl p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-white mb-2">
              {deliverable.title}
            </h2>
            <p className="text-sm text-gray-400">
              Generated: {new Date(finalOutput.timestamp).toLocaleString()}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Slides */}
      <div className="space-y-4">
        {deliverable.slides?.map((slide: any, index: number) => (
          <motion.div
            key={index}
            className="glass rounded-xl p-6"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <div className="flex items-start gap-4">
              {/* Slide Number */}
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold">{index + 1}</span>
              </div>

              {/* Slide Content */}
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white mb-3">{slide.title}</h3>
                <p className="text-gray-300 mb-4">{slide.content}</p>

                {/* Data Highlights */}
                {slide.data && (
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    {Object.entries(slide.data).map(([key, value]) => (
                      <div
                        key={key}
                        className="bg-black/30 rounded-lg p-3 border border-purple-500/20"
                      >
                        <p className="text-xs text-gray-400 uppercase mb-1">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </p>
                        <p className="text-lg font-bold text-purple-400">{value as string}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Features List */}
                {slide.features && (
                  <ul className="space-y-2 mt-4">
                    {slide.features.map((feature: string, i: number) => (
                      <li key={i} className="flex items-center gap-2 text-gray-300">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                )}

                {/* Channels List */}
                {slide.channels && (
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    {slide.channels.map((channel: string, i: number) => (
                      <div
                        key={i}
                        className="bg-black/30 rounded-lg px-3 py-2 text-sm text-gray-300"
                      >
                        → {channel}
                      </div>
                    ))}
                  </div>
                )}

                {/* Pricing */}
                {slide.pricing && (
                  <div className="flex gap-3 mt-4">
                    {Object.entries(slide.pricing).map(([tier, price]) => (
                      <div
                        key={tier}
                        className="flex-1 bg-gradient-to-br from-green-500/20 to-blue-500/20 rounded-lg p-3 border border-green-500/30"
                      >
                        <p className="text-xs text-gray-400 uppercase mb-1">{tier}</p>
                        <p className="text-xl font-bold text-green-400">{price as string}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Metrics */}
                {slide.metrics && (
                  <div className="grid grid-cols-3 gap-3 mt-4">
                    {Object.entries(slide.metrics).map(([key, value]) => (
                      <div
                        key={key}
                        className="bg-black/30 rounded-lg p-3 text-center border border-blue-500/20"
                      >
                        <p className="text-2xl font-bold text-blue-400 mb-1">{value as string}</p>
                        <p className="text-xs text-gray-400 uppercase">
                          {key}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Team */}
                {slide.team && (
                  <div className="space-y-2 mt-4">
                    {slide.team.map((member: string, i: number) => (
                      <div
                        key={i}
                        className="bg-black/30 rounded-lg p-3 flex items-center gap-3"
                      >
                        <Users className="w-5 h-5 text-purple-400" />
                        <span className="text-gray-300">{member}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Ask */}
                {slide.ask && (
                  <div className="mt-4 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-lg p-4 border border-purple-500/30">
                    <div className="flex items-center gap-3 mb-3">
                      <DollarSign className="w-6 h-6 text-green-400" />
                      <span className="text-2xl font-bold text-white">{slide.ask.amount}</span>
                    </div>
                    {slide.ask.use && (
                      <div className="space-y-2">
                        {slide.ask.use.map((item: string, i: number) => (
                          <div key={i} className="flex items-center gap-2 text-gray-300">
                            <Target className="w-4 h-4 text-purple-400" />
                            {item}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Agent Outputs Summary */}
      {finalOutput.agentOutputs && (
        <motion.div
          className="glass rounded-xl p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h3 className="text-lg font-bold text-white mb-4">Agent Contributions</h3>
          <div className="space-y-3">
            {Object.entries(finalOutput.agentOutputs).map(([agent, data]: [string, any]) => (
              <div key={agent} className="bg-black/30 rounded-lg p-4">
                <p className="font-semibold text-white mb-2">🤖 {agent}</p>
                <p className="text-sm text-gray-400 mb-2">
                  Tasks: {data.tasks?.join(', ')}
                </p>
                <p className="text-sm text-gray-300">{data.findings}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
