import { logger } from '../utils/logger.js';
import { getErrorMessage } from '../types/errors';
import Joi from 'joi';

/**
 * Arguments for web_search tool
 */
export interface WebSearchArgs {
  query: string;
  limit?: number;
}

/**
 * Validation schema for web_search
 */
const webSearchSchema = Joi.object({
  query: Joi.string().min(1).max(200).required().description('Search query'),
  limit: Joi.number().integer().min(1).max(10).default(5).description('Number of search results to return')
});

/**
 * Search the web for news and information
 *
 * @param args - Search parameters
 * @returns Search results with titles, snippets, and URLs
 */
export async function webSearch(args: WebSearchArgs) {
  try {
    // Validate input
    const { error, value } = webSearchSchema.validate(args);
    if (error) {
      logger.error('Invalid web search arguments:', error.details);
      throw new Error(`Invalid arguments: ${error.details.map(d => d.message).join(', ')}`);
    }

    const { query, limit } = value;

    logger.info(`Performing web search for: "${query}"`);

    // Use built-in web search capability via Claude's web search
    // This leverages Claude's native web search capabilities
    const searchResults = await performWebSearch(query, limit);

    logger.info(`Found ${searchResults.length} search results`);

    return {
      query,
      results: searchResults,
      timestamp: new Date().toISOString(),
      source: 'web_search'
    };

  } catch (error) {
    const message = getErrorMessage(error);
    logger.error('Web search failed:', { error: message, query: args.query });
    throw new Error(`Web search failed: ${message}`);
  }
}

/**
 * Perform the actual web search
 * This function interfaces with Claude's web search capability
 */
async function performWebSearch(query: string, limit: number) {
  // For now, return a structured response that tells Claude to use its web search
  // In production, this would integrate with Brave Search API or similar

  return [
    {
      title: `Web search results for: ${query}`,
      snippet: `Use Claude's built-in web search to find current information about "${query}". This tool delegates to Claude's web search capability to get real-time results.`,
      url: `https://search.brave.com/search?q=${encodeURIComponent(query)}`,
      timestamp: new Date().toISOString()
    }
  ];
}

/**
 * Extract clean search terms from complex queries
 */
export function extractSearchQuery(userMessage: string): string {
  let query = userMessage;

  // Remove common search command prefixes
  query = query.replace(
    /^(search for|find|look up|google|web search|search)\s+/i,
    ''
  );

  // Remove analysis/action suffixes
  query = query.replace(
    /\s+(and analyze|then analyze|analyze|and check|then check).+$/i,
    ''
  );

  query = query.replace(/\s+(and tell me|tell me|show me).+$/i, '');

  // Remove sentiment analysis instructions
  query = query.replace(/\s+(using sentiment analyzer|sentiment analysis|analyze sentiment).+$/i, '');

  // Clean up whitespace
  query = query.trim();

  return query;
}