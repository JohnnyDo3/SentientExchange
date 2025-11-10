import type { ServiceIntent } from './types.js';

/**
 * Fast pattern-based intent detection
 * Runs in <1ms vs AI analysis which takes 1-2 seconds
 */
export class PatternMatcher {
  /**
   * Try to detect intent using pattern matching
   * Returns null if no pattern matches (fallback to AI)
   */
  static detectIntent(message: string): ServiceIntent | null {
    const lowerMessage = message.toLowerCase().trim();

    // Marketplace discovery patterns
    if (this.matchesMarketplaceDiscovery(lowerMessage)) {
      return {
        needsService: true,
        reasoning: 'Pattern matched: marketplace discovery request',
        serviceType: ['marketplace-discovery'],
        taskDescription: 'List available marketplace services',
      };
    }

    // Web search patterns
    if (this.matchesWebSearch(lowerMessage)) {
      return {
        needsService: true,
        reasoning: 'Pattern matched: web search request',
        serviceType: ['web-search'],
        taskDescription: message,
      };
    }

    // Sentiment analysis patterns
    if (this.matchesSentiment(lowerMessage)) {
      return {
        needsService: true,
        reasoning: 'Pattern matched: sentiment analysis request',
        serviceType: ['sentiment-analysis'],
        taskDescription: message,
      };
    }

    // x402 fetch patterns
    if (this.matchesX402Fetch(lowerMessage)) {
      return {
        needsService: true,
        reasoning: 'Pattern matched: x402 content fetch request',
        serviceType: ['x402-fetch'],
        taskDescription: message,
      };
    }

    // Conversation patterns (skip AI entirely)
    if (this.isConversation(lowerMessage)) {
      return {
        needsService: false,
        reasoning: 'Pattern matched: conversational message, no service needed',
      };
    }

    // No pattern matched - use AI
    return null;
  }

  private static matchesMarketplaceDiscovery(msg: string): boolean {
    const patterns = [
      /what (services|tools|capabilities) (are|do you have) available/i,
      /show me (the )?(available )?(services|tools)/i,
      /list (all )?(services|tools|capabilities)/i,
      /what can you do (beyond|besides)/i,
      /browse (the )?marketplace/i,
      /discover services/i,
    ];
    return patterns.some((p) => p.test(msg));
  }

  private static matchesWebSearch(msg: string): boolean {
    const patterns = [
      /search (for|the web|internet|online)/i,
      /look up .+/i,
      /find (the )?latest .+/i,
      /what('s| is) (the )?(current|latest|recent)/i,
      /google .+/i,
      /web search/i,
    ];
    return patterns.some((p) => p.test(msg));
  }

  private static matchesSentiment(msg: string): boolean {
    const patterns = [
      /analyz(e|ing) (the )?sentiment/i,
      /what('s| is) the sentiment (of|in)/i,
      /(check|detect) sentiment/i,
      /is this (positive|negative|neutral)/i,
      /tone (of|in) (this|the)/i,
    ];
    return patterns.some((p) => p.test(msg));
  }

  private static matchesX402Fetch(msg: string): boolean {
    // Check for URLs and paywalled content requests
    const hasUrl = /https?:\/\/[^\s]+/i.test(msg);
    const mentionsPaywall =
      /(paywall|paywalled|paid|subscription) (content|article)/i.test(msg);
    const requestsArticle =
      /(fetch|get|read|access) (the )?(nyt|article|paper)/i.test(msg);

    return hasUrl || mentionsPaywall || requestsArticle;
  }

  private static isConversation(msg: string): boolean {
    const patterns = [
      // Greetings
      /^(hi|hello|hey|greetings|good (morning|afternoon|evening))/i,

      // Questions about Claude itself
      /who (are you|created you|made you)/i,
      /what (are you|is your|do you)/i,

      // Simple yes/no responses
      /^(yes|no|yeah|nope|sure|okay|ok|thanks|thank you)/i,

      // Meta questions
      /how (are|do) you/i,
      /can you help/i,
      /tell me about yourself/i,

      // Short acknowledgments (< 10 words, no task indicators)
      msg.split(' ').length < 10 &&
        !/\b(search|analyze|fetch|find|get|summarize|compare)\b/i.test(msg),
    ];

    return patterns.some((p) => (typeof p === 'boolean' ? p : p.test(msg)));
  }
}
