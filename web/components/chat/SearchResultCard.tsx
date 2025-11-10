'use client';

import { motion } from 'framer-motion';
import { Search, ExternalLink, AlertCircle, CheckCircle } from 'lucide-react';

export interface SearchResult {
  rank: number;
  title: string;
  url: string;
  description: string;
  source?: string;
  age?: string;
}

interface SearchResultCardProps {
  query: string;
  results: SearchResult[];
  totalResults?: number;
  healthCheckPassed: boolean;
  cost: string;
  timestamp: string;
  error?: string;
}

export default function SearchResultCard({
  query,
  results,
  totalResults,
  healthCheckPassed,
  cost,
  timestamp,
  error
}: SearchResultCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-dark-secondary border border-gray-800 rounded-lg p-4 my-2"
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue/20 to-purple/20 flex items-center justify-center flex-shrink-0">
          <Search className="w-4 h-4 text-blue" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold text-white">Web Search</h3>
            {healthCheckPassed ? (
              <CheckCircle className="w-4 h-4 text-green" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red" />
            )}
            <span className="text-xs text-gray-500">•</span>
            <span className="text-xs text-gray-400">{timestamp}</span>
          </div>
          <p className="text-sm text-gray-300 italic">&quot;{query}&quot;</p>
        </div>
        <div className="text-xs text-gray-400">{cost}</div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red/10 border border-red/30 rounded-lg p-3 mb-3">
          <div className="flex items-center gap-2 text-red text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Results */}
      {results.length > 0 ? (
        <div className="space-y-2">
          <div className="text-xs text-gray-400 mb-2">
            Found {totalResults || results.length} results
          </div>
          {results.map((result) => (
            <div
              key={result.rank}
              className="bg-dark border border-gray-800 rounded-lg p-3 hover:border-gray-700 transition-colors"
            >
              <div className="flex items-start gap-2 mb-1">
                <span className="text-xs text-gray-500 flex-shrink-0">
                  #{result.rank}
                </span>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-white mb-1 truncate">
                    {result.title}
                  </h4>
                  <p className="text-xs text-gray-400 line-clamp-2 mb-2">
                    {result.description}
                  </p>
                  <a
                    href={result.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue hover:text-blue/80 flex items-center gap-1 truncate"
                  >
                    <span className="truncate">{result.url}</span>
                    <ExternalLink className="w-3 h-3 flex-shrink-0" />
                  </a>
                  {result.source && (
                    <div className="text-xs text-gray-500 mt-1">
                      Source: {result.source}
                      {result.age && ` • ${result.age}`}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : !error ? (
        <div className="text-sm text-gray-400 text-center py-4">
          No results found
        </div>
      ) : null}
    </motion.div>
  );
}
