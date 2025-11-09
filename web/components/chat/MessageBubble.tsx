'use client';

import { motion } from 'framer-motion';
import { User, Bot, Sparkles } from 'lucide-react';

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  isStreaming?: boolean;
}

export default function MessageBubble({
  role,
  content,
  timestamp,
  isStreaming
}: MessageBubbleProps) {
  const isUser = role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
    >
      {/* Avatar */}
      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
        isUser
          ? 'bg-purple text-white'
          : 'bg-gradient-to-br from-purple to-blue text-white'
      }`}>
        {isUser ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
      </div>

      {/* Message Content */}
      <div className={`flex flex-col max-w-[70%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div className={`rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-purple text-white'
            : 'bg-dark-card border border-gray-800 text-gray-100'
        }`}>
          <p className="whitespace-pre-wrap">{content}</p>
          {isStreaming && (
            <motion.span
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="inline-flex items-center gap-1 ml-1"
            >
              <Sparkles className="w-3 h-3" />
            </motion.span>
          )}
        </div>
        <span className="text-xs text-gray-500 mt-1">{timestamp}</span>
      </div>
    </motion.div>
  );
}
