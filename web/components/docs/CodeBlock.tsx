'use client';

import { useState } from 'react';

interface CodeBlockProps {
  children: React.ReactNode;
  className?: string;
}

export function CodeBlock({ children, className }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  // Extract language from className (e.g., "language-typescript")
  const language = className?.replace(/language-/, '') || 'text';

  const copyToClipboard = async () => {
    const code = extractTextFromChildren(children);
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group my-6">
      {/* Language indicator */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-900/50 border-b border-purple-900/30 rounded-t-lg">
        <span className="text-xs font-mono text-purple-400 uppercase">{language}</span>
        <button
          onClick={copyToClipboard}
          className="text-xs px-3 py-1 rounded bg-purple-900/30 hover:bg-purple-800/40 text-purple-300 transition-colors"
        >
          {copied ? '✓ Copied!' : 'Copy'}
        </button>
      </div>

      {/* Code content */}
      <pre className="!mt-0 !mb-0 !rounded-t-none overflow-x-auto bg-gray-900/80 border border-purple-900/30 rounded-b-lg">
        <code className={`${className} block p-4 text-sm leading-relaxed`}>
          {children}
        </code>
      </pre>
    </div>
  );
}

function extractTextFromChildren(children: React.ReactNode): string {
  if (typeof children === 'string') return children;
  if (Array.isArray(children)) {
    return children.map(extractTextFromChildren).join('');
  }
  if (children && typeof children === 'object' && 'props' in children) {
    return extractTextFromChildren((children as any).props.children);
  }
  return '';
}
