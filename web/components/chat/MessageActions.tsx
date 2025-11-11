'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Copy, RotateCcw, Trash2, Check } from 'lucide-react';
import { useState } from 'react';

interface MessageActionsProps {
  content: string;
  role: 'user' | 'assistant';
  messageIndex: number;
  onCopy: () => void;
  onRegenerate?: () => void;
  onDelete?: () => void;
  isVisible: boolean;
}

export default function MessageActions({
  content,
  role,
  messageIndex,
  onCopy,
  onRegenerate,
  onDelete,
  isVisible
}: MessageActionsProps) {
  const [copied, setCopied] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      onCopy();
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy message:', err);
    }
  };

  const handleDelete = () => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      setTimeout(() => setShowDeleteConfirm(false), 3000);
    } else {
      onDelete?.();
      setShowDeleteConfirm(false);
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: -5 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: -5 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className={`flex items-center gap-1 ${
            role === 'user' ? 'flex-row' : 'flex-row-reverse'
          }`}
        >
          {/* Copy Button */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleCopy}
            className="p-2 bg-gray-800/80 hover:bg-gray-700/80 backdrop-blur-xl rounded-lg transition-colors border border-gray-700/50 hover:border-purple/50 shadow-lg"
            title="Copy message"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-green" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-gray-300" />
            )}
          </motion.button>

          {/* Regenerate Button (only for assistant messages) */}
          {role === 'assistant' && onRegenerate && (
            <motion.button
              whileHover={{ scale: 1.1, rotate: -180 }}
              whileTap={{ scale: 0.9 }}
              onClick={onRegenerate}
              className="p-2 bg-gray-800/80 hover:bg-purple/20 backdrop-blur-xl rounded-lg transition-colors border border-gray-700/50 hover:border-purple/50 shadow-lg"
              title="Regenerate response"
            >
              <RotateCcw className="w-3.5 h-3.5 text-gray-300 hover:text-purple" />
            </motion.button>
          )}

          {/* Delete Button */}
          {onDelete && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleDelete}
              className={`p-2 backdrop-blur-xl rounded-lg transition-colors border shadow-lg ${
                showDeleteConfirm
                  ? 'bg-red/20 border-red/50 hover:bg-red/30'
                  : 'bg-gray-800/80 hover:bg-gray-700/80 border-gray-700/50 hover:border-red/50'
              }`}
              title={showDeleteConfirm ? 'Click again to confirm' : 'Delete message'}
            >
              <Trash2
                className={`w-3.5 h-3.5 ${
                  showDeleteConfirm ? 'text-red' : 'text-gray-300'
                }`}
              />
            </motion.button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
