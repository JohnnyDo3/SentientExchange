'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { motion } from 'framer-motion';

interface CodeBlockProps {
  code: string;
  language?: string;
  className?: string;
  children?: React.ReactNode;
  onCopy?: () => void;
}

export default function CodeBlock({ code, language, className, children, onCopy }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      onCopy?.();
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  return (
    <div className="relative group">
      {language && (
        <div className="flex items-center justify-between px-3 py-1 bg-gray-900/50 border-b border-gray-800 rounded-t-lg">
          <span className="text-xs text-gray-400 font-mono">{language}</span>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-1 text-xs text-gray-400 hover:text-white bg-gray-800/50 hover:bg-gray-700/50 rounded transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-green" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                  Copy
                </span>
              </>
            )}
          </motion.button>
        </div>
      )}
      <code className={className}>
        {children}
      </code>
    </div>
  );
}
