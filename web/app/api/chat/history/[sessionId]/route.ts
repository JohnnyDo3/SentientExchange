import { NextRequest, NextResponse } from 'next/server';

// GET /api/chat/history/[sessionId] - Get chat history for a specific session
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
      const session = JSON.parse(sessionData);

      // Update last activity timestamp (user viewed this session)
      session.lastActivity = new Date().toISOString();
      await fs.writeFile(sessionPath, JSON.stringify(session, null, 2));

      // Return the full chat history
      return NextResponse.json({
        success: true,
        history: {
          messages: session.messages || [],
          serviceCalls: session.serviceCalls || [],
          searchQueries: session.searchQueries || [],
          paymentRequests: session.paymentRequests || [],
          session: {
            id: session.id,
            balance: session.balance || '0.000',
            initialBalance: session.initialBalance || '0.000',
            pdaAddress: session.pdaAddress || generatePDAAddress()
          }
        }
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
    console.error(`Failed to fetch chat history for session ${params.sessionId}:`, error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch chat history'
    }, { status: 500 });
  }
}

// Generate a mock PDA address for the session
function generatePDAAddress(): string {
  // Generate a mock Solana-style address
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz123456789';
  let result = '';
  for (let i = 0; i < 44; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}