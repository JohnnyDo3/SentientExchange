'use client';

import { Play, Pause, SkipBack, FastForward, Rewind } from 'lucide-react';
import { motion } from 'framer-motion';

interface PlaybackControlsProps {
  isPlaying: boolean;
  onPlayPause: () => void;
  speed: number;
  onSpeedChange: (speed: number) => void;
  onReset: () => void;
}

const SPEED_OPTIONS = [
  { label: '0.25x', value: 0.25 },
  { label: '0.5x', value: 0.5 },
  { label: '1x', value: 1 },
  { label: '2x', value: 2 },
  { label: '4x', value: 4 },
];

export function PlaybackControls({
  isPlaying,
  onPlayPause,
  speed,
  onSpeedChange,
  onReset,
}: PlaybackControlsProps) {
  return (
    <motion.div
      className="glass rounded-xl p-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center justify-between gap-4">
        {/* Left: Playback Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={onReset}
            className="p-2 glass-light rounded-lg hover:bg-white/10 transition-colors"
            title="Reset to beginning"
          >
            <SkipBack className="w-5 h-5 text-gray-300" />
          </button>

          <button
            onClick={() => {
              const currentIndex = SPEED_OPTIONS.findIndex((s) => s.value === speed);
              const prevIndex = Math.max(0, currentIndex - 1);
              onSpeedChange(SPEED_OPTIONS[prevIndex].value);
            }}
            className="p-2 glass-light rounded-lg hover:bg-white/10 transition-colors"
            title="Slower"
          >
            <Rewind className="w-5 h-5 text-gray-300" />
          </button>

          <button
            onClick={onPlayPause}
            className="p-3 gradient-bg rounded-lg hover:scale-105 transition-transform"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-6 h-6 text-white fill-white" />
            ) : (
              <Play className="w-6 h-6 text-white fill-white" />
            )}
          </button>

          <button
            onClick={() => {
              const currentIndex = SPEED_OPTIONS.findIndex((s) => s.value === speed);
              const nextIndex = Math.min(SPEED_OPTIONS.length - 1, currentIndex + 1);
              onSpeedChange(SPEED_OPTIONS[nextIndex].value);
            }}
            className="p-2 glass-light rounded-lg hover:bg-white/10 transition-colors"
            title="Faster"
          >
            <FastForward className="w-5 h-5 text-gray-300" />
          </button>
        </div>

        {/* Center: Speed Display */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-400 mr-2">SPEED:</span>
          {SPEED_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => onSpeedChange(option.value)}
              className={`px-3 py-1 rounded-lg text-sm font-semibold transition-all ${
                speed === option.value
                  ? 'bg-purple text-white scale-105'
                  : 'glass-light text-gray-400 hover:text-white'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {/* Right: Instructions */}
        <div className="text-xs text-gray-400">
          <p>Click nodes to see details</p>
        </div>
      </div>
    </motion.div>
  );
}
