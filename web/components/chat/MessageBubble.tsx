'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Bot, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import CodeBlock from './CodeBlock';
import MessageActions from './MessageActions';

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  isStreaming?: boolean;
  messageIndex?: number;
  onCodeCopy?: () => void;
  onCopyMessage?: () => void;
  onRegenerate?: () => void;
  onDelete?: () => void;
}

export default function MessageBubble({
  role,
  content,
  timestamp,
  isStreaming,
  messageIndex,
  onCodeCopy,
  onCopyMessage,
  onRegenerate,
  onDelete
}: MessageBubbleProps) {
  const isUser = role === 'user';
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        type: "spring",
        stiffness: 260,
        damping: 20
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} group relative`}
    >
      {/* Avatar with glow */}
      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg ${
        isUser
          ? 'bg-purple text-white shadow-purple/50'
          : 'bg-gradient-to-br from-purple to-blue text-white shadow-blue/50'
      }`}>
        {isUser ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
      </div>

      {/* Message Content with glassmorphism */}
      <motion.div
        className={`flex flex-col max-w-[70%] ${isUser ? 'items-end' : 'items-start'}`}
        whileHover={{ scale: 1.02 }}
        transition={{ type: "spring", stiffness: 400, damping: 10 }}
      >
        <div className={`rounded-2xl px-4 py-3 backdrop-blur-xl transition-all duration-300 ${
          isUser
            ? 'bg-purple/90 text-white shadow-lg shadow-purple/30 group-hover:shadow-purple/50 group-hover:bg-purple'
            : 'bg-dark-card/80 border border-gray-800/50 text-gray-100 shadow-lg shadow-black/20 group-hover:border-purple/30 group-hover:shadow-purple/10'
        }`}>
          <div className="prose prose-invert prose-sm max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
              components={{
                h1: ({node, ...props}) => <h1 className="text-2xl font-bold mb-2" {...props} />,
                h2: ({node, ...props}) => <h2 className="text-xl font-bold mb-2" {...props} />,
                h3: ({node, ...props}) => <h3 className="text-lg font-bold mb-1" {...props} />,
                p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                ul: ({node, ...props}) => <ul className="list-disc list-inside mb-2" {...props} />,
                ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-2" {...props} />,
                code: ({node, className, children, ...props}: any) => {
                  const isInline = !className?.includes('language-');
                  const language = className?.replace('language-', '');
                  const codeString = String(children).replace(/\n$/, '');

                  return isInline ? (
                    <code className="bg-gray-800 px-1 py-0.5 rounded text-sm" {...props}>
                      {children}
                    </code>
                  ) : (
                    <CodeBlock
                      code={codeString}
                      language={language}
                      className="block bg-gray-900 p-3 rounded text-sm overflow-x-auto"
                      onCopy={onCodeCopy}
                    >
                      {children}
                    </CodeBlock>
                  );
                },
                strong: ({node, ...props}) => <strong className="font-bold" {...props} />,
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
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
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-gray-500">{timestamp}</span>
          {!isStreaming && (
            <MessageActions
              content={content}
              role={role}
              messageIndex={messageIndex || 0}
              onCopy={() => onCopyMessage?.()}
              onRegenerate={role === 'assistant' ? onRegenerate : undefined}
              onDelete={onDelete}
              isVisible={isHovered}
            />
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
