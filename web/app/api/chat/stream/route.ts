import { NextRequest } from 'next/server';

// GET /api/chat/stream - Stream AI responses using Server-Sent Events
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId');

  if (!sessionId) {
    return new Response('Session ID is required', { status: 400 });
  }

  try {
    // Load the session to get the latest message
    const fs = require('fs').promises;
    const path = require('path');

    const sessionsDir = path.join(process.cwd(), 'data', 'chat-sessions');
    const sessionPath = path.join(sessionsDir, `${sessionId}.json`);

    let session;
    try {
      const sessionData = await fs.readFile(sessionPath, 'utf8');
      session = JSON.parse(sessionData);
    } catch (fileError) {
      return new Response('Session not found', { status: 404 });
    }

    // Get the latest user message
    const messages = session.messages || [];
    const lastMessage = messages[messages.length - 1];

    if (!lastMessage || lastMessage.role !== 'user') {
      return new Response('No user message to respond to', { status: 400 });
    }

    // Create a Server-Sent Events stream
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      start(controller) {
        // Function to send SSE data
        const sendEvent = (data: any) => {
          const sseData = `data: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(sseData));
        };

        // Start the AI response process
        processAIResponse(lastMessage.content, sessionId, sendEvent)
          .then(() => {
            // Send completion event
            sendEvent({ type: 'done' });
            controller.close();
          })
          .catch((error) => {
            console.error('AI response error:', error);
            sendEvent({
              type: 'error',
              error: error.message || 'Failed to generate response'
            });
            controller.close();
          });
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      }
    });

  } catch (error) {
    console.error('Stream setup error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}

// Process AI response - this connects to the AgentMarket MCP server
async function processAIResponse(userMessage: string, sessionId: string, sendEvent: (data: any) => void) {
  try {
    // First, simulate connecting to AgentMarket MCP server
    // In a real implementation, this would connect to the MCP server on port 8081

    // For now, let's create a meaningful response that demonstrates the system working
    const responses = [
      "I'll help you with that. Let me search for relevant services in the marketplace.",
      "I found several services that can help with your request.",
      "Let me execute the appropriate service for you.",
      "Great! I've completed the task using the marketplace services."
    ];

    // Simulate different types of events
    if (userMessage.toLowerCase().includes('service') || userMessage.toLowerCase().includes('search')) {
      // Simulate service discovery
      sendEvent({
        type: 'service_status',
        data: {
          serviceName: 'Service Discovery',
          status: 'executing',
          icon: '🔍',
          message: 'Searching marketplace services...',
          cost: '$0.001'
        }
      });

      await delay(1000);

      sendEvent({
        type: 'search_results',
        data: {
          query: userMessage,
          results: [
            {
              rank: 1,
              title: 'Sentiment Analysis Service',
              url: 'sentiment-ai',
              description: 'Analyze sentiment of text with high accuracy',
              source: 'marketplace',
              age: '2 days ago'
            },
            {
              rank: 2,
              title: 'Text Summarization Service',
              url: 'text-summarizer',
              description: 'Summarize long text into key points',
              source: 'marketplace',
              age: '1 day ago'
            }
          ],
          totalResults: 5,
          healthCheckPassed: true,
          cost: '$0.001'
        }
      });
    }

    // Stream the AI response token by token
    const aiResponse = generateAIResponse(userMessage);
    const tokens = aiResponse.split(' ');

    for (const token of tokens) {
      sendEvent({
        type: 'token',
        data: { token: token + ' ' }
      });
      await delay(50); // Simulate streaming delay
    }

    // Save AI response to session
    await saveAIResponseToSession(sessionId, aiResponse);

    // Simulate balance update
    sendEvent({
      type: 'balance_update',
      balance: '9.998' // Simulate small cost deduction
    });

  } catch (error) {
    throw error;
  }
}

// Generate an AI response based on the user message
function generateAIResponse(userMessage: string): string {
  const message = userMessage.toLowerCase();

  if (message.includes('sentiment') || message.includes('analyze')) {
    return "I can help you analyze sentiment! I've found several sentiment analysis services in the marketplace. The Sentiment Analysis Service offers high-accuracy text sentiment detection with real-time processing. Would you like me to analyze some text for you?";
  }

  if (message.includes('summarize') || message.includes('summary')) {
    return "I can help you summarize text! I found the Text Summarization Service which can extract key points from long documents. Just provide the text you'd like me to summarize and I'll use the service to process it for you.";
  }

  if (message.includes('image') || message.includes('analyze image')) {
    return "I can analyze images for you! I found the Vision Analysis Service in the marketplace that can identify objects, text, and provide detailed descriptions. Please share an image URL or upload an image and I'll analyze it using the service.";
  }

  if (message.includes('services') || message.includes('what') || message.includes('available')) {
    return "I have access to several AI services through the AgentMarket marketplace including: \n\n• **Sentiment Analysis** - Analyze text sentiment and emotions\n• **Text Summarization** - Extract key points from long content  \n• **Image Analysis** - Identify objects and analyze visual content\n• **Language Translation** - Translate between multiple languages\n\nWhat would you like me to help you with?";
  }

  // Default response
  return `I understand you're asking about "${userMessage}". I can help you with various AI tasks using services from the marketplace. I can analyze sentiment, summarize text, process images, and much more. What specific task would you like me to help you with?`;
}

// Save AI response to the session file
async function saveAIResponseToSession(sessionId: string, response: string) {
  try {
    const fs = require('fs').promises;
    const path = require('path');

    const sessionsDir = path.join(process.cwd(), 'data', 'chat-sessions');
    const sessionPath = path.join(sessionsDir, `${sessionId}.json`);

    const sessionData = await fs.readFile(sessionPath, 'utf8');
    const session = JSON.parse(sessionData);

    // Add AI response
    const aiMessage = {
      role: 'assistant',
      content: response,
      timestamp: new Date().toLocaleTimeString(),
      createdAt: new Date().toISOString(),
      isStreaming: false
    };

    session.messages = session.messages || [];
    session.messages.push(aiMessage);
    session.messageCount = session.messages.length;
    session.lastActivity = new Date().toISOString();

    // Save updated session
    await fs.writeFile(sessionPath, JSON.stringify(session, null, 2));
  } catch (error) {
    console.error('Failed to save AI response:', error);
  }
}

// Helper function for delays
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}