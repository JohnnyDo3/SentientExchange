export interface ChatMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  toolCalls?: ToolCall[];
}

export interface ToolCall {
  tool: string;
  arguments: Record<string, any>;
  result?: any;
  cost?: string;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  startTime: number;
  endTime?: number;
  error?: string;
}

export interface ChatSession {
  id: string;
  pdaAddress: string;
  walletAddress: string;
  initialBalance: string;
  currentBalance: string;
  createdAt: number;
  lastActivity: number;
  nonceAccounts: string[];
}

export interface ServiceIntent {
  needsService: boolean;
  reasoning: string;
  serviceType?: string[];
  taskDescription?: string;
}
