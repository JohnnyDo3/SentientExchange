export const chatAPI = {
  async createSession() {
    const res = await fetch('/api/chat/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) throw new Error('Failed to create session');
    return res.json();
  },

  streamMessage(sessionId: string, message: string) {
    const url = `/api/chat/stream?sessionId=${sessionId}`;
    const eventSource = new EventSource(url);

    // Send the message via POST first
    fetch('/api/chat/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, message })
    });

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
