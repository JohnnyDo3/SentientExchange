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

export interface SearchQuery {
  messageIndex: number;
  query: string;
  results: Array<{
    rank: number;
    title: string;
    url: string;
    description: string;
    source?: string;
    age?: string;
  }>;
  totalResults?: number;
  healthCheckPassed: boolean;
  cost: string;
  timestamp: string;
  error?: string;
}

export interface PaymentRequest {
  messageIndex: number;
  url: string;
  status: 'checking_health' | 'pending_approval' | 'processing' | 'completed' | 'failed';
  amount?: string;
  recipient?: string;
  signature?: string;
  healthCheckPassed?: boolean;
  error?: string;
  timestamp: string;
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
  const [searchQueries, setSearchQueries] = useState<SearchQuery[]>([]);
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize session on mount
  useEffect(() => {
    initializeSession();
  }, []);

  // Load saved conversation from localStorage
  useEffect(() => {
    if (session) {
      const saved = localStorage.getItem(`chat-${session.id}`);
      if (saved) {
        try {
          const {
            messages: savedMessages,
            serviceCalls: savedCalls,
            searchQueries: savedSearches,
            paymentRequests: savedPayments
          } = JSON.parse(saved);
          setMessages(savedMessages || []);
          setServiceCalls(savedCalls || []);
          setSearchQueries(savedSearches || []);
          setPaymentRequests(savedPayments || []);
        } catch (e) {
          console.error('Failed to load saved conversation:', e);
        }
      }
    }
  }, [session]);

  // Save conversation to localStorage
  useEffect(() => {
    if (session && messages.length > 0) {
      localStorage.setItem(`chat-${session.id}`, JSON.stringify({
        messages,
        serviceCalls,
        searchQueries,
        paymentRequests
      }));
    }
  }, [session, messages, serviceCalls, searchQueries, paymentRequests]);

  const initializeSession = async () => {
    try {
      setError(null);
      const newSession = await chatAPI.createSession();
      setSession(newSession);
    } catch (error) {
      console.error('Failed to create session:', error);
      setError('Failed to create session. Please refresh the page.');
    }
  };

  const clearChat = useCallback(() => {
    setMessages([]);
    setServiceCalls([]);
    setSearchQueries([]);
    setPaymentRequests([]);
    if (session) {
      localStorage.removeItem(`chat-${session.id}`);
    }
  }, [session]);

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

          case 'search_results':
            // Add or update search query
            setSearchQueries(prev => {
              const newQuery: SearchQuery = {
                messageIndex: messages.length,
                query: data.data.query,
                results: data.data.results || [],
                totalResults: data.data.totalResults,
                healthCheckPassed: data.data.healthCheckPassed,
                cost: data.data.cost || '$0.00',
                timestamp: new Date().toLocaleTimeString(),
                error: data.data.error
              };
              return [...prev, newQuery];
            });
            break;

          case 'payment_request':
            // Add new payment request (health checking)
            setPaymentRequests(prev => [
              ...prev,
              {
                messageIndex: messages.length,
                url: data.data.url,
                status: data.data.status,
                timestamp: new Date().toLocaleTimeString()
              }
            ]);
            break;

          case 'payment_approval_needed':
            // Update payment request to pending approval
            setPaymentRequests(prev =>
              prev.map((req, idx) =>
                idx === prev.length - 1
                  ? {
                      ...req,
                      status: 'pending_approval' as const,
                      amount: data.data.amount,
                      recipient: data.data.recipient
                    }
                  : req
              )
            );
            break;

          case 'payment_complete':
            // Update payment request to completed/failed
            setPaymentRequests(prev =>
              prev.map((req, idx) =>
                idx === prev.length - 1
                  ? {
                      ...req,
                      status: data.data.success ? ('completed' as const) : ('failed' as const),
                      amount: data.data.amount,
                      signature: data.data.signature,
                      healthCheckPassed: data.data.healthCheckPassed,
                      error: data.data.error
                    }
                  : req
              )
            );
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
    searchQueries,
    paymentRequests,
    session,
    isLoading,
    error,
    sendMessage,
    addFunds,
    clearChat
  };
}
