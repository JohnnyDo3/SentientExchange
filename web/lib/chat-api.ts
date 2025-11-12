export const chatAPI = {
  async createSession() {
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    const res = await fetch('/api/chat/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'New Chat',
        messages: [],
        serviceCalls: [],
        searchQueries: [],
        paymentRequests: []
      })
    });
    if (!res.ok) throw new Error('Failed to create session');
    const data = await res.json();

    // Return session object that useChat expects
    return {
      id: data.session.id,
      balance: '0.000',
      initialBalance: '0.000',
      pdaAddress: generatePDAAddress()
    };
  },

  async streamMessage(sessionId: string, message: string) {
    // Send the message via POST first and wait for it to be saved
    await fetch('/api/chat/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, message })
    });

    // Now open the stream (message is guaranteed to be in DB)
    const url = `/api/chat/stream?sessionId=${sessionId}`;
    const eventSource = new EventSource(url);

    return eventSource;
  },

  async addFunds(sessionId: string, amount: number) {
    const res = await fetch('/api/chat/fund', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, amount })
    });
    if (!res.ok) throw new Error('Failed to add funds');
    return res.json();
  },

  async getHistory(sessionId: string) {
    const res = await fetch(`/api/chat/history/${sessionId}`);
    const data = await res.json();

    // Return the response data even if status is not ok
    // The useChat hook will check data.success
    return data;
  }
};

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
