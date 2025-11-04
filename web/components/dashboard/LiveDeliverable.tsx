'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, CheckCircle2, Sparkles, ChevronDown } from 'lucide-react';
import { useMemo, useState } from 'react';

interface LiveDeliverableProps {
  events: any[];
  finalOutput: any;
}

export function LiveDeliverable({ events, finalOutput }: LiveDeliverableProps) {
  const [expandedSlide, setExpandedSlide] = useState<number | null>(null);

  const { slides, progress, isComplete } = useMemo(() => {
    const servicesHired = events.filter(e => e.event === 'service-hired').length;
    const hasCompleted = events.some(e => e.event === 'orchestration-completed');

    // Check if we have real slides
    const realSlides = finalOutput?.deliverable?.slides || [];
    const hasRealSlides = realSlides.length > 0;

    console.log('LiveDeliverable:', {
      servicesHired,
      hasCompleted,
      hasRealSlides,
      realSlides: realSlides.length,
      finalOutput: !!finalOutput
    });

    return {
      slides: hasRealSlides ? realSlides : [],
      progress: Math.min(Math.floor((servicesHired / 9) * 100), 100),
      isComplete: hasCompleted && hasRealSlides,
    };
  }, [events, finalOutput]);

  return (
    <div className="glass rounded-2xl p-6 h-full flex flex-col">
      {/* Header */}
      <div className="mb-4 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xl font-bold text-white">Pitch Deck Output</h3>
          {isComplete ? (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 rounded-full border border-green-500/30">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              <span className="text-xs text-green-400 font-bold">COMPLETE</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/20 rounded-full border border-blue-500/30">
              <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
              <span className="text-xs text-blue-400 font-bold">GENERATING</span>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        {!isComplete && (
          <div className="relative h-2 bg-gray-800 rounded-full overflow-hidden">
            <motion.div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: 'easeInOut' }}
            />
          </div>
        )}
      </div>

      {/* Slides */}
      <div className="flex-1 overflow-y-auto pr-2 space-y-3">
        {slides.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-400">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
              >
                <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
              </motion.div>
              <p className="text-sm">Agents are building your pitch deck...</p>
              <p className="text-xs mt-2 text-gray-500">{progress}% complete</p>
            </div>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {slides.map((slide: any, index: number) => {
              const isExpanded = expandedSlide === index;

              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  layout
                >
                  <div
                    className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-xl overflow-hidden hover:border-purple-500/50 transition-all cursor-pointer"
                    onClick={() => setExpandedSlide(isExpanded ? null : index)}
                  >
                    {/* Slide Header */}
                    <div className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-white text-base mb-1">{slide.title}</h4>
                          <p className="text-sm text-gray-400 line-clamp-2">{slide.content}</p>
                        </div>
                        <motion.div
                          animate={{ rotate: isExpanded ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        </motion.div>
                      </div>

                      {/* Quick Preview */}
                      {!isExpanded && (slide.data || slide.metrics) && (
                        <div className="mt-3 flex gap-2 flex-wrap">
                          {Object.entries(slide.data || slide.metrics || {}).slice(0, 3).map(([key, value]) => (
                            <div
                              key={key}
                              className="px-2 py-1 bg-purple-500/20 rounded-md text-xs text-purple-300 font-semibold border border-purple-500/30"
                            >
                              {value as string}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Expanded Content */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="border-t border-gray-700"
                        >
                          <div className="p-4 bg-black/20 space-y-3">
                            {/* Data */}
                            {slide.data && (
                              <div className="grid grid-cols-2 gap-2">
                                {Object.entries(slide.data).map(([key, value]) => (
                                  <div key={key} className="bg-gray-800/50 rounded-lg p-2">
                                    <p className="text-xs text-gray-500 uppercase mb-1">{key}</p>
                                    <p className="text-sm font-bold text-purple-400">{value as string}</p>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Features */}
                            {slide.features && (
                              <div className="space-y-2">
                                {slide.features.map((feature: string, i: number) => (
                                  <div key={i} className="flex items-center gap-2 text-sm text-gray-300 bg-gray-800/30 rounded-lg p-2">
                                    <div className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
                                    {feature}
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Channels */}
                            {slide.channels && (
                              <div className="grid grid-cols-2 gap-2">
                                {slide.channels.map((channel: string, i: number) => (
                                  <div key={i} className="bg-gray-800/50 rounded-lg px-3 py-2 text-sm text-gray-300">
                                    → {channel}
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Pricing */}
                            {slide.pricing && (
                              <div className="flex gap-2">
                                {Object.entries(slide.pricing).map(([tier, price]) => (
                                  <div key={tier} className="flex-1 bg-gradient-to-br from-green-500/20 to-blue-500/20 rounded-lg p-3 border border-green-500/30">
                                    <p className="text-xs text-gray-400 uppercase mb-1">{tier}</p>
                                    <p className="text-lg font-bold text-green-400">{price as string}</p>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Metrics */}
                            {slide.metrics && (
                              <div className="grid grid-cols-3 gap-2">
                                {Object.entries(slide.metrics).map(([key, value]) => (
                                  <div key={key} className="bg-gray-800/50 rounded-lg p-2 text-center">
                                    <p className="text-lg font-bold text-blue-400">{value as string}</p>
                                    <p className="text-xs text-gray-500 uppercase mt-1">{key}</p>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Team */}
                            {slide.team && (
                              <div className="space-y-2">
                                {slide.team.map((member: string, i: number) => (
                                  <div key={i} className="bg-gray-800/50 rounded-lg p-2 text-sm text-gray-300">
                                    👤 {member}
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Ask */}
                            {slide.ask && (
                              <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-lg p-3 border border-purple-500/30">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-xl font-bold text-white">{slide.ask.amount}</span>
                                </div>
                                {slide.ask.use && (
                                  <div className="space-y-1">
                                    {slide.ask.use.map((item: string, i: number) => (
                                      <div key={i} className="text-sm text-gray-300">• {item}</div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
