import { NextRequest, NextResponse } from 'next/server';

// POST /api/chat/fund - Add funds to a chat session
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, amount } = body;

    if (!sessionId || amount === undefined) {
      return NextResponse.json({
        success: false,
        error: 'Session ID and amount are required'
      }, { status: 400 });
    }

    if (amount <= 0) {
      return NextResponse.json({
        success: false,
        error: 'Amount must be greater than 0'
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
      if ((fileError as NodeJS.ErrnoException).code === 'ENOENT') {
        return NextResponse.json({
          success: false,
          error: 'Session not found'
        }, { status: 404 });
      }
      throw fileError;
    }

    // Update session balance
    const currentBalance = parseFloat(session.balance || '0.000'); // Default starting balance
    const newBalance = currentBalance + amount;

    session.balance = newBalance.toFixed(3);
    session.lastActivity = new Date().toISOString();

    // Track funding history
    if (!session.fundingHistory) {
      session.fundingHistory = [];
    }

    session.fundingHistory.push({
      amount: amount,
      timestamp: new Date().toISOString(),
      balanceAfter: session.balance
    });

    // Save updated session
    await fs.writeFile(sessionPath, JSON.stringify(session, null, 2));

    // Return session data for useChat hook
    return NextResponse.json({
      success: true,
      id: session.id,
      balance: session.balance,
      initialBalance: session.initialBalance || '10.000',
      pdaAddress: session.pdaAddress || generatePDAAddress()
    });

  } catch (error) {
    console.error('Failed to add funds to chat session:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add funds'
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