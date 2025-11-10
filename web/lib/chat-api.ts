export const chatAPI = {
  async createSession() {
    const res = await fetch('/api/chat/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) throw new Error('Failed to create session');
    return res.json();
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
    if (!res.ok) throw new Error('Failed to fetch history');
    return res.json();
  }
};
