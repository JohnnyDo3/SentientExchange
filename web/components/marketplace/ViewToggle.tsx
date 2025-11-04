'use client';

import { motion } from 'framer-motion';
import { LayoutGrid, Box } from 'lucide-react';
import { soundManager } from '@/lib/sound';

interface ViewToggleProps {
  view: 'cards' | '3d';
  onViewChange: (view: 'cards' | '3d') => void;
}

export default function ViewToggle({ view, onViewChange }: ViewToggleProps) {
  return (
    <div className="flex items-center gap-2 glass rounded-xl p-2">
      <button
        onClick={() => {
          soundManager.playClick();
          onViewChange('cards');
        }}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
          view === 'cards'
            ? 'bg-gradient-to-r from-purple to-pink text-white'
            : 'text-gray-400 hover:text-white'
        }`}
      >
        <LayoutGrid className="w-5 h-5" />
        <span className="hidden sm:inline">Cards</span>
      </button>

      <button
        onClick={() => {
          soundManager.playClick();
          onViewChange('3d');
        }}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
          view === '3d'
            ? 'bg-gradient-to-r from-purple to-pink text-white'
            : 'text-gray-400 hover:text-white'
        }`}
      >
        <Box className="w-5 h-5" />
        <span className="hidden sm:inline">3D View</span>
      </button>
    </div>
  );
}
