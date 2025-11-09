'use client';

import { useState, useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';
import ChatInput from './ChatInput';
import ServiceCallCard from './ServiceCallCard';
import SearchResultCard from './SearchResultCard';
import PaymentRequestCard from './PaymentRequestCard';
import SessionWalletCard from './SessionWalletCard';
import TypingIndicator from './TypingIndicator';
import { useChat } from '@/hooks/useChat';
import { motion } from 'framer-motion';
import { MessageSquare, Trash2, AlertCircle } from 'lucide-react';

export default function ChatInterface() {
  const {
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
  } = useChat();

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, serviceCalls, searchQueries, paymentRequests]);

  return (
    <div className="flex flex-col h-screen bg-gradient-to-b from-dark via-dark to-dark-secondary">
      {/* Streamlined Header */}
      <div className="border-b border-gray-800/50 bg-dark/80 backdrop-blur-sm px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple via-purple/80 to-blue flex items-center justify-center shadow-lg shadow-purple/20">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold gradient-text">AI Assistant</h1>
              <p className="text-xs text-gray-500">Powered by AgentMarket</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {messages.length > 0 && (
              <button
                onClick={clearChat}
                className="btn-secondary text-xs px-3 py-2 flex items-center gap-2"
                title="Clear chat"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Clear</span>
              </button>
            )}

            {session && (
              <div className="hidden lg:block max-w-xs">
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
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
        <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red/10 border border-red/30 rounded-lg p-4 flex items-center gap-3"
            >
              <AlertCircle className="w-5 h-5 text-red" />
              <p className="text-red text-sm">{error}</p>
            </motion.div>
          )}

          {messages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-16 sm:py-20"
            >
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-purple/10 via-purple/5 to-blue/10 flex items-center justify-center mx-auto mb-6 border border-purple/20 shadow-lg shadow-purple/10">
                <MessageSquare className="w-12 h-12 text-purple" />
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">
                Start a Conversation
              </h2>
              <p className="text-gray-400 mb-8 max-w-lg mx-auto text-sm sm:text-base">
                I can help you with tasks, answer questions, and automatically use specialized AI services from the marketplace when needed.
              </p>
              <div className="flex flex-wrap gap-2 justify-center max-w-2xl mx-auto">
                {[
                  "Analyze sentiment of a tweet",
                  "Summarize this article",
                  "Analyze an image",
                  "What services are available?"
                ].map((example, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(example)}
                    className="btn-secondary text-sm hover:scale-105 transition-transform"
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
                        key={`service-${j}`}
                        serviceName={call.serviceName}
                        status={call.status}
                        cost={call.cost}
                        startTime={call.startTime}
                        endTime={call.endTime}
                        result={call.result}
                        error={call.error}
                      />
                    ))}

                  {/* Show search results after corresponding messages */}
                  {searchQueries
                    .filter(search => search.messageIndex === i)
                    .map((search, j) => (
                      <SearchResultCard
                        key={`search-${j}`}
                        query={search.query}
                        results={search.results}
                        totalResults={search.totalResults}
                        healthCheckPassed={search.healthCheckPassed}
                        cost={search.cost}
                        timestamp={search.timestamp}
                        error={search.error}
                      />
                    ))}

                  {/* Show payment requests after corresponding messages */}
                  {paymentRequests
                    .filter(payment => payment.messageIndex === i)
                    .map((payment, j) => (
                      <PaymentRequestCard
                        key={`payment-${j}`}
                        url={payment.url}
                        status={payment.status}
                        amount={payment.amount}
                        recipient={payment.recipient}
                        signature={payment.signature}
                        healthCheckPassed={payment.healthCheckPassed}
                        error={payment.error}
                        timestamp={payment.timestamp}
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
        <div className="lg:hidden border-t border-gray-800/50 bg-dark/80 backdrop-blur-sm p-3">
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
