/**
 * Smart query extraction for different service types
 * Extracts clean, focused queries from user messages
 */
export class QueryExtractor {
  /**
   * Extract clean search query from user message
   * Removes command words and analysis instructions
   *
   * Examples:
   * "search for Tesla stock news and analyze sentiment" → "Tesla stock news"
   * "find latest AI developments" → "latest AI developments"
   * "look up Bitcoin price" → "Bitcoin price"
   */
  static extractSearchQuery(message: string): string {
    let query = message;

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

    // Clean up extra whitespace
    query = query.trim();

    // If we stripped everything, return original
    return query || message;
  }

  /**
   * Extract text for sentiment analysis
   *
   * Examples:
   * "analyze sentiment of this: I love it!" → "I love it!"
   * "what's the sentiment around Bitcoin?" → "[SEARCH_RESULTS]" (marker)
   * "check sentiment: This product is terrible" → "This product is terrible"
   */
  static extractSentimentText(message: string): string {
    // Check for explicit text after colon
    const colonMatch = message.match(/sentiment.*?:\s*(.+)/i);
    if (colonMatch) {
      return colonMatch[1].trim();
    }

    // Check for quoted text
    const quoteMatch = message.match(/"([^"]+)"|'([^']+)'/);
    if (quoteMatch) {
      return (quoteMatch[1] || quoteMatch[2]).trim();
    }

    // If asking about sentiment of something (likely search results)
    if (/sentiment (of|in|around|about)/.test(message.toLowerCase())) {
      return '[SEARCH_RESULTS]'; // Special marker for pipeline
    }

    // Default: use original message
    return message;
  }

  /**
   * Extract URL from message
   *
   * Examples:
   * "fetch https://nyt.com/article" → "https://nyt.com/article"
   * "get me this article https://..." → "https://..."
   */
  static extractUrl(message: string): string | null {
    const urlMatch = message.match(/(https?:\/\/[^\s]+)/i);
    return urlMatch ? urlMatch[1] : null;
  }

  /**
   * Smart extraction for multiple services
   * Returns a map of service type → extracted query
   *
   * Handles multi-service workflows like search → sentiment
   */
  static extractForServices(
    message: string,
    serviceTypes: string[]
  ): Map<string, string> {
    const queries = new Map<string, string>();

    if (serviceTypes.includes('web-search')) {
      queries.set('web-search', this.extractSearchQuery(message));
    }

    if (serviceTypes.includes('sentiment-analysis')) {
      queries.set('sentiment-analysis', this.extractSentimentText(message));
    }

    if (serviceTypes.includes('x402-fetch')) {
      const url = this.extractUrl(message);
      if (url) {
        queries.set('x402-fetch', url);
      }
    }

    return queries;
  }

  /**
   * Refine a search query that returned no results
   * Simplifies the query by removing modifiers
   *
   * Examples:
   * "latest breaking Tesla stock news" → "Tesla stock news"
   * "recent AI developments in 2025" → "AI developments"
   */
  static refineSearchQuery(query: string): string {
    return query
      .replace(/(latest|recent|new|breaking|current|today|this week)/gi, '')
      .replace(/\b(in|for|during)\s+\d{4}\b/gi, '') // Remove years
      .replace(/\s+/g, ' ')
      .trim();
  }
}
