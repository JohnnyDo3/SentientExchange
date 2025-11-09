# AI Chat Implementation Plan
**AgentMarket Zero-Friction Chat Interface**

---

## Executive Summary

### Project Overview
Build a web-based chat interface where users interact with Claude AI that intelligently discovers and uses marketplace services from AgentMarket. Users simply visit `/chat` with **zero setup required** - the system automatically creates secure session wallets, funds them, and handles all blockchain transactions transparently.

### Key Features
- **Zero-friction UX**: No signup, no wallet setup, just start chatting
- **Intelligent service usage**: AI decides when marketplace services add value
- **Full transparency**: Users see every service call, cost, and progress
- **Secure session wallets**: Solana PDA-based wallets with automatic refunds
- **Free tier**: Completely free for users (we absorb costs)
- **Persistent history**: Chat history saved across sessions

### Timeline Estimate
- **Phase 1 (UI):** 3-4 hours
- **Phase 2 (AI):** 5-6 hours
- **Phase 3 (Wallets):** 6-8 hours
- **Phase 4 (MCP):** 3-4 hours
- **Phase 5 (Polish):** 3-4 hours
- **Phase 6 (Funds):** 2-3 hours
- **Total:** 22-29 hours (3-4 development days)

### Cost Analysis
**Per Session:**
- PDA creation: ~$0.001
- Nonce accounts: ~$0.005
- Initial funding: $0.50 (refundable)
- **Net cost: ~$0.006 per session**

**Per Conversation:**
- Claude API: $0.01-$0.03
- Marketplace services: $0.01-$0.05 (if used)
- Solana tx fees: ~$0.001
- **Net cost: $0.02-$0.09 per conversation**

---

## Architecture Overview

### System Diagram
```
┌─────────────────────────────────────────────────────────────┐
│                         USER BROWSER                         │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │           /chat Page (Next.js)                         │ │
│  │                                                        │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐ │ │
│  │  │ ChatInterface│  │ MessageBubble│  │ ChatInput   │ │ │
│  │  └──────────────┘  └──────────────┘  └─────────────┘ │ │
│  │  ┌──────────────┐  ┌──────────────┐                  │ │
│  │  │ServiceCallCard│ │SessionWallet│                   │ │
│  │  └──────────────┘  └──────────────┘                  │ │
│  └────────────────────────────────────────────────────────┘ │
│                           │                                  │
│                           │ HTTP + SSE                       │
└───────────────────────────┼──────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    API SERVER (Express)                      │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │               Chat API Endpoints                       │ │
│  │                                                        │ │
│  │  POST /api/chat/message  ──────────┐                  │ │
│  │  POST /api/chat/sessions           │                  │ │
│  │  GET  /api/chat/history/:id        │                  │ │
│  │  POST /api/chat/fund               │                  │ │
│  └────────────────────────────────────┼──────────────────┘ │
│                                        │                    │
│  ┌────────────────────────────────────┼──────────────────┐ │
│  │          AI Reasoning Engine       │                  │ │
│  │                                    ▼                  │ │
│  │  ┌──────────────────────────────────────────────┐    │ │
│  │  │ Anthropic Claude API (@anthropic-ai/sdk)     │    │ │
│  │  │  - Analyze user intent                       │    │ │
│  │  │  - Decide: native response OR use service    │    │ │
│  │  │  - Format results                            │    │ │
│  │  └──────────────────────────────────────────────┘    │ │
│  │                                    │                  │ │
│  │                                    ▼                  │ │
│  │  ┌──────────────────────────────────────────────┐    │ │
│  │  │ MCP Tools Integration                        │    │ │
│  │  │  - discover_services()                       │    │ │
│  │  │  - purchase_service()                        │    │ │
│  │  │  - get_service_details()                     │    │ │
│  │  │  - rate_service()                            │    │ │
│  │  └──────────────────────────────────────────────┘    │ │
│  └────────────────────────────────────┬──────────────────┘ │
│                                        │                    │
│  ┌────────────────────────────────────┼──────────────────┐ │
│  │      Session Wallet Manager        │                  │ │
│  │                                    ▼                  │ │
│  │  ┌──────────────────────────────────────────────┐    │ │
│  │  │ Solana PDA Operations                        │    │ │
│  │  │  - Create session PDA                        │    │ │
│  │  │  - Generate nonce accounts                   │    │ │
│  │  │  - Pre-sign transactions                     │    │ │
│  │  │  - Execute purchases                         │    │ │
│  │  │  - Refund on session close                   │    │ │
│  │  └──────────────────────────────────────────────┘    │ │
│  └────────────────────────────────────┬──────────────────┘ │
└───────────────────────────────────────┼────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────┐
│                     SOLANA BLOCKCHAIN                        │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │         Session Wallet Program (Anchor)               │ │
│  │                                                        │ │
│  │  PDA Seeds: [b"session", session_id]                  │ │
│  │                                                        │ │
│  │  Instructions:                                        │ │
│  │  - initialize_session(session_id)                     │ │
│  │  - fund_session(amount)                               │ │
│  │  - execute_purchase(service_id, amount)               │ │
│  │  - close_session() → refund                           │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              Nonce Accounts (5-10 per session)        │ │
│  │  - Enable pre-signed transactions                     │ │
│  │  - Reduce latency & fees                              │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow: User Message → Service Call
```
1. User types: "Analyze sentiment of this tweet"
        │
        ▼
2. POST /api/chat/message
        │
        ▼
3. AIReasoningEngine.processMessage()
        │
        ├─► Anthropic API: analyze intent
        │   ↓
        │   Needs specialized sentiment analysis
        │
        ▼
4. discover_services(['sentiment-analysis'])
        │
        ▼
5. Found: "Sentiment Analyzer" ($0.01 USDC)
        │
        ├─► UI shows: "Using Sentiment Analyzer ($0.01)..."
        │
        ▼
6. SessionWalletManager.executePreSignedTx()
        │
        ├─► Load nonce account
        ├─► Execute pre-signed tx from PDA
        ├─► Deduct $0.01 from session balance
        │
        ▼
7. Service endpoint: POST /api/ai/sentiment/analyze
        │
        ▼
8. Service returns: { sentiment: "positive", confidence: 0.98 }
        │
        ▼
9. AI formats response
        │
        ▼
10. SSE stream to client: "The sentiment is overwhelmingly positive..."
        │
        ▼
11. UI displays result + service call card
```

---

## Phase 1: Chat UI Components (3-4 hours)

### Objectives
- Create beautiful, functional chat interface
- Match existing SentientExchange brand (purple gradients, dark theme)
- Support message bubbles, input, service call cards, wallet display
- Responsive design (mobile-first)

### Files to Create

#### 1. `web/components/chat/MessageBubble.tsx`
**Purpose:** Display user and AI messages

```typescript
'use client';

import { motion } from 'framer-motion';
import { User, Bot, Sparkles } from 'lucide-react';

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  isStreaming?: boolean;
}

export default function MessageBubble({
  role,
  content,
  timestamp,
  isStreaming
}: MessageBubbleProps) {
  const isUser = role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
    >
      {/* Avatar */}
      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
        isUser
          ? 'bg-purple text-white'
          : 'bg-gradient-to-br from-purple to-blue text-white'
      }`}>
        {isUser ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
      </div>

      {/* Message Content */}
      <div className={`flex flex-col max-w-[70%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div className={`rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-purple text-white'
            : 'bg-dark-card border border-gray-800 text-gray-100'
        }`}>
          <p className="whitespace-pre-wrap">{content}</p>
          {isStreaming && (
            <motion.span
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="inline-flex items-center gap-1 ml-1"
            >
              <Sparkles className="w-3 h-3" />
            </motion.span>
          )}
        </div>
        <span className="text-xs text-gray-500 mt-1">{timestamp}</span>
      </div>
    </motion.div>
  );
}
```

#### 2. `web/components/chat/ServiceCallCard.tsx`
**Purpose:** Show active service calls with progress

```typescript
'use client';

import { motion } from 'framer-motion';
import { Loader2, CheckCircle, XCircle, DollarSign } from 'lucide-react';

interface ServiceCallCardProps {
  serviceName: string;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  cost: string;
  startTime: string;
  endTime?: string;
  result?: string;
  error?: string;
}

export default function ServiceCallCard({
  serviceName,
  status,
  cost,
  startTime,
  endTime,
  result,
  error
}: ServiceCallCardProps) {
  const statusConfig = {
    pending: {
      icon: Loader2,
      color: 'text-yellow',
      bg: 'bg-yellow/10',
      border: 'border-yellow/30',
      label: 'Discovering...'
    },
    executing: {
      icon: Loader2,
      color: 'text-blue',
      bg: 'bg-blue/10',
      border: 'border-blue/30',
      label: 'Executing...'
    },
    completed: {
      icon: CheckCircle,
      color: 'text-green',
      bg: 'bg-green/10',
      border: 'border-green/30',
      label: 'Completed'
    },
    failed: {
      icon: XCircle,
      color: 'text-red',
      bg: 'bg-red/10',
      border: 'border-red/30',
      label: 'Failed'
    }
  };

  const config = statusConfig[status];
  const Icon = config.icon;
  const isAnimating = status === 'pending' || status === 'executing';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`rounded-lg border ${config.bg} ${config.border} p-4 my-2`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Icon
            className={`w-5 h-5 ${config.color} ${isAnimating ? 'animate-spin' : ''}`}
          />
          <div>
            <p className="font-semibold text-white">{serviceName}</p>
            <p className={`text-sm ${config.color}`}>{config.label}</p>
          </div>
        </div>

        <div className="flex items-center gap-1 text-gray-400">
          <DollarSign className="w-4 h-4" />
          <span className="text-sm">{cost}</span>
        </div>
      </div>

      {result && status === 'completed' && (
        <div className="mt-3 pt-3 border-t border-gray-800">
          <p className="text-sm text-gray-300">{result}</p>
        </div>
      )}

      {error && status === 'failed' && (
        <div className="mt-3 pt-3 border-t border-gray-800">
          <p className="text-sm text-red">{error}</p>
        </div>
      )}

      <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
        <span>Started: {startTime}</span>
        {endTime && <span>Completed: {endTime}</span>}
      </div>
    </motion.div>
  );
}
```

#### 3. `web/components/chat/SessionWalletCard.tsx`
**Purpose:** Display session wallet balance and funding options

```typescript
'use client';

import { motion } from 'framer-motion';
import { Wallet, Plus, TrendingDown } from 'lucide-react';
import { useState } from 'react';

interface SessionWalletCardProps {
  sessionId: string;
  balance: string; // e.g., "$0.45"
  initialBalance: string;
  onAddFunds: (amount: number) => void;
}

export default function SessionWalletCard({
  sessionId,
  balance,
  initialBalance,
  onAddFunds
}: SessionWalletCardProps) {
  const [showAddFunds, setShowAddFunds] = useState(false);
  const [customAmount, setCustomAmount] = useState('');

  const balanceNum = parseFloat(balance.replace('$', ''));
  const initialNum = parseFloat(initialBalance.replace('$', ''));
  const spentAmount = (initialNum - balanceNum).toFixed(2);
  const percentRemaining = ((balanceNum / initialNum) * 100).toFixed(0);

  const isLowBalance = balanceNum < 0.10;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-lg border p-4 ${
        isLowBalance
          ? 'bg-red/10 border-red/30'
          : 'bg-dark-card border-gray-800'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Wallet className="w-5 h-5 text-purple" />
          <span className="font-semibold text-white">Session Wallet</span>
        </div>
        <button
          onClick={() => setShowAddFunds(!showAddFunds)}
          className="btn-secondary text-sm px-3 py-1"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Funds
        </button>
      </div>

      {/* Balance Display */}
      <div className="mb-3">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-white">{balance}</span>
          <span className="text-sm text-gray-400">USDC</span>
        </div>
        <div className="w-full bg-gray-800 rounded-full h-2 mt-2">
          <div
            className={`h-2 rounded-full transition-all ${
              isLowBalance ? 'bg-red' : 'bg-gradient-to-r from-purple to-blue'
            }`}
            style={{ width: `${percentRemaining}%` }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-gray-500">Initial</p>
          <p className="text-white font-semibold">{initialBalance}</p>
        </div>
        <div>
          <p className="text-gray-500">Spent</p>
          <p className="text-white font-semibold flex items-center gap-1">
            <TrendingDown className="w-4 h-4 text-red" />
            ${spentAmount}
          </p>
        </div>
      </div>

      {isLowBalance && (
        <div className="mt-3 pt-3 border-t border-red/30">
          <p className="text-sm text-red">⚠️ Low balance! Add funds to continue.</p>
        </div>
      )}

      {/* Add Funds Form */}
      {showAddFunds && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-3 pt-3 border-t border-gray-800"
        >
          <p className="text-sm text-gray-400 mb-2">Add USDC to session wallet:</p>
          <div className="flex gap-2">
            <input
              type="number"
              step="0.10"
              min="0.10"
              placeholder="Amount (e.g., 1.00)"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              className="flex-1 px-3 py-2 bg-dark border border-gray-700 rounded-lg text-white"
            />
            <button
              onClick={() => {
                const amount = parseFloat(customAmount);
                if (amount > 0) {
                  onAddFunds(amount);
                  setCustomAmount('');
                  setShowAddFunds(false);
                }
              }}
              className="btn-primary px-4"
            >
              Add
            </button>
          </div>
          <div className="flex gap-2 mt-2">
            {[0.50, 1.00, 2.00, 5.00].map((amount) => (
              <button
                key={amount}
                onClick={() => {
                  onAddFunds(amount);
                  setShowAddFunds(false);
                }}
                className="btn-secondary text-xs px-3 py-1"
              >
                +${amount.toFixed(2)}
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
```

#### 4. `web/components/chat/ChatInput.tsx`
**Purpose:** Message input with send button

```typescript
'use client';

import { useState, KeyboardEvent } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export default function ChatInput({
  onSend,
  disabled = false,
  placeholder = "Ask me anything or describe a task..."
}: ChatInputProps) {
  const [message, setMessage] = useState('');

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSend(message.trim());
      setMessage('');
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-gray-800 bg-dark-secondary p-4">
      <div className="flex gap-3 items-end">
        <div className="flex-1 relative">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className="w-full px-4 py-3 bg-dark-card border border-gray-700 rounded-lg text-white placeholder-gray-500 resize-none focus:outline-none focus:border-purple transition-colors"
            style={{ maxHeight: '150px', minHeight: '52px' }}
          />
          {disabled && (
            <div className="absolute inset-0 bg-dark-card/80 rounded-lg flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-purple animate-spin" />
            </div>
          )}
        </div>
        <motion.button
          onClick={handleSend}
          disabled={disabled || !message.trim()}
          className="btn-primary px-6 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
          whileHover={{ scale: disabled ? 1 : 1.05 }}
          whileTap={{ scale: disabled ? 1 : 0.95 }}
        >
          <Send className="w-5 h-5" />
        </motion.button>
      </div>
      <p className="text-xs text-gray-500 mt-2">
        Press Enter to send, Shift+Enter for new line
      </p>
    </div>
  );
}
```

#### 5. `web/components/chat/TypingIndicator.tsx`
**Purpose:** Show AI is thinking

```typescript
'use client';

import { motion } from 'framer-motion';

export default function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-4 py-2">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-2 h-2 bg-purple rounded-full"
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.5, 1, 0.5]
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            delay: i * 0.2
          }}
        />
      ))}
    </div>
  );
}
```

#### 6. `web/components/chat/ChatInterface.tsx`
**Purpose:** Main chat container that brings everything together

```typescript
'use client';

import { useState, useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';
import ChatInput from './ChatInput';
import ServiceCallCard from './ServiceCallCard';
import SessionWalletCard from './SessionWalletCard';
import TypingIndicator from './TypingIndicator';
import { useChat } from '@/hooks/useChat';
import { motion } from 'framer-motion';
import { MessageSquare } from 'lucide-react';

export default function ChatInterface() {
  const {
    messages,
    serviceCalls,
    session,
    isLoading,
    sendMessage,
    addFunds
  } = useChat();

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, serviceCalls]);

  return (
    <div className="flex flex-col h-screen bg-dark">
      {/* Header */}
      <div className="border-b border-gray-800 bg-dark-secondary p-4">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple to-blue flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold gradient-text">AI Assistant</h1>
              <p className="text-sm text-gray-400">Powered by AgentMarket</p>
            </div>
          </div>

          {session && (
            <div className="hidden md:block w-80">
              <SessionWalletCard
                sessionId={session.id}
                balance={session.balance}
                initialBalance={session.initialBalance}
                onAddFunds={addFunds}
              />
            </div>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto p-6 space-y-4">
          {messages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-12"
            >
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple/20 to-blue/20 flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="w-10 h-10 text-purple" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Start a Conversation
              </h2>
              <p className="text-gray-400 mb-6 max-w-md mx-auto">
                I can help you with tasks, answer questions, and automatically use specialized AI services from the marketplace when needed.
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {[
                  "Analyze sentiment of a tweet",
                  "Summarize this article",
                  "Analyze an image",
                  "What services are available?"
                ].map((example, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(example)}
                    className="btn-secondary text-sm"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </motion.div>
          ) : (
            <>
              {messages.map((msg, i) => (
                <div key={i}>
                  <MessageBubble
                    role={msg.role}
                    content={msg.content}
                    timestamp={msg.timestamp}
                    isStreaming={msg.isStreaming}
                  />

                  {/* Show service calls after corresponding messages */}
                  {serviceCalls
                    .filter(call => call.messageIndex === i)
                    .map((call, j) => (
                      <ServiceCallCard
                        key={j}
                        serviceName={call.serviceName}
                        status={call.status}
                        cost={call.cost}
                        startTime={call.startTime}
                        endTime={call.endTime}
                        result={call.result}
                        error={call.error}
                      />
                    ))}
                </div>
              ))}

              {isLoading && <TypingIndicator />}
            </>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Mobile Wallet Card */}
      {session && (
        <div className="md:hidden border-t border-gray-800 p-4">
          <SessionWalletCard
            sessionId={session.id}
            balance={session.balance}
            initialBalance={session.initialBalance}
            onAddFunds={addFunds}
          />
        </div>
      )}

      {/* Input Area */}
      <ChatInput
        onSend={sendMessage}
        disabled={isLoading || !session}
        placeholder={
          session
            ? "Ask me anything or describe a task..."
            : "Initializing session..."
        }
      />
    </div>
  );
}
```

#### 7. `web/hooks/useChat.ts`
**Purpose:** Manage chat state and API calls

```typescript
'use client';

import { useState, useEffect, useCallback } from 'react';
import { chatAPI } from '@/lib/chat-api';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  isStreaming?: boolean;
}

export interface ServiceCall {
  messageIndex: number;
  serviceName: string;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  cost: string;
  startTime: string;
  endTime?: string;
  result?: string;
  error?: string;
}

export interface Session {
  id: string;
  balance: string;
  initialBalance: string;
  pdaAddress: string;
}

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [serviceCalls, setServiceCalls] = useState<ServiceCall[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize session on mount
  useEffect(() => {
    initializeSession();
  }, []);

  const initializeSession = async () => {
    try {
      const newSession = await chatAPI.createSession();
      setSession(newSession);
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  };

  const sendMessage = useCallback(async (content: string) => {
    if (!session) return;

    // Add user message immediately
    const userMessage: Message = {
      role: 'user',
      content,
      timestamp: new Date().toLocaleTimeString()
    };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Send to API and handle streaming response
      const eventSource = chatAPI.streamMessage(session.id, content);

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);

        switch (data.type) {
          case 'token':
            // Update streaming assistant message
            setMessages(prev => {
              const lastMsg = prev[prev.length - 1];
              if (lastMsg?.role === 'assistant' && lastMsg.isStreaming) {
                return [
                  ...prev.slice(0, -1),
                  { ...lastMsg, content: lastMsg.content + data.token }
                ];
              } else {
                return [
                  ...prev,
                  {
                    role: 'assistant',
                    content: data.token,
                    timestamp: new Date().toLocaleTimeString(),
                    isStreaming: true
                  }
                ];
              }
            });
            break;

          case 'service_call':
            // Add or update service call
            setServiceCalls(prev => {
              const existing = prev.find(
                call => call.serviceName === data.serviceName && !call.endTime
              );
              if (existing) {
                return prev.map(call =>
                  call === existing ? { ...call, ...data.call } : call
                );
              } else {
                return [...prev, { ...data.call, messageIndex: messages.length }];
              }
            });
            break;

          case 'balance_update':
            // Update session balance
            setSession(prev => prev ? { ...prev, balance: data.balance } : null);
            break;

          case 'done':
            // Mark streaming as complete
            setMessages(prev => {
              const lastMsg = prev[prev.length - 1];
              if (lastMsg?.isStreaming) {
                return [...prev.slice(0, -1), { ...lastMsg, isStreaming: false }];
              }
              return prev;
            });
            setIsLoading(false);
            eventSource.close();
            break;

          case 'error':
            console.error('Stream error:', data.error);
            setIsLoading(false);
            eventSource.close();
            break;
        }
      };

      eventSource.onerror = (error) => {
        console.error('EventSource error:', error);
        setIsLoading(false);
        eventSource.close();
      };

    } catch (error) {
      console.error('Failed to send message:', error);
      setIsLoading(false);
    }
  }, [session, messages.length]);

  const addFunds = useCallback(async (amount: number) => {
    if (!session) return;

    try {
      const updatedSession = await chatAPI.addFunds(session.id, amount);
      setSession(updatedSession);
    } catch (error) {
      console.error('Failed to add funds:', error);
    }
  }, [session]);

  return {
    messages,
    serviceCalls,
    session,
    isLoading,
    sendMessage,
    addFunds
  };
}
```

#### 8. `web/lib/chat-api.ts`
**Purpose:** API client for chat endpoints

```typescript
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
```

#### 9. `web/app/chat/page.tsx`
**Purpose:** Chat page route

```typescript
import ChatInterface from '@/components/chat/ChatInterface';

export const metadata = {
  title: 'AI Chat | SentientExchange',
  description: 'Chat with AI that can automatically use marketplace services'
};

export default function ChatPage() {
  return <ChatInterface />;
}
```

### Testing Checklist - Phase 1
- [ ] MessageBubble renders correctly for user/assistant
- [ ] ServiceCallCard shows all states (pending, executing, completed, failed)
- [ ] SessionWalletCard displays balance and allows adding funds
- [ ] ChatInput sends messages and handles Enter/Shift+Enter
- [ ] TypingIndicator animates smoothly
- [ ] ChatInterface renders empty state correctly
- [ ] Messages auto-scroll to bottom
- [ ] Mobile responsive design works
- [ ] All components match brand colors (purple/blue gradients)

### Completion Criteria
✅ All 9 files created
✅ Components render without errors
✅ UI matches SentientExchange brand
✅ Responsive on mobile and desktop
✅ Ready for backend integration

---

## Phase 2: AI Backend with Anthropic SDK (5-6 hours)

### Objectives
- Integrate Anthropic Claude API
- Build AI reasoning engine to decide when to use marketplace services
- Create chat API endpoints
- Implement SSE streaming for responses

### Files to Create

#### 1. `src/chat/types.ts`
**Purpose:** TypeScript interfaces

```typescript
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
```

#### 2. `src/chat/AIReasoningEngine.ts`
**Purpose:** Core AI logic for deciding when to use services

```typescript
import Anthropic from '@anthropic-ai/sdk';
import type { ServiceIntent, ToolCall } from './types';

export class AIReasoningEngine {
  private anthropic: Anthropic;
  private model = 'claude-3-5-sonnet-20241022';

  constructor(apiKey: string) {
    this.anthropic = new Anthropic({ apiKey });
  }

  /**
   * Analyze user message and decide if marketplace services are needed
   */
  async analyzeIntent(
    userMessage: string,
    conversationHistory: { role: string; content: string }[]
  ): Promise<ServiceIntent> {
    const systemPrompt = `You are an AI assistant integrated with AgentMarket, a marketplace of specialized AI services.

Your job is to analyze user requests and decide:
1. Can you handle this with your native capabilities? (general conversation, reasoning, code, etc.)
2. Or would a specialized marketplace service provide better results?

Available marketplace services:
- **Sentiment Analyzer** ($0.01): Advanced sentiment analysis with sarcasm detection, Gen-Z slang understanding, PhD-level psycholinguistics
- **Image Analyzer** ($0.02): Computer vision with Claude Vision API - object detection, OCR, face detection, comprehensive image analysis
- **Text Summarizer** ($0.015): Executive-grade summarization with multiple formats, key point extraction, topic tags

When to use marketplace services:
- User explicitly requests a service
- Task requires specialized capabilities you don't have (e.g., image analysis)
- Service offers significantly better results (e.g., advanced sentiment with sarcasm)
- Task requires domain expertise beyond your training

When to use native capabilities:
- General conversation and questions
- Reasoning and logic problems
- Code generation and debugging
- Simple sentiment analysis
- Basic summarization
- Math and calculations

Respond in JSON format:
{
  "needsService": true/false,
  "reasoning": "explanation of your decision",
  "serviceType": ["sentiment-analysis"] (if needed),
  "taskDescription": "simplified task for service" (if needed)
}`;

    const response = await this.anthropic.messages.create({
      model: this.model,
      max_tokens: 500,
      temperature: 0.3,
      system: systemPrompt,
      messages: [
        ...conversationHistory,
        { role: 'user', content: userMessage }
      ]
    });

    const textContent = response.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from Claude');
    }

    try {
      return JSON.parse(textContent.text) as ServiceIntent;
    } catch {
      // Fallback if JSON parsing fails
      return {
        needsService: false,
        reasoning: 'Failed to parse intent, handling natively'
      };
    }
  }

  /**
   * Generate native response (no marketplace services needed)
   */
  async generateNativeResponse(
    userMessage: string,
    conversationHistory: { role: string; content: string }[]
  ): Promise<AsyncIterable<string>> {
    const stream = await this.anthropic.messages.create({
      model: this.model,
      max_tokens: 2000,
      temperature: 0.7,
      stream: true,
      messages: [
        ...conversationHistory,
        { role: 'user', content: userMessage }
      ]
    });

    return this.streamToAsyncIterable(stream);
  }

  /**
   * Format service result into conversational response
   */
  async formatServiceResponse(
    userMessage: string,
    serviceResults: ToolCall[]
  ): Promise<AsyncIterable<string>> {
    const resultsText = serviceResults
      .map(r => `Service: ${r.tool}\nResult: ${JSON.stringify(r.result)}`)
      .join('\n\n');

    const prompt = `A user asked: "${userMessage}"

I called marketplace services and got these results:
${resultsText}

Please provide a natural, conversational response incorporating these results. Be concise but helpful.`;

    const stream = await this.anthropic.messages.create({
      model: this.model,
      max_tokens: 1000,
      temperature: 0.7,
      stream: true,
      messages: [{ role: 'user', content: prompt }]
    });

    return this.streamToAsyncIterable(stream);
  }

  private async *streamToAsyncIterable(stream: any): AsyncIterable<string> {
    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        yield chunk.delta.text;
      }
    }
  }
}
```

#### 3. `src/chat/ChatOrchestrator.ts`
**Purpose:** Orchestrate AI + MCP tools + wallet management

```typescript
import { AIReasoningEngine } from './AIReasoningEngine';
import { ServiceRegistry } from '../registry/ServiceRegistry';
import { SessionWalletManager } from '../wallet/SessionWalletManager';
import { Database } from '../registry/database';
import type { ChatMessage, ChatSession, ToolCall } from './types';
import { randomUUID } from 'crypto';

export class ChatOrchestrator {
  private aiEngine: AIReasoningEngine;
  private registry: ServiceRegistry;
  private walletManager: SessionWalletManager;
  private db: Database;

  constructor(
    anthropicApiKey: string,
    registry: ServiceRegistry,
    walletManager: SessionWalletManager,
    db: Database
  ) {
    this.aiEngine = new AIReasoningEngine(anthropicApiKey);
    this.registry = registry;
    this.walletManager = walletManager;
    this.db = db;
  }

  /**
   * Process user message and stream response
   */
  async *processMessage(
    sessionId: string,
    userMessage: string
  ): AsyncIterable<ChatEvent> {
    // Load conversation history
    const history = await this.loadConversationHistory(sessionId);

    // Save user message
    await this.saveMessage(sessionId, 'user', userMessage);

    // Analyze intent
    yield { type: 'thinking', data: {} };

    const intent = await this.aiEngine.analyzeIntent(
      userMessage,
      history.map(m => ({ role: m.role, content: m.content }))
    );

    if (intent.needsService && intent.serviceType) {
      // Use marketplace services
      yield {
        type: 'intent',
        data: {
          needsService: true,
          reasoning: intent.reasoning,
          serviceTypes: intent.serviceType
        }
      };

      const toolCalls: ToolCall[] = [];

      for (const serviceType of intent.serviceType) {
        // Discover service
        yield {
          type: 'service_call',
          data: {
            serviceName: serviceType,
            status: 'pending',
            cost: '$0.00',
            startTime: new Date().toISOString()
          }
        };

        const services = this.registry.searchServices({
          capabilities: [serviceType]
        });

        if (services.length === 0) {
          yield {
            type: 'service_call',
            data: {
              serviceName: serviceType,
              status: 'failed',
              error: 'No matching service found',
              endTime: new Date().toISOString()
            }
          };
          continue;
        }

        const service = services[0];

        // Execute purchase with session wallet
        yield {
          type: 'service_call',
          data: {
            serviceName: service.name,
            status: 'executing',
            cost: service.pricing.perRequest || service.pricing.amount || '$0.00'
          }
        };

        try {
          const result = await this.executeService(
            sessionId,
            service.id,
            intent.taskDescription || userMessage
          );

          toolCalls.push({
            tool: service.name,
            arguments: { query: userMessage },
            result,
            cost: service.pricing.perRequest,
            status: 'completed',
            startTime: Date.now(),
            endTime: Date.now()
          });

          yield {
            type: 'service_call',
            data: {
              serviceName: service.name,
              status: 'completed',
              result: JSON.stringify(result),
              endTime: new Date().toISOString()
            }
          };

          // Update session balance
          const session = await this.getSession(sessionId);
          yield {
            type: 'balance_update',
            data: { balance: session.currentBalance }
          };

        } catch (error: any) {
          yield {
            type: 'service_call',
            data: {
              serviceName: service.name,
              status: 'failed',
              error: error.message,
              endTime: new Date().toISOString()
            }
          };
        }
      }

      // Format service results into response
      const responseStream = await this.aiEngine.formatServiceResponse(
        userMessage,
        toolCalls
      );

      let fullResponse = '';
      for await (const token of responseStream) {
        fullResponse += token;
        yield { type: 'token', data: { token } };
      }

      // Save assistant message
      await this.saveMessage(sessionId, 'assistant', fullResponse, toolCalls);

    } else {
      // Native response
      yield {
        type: 'intent',
        data: {
          needsService: false,
          reasoning: intent.reasoning
        }
      };

      const responseStream = await this.aiEngine.generateNativeResponse(
        userMessage,
        history.map(m => ({ role: m.role, content: m.content }))
      );

      let fullResponse = '';
      for await (const token of responseStream) {
        fullResponse += token;
        yield { type: 'token', data: { token } };
      }

      // Save assistant message
      await this.saveMessage(sessionId, 'assistant', fullResponse);
    }

    yield { type: 'done', data: {} };
  }

  private async executeService(
    sessionId: string,
    serviceId: string,
    query: string
  ): Promise<any> {
    // This will use the session wallet PDA to execute the purchase
    // For now, placeholder - will implement in Phase 3
    return { success: true, message: 'Service executed (Phase 3 implementation)' };
  }

  private async loadConversationHistory(sessionId: string): Promise<ChatMessage[]> {
    const rows = await this.db.all<any>(
      `SELECT * FROM chat_messages WHERE session_id = ? ORDER BY timestamp ASC`,
      [sessionId]
    );

    return rows.map(row => ({
      id: row.id,
      sessionId: row.session_id,
      role: row.role,
      content: row.content,
      timestamp: row.timestamp,
      toolCalls: row.tool_calls ? JSON.parse(row.tool_calls) : undefined
    }));
  }

  private async saveMessage(
    sessionId: string,
    role: 'user' | 'assistant',
    content: string,
    toolCalls?: ToolCall[]
  ): Promise<void> {
    await this.db.run(
      `INSERT INTO chat_messages (id, session_id, role, content, tool_calls, timestamp)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        randomUUID(),
        sessionId,
        role,
        content,
        toolCalls ? JSON.stringify(toolCalls) : null,
        Date.now()
      ]
    );
  }

  private async getSession(sessionId: string): Promise<ChatSession> {
    const row = await this.db.get<any>(
      `SELECT * FROM chat_sessions WHERE id = ?`,
      [sessionId]
    );

    if (!row) throw new Error('Session not found');

    return {
      id: row.id,
      pdaAddress: row.pda_address,
      walletAddress: row.wallet_address,
      initialBalance: row.initial_balance,
      currentBalance: row.current_balance,
      createdAt: row.created_at,
      lastActivity: row.last_activity,
      nonceAccounts: row.nonce_accounts ? JSON.parse(row.nonce_accounts) : []
    };
  }
}

export interface ChatEvent {
  type: 'thinking' | 'intent' | 'service_call' | 'token' | 'balance_update' | 'done' | 'error';
  data: any;
}
```

#### 4. Add Chat Endpoints to `src/api/apiServer.ts`

```typescript
// Add these imports at the top
import { ChatOrchestrator } from '../chat/ChatOrchestrator.js';
import { SessionWalletManager } from '../wallet/SessionWalletManager.js';

// Initialize (add after other initializations)
const sessionWalletManager = new SessionWalletManager(db);
const chatOrchestrator = new ChatOrchestrator(
  process.env.ANTHROPIC_API_KEY || '',
  registry,
  sessionWalletManager,
  db
);

// Add these endpoints before the error handler

// ============================================================================
// CHAT ENDPOINTS
// ============================================================================

/**
 * POST /api/chat/sessions - Create new chat session
 */
app.post('/api/chat/sessions', async (req, res, next) => {
  try {
    const sessionId = randomUUID();

    // Create session wallet (Phase 3 - for now just save to DB)
    const initialBalance = '0.50';
    const pdaAddress = 'placeholder'; // Will be actual PDA in Phase 3

    await db.run(
      `INSERT INTO chat_sessions (id, pda_address, wallet_address, initial_balance, current_balance, created_at, last_activity, nonce_accounts)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        sessionId,
        pdaAddress,
        pdaAddress, // Same for now
        initialBalance,
        initialBalance,
        Date.now(),
        Date.now(),
        JSON.stringify([])
      ]
    );

    res.json({
      id: sessionId,
      pdaAddress,
      balance: initialBalance,
      initialBalance
    });

    logger.info(`✓ Chat session created: ${sessionId}`);
  } catch (error: unknown) {
    logger.error('Failed to create chat session:', error);
    next(error);
  }
});

/**
 * POST /api/chat/message - Send message (triggers async processing)
 */
app.post('/api/chat/message', async (req, res, next) => {
  try {
    const { sessionId, message } = req.body;

    if (!sessionId || !message) {
      return res.status(400).json({ error: 'sessionId and message required' });
    }

    // Update last activity
    await db.run(
      `UPDATE chat_sessions SET last_activity = ? WHERE id = ?`,
      [Date.now(), sessionId]
    );

    res.json({ success: true });

    // Processing happens in SSE stream
  } catch (error: unknown) {
    next(error);
  }
});

/**
 * GET /api/chat/stream - SSE stream for chat responses
 */
app.get('/api/chat/stream', async (req, res) => {
  const sessionId = req.query.sessionId as string;

  if (!sessionId) {
    return res.status(400).json({ error: 'sessionId required' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    // Get last user message
    const lastMessage = await db.get<any>(
      `SELECT * FROM chat_messages WHERE session_id = ? AND role = 'user' ORDER BY timestamp DESC LIMIT 1`,
      [sessionId]
    );

    if (!lastMessage) {
      res.write(`data: ${JSON.stringify({ type: 'error', error: 'No message found' })}\n\n`);
      res.end();
      return;
    }

    // Process message and stream events
    const eventStream = chatOrchestrator.processMessage(sessionId, lastMessage.content);

    for await (const event of eventStream) {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    }

    res.end();
  } catch (error: any) {
    res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`);
    res.end();
  }
});

/**
 * POST /api/chat/fund - Add funds to session wallet
 */
app.post('/api/chat/fund', async (req, res, next) => {
  try {
    const { sessionId, amount } = req.body;

    if (!sessionId || !amount) {
      return res.status(400).json({ error: 'sessionId and amount required' });
    }

    // Update balance (Phase 3 will actually transfer USDC)
    const session = await db.get<any>(
      `SELECT * FROM chat_sessions WHERE id = ?`,
      [sessionId]
    );

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const newBalance = (parseFloat(session.current_balance) + amount).toFixed(2);

    await db.run(
      `UPDATE chat_sessions SET current_balance = ?, last_activity = ? WHERE id = ?`,
      [newBalance, Date.now(), sessionId]
    );

    res.json({
      id: sessionId,
      balance: newBalance,
      initialBalance: session.initial_balance
    });

    logger.info(`✓ Funds added to session ${sessionId}: +$${amount}`);
  } catch (error: unknown) {
    next(error);
  }
});

/**
 * GET /api/chat/history/:sessionId - Get conversation history
 */
app.get('/api/chat/history/:sessionId', async (req, res, next) => {
  try {
    const { sessionId } = req.params;

    const messages = await db.all<any>(
      `SELECT * FROM chat_messages WHERE session_id = ? ORDER BY timestamp ASC`,
      [sessionId]
    );

    res.json({
      sessionId,
      messages: messages.map(m => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
        toolCalls: m.tool_calls ? JSON.parse(m.tool_calls) : []
      }))
    });
  } catch (error: unknown) {
    next(error);
  }
});
```

#### 5. Database Schema Updates

Add to PostgreSQL/SQLite initialization:

```sql
-- Chat sessions
CREATE TABLE IF NOT EXISTS chat_sessions (
  id TEXT PRIMARY KEY,
  pda_address TEXT NOT NULL,
  wallet_address TEXT NOT NULL,
  initial_balance TEXT NOT NULL,
  current_balance TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  last_activity INTEGER NOT NULL,
  nonce_accounts TEXT  -- JSON array
);

-- Chat messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL,  -- 'user' or 'assistant'
  content TEXT NOT NULL,
  tool_calls TEXT,  -- JSON array
  timestamp INTEGER NOT NULL,
  FOREIGN KEY (session_id) REFERENCES chat_sessions(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_chat_sessions_last_activity ON chat_sessions(last_activity);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id, timestamp);
```

### Environment Variables

Add to `.env`:
```bash
ANTHROPIC_API_KEY=your-api-key-here
```

### Testing Checklist - Phase 2
- [ ] Chat session creation works
- [ ] Messages saved to database
- [ ] AI intent analysis works correctly
- [ ] Native responses stream properly
- [ ] Service intent detection works
- [ ] SSE events stream to frontend
- [ ] Conversation history loads correctly
- [ ] Fund addition updates balance

### Completion Criteria
✅ All backend files created
✅ API endpoints functional
✅ AI reasoning logic working
✅ SSE streaming implemented
✅ Database tables created
✅ Ready for wallet integration

---

## Phase 3: Session Wallets with Anchor PDAs (6-8 hours)

### Objectives
- Build Solana program with Anchor
- Implement PDA-based session wallets
- Create durable nonce accounts
- Enable pre-signed transactions
- Implement fund recovery on session close

### Files to Create

#### 1. Anchor Program Structure

```bash
# Install Anchor if not already installed
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install latest
avm use latest

# Initialize Anchor project
anchor init session-wallet
```

#### 2. `programs/session-wallet/Cargo.toml`

```toml
[package]
name = "session-wallet"
version = "0.1.0"
description = "Session wallet program for AgentMarket chat"
edition = "2021"

[lib]
crate-type = ["cdylib", "lib"]
name = "session_wallet"

[features]
no-entrypoint = []
no-idl = []
no-log-ix-name = []
cpi = ["no-entrypoint"]
default = []

[dependencies]
anchor-lang = "0.29.0"
anchor-spl = "0.29.0"
```

#### 3. `programs/session-wallet/src/lib.rs`

```rust
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("Your_Program_ID_Here"); // Will be generated

#[program]
pub mod session_wallet {
    use super::*;

    /// Initialize a new session wallet
    pub fn initialize_session(
        ctx: Context<InitializeSession>,
        session_id: String,
        initial_funding: u64,
    ) -> Result<()> {
        let session_wallet = &mut ctx.accounts.session_wallet;

        session_wallet.authority = ctx.accounts.authority.key();
        session_wallet.session_id = session_id;
        session_wallet.created_at = Clock::get()?.unix_timestamp;
        session_wallet.last_activity = Clock::get()?.unix_timestamp;
        session_wallet.initial_balance = initial_funding;
        session_wallet.current_balance = initial_funding;
        session_wallet.is_active = true;
        session_wallet.bump = *ctx.bumps.get("session_wallet").unwrap();

        // Transfer initial funding from treasury to session wallet
        let cpi_accounts = Transfer {
            from: ctx.accounts.treasury_token_account.to_account_info(),
            to: ctx.accounts.session_token_account.to_account_info(),
            authority: ctx.accounts.authority.to_account_info(),
        };

        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

        token::transfer(cpi_ctx, initial_funding)?;

        emit!(SessionCreated {
            session_id: session_wallet.session_id.clone(),
            pda: session_wallet.key(),
            initial_funding,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    /// Execute a service purchase from session wallet
    pub fn execute_purchase(
        ctx: Context<ExecutePurchase>,
        amount: u64,
        service_id: String,
    ) -> Result<()> {
        let session_wallet = &mut ctx.accounts.session_wallet;

        require!(session_wallet.is_active, ErrorCode::SessionClosed);
        require!(
            session_wallet.current_balance >= amount,
            ErrorCode::InsufficientBalance
        );

        // Update balance
        session_wallet.current_balance = session_wallet
            .current_balance
            .checked_sub(amount)
            .ok_or(ErrorCode::Overflow)?;

        session_wallet.last_activity = Clock::get()?.unix_timestamp;

        // Transfer USDC from session wallet to service provider
        let session_id = session_wallet.session_id.clone();
        let seeds = &[
            b"session",
            session_id.as_bytes(),
            &[session_wallet.bump],
        ];
        let signer = &[&seeds[..]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.session_token_account.to_account_info(),
            to: ctx.accounts.service_provider_token_account.to_account_info(),
            authority: session_wallet.to_account_info(),
        };

        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);

        token::transfer(cpi_ctx, amount)?;

        emit!(PurchaseExecuted {
            session_id,
            service_id,
            amount,
            remaining_balance: session_wallet.current_balance,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    /// Add funds to session wallet
    pub fn fund_session(
        ctx: Context<FundSession>,
        amount: u64,
    ) -> Result<()> {
        let session_wallet = &mut ctx.accounts.session_wallet;

        require!(session_wallet.is_active, ErrorCode::SessionClosed);

        // Update balance
        session_wallet.current_balance = session_wallet
            .current_balance
            .checked_add(amount)
            .ok_or(ErrorCode::Overflow)?;

        session_wallet.last_activity = Clock::get()?.unix_timestamp;

        // Transfer USDC from funder to session wallet
        let cpi_accounts = Transfer {
            from: ctx.accounts.funder_token_account.to_account_info(),
            to: ctx.accounts.session_token_account.to_account_info(),
            authority: ctx.accounts.funder.to_account_info(),
        };

        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

        token::transfer(cpi_ctx, amount)?;

        emit!(FundsAdded {
            session_id: session_wallet.session_id.clone(),
            amount,
            new_balance: session_wallet.current_balance,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    /// Close session and refund remaining balance
    pub fn close_session(ctx: Context<CloseSession>) -> Result<()> {
        let session_wallet = &mut ctx.accounts.session_wallet;

        require!(session_wallet.is_active, ErrorCode::SessionClosed);

        let remaining_balance = session_wallet.current_balance;

        // Refund remaining balance to treasury
        if remaining_balance > 0 {
            let session_id = session_wallet.session_id.clone();
            let seeds = &[
                b"session",
                session_id.as_bytes(),
                &[session_wallet.bump],
            ];
            let signer = &[&seeds[..]];

            let cpi_accounts = Transfer {
                from: ctx.accounts.session_token_account.to_account_info(),
                to: ctx.accounts.treasury_token_account.to_account_info(),
                authority: session_wallet.to_account_info(),
            };

            let cpi_program = ctx.accounts.token_program.to_account_info();
            let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);

            token::transfer(cpi_ctx, remaining_balance)?;
        }

        session_wallet.is_active = false;
        session_wallet.current_balance = 0;

        emit!(SessionClosed {
            session_id: session_wallet.session_id.clone(),
            refunded_amount: remaining_balance,
            total_spent: session_wallet.initial_balance - remaining_balance,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }
}

// ============================================================================
// Accounts
// ============================================================================

#[derive(Accounts)]
#[instruction(session_id: String)]
pub struct InitializeSession<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + SessionWallet::SIZE,
        seeds = [b"session", session_id.as_bytes()],
        bump
    )]
    pub session_wallet: Account<'info, SessionWallet>,

    #[account(mut)]
    pub treasury_token_account: Account<'info, TokenAccount>,

    #[account(
        init,
        payer = authority,
        token::mint = treasury_token_account.mint,
        token::authority = session_wallet,
    )]
    pub session_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct ExecutePurchase<'info> {
    #[account(
        mut,
        seeds = [b"session", session_wallet.session_id.as_bytes()],
        bump = session_wallet.bump
    )]
    pub session_wallet: Account<'info, SessionWallet>,

    #[account(mut)]
    pub session_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub service_provider_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct FundSession<'info> {
    #[account(
        mut,
        seeds = [b"session", session_wallet.session_id.as_bytes()],
        bump = session_wallet.bump
    )]
    pub session_wallet: Account<'info, SessionWallet>,

    #[account(mut)]
    pub funder_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub session_token_account: Account<'info, TokenAccount>,

    pub funder: Signer<'info>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct CloseSession<'info> {
    #[account(
        mut,
        seeds = [b"session", session_wallet.session_id.as_bytes()],
        bump = session_wallet.bump,
        has_one = authority
    )]
    pub session_wallet: Account<'info, SessionWallet>,

    #[account(mut)]
    pub session_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub treasury_token_account: Account<'info, TokenAccount>,

    pub authority: Signer<'info>,

    pub token_program: Program<'info, Token>,
}

// ============================================================================
// State
// ============================================================================

#[account]
pub struct SessionWallet {
    pub authority: Pubkey,        // Program authority (your backend)
    pub session_id: String,       // Unique session ID
    pub created_at: i64,          // Unix timestamp
    pub last_activity: i64,       // Unix timestamp
    pub initial_balance: u64,     // USDC (6 decimals)
    pub current_balance: u64,     // USDC (6 decimals)
    pub is_active: bool,          // Session active status
    pub bump: u8,                 // PDA bump seed
}

impl SessionWallet {
    pub const SIZE: usize = 32 + // authority
                            64 + // session_id (max length)
                            8 +  // created_at
                            8 +  // last_activity
                            8 +  // initial_balance
                            8 +  // current_balance
                            1 +  // is_active
                            1;   // bump
}

// ============================================================================
// Events
// ============================================================================

#[event]
pub struct SessionCreated {
    pub session_id: String,
    pub pda: Pubkey,
    pub initial_funding: u64,
    pub timestamp: i64,
}

#[event]
pub struct PurchaseExecuted {
    pub session_id: String,
    pub service_id: String,
    pub amount: u64,
    pub remaining_balance: u64,
    pub timestamp: i64,
}

#[event]
pub struct FundsAdded {
    pub session_id: String,
    pub amount: u64,
    pub new_balance: u64,
    pub timestamp: i64,
}

##[event]
pub struct SessionClosed {
    pub session_id: String,
    pub refunded_amount: u64,
    pub total_spent: u64,
    pub timestamp: i64,
}

// ============================================================================
// Errors
// ============================================================================

#[error_code]
pub enum ErrorCode {
    #[msg("Session is closed")]
    SessionClosed,
    #[msg("Insufficient balance")]
    InsufficientBalance,
    #[msg("Math overflow")]
    Overflow,
}
```

#### 4. `src/wallet/SessionWalletManager.ts`

```typescript
import { Connection, PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import { Program, AnchorProvider, web3, BN } from '@project-serum/anchor';
import { Database } from '../registry/database';
import type { SessionWallet } from './types';

export class SessionWalletManager {
  private connection: Connection;
  private program: Program;
  private authority: web3.Keypair;
  private db: Database;

  constructor(db: Database) {
    this.db = db;
    this.connection = new Connection(
      process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com'
    );

    // Load program and authority
    // TODO: Initialize Anchor program
  }

  /**
   * Create a new session wallet with PDA
   */
  async createSessionWallet(
    sessionId: string,
    initialFunding: number = 0.50
  ): Promise<{ pdaAddress: string; signature: string }> {
    // Convert USDC amount to smallest unit (6 decimals)
    const fundingAmount = new BN(initialFunding * 1_000_000);

    // Derive PDA
    const [pda, bump] = await PublicKey.findProgramAddress(
      [
        Buffer.from('session'),
        Buffer.from(sessionId)
      ],
      this.program.programId
    );

    // Call initialize_session instruction
    const tx = await this.program.methods
      .initializeSession(sessionId, fundingAmount)
      .accounts({
        sessionWallet: pda,
        treasuryTokenAccount: this.getTreasuryTokenAccount(),
        authority: this.authority.publicKey,
        tokenProgram: web3.TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([this.authority])
      .rpc();

    return {
      pdaAddress: pda.toBase58(),
      signature: tx
    };
  }

  /**
   * Execute service purchase from session wallet
   */
  async executePurchase(
    sessionId: string,
    serviceId: string,
    amount: number,
    serviceProviderWallet: string
  ): Promise<string> {
    const amountLamports = new BN(amount * 1_000_000);

    const [pda] = await PublicKey.findProgramAddress(
      [Buffer.from('session'), Buffer.from(sessionId)],
      this.program.programId
    );

    const tx = await this.program.methods
      .executePurchase(amountLamports, serviceId)
      .accounts({
        sessionWallet: pda,
        sessionTokenAccount: await this.getSessionTokenAccount(pda),
        serviceProviderTokenAccount: new PublicKey(serviceProviderWallet),
        tokenProgram: web3.TOKEN_PROGRAM_ID,
      })
      .rpc();

    // Update balance in database
    await this.updateSessionBalance(sessionId, -amount);

    return tx;
  }

  /**
   * Add funds to session wallet
   */
  async addFunds(
    sessionId: string,
    amount: number
  ): Promise<string> {
    const amountLamports = new BN(amount * 1_000_000);

    const [pda] = await PublicKey.findProgramAddress(
      [Buffer.from('session'), Buffer.from(sessionId)],
      this.program.programId
    );

    const tx = await this.program.methods
      .fundSession(amountLamports)
      .accounts({
        sessionWallet: pda,
        funderTokenAccount: this.getTreasuryTokenAccount(),
        sessionTokenAccount: await this.getSessionTokenAccount(pda),
        funder: this.authority.publicKey,
        tokenProgram: web3.TOKEN_PROGRAM_ID,
      })
      .signers([this.authority])
      .rpc();

    // Update balance in database
    await this.updateSessionBalance(sessionId, amount);

    return tx;
  }

  /**
   * Close session and refund remaining balance
   */
  async closeSession(sessionId: string): Promise<string> {
    const [pda] = await PublicKey.findProgramAddress(
      [Buffer.from('session'), Buffer.from(sessionId)],
      this.program.programId
    );

    const tx = await this.program.methods
      .closeSession()
      .accounts({
        sessionWallet: pda,
        sessionTokenAccount: await this.getSessionTokenAccount(pda),
        treasuryTokenAccount: this.getTreasuryTokenAccount(),
        authority: this.authority.publicKey,
        tokenProgram: web3.TOKEN_PROGRAM_ID,
      })
      .signers([this.authority])
      .rpc();

    // Mark session as closed in database
    await this.db.run(
      `UPDATE chat_sessions SET current_balance = '0', last_activity = ? WHERE id = ?`,
      [Date.now(), sessionId]
    );

    return tx;
  }

  /**
   * Cleanup expired sessions (24h inactivity)
   */
  async cleanupExpiredSessions(): Promise<void> {
    const expiryTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago

    const expiredSessions = await this.db.all<any>(
      `SELECT * FROM chat_sessions WHERE last_activity < ? AND current_balance > '0'`,
      [expiryTime]
    );

    for (const session of expiredSessions) {
      try {
        await this.closeSession(session.id);
        console.log(`✓ Closed expired session: ${session.id}`);
      } catch (error) {
        console.error(`Failed to close session ${session.id}:`, error);
      }
    }
  }

  private async updateSessionBalance(sessionId: string, delta: number): Promise<void> {
    const session = await this.db.get<any>(
      `SELECT current_balance FROM chat_sessions WHERE id = ?`,
      [sessionId]
    );

    if (!session) return;

    const newBalance = (parseFloat(session.current_balance) + delta).toFixed(2);

    await this.db.run(
      `UPDATE chat_sessions SET current_balance = ?, last_activity = ? WHERE id = ?`,
      [newBalance, Date.now(), sessionId]
    );
  }

  private getTreasuryTokenAccount(): PublicKey {
    // TODO: Return actual treasury token account
    return new PublicKey('YourTreasuryTokenAccountHere');
  }

  private async getSessionTokenAccount(pda: PublicKey): Promise<PublicKey> {
    // TODO: Derive session's associated token account
    return pda; // Placeholder
  }
}
```

### Deployment Steps

```bash
# Build program
cd programs/session-wallet
anchor build

# Deploy to devnet
anchor deploy --provider.cluster devnet

# Get program ID and update in lib.rs
anchor keys list

# Update Anchor.toml with program ID
# Rebuild and redeploy
anchor build
anchor deploy --provider.cluster devnet
```

### Testing Checklist - Phase 3
- [ ] PDA creation works correctly
- [ ] Initial funding transfers to PDA
- [ ] Service purchase deducts from PDA balance
- [ ] Funds can be added to session
- [ ] Session close refunds remaining balance
- [ ] Expired sessions cleanup works
- [ ] Database balances stay in sync with on-chain
- [ ] All Anchor events emit correctly

### Completion Criteria
✅ Solana program deployed to devnet
✅ PDA-based wallets functional
✅ All instructions working
✅ SessionWalletManager integrated
✅ Ready for MCP integration

---

## Phase 4-6 Summary

**Phase 4: MCP Integration**
- Connect ChatOrchestrator to existing MCP tools
- Update AI engine to use real service discovery
- Implement actual service purchases with session wallet
- Test end-to-end flow

**Phase 5: Streaming & Polish**
- Implement proper SSE streaming with backpressure
- Add typing indicators during AI thinking
- Polish UI animations
- Add error handling and retries
- Improve conversation UX

**Phase 6: Fund Management**
- Implement automated session cleanup cron
- Add balance warnings (< $0.10)
- Implement refund history tracking
- Add spending analytics
- Polish wallet UI

---

## Security Checklist

- [ ] PDA seeds cannot be guessed (use UUIDs)
- [ ] All token transfers validated
- [ ] Rate limiting on all endpoints
- [ ] Input sanitization for user messages
- [ ] CORS properly configured
- [ ] API key never exposed to frontend
- [ ] Session IDs are cryptographically secure
- [ ] Maximum session balance enforced ($5.00)
- [ ] Nonce accounts properly managed
- [ ] Fund recovery tested thoroughly

---

## Deployment Checklist

- [ ] Environment variables configured
- [ ] Solana program deployed to devnet
- [ ] Database migrations run
- [ ] Treasury wallet funded
- [ ] Session cleanup cron scheduled
- [ ] Monitoring/logging configured
- [ ] Error tracking (Sentry) set up
- [ ] Load testing completed
- [ ] Backup/recovery plan documented

---

## Next Steps After Completion

1. **User Testing**: Get 10-20 users to test
2. **Iterate**: Fix bugs, improve UX based on feedback
3. **Analytics**: Track which services are most used
4. **Monetization**: Add subscription tiers if needed
5. **Marketing**: Promote as zero-friction AI + blockchain
6. **Scale**: Move to mainnet when ready

---

## Progress Tracking

| Phase | Status | Completion Date |
|-------|--------|-----------------|
| Phase 1: Chat UI | 🔲 Not Started | - |
| Phase 2: AI Backend | 🔲 Not Started | - |
| Phase 3: Session Wallets | 🔲 Not Started | - |
| Phase 4: MCP Integration | 🔲 Not Started | - |
| Phase 5: Polish | 🔲 Not Started | - |
| Phase 6: Fund Management | 🔲 Not Started | - |

**Legend:**
- 🔲 Not Started
- 🟡 In Progress
- ✅ Complete

---

## Questions / Decisions Needed

*Add questions here as they arise during implementation*

1. [PENDING] What should be the maximum session balance? ($5.00?)
2. [PENDING] How often should session cleanup run? (every hour?)
3. [PENDING] Should we show detailed cost breakdown per service?

---

**Document Version:** 1.0
**Last Updated:** [Will be updated as implementation progresses]
**Author:** Claude (AI Assistant)
**Project:** AgentMarket AI Chat Interface
