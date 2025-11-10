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
    const systemPrompt = `You are an AI assistant with SUPERPOWERS integrated with AgentMarket.

🌟 YOUR CAPABILITIES:

1. **Native Abilities**: Conversation, reasoning, code, math, analysis
2. **Web Search** (Brave API): Search the entire internet for current information
3. **x402 Autopay**: Access paywalled content anywhere on the internet with automatic micropayments
4. **Marketplace Services**: Specialized AI tools for advanced tasks

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
  "serviceType": ["sentiment-analysis"] OR ["web-search"] OR ["x402-fetch"] (if needed),
  "taskDescription": "simplified task for service" (if needed)
}`;

    const response = await this.anthropic.messages.create({
      model: this.model,
      max_tokens: 500,
      temperature: 0.3,
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
    const stream = await this.anthropic.messages.create({
      model: this.model,
      max_tokens: 2000,
      temperature: 0.7,
      stream: true,
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
