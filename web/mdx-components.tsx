import type { MDXComponents } from 'mdx/types';
import { CodeBlock } from './components/docs/CodeBlock';
import { Callout } from './components/docs/Callout';

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    // Override default code blocks with syntax highlighting
    pre: ({ children, ...props }: any) => <CodeBlock {...props}>{children}</CodeBlock>,

    // Custom components for documentation
    Callout,

    // Style headings
    h1: ({ children }: any) => (
      <h1 className="text-4xl font-bold mb-6 text-purple-400 border-b border-purple-900/30 pb-4">
        {children}
      </h1>
    ),
    h2: ({ children }: any) => (
      <h2 className="text-3xl font-semibold mt-12 mb-4 text-purple-300">
        {children}
      </h2>
    ),
    h3: ({ children }: any) => (
      <h3 className="text-2xl font-semibold mt-8 mb-3 text-purple-200">
        {children}
      </h3>
    ),

    // Style paragraphs and lists
    p: ({ children }: any) => <p className="mb-4 text-gray-300 leading-relaxed">{children}</p>,
    ul: ({ children }: any) => <ul className="list-disc list-inside mb-4 space-y-2 text-gray-300">{children}</ul>,
    ol: ({ children }: any) => <ol className="list-decimal list-inside mb-4 space-y-2 text-gray-300">{children}</ol>,
    li: ({ children }: any) => <li className="ml-4">{children}</li>,

    // Style links
    a: ({ href, children }: any) => (
      <a
        href={href}
        className="text-purple-400 hover:text-purple-300 underline decoration-purple-500/30 hover:decoration-purple-400 transition-colors"
      >
        {children}
      </a>
    ),

    // Style tables
    table: ({ children }: any) => (
      <div className="overflow-x-auto mb-6">
        <table className="min-w-full border border-purple-900/30 rounded-lg">
          {children}
        </table>
      </div>
    ),
    th: ({ children }: any) => (
      <th className="px-4 py-2 bg-purple-900/20 border-b border-purple-900/30 text-left text-purple-300 font-semibold">
        {children}
      </th>
    ),
    td: ({ children }: any) => (
      <td className="px-4 py-2 border-b border-purple-900/10 text-gray-300">
        {children}
      </td>
    ),

    // Style blockquotes
    blockquote: ({ children }: any) => (
      <blockquote className="border-l-4 border-purple-500 pl-4 py-2 my-4 bg-purple-900/10 rounded-r">
        {children}
      </blockquote>
    ),

    // Style inline code
    code: ({ children }: any) => (
      <code className="px-1.5 py-0.5 bg-purple-900/30 text-purple-300 rounded text-sm font-mono">
        {children}
      </code>
    ),

    ...components,
  };
}
