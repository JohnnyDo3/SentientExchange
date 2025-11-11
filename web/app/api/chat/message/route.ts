import { NextRequest, NextResponse } from 'next/server';

// POST /api/chat/message - Save a message to a chat session
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, message } = body;

    if (!sessionId || !message) {
      return NextResponse.json({
        success: false,
        error: 'Session ID and message are required'
      }, { status: 400 });
    }

    // Load existing session
    const fs = require('fs').promises;
    const path = require('path');

    const sessionsDir = path.join(process.cwd(), 'data', 'chat-sessions');
    const sessionPath = path.join(sessionsDir, `${sessionId}.json`);

    let session;

    try {
      const sessionData = await fs.readFile(sessionPath, 'utf8');
      session = JSON.parse(sessionData);
    } catch (fileError) {
      // If session doesn't exist, create a new one
      if ((fileError as NodeJS.ErrnoException).code === 'ENOENT') {
        session = {
          id: sessionId,
          title: generateTitleFromMessage(message),
          preview: generatePreviewFromMessage(message),
          messageCount: 0,
          lastActivity: new Date().toISOString(),
          isPinned: false,
          messages: [],
          serviceCalls: [],
          searchQueries: [],
          paymentRequests: []
        };

        // Create directory if it doesn't exist
        await fs.mkdir(sessionsDir, { recursive: true });
      } else {
        throw fileError;
      }
    }

    // Add the user message
    const userMessage = {
      role: 'user',
      content: message,
      timestamp: new Date().toLocaleTimeString(),
      createdAt: new Date().toISOString()
    };

    session.messages = session.messages || [];
    session.messages.push(userMessage);
    session.messageCount = session.messages.length;
    session.lastActivity = new Date().toISOString();

    // Update title and preview if this is the first message
    if (session.messages.length === 1) {
      session.title = generateTitleFromMessage(message);
      session.preview = generatePreviewFromMessage(message);
    }

    // Save updated session
    await fs.writeFile(sessionPath, JSON.stringify(session, null, 2));

    return NextResponse.json({
      success: true,
      session: session
    });

  } catch (error) {
    console.error('Failed to save chat message:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save message'
    }, { status: 500 });
  }
}

// Helper functions
function generateTitleFromMessage(message: string): string {
  const content = message.trim();
  if (content.length > 50) {
    return content.substring(0, 50) + '...';
  }
  return content;
}

function generatePreviewFromMessage(message: string): string {
  const content = message.trim();
  if (content.length > 100) {
    return content.substring(0, 100) + '...';
  }
  return content;
}