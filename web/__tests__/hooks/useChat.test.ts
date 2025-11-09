import { renderHook, act, waitFor } from '@testing-library/react';
import { useChat } from '@/hooks/useChat';
import { chatAPI } from '@/lib/chat-api';

// Mock chat API
jest.mock('@/lib/chat-api');
const mockChatAPI = chatAPI as jest.Mocked<typeof chatAPI>;

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('useChat Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
  });

  describe('Session Initialization', () => {
    it('should initialize session on mount', async () => {
      const mockSession = {
        id: 'session-123',
        balance: '10.00',
        initialBalance: '10.00',
        pdaAddress: 'pda-addr'
      };

      mockChatAPI.createSession.mockResolvedValueOnce(mockSession);

      const { result } = renderHook(() => useChat());

      await waitFor(() => {
        expect(result.current.session).toEqual(mockSession);
      });

      expect(mockChatAPI.createSession).toHaveBeenCalledTimes(1);
    });

    it('should set error when session creation fails', async () => {
      mockChatAPI.createSession.mockRejectedValueOnce(new Error('API error'));

      const { result } = renderHook(() => useChat());

      await waitFor(() => {
        expect(result.current.error).toBe('Failed to create session. Please refresh the page.');
      });
    });
  });

  describe('localStorage Persistence', () => {
    it('should load saved conversation from localStorage', async () => {
      const mockSession = {
        id: 'session-123',
        balance: '10.00',
        initialBalance: '10.00',
        pdaAddress: 'pda-addr'
      };

      const savedData = {
        messages: [
          { role: 'user', content: 'Hello', timestamp: '10:00 AM' }
        ],
        serviceCalls: [],
        searchQueries: [],
        paymentRequests: []
      };

      localStorageMock.setItem(`chat-${mockSession.id}`, JSON.stringify(savedData));
      mockChatAPI.createSession.mockResolvedValueOnce(mockSession);

      const { result } = renderHook(() => useChat());

      await waitFor(() => {
        expect(result.current.messages).toHaveLength(1);
        expect(result.current.messages[0].content).toBe('Hello');
      });
    });

    it('should save conversation to localStorage after sending message', async () => {
      const mockSession = {
        id: 'session-123',
        balance: '10.00',
        initialBalance: '10.00',
        pdaAddress: 'pda-addr'
      };

      const mockEventSource = {
        onmessage: jest.fn(),
        onerror: jest.fn(),
        close: jest.fn()
      };

      mockChatAPI.createSession.mockResolvedValueOnce(mockSession);
      mockChatAPI.streamMessage.mockReturnValueOnce(mockEventSource as any);

      const { result } = renderHook(() => useChat());

      await waitFor(() => expect(result.current.session).toBeTruthy());

      act(() => {
        result.current.sendMessage('Test message');
      });

      await waitFor(() => {
        const saved = localStorageMock.getItem(`chat-${mockSession.id}`);
        expect(saved).toBeTruthy();
        const parsed = JSON.parse(saved!);
        expect(parsed.messages).toHaveLength(1);
        expect(parsed.messages[0].content).toBe('Test message');
      });
    });
  });

  describe('Message Sending', () => {
    it('should add user message immediately when sending', async () => {
      const mockSession = {
        id: 'session-123',
        balance: '10.00',
        initialBalance: '10.00',
        pdaAddress: 'pda-addr'
      };

      const mockEventSource = {
        onmessage: jest.fn(),
        onerror: jest.fn(),
        close: jest.fn()
      };

      mockChatAPI.createSession.mockResolvedValueOnce(mockSession);
      mockChatAPI.streamMessage.mockReturnValueOnce(mockEventSource as any);

      const { result } = renderHook(() => useChat());

      await waitFor(() => expect(result.current.session).toBeTruthy());

      act(() => {
        result.current.sendMessage('Hello AI');
      });

      expect(result.current.messages).toHaveLength(1);
      expect(result.current.messages[0]).toMatchObject({
        role: 'user',
        content: 'Hello AI'
      });
      expect(result.current.isLoading).toBe(true);
    });

    it('should not send message if no session', async () => {
      mockChatAPI.createSession.mockResolvedValueOnce(null as any);

      const { result } = renderHook(() => useChat());

      act(() => {
        result.current.sendMessage('Test');
      });

      expect(mockChatAPI.streamMessage).not.toHaveBeenCalled();
    });
  });

  describe('SSE Event Handling - Token Streaming', () => {
    it('should handle token events and build assistant message', async () => {
      const mockSession = {
        id: 'session-123',
        balance: '10.00',
        initialBalance: '10.00',
        pdaAddress: 'pda-addr'
      };

      let eventHandler: ((event: MessageEvent) => void) | null = null;
      const mockEventSource = {
        onmessage: null,
        onerror: jest.fn(),
        close: jest.fn()
      };

      mockChatAPI.createSession.mockResolvedValueOnce(mockSession);
      mockChatAPI.streamMessage.mockReturnValueOnce(mockEventSource as any);

      const { result } = renderHook(() => useChat());

      await waitFor(() => expect(result.current.session).toBeTruthy());

      act(() => {
        result.current.sendMessage('Test');
      });

      // Capture the onmessage handler
      eventHandler = mockEventSource.onmessage as any;

      // Simulate token events
      act(() => {
        eventHandler!({ data: JSON.stringify({ type: 'token', token: 'Hello' }) } as MessageEvent);
      });

      expect(result.current.messages).toHaveLength(2);
      expect(result.current.messages[1]).toMatchObject({
        role: 'assistant',
        content: 'Hello',
        isStreaming: true
      });

      act(() => {
        eventHandler!({ data: JSON.stringify({ type: 'token', token: ' there!' }) } as MessageEvent);
      });

      expect(result.current.messages[1].content).toBe('Hello there!');
    });
  });

  describe('SSE Event Handling - Search Results', () => {
    it('should handle search_results event', async () => {
      const mockSession = {
        id: 'session-123',
        balance: '10.00',
        initialBalance: '10.00',
        pdaAddress: 'pda-addr'
      };

      let eventHandler: ((event: MessageEvent) => void) | null = null;
      const mockEventSource = {
        onmessage: null,
        onerror: jest.fn(),
        close: jest.fn()
      };

      mockChatAPI.createSession.mockResolvedValueOnce(mockSession);
      mockChatAPI.streamMessage.mockReturnValueOnce(mockEventSource as any);

      const { result } = renderHook(() => useChat());

      await waitFor(() => expect(result.current.session).toBeTruthy());

      act(() => {
        result.current.sendMessage('Search for AI news');
      });

      eventHandler = mockEventSource.onmessage as any;

      act(() => {
        eventHandler!({
          data: JSON.stringify({
            type: 'search_results',
            data: {
              query: 'AI news',
              results: [
                {
                  rank: 1,
                  title: 'AI Breakthrough',
                  url: 'https://example.com',
                  description: 'New AI model'
                }
              ],
              totalResults: 1,
              healthCheckPassed: true,
              cost: '$0.005'
            }
          })
        } as MessageEvent);
      });

      expect(result.current.searchQueries).toHaveLength(1);
      expect(result.current.searchQueries[0]).toMatchObject({
        query: 'AI news',
        results: expect.arrayContaining([
          expect.objectContaining({
            title: 'AI Breakthrough'
          })
        ]),
        healthCheckPassed: true,
        cost: '$0.005'
      });
    });
  });

  describe('SSE Event Handling - Payment Flow', () => {
    it('should handle payment_request event', async () => {
      const mockSession = {
        id: 'session-123',
        balance: '10.00',
        initialBalance: '10.00',
        pdaAddress: 'pda-addr'
      };

      let eventHandler: ((event: MessageEvent) => void) | null = null;
      const mockEventSource = {
        onmessage: null,
        onerror: jest.fn(),
        close: jest.fn()
      };

      mockChatAPI.createSession.mockResolvedValueOnce(mockSession);
      mockChatAPI.streamMessage.mockReturnValueOnce(mockEventSource as any);

      const { result } = renderHook(() => useChat());

      await waitFor(() => expect(result.current.session).toBeTruthy());

      act(() => {
        result.current.sendMessage('Fetch https://example.com');
      });

      eventHandler = mockEventSource.onmessage as any;

      act(() => {
        eventHandler!({
          data: JSON.stringify({
            type: 'payment_request',
            data: {
              url: 'https://example.com',
              status: 'checking_health'
            }
          })
        } as MessageEvent);
      });

      expect(result.current.paymentRequests).toHaveLength(1);
      expect(result.current.paymentRequests[0]).toMatchObject({
        url: 'https://example.com',
        status: 'checking_health'
      });
    });

    it('should handle payment_approval_needed event', async () => {
      const mockSession = {
        id: 'session-123',
        balance: '10.00',
        initialBalance: '10.00',
        pdaAddress: 'pda-addr'
      };

      let eventHandler: ((event: MessageEvent) => void) | null = null;
      const mockEventSource = {
        onmessage: null,
        onerror: jest.fn(),
        close: jest.fn()
      };

      mockChatAPI.createSession.mockResolvedValueOnce(mockSession);
      mockChatAPI.streamMessage.mockReturnValueOnce(mockEventSource as any);

      const { result } = renderHook(() => useChat());

      await waitFor(() => expect(result.current.session).toBeTruthy());

      act(() => {
        result.current.sendMessage('Test');
      });

      eventHandler = mockEventSource.onmessage as any;

      // First, add a payment request
      act(() => {
        eventHandler!({
          data: JSON.stringify({
            type: 'payment_request',
            data: { url: 'https://expensive.com', status: 'checking_health' }
          })
        } as MessageEvent);
      });

      // Then, approval needed
      act(() => {
        eventHandler!({
          data: JSON.stringify({
            type: 'payment_approval_needed',
            data: {
              amount: '$2.00',
              recipient: '0xRecipient123'
            }
          })
        } as MessageEvent);
      });

      expect(result.current.paymentRequests[0]).toMatchObject({
        status: 'pending_approval',
        amount: '$2.00',
        recipient: '0xRecipient123'
      });
    });

    it('should handle payment_complete event', async () => {
      const mockSession = {
        id: 'session-123',
        balance: '10.00',
        initialBalance: '10.00',
        pdaAddress: 'pda-addr'
      };

      let eventHandler: ((event: MessageEvent) => void) | null = null;
      const mockEventSource = {
        onmessage: null,
        onerror: jest.fn(),
        close: jest.fn()
      };

      mockChatAPI.createSession.mockResolvedValueOnce(mockSession);
      mockChatAPI.streamMessage.mockReturnValueOnce(mockEventSource as any);

      const { result } = renderHook(() => useChat());

      await waitFor(() => expect(result.current.session).toBeTruthy());

      act(() => {
        result.current.sendMessage('Test');
      });

      eventHandler = mockEventSource.onmessage as any;

      // Add payment request first
      act(() => {
        eventHandler!({
          data: JSON.stringify({
            type: 'payment_request',
            data: { url: 'https://example.com', status: 'processing' }
          })
        } as MessageEvent);
      });

      // Complete payment
      act(() => {
        eventHandler!({
          data: JSON.stringify({
            type: 'payment_complete',
            data: {
              success: true,
              amount: '$0.25',
              signature: 'tx-sig-123',
              healthCheckPassed: true
            }
          })
        } as MessageEvent);
      });

      expect(result.current.paymentRequests[0]).toMatchObject({
        status: 'completed',
        amount: '$0.25',
        signature: 'tx-sig-123',
        healthCheckPassed: true
      });
    });
  });

  describe('SSE Event Handling - Service Calls', () => {
    it('should handle service_call event', async () => {
      const mockSession = {
        id: 'session-123',
        balance: '10.00',
        initialBalance: '10.00',
        pdaAddress: 'pda-addr'
      };

      let eventHandler: ((event: MessageEvent) => void) | null = null;
      const mockEventSource = {
        onmessage: null,
        onerror: jest.fn(),
        close: jest.fn()
      };

      mockChatAPI.createSession.mockResolvedValueOnce(mockSession);
      mockChatAPI.streamMessage.mockReturnValueOnce(mockEventSource as any);

      const { result } = renderHook(() => useChat());

      await waitFor(() => expect(result.current.session).toBeTruthy());

      act(() => {
        result.current.sendMessage('Analyze sentiment');
      });

      eventHandler = mockEventSource.onmessage as any;

      act(() => {
        eventHandler!({
          data: JSON.stringify({
            type: 'service_call',
            serviceName: 'sentiment-analysis',
            call: {
              messageIndex: 0,
              serviceName: 'sentiment-analysis',
              status: 'pending',
              cost: '$0.01',
              startTime: new Date().toISOString()
            }
          })
        } as MessageEvent);
      });

      expect(result.current.serviceCalls).toHaveLength(1);
      expect(result.current.serviceCalls[0]).toMatchObject({
        serviceName: 'sentiment-analysis',
        status: 'pending',
        cost: '$0.01'
      });
    });
  });

  describe('Clear Chat', () => {
    it('should clear all messages and state', async () => {
      const mockSession = {
        id: 'session-123',
        balance: '10.00',
        initialBalance: '10.00',
        pdaAddress: 'pda-addr'
      };

      const mockEventSource = {
        onmessage: jest.fn(),
        onerror: jest.fn(),
        close: jest.fn()
      };

      mockChatAPI.createSession.mockResolvedValueOnce(mockSession);
      mockChatAPI.streamMessage.mockReturnValueOnce(mockEventSource as any);

      const { result } = renderHook(() => useChat());

      await waitFor(() => expect(result.current.session).toBeTruthy());

      // Send a message
      act(() => {
        result.current.sendMessage('Test');
      });

      expect(result.current.messages).toHaveLength(1);

      // Clear chat
      act(() => {
        result.current.clearChat();
      });

      expect(result.current.messages).toHaveLength(0);
      expect(result.current.serviceCalls).toHaveLength(0);
      expect(result.current.searchQueries).toHaveLength(0);
      expect(result.current.paymentRequests).toHaveLength(0);
      expect(localStorageMock.getItem(`chat-${mockSession.id}`)).toBeNull();
    });
  });

  describe('Balance Updates', () => {
    it('should handle balance_update event', async () => {
      const mockSession = {
        id: 'session-123',
        balance: '10.00',
        initialBalance: '10.00',
        pdaAddress: 'pda-addr'
      };

      let eventHandler: ((event: MessageEvent) => void) | null = null;
      const mockEventSource = {
        onmessage: null,
        onerror: jest.fn(),
        close: jest.fn()
      };

      mockChatAPI.createSession.mockResolvedValueOnce(mockSession);
      mockChatAPI.streamMessage.mockReturnValueOnce(mockEventSource as any);

      const { result } = renderHook(() => useChat());

      await waitFor(() => expect(result.current.session).toBeTruthy());

      act(() => {
        result.current.sendMessage('Test');
      });

      eventHandler = mockEventSource.onmessage as any;

      act(() => {
        eventHandler!({
          data: JSON.stringify({
            type: 'balance_update',
            data: { balance: '9.75' }
          })
        } as MessageEvent);
      });

      expect(result.current.session?.balance).toBe('9.75');
    });
  });

  describe('Done Event', () => {
    it('should set isLoading to false on done event', async () => {
      const mockSession = {
        id: 'session-123',
        balance: '10.00',
        initialBalance: '10.00',
        pdaAddress: 'pda-addr'
      };

      let eventHandler: ((event: MessageEvent) => void) | null = null;
      const mockEventSource = {
        onmessage: null,
        onerror: jest.fn(),
        close: jest.fn()
      };

      mockChatAPI.createSession.mockResolvedValueOnce(mockSession);
      mockChatAPI.streamMessage.mockReturnValueOnce(mockEventSource as any);

      const { result } = renderHook(() => useChat());

      await waitFor(() => expect(result.current.session).toBeTruthy());

      act(() => {
        result.current.sendMessage('Test');
      });

      expect(result.current.isLoading).toBe(true);

      eventHandler = mockEventSource.onmessage as any;

      act(() => {
        eventHandler!({
          data: JSON.stringify({ type: 'done', data: {} })
        } as MessageEvent);
      });

      expect(result.current.isLoading).toBe(false);
    });
  });
});
