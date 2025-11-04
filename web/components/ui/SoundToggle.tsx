'use client';

import { useState, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { soundManager } from '@/lib/sound';
import { motion } from 'framer-motion';

export default function SoundToggle() {
  const [isMuted, setIsMuted] = useState(true);

  useEffect(() => {
    // Initialize sound system
    const init = async () => {
      await soundManager.initialize();
    };

    const handleClick = () => {
      init();
    };

    document.addEventListener('click', handleClick, { once: true });

    return () => {
      document.removeEventListener('click', handleClick);
    };
  }, []);

  const toggleSound = () => {
    const newMutedState = soundManager.toggleMute();
    setIsMuted(newMutedState);
  };

  return (
    <motion.button
      onClick={toggleSound}
      className="fixed bottom-8 right-8 z-50 glass rounded-full p-4 hover:scale-110 transition-all group"
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      title={isMuted ? 'Enable sound' : 'Disable sound'}
    >
      {isMuted ? (
        <VolumeX className="w-6 h-6 text-gray-400 group-hover:text-white transition-colors" />
      ) : (
        <Volume2 className="w-6 h-6 text-purple group-hover:text-pink transition-colors" />
      )}
    </motion.button>
  );
}
