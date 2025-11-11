import { NextRequest, NextResponse } from 'next/server';

interface ChatSessionFull {
  id: string;
  title: string;
  preview: string;
  messageCount: number;
  lastActivity: string;
  isPinned?: boolean;
  messages: any[];
  serviceCalls: any[];
  searchQueries: any[];
  paymentRequests: any[];
}

// GET /api/chat/sessions/[sessionId] - Get a specific chat session with full data
export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { sessionId } = params;

    if (!sessionId) {
      return NextResponse.json({
        success: false,
        error: 'Session ID is required'
      }, { status: 400 });
    }

    // Load session from file storage
    const fs = require('fs').promises;
    const path = require('path');

    const sessionsDir = path.join(process.cwd(), 'data', 'chat-sessions');
    const sessionPath = path.join(sessionsDir, `${sessionId}.json`);

    try {
      const sessionData = await fs.readFile(sessionPath, 'utf8');
      const session: ChatSessionFull = JSON.parse(sessionData);

      // Update last activity timestamp
      session.lastActivity = new Date().toISOString();

      // Save updated timestamp
      await fs.writeFile(sessionPath, JSON.stringify(session, null, 2));

      return NextResponse.json({
        success: true,
        session: session
      });

    } catch (fileError) {
      if ((fileError as NodeJS.ErrnoException).code === 'ENOENT') {
        return NextResponse.json({
          success: false,
          error: 'Session not found'
        }, { status: 404 });
      }
      throw fileError;
    }

  } catch (error) {
    console.error(`Failed to load chat session ${params.sessionId}:`, error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load session'
    }, { status: 500 });
  }
}

// PUT /api/chat/sessions/[sessionId] - Update a chat session
export async function PUT(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { sessionId } = params;
    const body = await request.json();
    const { title, messages, serviceCalls, searchQueries, paymentRequests, isPinned } = body;

    if (!sessionId) {
      return NextResponse.json({
        success: false,
        error: 'Session ID is required'
      }, { status: 400 });
    }

    // Load existing session
    const fs = require('fs').promises;
    const path = require('path');

    const sessionsDir = path.join(process.cwd(), 'data', 'chat-sessions');
    const sessionPath = path.join(sessionsDir, `${sessionId}.json`);

    let existingSession: ChatSessionFull;

    try {
      const sessionData = await fs.readFile(sessionPath, 'utf8');
      existingSession = JSON.parse(sessionData);
    } catch (fileError) {
      if ((fileError as NodeJS.ErrnoException).code === 'ENOENT') {
        return NextResponse.json({
          success: false,
          error: 'Session not found'
        }, { status: 404 });
      }
      throw fileError;
    }

    // Update session data
    const updatedSession: ChatSessionFull = {
      ...existingSession,
      title: title !== undefined ? title : existingSession.title,
      messages: messages !== undefined ? messages : existingSession.messages,
      serviceCalls: serviceCalls !== undefined ? serviceCalls : existingSession.serviceCalls,
      searchQueries: searchQueries !== undefined ? searchQueries : existingSession.searchQueries,
      paymentRequests: paymentRequests !== undefined ? paymentRequests : existingSession.paymentRequests,
      isPinned: isPinned !== undefined ? isPinned : existingSession.isPinned,
      lastActivity: new Date().toISOString(),
      messageCount: messages ? messages.length : existingSession.messageCount,
      preview: messages ? generatePreviewFromMessages(messages) : existingSession.preview
    };

    // Save updated session
    await fs.writeFile(sessionPath, JSON.stringify(updatedSession, null, 2));

    return NextResponse.json({
      success: true,
      session: {
        id: updatedSession.id,
        title: updatedSession.title,
        preview: updatedSession.preview,
        messageCount: updatedSession.messageCount,
        lastActivity: updatedSession.lastActivity,
        isPinned: updatedSession.isPinned
      }
    });

  } catch (error) {
    console.error(`Failed to update chat session ${params.sessionId}:`, error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update session'
    }, { status: 500 });
  }
}

// DELETE /api/chat/sessions/[sessionId] - Delete a chat session
export async function DELETE(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { sessionId } = params;

    if (!sessionId) {
      return NextResponse.json({
        success: false,
        error: 'Session ID is required'
      }, { status: 400 });
    }

    // Delete session file
    const fs = require('fs').promises;
    const path = require('path');

    const sessionsDir = path.join(process.cwd(), 'data', 'chat-sessions');
    const sessionPath = path.join(sessionsDir, `${sessionId}.json`);

    try {
      await fs.unlink(sessionPath);

      return NextResponse.json({
        success: true,
        message: 'Session deleted successfully'
      });

    } catch (fileError) {
      if ((fileError as NodeJS.ErrnoException).code === 'ENOENT') {
        return NextResponse.json({
          success: false,
          error: 'Session not found'
        }, { status: 404 });
      }
      throw fileError;
    }

  } catch (error) {
    console.error(`Failed to delete chat session ${params.sessionId}:`, error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete session'
    }, { status: 500 });
  }
}

// Helper function
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