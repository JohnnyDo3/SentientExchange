'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Loader2, CheckCircle2, Sparkles } from 'lucide-react';
import { useMemo } from 'react';

interface ProgressiveDeliverableProps {
  events: any[];
  finalOutput: any;
}

// Template slides that appear progressively
const SLIDE_TEMPLATES = [
  { title: 'Problem', preview: 'Identifying the core problem developers face...' },
  { title: 'Solution', preview: 'Introducing Sentient Exchange AI-powered solution...' },
  { title: 'Market Opportunity', preview: 'Analyzing total addressable market...' },
  { title: 'Business Model', preview: 'Defining pricing and revenue strategy...' },
  { title: 'Go-to-Market Strategy', preview: 'Planning distribution channels...' },
  { title: 'Traction', preview: 'Current metrics and user adoption...' },
  { title: 'Team', preview: 'Experienced founders and advisors...' },
  { title: 'The Ask', preview: 'Funding requirements and use of capital...' },
];

export function ProgressiveDeliverable({ events, finalOutput }: ProgressiveDeliverableProps) {
  // Calculate which slides to show based on service hires
  const { visibleSlides, progress } = useMemo(() => {
    const totalSteps = 8;
    const servicesHired = events.filter(e => e.event === 'service-hired').length;

    // Show 1 slide per service hired (up to 8 slides total)
    const completedSteps = Math.min(Math.ceil(servicesHired * (totalSteps / 9)), totalSteps);
    const isComplete = !!finalOutput?.deliverable?.slides;

    // Use real slides if available, otherwise use templates
    const realSlides = finalOutput?.deliverable?.slides || [];
    const slides = isComplete ? realSlides : SLIDE_TEMPLATES.slice(0, completedSteps);

    return {
      visibleSlides: slides,
      progress: {
        completed: completedSteps,
        total: totalSteps,
        percentage: Math.floor((completedSteps / totalSteps) * 100),
        isComplete,
      },
    };
  }, [events, finalOutput]);

  return (
    <div className="glass rounded-2xl p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xl font-bold text-white">Live Output</h3>
          {progress.isComplete ? (
            <div className="flex items-center gap-2 px-3 py-1 bg-green-500/20 rounded-full">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              <span className="text-xs text-green-400 font-semibold">COMPLETE</span>
            </div>
          ) : progress.completed > 0 ? (
            <div className="flex items-center gap-2 px-3 py-1 bg-blue-500/20 rounded-full">
              <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
              <span className="text-xs text-blue-400 font-semibold">BUILDING</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1 bg-gray-500/20 rounded-full">
              <span className="text-xs text-gray-400 font-semibold">WAITING</span>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div className="relative h-2 bg-gray-800 rounded-full overflow-hidden">
          <motion.div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple-500 to-blue-500"
            initial={{ width: 0 }}
            animate={{ width: `${progress.percentage}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-400">
          <span>{progress.completed} of {progress.total} slides</span>
          <span>{progress.percentage}%</span>
        </div>
      </div>

      {/* Slides Preview */}
      <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
        <AnimatePresence mode="popLayout">
          {visibleSlides.map((slide: any, index: number) => {
            const isTemplate = !slide.content; // Template slides don't have full content
            const isNew = index === visibleSlides.length - 1 && !progress.isComplete;

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: 20, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -20, scale: 0.9 }}
                transition={{ type: 'spring', damping: 20 }}
                layout
              >
                <div className={`relative rounded-lg p-4 border transition-all ${
                  isTemplate
                    ? 'bg-gradient-to-br from-gray-800/50 to-gray-900/50 border-gray-700'
                    : 'bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700 hover:border-purple-500/50'
                }`}>
                  {/* Slide Number Badge */}
                  <div className="absolute -top-2 -left-2 w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-sm shadow-lg">
                    {index + 1}
                  </div>

                  {/* New Badge */}
                  {isNew && (
                    <motion.div
                      className="absolute -top-2 -right-2 px-2 py-1 bg-green-500 rounded-full text-white text-[10px] font-bold shadow-lg"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', damping: 10 }}
                    >
                      NEW
                    </motion.div>
                  )}

                  {/* Slide Content */}
                  <div className="ml-6">
                    <h4 className="font-bold text-white mb-2 text-sm flex items-center gap-2">
                      {slide.title}
                      {isTemplate && (
                        <Loader2 className="w-3 h-3 text-blue-400 animate-spin" />
                      )}
                    </h4>

                    {isTemplate ? (
                      // Template preview
                      <p className="text-xs text-gray-500 italic">{slide.preview}</p>
                    ) : (
                      // Real content
                      <>
                        <p className="text-xs text-gray-400 line-clamp-2 mb-2">{slide.content}</p>

                        {/* Quick Stats if available */}
                        {(slide.data || slide.metrics) && (
                          <div className="mt-2 flex gap-2 flex-wrap">
                            {Object.entries(slide.data || slide.metrics || {}).slice(0, 3).map(([key, value]) => (
                              <div
                                key={key}
                                className="px-2 py-1 bg-purple-500/20 rounded text-[10px] text-purple-300 font-semibold"
                              >
                                {value as string}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Features */}
                        {slide.features && (
                          <div className="mt-2 space-y-1">
                            {slide.features.slice(0, 2).map((feature: string, i: number) => (
                              <div key={i} className="flex items-center gap-2 text-[10px] text-gray-400">
                                <div className="w-1 h-1 rounded-full bg-green-400" />
                                {feature}
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Loading Next Slides */}
        {!progress.isComplete && progress.completed < progress.total && visibleSlides.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative bg-gray-900/30 border border-gray-800 border-dashed rounded-lg p-4"
          >
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-gray-600 animate-spin" />
              <div className="flex-1">
                <div className="h-3 bg-gray-800 rounded w-3/4 mb-2 animate-pulse" />
                <div className="h-2 bg-gray-800 rounded w-1/2 animate-pulse" />
              </div>
            </div>
          </motion.div>
        )}

        {/* Empty State */}
        {visibleSlides.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <motion.div
              animate={{
                y: [0, -10, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
            </motion.div>
            <p className="text-sm">Waiting for agents to start creating...</p>
          </div>
        )}
      </div>

      {/* Final Output Summary */}
      {progress.isComplete && finalOutput && (
        <motion.div
          className="mt-4 pt-4 border-t border-gray-700"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="bg-gradient-to-r from-green-500/10 to-blue-500/10 rounded-lg p-4 border border-green-500/30">
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle2 className="w-5 h-5 text-green-400" />
              <span className="font-bold text-white">Pitch Deck Complete!</span>
            </div>
            <p className="text-xs text-gray-400 mb-3">
              {visibleSlides.length} slides generated with complete market analysis, strategy, and financials
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {finalOutput.agentOutputs && Object.entries(finalOutput.agentOutputs).map(([agent, data]: [string, any]) => (
                <div key={agent} className="flex items-center gap-2 text-gray-400">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                  <span>{agent}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
