import { NextRequest, NextResponse } from 'next/server';

interface ChatSession {
  id: string;
  title: string;
  preview: string;
  messageCount: number;
  lastActivity: string;
  isPinned?: boolean;
  messages?: any[];
  serviceCalls?: any[];
  searchQueries?: any[];
  paymentRequests?: any[];
}

// GET /api/chat/sessions - Get all chat sessions for the user
export async function GET(request: NextRequest) {
  try {
    // For now, we'll use a file-based storage system
    // In production, this would be a database
    const fs = require('fs').promises;
    const path = require('path');

    const sessionsDir = path.join(process.cwd(), 'data', 'chat-sessions');

    try {
      // Ensure directory exists
      await fs.mkdir(sessionsDir, { recursive: true });

      // Read all session files
      const sessionFiles = await fs.readdir(sessionsDir);
      const sessions: ChatSession[] = [];

      for (const file of sessionFiles) {
        if (file.endsWith('.json')) {
          try {
            const sessionPath = path.join(sessionsDir, file);
            const sessionData = await fs.readFile(sessionPath, 'utf8');
            const session = JSON.parse(sessionData);

            // Extract metadata for the session list
            const sessionMetadata: ChatSession = {
              id: session.id,
              title: session.title || generateTitleFromMessages(session.messages),
              preview: session.preview || generatePreviewFromMessages(session.messages),
              messageCount: session.messages ? session.messages.length : 0,
              lastActivity: session.lastActivity || new Date().toISOString(),
              isPinned: session.isPinned || false
            };

            sessions.push(sessionMetadata);
          } catch (parseError) {
            console.warn(`Failed to parse session file ${file}:`, parseError);
          }
        }
      }

      // Sort by last activity (newest first)
      sessions.sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime());

      return NextResponse.json({
        success: true,
        sessions: sessions
      });

    } catch (dirError) {
      console.warn('Chat sessions directory not found, returning empty list');
      return NextResponse.json({
        success: true,
        sessions: []
      });
    }

  } catch (error) {
    console.error('Failed to fetch chat sessions:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch sessions',
      sessions: []
    }, { status: 500 });
  }
}

// POST /api/chat/sessions - Create a new chat session
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, messages, serviceCalls, searchQueries, paymentRequests } = body;

    const sessionId = generateSessionId();
    const session: ChatSession = {
      id: sessionId,
      title: title || generateTitleFromMessages(messages),
      preview: generatePreviewFromMessages(messages),
      messageCount: messages ? messages.length : 0,
      lastActivity: new Date().toISOString(),
      isPinned: false,
      messages: messages || [],
      serviceCalls: serviceCalls || [],
      searchQueries: searchQueries || [],
      paymentRequests: paymentRequests || []
    };

    // Save to file storage
    const fs = require('fs').promises;
    const path = require('path');

    const sessionsDir = path.join(process.cwd(), 'data', 'chat-sessions');
    await fs.mkdir(sessionsDir, { recursive: true });

    const sessionPath = path.join(sessionsDir, `${sessionId}.json`);
    await fs.writeFile(sessionPath, JSON.stringify(session, null, 2));

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        title: session.title,
        preview: session.preview,
        messageCount: session.messageCount,
        lastActivity: session.lastActivity,
        isPinned: session.isPinned
      }
    });

  } catch (error) {
    console.error('Failed to create chat session:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create session'
    }, { status: 500 });
  }
}

// Helper functions
function generateSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

function generateTitleFromMessages(messages: any[]): string {
  if (!messages || messages.length === 0) {
    return 'New Chat';
  }

  const firstUserMessage = messages.find(msg => msg.role === 'user');
  if (firstUserMessage) {
    const content = firstUserMessage.content.trim();
    if (content.length > 50) {
      return content.substring(0, 50) + '...';
    }
    return content;
  }

  return 'New Chat';
}

function generatePreviewFromMessages(messages: any[]): string {
  if (!messages || messages.length === 0) {
    return 'No messages yet';
  }

  const firstUserMessage = messages.find(msg => msg.role === 'user');
  if (firstUserMessage) {
    const content = firstUserMessage.content.trim();
    if (content.length > 100) {
      return content.substring(0, 100) + '...';
    }
    return content;
  }

  return 'Chat conversation';
}