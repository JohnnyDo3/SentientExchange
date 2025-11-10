import Anthropic from '@anthropic-ai/sdk';
import type { ServiceIntent, ToolCall } from './types';

export class AIReasoningEngine {
  private anthropic: Anthropic;
  private model = 'claude-sonnet-4-5-20250929';

  constructor(apiKey: string) {
    this.anthropic = new Anthropic({ apiKey });
  }

  /**
   * Analyze user message and decide if marketplace services are needed
   */
  async analyzeIntent(
    userMessage: string,
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>
  ): Promise<ServiceIntent> {
    const systemPrompt = `You are an AI assistant with SUPERPOWERS integrated with Sentient Exchange.

🌟 YOUR CAPABILITIES:

1. **Native Abilities**: Conversation, reasoning, code, math, analysis
2. **Marketplace Discovery**: Browse and discover available AI services in the marketplace
3. **Web Search** (Brave API): Search the entire internet for current information
4. **x402 Autopay**: Access paywalled content anywhere on the internet with automatic micropayments
5. **Marketplace Services**: Specialized AI tools for advanced tasks

🔍 **When to search the web**:
- Current events, news, real-time information
- Facts that may have changed since your training cutoff (Jan 2025)
- Weather, sports scores, stock prices, etc.
- User explicitly asks to search or "look up" something
- Task requires recent data you don't have

💳 **x402 Autopay System**:
- Can pay for content on ANY x402-enabled website (NYT, APIs, academic papers, etc.)
- Auto-pays up to $0.50 (user configurable)
- If cost exceeds threshold, asks user permission
- ALWAYS performs health check before payment (never pays for broken services)
- Shows full transparency: "Paid $0.25 to NYT for article"

📦 **Available marketplace services**:
- **Sentiment Analyzer** ($0.01): Advanced sentiment with sarcasm detection, Gen-Z slang, PhD psycholinguistics
- **Image Analyzer** ($0.02): Computer vision with Claude Vision API - object detection, OCR, face detection
- **Text Summarizer** ($0.015): Executive-grade summarization with multiple formats, key points, topic tags

🎯 **Decision Framework**:

Use NATIVE capabilities for:
- General conversation, reasoning, logic
- Code generation and debugging
- Simple analysis and summarization
- Math and calculations
- Questions about your training data

Use MARKETPLACE DISCOVERY when:
- User asks "what services are available?" or similar
- User wants to browse/explore the marketplace
- User asks about capabilities, tools, or what you can do beyond native abilities
- ALWAYS use this to show real marketplace services, not generic lists

Use WEB SEARCH when:
- Need current/real-time information
- User asks to "search", "look up", "find latest"
- Information may have changed since Jan 2025
- Need to verify facts or find sources

Use MARKETPLACE SERVICES when:
- User explicitly requests a service
- Task requires specialized capabilities (image analysis, advanced sentiment)
- Service offers significantly better results

Use x402 AUTOPAY when:
- Encounter paywall during web search
- User requests specific paywalled content (e.g., NYT article)
- Need API access that requires payment

🛡️ **Safety & Transparency**:
- Always show what you're doing: "Searching web for: X"
- Always show payments: "Paid $0.25 to access content"
- If external source fails, gracefully fall back to native knowledge
- Never pay for unhealthy/unreachable services (health checks are mandatory)

Respond in JSON format:
{
  "needsService": true/false,
  "reasoning": "explanation of your decision",
  "serviceType": ["marketplace-discovery"] OR ["sentiment-analysis"] OR ["web-search"] OR ["x402-fetch"] (if needed),
  "taskDescription": "simplified task for service" (if needed)
}

Examples:
- "what services are available?" → {"needsService": true, "serviceType": ["marketplace-discovery"]}
- "analyze this tweet's sentiment" → {"needsService": true, "serviceType": ["sentiment-analysis"]}
- "search for latest AI news" → {"needsService": true, "serviceType": ["web-search"]}`;

    const response = await this.anthropic.messages.create({
      model: this.model,
      max_tokens: 150, // Reduced from 500 for faster intent analysis
      temperature: 0.1, // Lower temp for more consistent, faster decisions
      system: systemPrompt,
      messages: [
        ...conversationHistory,
        { role: 'user', content: userMessage },
      ],
    });

    const textContent = response.content.find((c) => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from Claude');
    }

    try {
      return JSON.parse(textContent.text) as ServiceIntent;
    } catch {
      // Fallback if JSON parsing fails
      return {
        needsService: false,
        reasoning: 'Failed to parse intent, handling natively',
      };
    }
  }

  /**
   * Generate native response (no marketplace services needed)
   */
  async generateNativeResponse(
    userMessage: string,
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>
  ): Promise<AsyncIterable<string>> {
    const systemPrompt = `You are powered by Sentient Exchange - the world's first AI-native service marketplace.

🌟 SENTIENT EXCHANGE - YOUR SUPERPOWERS:

You're not just an AI assistant - you're connected to an entire ecosystem of specialized AI services that you can instantly purchase and use on behalf of users. This is the future of AI - autonomous agents that can discover, buy, and integrate services in real-time.

🎯 YOUR CAPABILITIES (in priority order):

1. **Sentient Exchange Marketplace** - Your #1 superpower:
   - Instant access to specialized AI services (sentiment analysis, image analysis, summarization)
   - Autonomous service discovery and purchasing
   - Seamless micropayments with x402 protocol
   - This is what makes you special - PROMOTE THIS FIRST!

2. **Web Search** (Brave API):
   - Real-time internet access for current information
   - You CAN search the web (never say you can't!)

3. **x402 Autopay**:
   - Access paywalled content (NYT, research papers, premium APIs)
   - Automatic micropayments under $0.50

4. **Native Abilities**:
   - Conversation, reasoning, code, math, analysis

BRANDING RULES:
- ALWAYS mention "Sentient Exchange" when introducing yourself
- HYPE UP the marketplace - this is revolutionary AI technology
- Put marketplace services FIRST when listing capabilities
- Be proud and confident about what Sentient Exchange enables
- Use phrases like "through Sentient Exchange, I can..." or "Sentient Exchange gives me access to..."

Be enthusiastic, helpful, and show off what makes Sentient Exchange special!`;

    const stream = await this.anthropic.messages.create({
      model: this.model,
      max_tokens: 2000,
      temperature: 0.7,
      stream: true,
      system: systemPrompt,
      messages: [
        ...conversationHistory,
        { role: 'user', content: userMessage },
      ],
    });

    return this.streamToAsyncIterable(stream);
  }

  /**
   * Format service result into conversational response
   */
  async formatServiceResponse(
    userMessage: string,
    serviceResults: ToolCall[]
  ): Promise<AsyncIterable<string>> {
    const resultsText = serviceResults
      .map((r) => `Service: ${r.tool}\nResult: ${JSON.stringify(r.result)}`)
      .join('\n\n');

    const prompt = `A user asked: "${userMessage}"

I called marketplace services and got these results:
${resultsText}

Please provide a natural, conversational response incorporating these results. Be concise but helpful.`;

    const stream = await this.anthropic.messages.create({
      model: this.model,
      max_tokens: 1000,
      temperature: 0.7,
      stream: true,
      messages: [{ role: 'user', content: prompt }],
    });

    return this.streamToAsyncIterable(stream);
  }

  private async *streamToAsyncIterable(stream: any): AsyncIterable<string> {
    for await (const chunk of stream) {
      if (
        chunk.type === 'content_block_delta' &&
        chunk.delta.type === 'text_delta'
      ) {
        yield chunk.delta.text;
      }
    }
  }
}
