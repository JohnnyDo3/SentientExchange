import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ChatInterface from '@/components/chat/ChatInterface';
import { useChat } from '@/hooks/useChat';

// Mock the useChat hook
jest.mock('@/hooks/useChat');
const mockUseChat = useChat as jest.MockedFunction<typeof useChat>;

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

describe('ChatInterface', () => {
  const mockSendMessage = jest.fn();
  const mockAddFunds = jest.fn();
  const mockClearChat = jest.fn();

  const defaultMockData = {
    messages: [],
    serviceCalls: [],
    searchQueries: [],
    paymentRequests: [],
    session: {
      id: 'session-123',
      balance: '10.00',
      initialBalance: '10.00'
    },
    isLoading: false,
    error: null,
    sendMessage: mockSendMessage,
    addFunds: mockAddFunds,
    clearChat: mockClearChat
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseChat.mockReturnValue(defaultMockData);
  });

  it('should render chat interface', () => {
    render(<ChatInterface />);
    expect(screen.getByText('AI Assistant')).toBeInTheDocument();
  });

  it('should show empty state when no messages', () => {
    render(<ChatInterface />);
    expect(screen.getByText('Start a Conversation')).toBeInTheDocument();
  });

  it('should display example prompts', () => {
    render(<ChatInterface />);
    expect(screen.getByText(/Analyze sentiment/i)).toBeInTheDocument();
    expect(screen.getByText(/Summarize this article/i)).toBeInTheDocument();
    expect(screen.getByText(/Analyze an image/i)).toBeInTheDocument();
  });

  it('should call sendMessage when example prompt clicked', () => {
    render(<ChatInterface />);
    const button = screen.getByText(/Analyze sentiment/i);
    fireEvent.click(button);
    expect(mockSendMessage).toHaveBeenCalledWith('Analyze sentiment of a tweet');
  });

  it('should show session wallet card', () => {
    render(<ChatInterface />);
    expect(screen.getByText(/10\.00/)).toBeInTheDocument();
  });

  it('should display messages when present', () => {
    mockUseChat.mockReturnValue({
      ...defaultMockData,
      messages: [
        { role: 'user', content: 'Hello', timestamp: Date.now() },
        { role: 'assistant', content: 'Hi there!', timestamp: Date.now() }
      ]
    });

    render(<ChatInterface />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('Hi there!')).toBeInTheDocument();
  });

  it('should show loading indicator when isLoading', () => {
    mockUseChat.mockReturnValue({
      ...defaultMockData,
      messages: [{ role: 'user', content: 'Test', timestamp: Date.now() }],
      isLoading: true
    });

    render(<ChatInterface />);
    // TypingIndicator component should be rendered
    expect(screen.getByTestId('typing-indicator')).toBeInTheDocument();
  });

  it('should display error message when error exists', () => {
    mockUseChat.mockReturnValue({
      ...defaultMockData,
      error: 'Connection failed'
    });

    render(<ChatInterface />);
    expect(screen.getByText('Connection failed')).toBeInTheDocument();
  });

  it('should show clear chat button when messages exist', () => {
    mockUseChat.mockReturnValue({
      ...defaultMockData,
      messages: [{ role: 'user', content: 'Test', timestamp: Date.now() }]
    });

    render(<ChatInterface />);
    const clearButton = screen.getByTitle('Clear chat');
    expect(clearButton).toBeInTheDocument();
  });

  it('should call clearChat when clear button clicked', () => {
    mockUseChat.mockReturnValue({
      ...defaultMockData,
      messages: [{ role: 'user', content: 'Test', timestamp: Date.now() }]
    });

    render(<ChatInterface />);
    const clearButton = screen.getByTitle('Clear chat');
    fireEvent.click(clearButton);
    expect(mockClearChat).toHaveBeenCalled();
  });

  it('should display service calls', () => {
    mockUseChat.mockReturnValue({
      ...defaultMockData,
      messages: [{ role: 'user', content: 'Test', timestamp: Date.now() }],
      serviceCalls: [{
        messageIndex: 0,
        serviceName: 'sentiment-analyzer',
        status: 'completed',
        cost: '$0.01',
        startTime: Date.now(),
        endTime: Date.now(),
        result: { sentiment: 'positive' }
      }]
    });

    render(<ChatInterface />);
    expect(screen.getByText('sentiment-analyzer')).toBeInTheDocument();
  });

  it('should display search queries', () => {
    mockUseChat.mockReturnValue({
      ...defaultMockData,
      messages: [{ role: 'user', content: 'Search', timestamp: Date.now() }],
      searchQueries: [{
        messageIndex: 0,
        query: 'AI news',
        results: [],
        totalResults: 0,
        healthCheckPassed: true,
        cost: '$0.00',
        timestamp: Date.now()
      }]
    });

    render(<ChatInterface />);
    expect(screen.getByText(/AI news/i)).toBeInTheDocument();
  });

  it('should display payment requests', () => {
    mockUseChat.mockReturnValue({
      ...defaultMockData,
      messages: [{ role: 'user', content: 'Fetch URL', timestamp: Date.now() }],
      paymentRequests: [{
        messageIndex: 0,
        url: 'https://example.com',
        status: 'completed',
        amount: '0.50',
        recipient: 'RecipientAddr',
        signature: 'sig-123',
        healthCheckPassed: true,
        timestamp: Date.now()
      }]
    });

    render(<ChatInterface />);
    expect(screen.getByText(/example\.com/i)).toBeInTheDocument();
  });

  it('should disable chat input when no session', () => {
    mockUseChat.mockReturnValue({
      ...defaultMockData,
      session: null
    });

    render(<ChatInterface />);
    expect(screen.getByPlaceholderText('Initializing session...')).toBeDisabled();
  });

  it('should enable chat input when session exists', () => {
    render(<ChatInterface />);
    expect(screen.getByPlaceholderText(/Ask me anything/i)).not.toBeDisabled();
  });

  it('should show wallet card on mobile', () => {
    render(<ChatInterface />);
    // Mobile wallet card should be in the DOM (hidden on larger screens)
    const walletCards = screen.getAllByText(/10\.00/);
    expect(walletCards.length).toBeGreaterThan(0);
  });

  it('should handle streaming messages', () => {
    mockUseChat.mockReturnValue({
      ...defaultMockData,
      messages: [
        {
          role: 'assistant',
          content: 'Streaming response...',
          timestamp: Date.now(),
          isStreaming: true
        }
      ]
    });

    render(<ChatInterface />);
    expect(screen.getByText('Streaming response...')).toBeInTheDocument();
  });
});
