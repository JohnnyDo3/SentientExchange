'use client';

import { useState, useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';
import ChatInput from './ChatInput';
import ServiceCallCard from './ServiceCallCard';
import ServiceIndicator from './ServiceIndicator';
import SearchResultCard from './SearchResultCard';
import PaymentRequestCard from './PaymentRequestCard';
import SessionWalletCard from './SessionWalletCard';
import TypingIndicator from './TypingIndicator';
import { useChat } from '@/hooks/useChat';
import { useToast } from '@/hooks/useToast';
import { useSound } from '@/hooks/useSound';
import { ToastContainer } from '@/components/ui/Toast';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Trash2, AlertCircle, ArrowDown, Menu, Volume2, VolumeX, Command, Store, Settings } from 'lucide-react';
import Header from '@/components/ui/Header';
import ChatHistorySidebar from './ChatHistorySidebar';
import CommandPalette from './CommandPalette';
import ServiceBrowserModal from './ServiceBrowserModal';
import SettingsPanel from './SettingsPanel';

export default function ChatInterface() {
  const {
    messages,
    serviceCalls,
    serviceStatuses,
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
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [serviceBrowserOpen, setServiceBrowserOpen] = useState(false);
  const [settingsPanelOpen, setSettingsPanelOpen] = useState(false);
  const { toasts, removeToast, success, error: showError, info } = useToast();
  const { play, enabled: soundEnabled, toggleSound, setVolume } = useSound();
  const prevMessagesLengthRef = useRef(messages.length);

  // Check if user is near bottom
  const checkScrollPosition = () => {
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 200;
    setShowScrollButton(!isNearBottom && messages.length > 3);
  };

  // Auto-scroll to bottom
  useEffect(() => {
    if (!showScrollButton) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, serviceCalls, searchQueries, paymentRequests, showScrollButton]);

  // Play sounds when messages are added
  useEffect(() => {
    if (messages.length > prevMessagesLengthRef.current) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === 'user') {
        play('messageSent');
      } else if (lastMessage.role === 'assistant' && !lastMessage.isStreaming) {
        play('messageReceived');
      }
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages, play]);

  // Play sound when service completes
  useEffect(() => {
    const completedService = serviceCalls.find(
      (call) => call.status === 'completed' && !call.error
    );
    if (completedService) {
      play('serviceComplete');
    }
    const failedService = serviceCalls.find(
      (call) => call.status === 'failed' || call.error
    );
    if (failedService) {
      play('serviceError');
    }
  }, [serviceCalls, play]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleClearChat = () => {
    clearChat();
    success('Chat cleared successfully');
  };

  const handleNewChat = () => {
    clearChat();
    info('Started new chat');
  };

  const handleSelectSession = (sessionId: string) => {
    // TODO: Load session history from API
    info(`Loading session: ${sessionId}`);
  };

  const handleCopyMessage = () => {
    success('Message copied to clipboard!');
  };

  const handleRegenerateResponse = (messageIndex: number) => {
    if (messageIndex > 0 && messages[messageIndex - 1]?.role === 'user') {
      const userMessage = messages[messageIndex - 1].content;
      info('Regenerating response...');
      sendMessage(userMessage);
    }
  };

  const handleDeleteMessage = (messageIndex: number) => {
    // TODO: Implement message deletion from state
    success('Message deleted');
    // For now, just show toast - actual deletion requires state management
  };

  const handleExportChat = () => {
    const exportData = {
      messages,
      serviceCalls,
      searchQueries,
      paymentRequests,
      session,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    success('Chat exported successfully!');
  };

  const handleClearAllHistory = () => {
    if (confirm('Are you sure you want to clear all chat history? This cannot be undone.')) {
      localStorage.removeItem('chat-history');
      clearChat();
      success('All history cleared');
    }
  };

  const handleUseService = (serviceName: string, serviceId: string) => {
    sendMessage(`Use ${serviceName} service`);
    info(`Preparing to use ${serviceName}...`);
  };

  const handleUpdateSettings = (settings: any) => {
    // Apply settings
    if (settings.sound) {
      if (!settings.sound.enabled && soundEnabled) {
        toggleSound();
      } else if (settings.sound.enabled && !soundEnabled) {
        toggleSound();
      }
      setVolume(settings.sound.volume);
    }
    success('Settings saved successfully!');
  };

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K or Cmd+K for command palette
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="flex flex-col h-screen bg-gradient-to-b from-gray-950 via-black to-gray-900">
      {/* Chat History Sidebar */}
      <ChatHistorySidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onNewChat={handleNewChat}
        onSelectSession={handleSelectSession}
        currentSessionId={session?.id}
      />
      {/* Navigation Header */}
      <Header />

      {/* Chat Sub-Header with Session Wallet */}
      <div className="border-b border-gray-800/50 bg-black/80 backdrop-blur-xl px-4 py-4 mt-20 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Sidebar Toggle Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-purple/20 rounded-lg transition-colors"
              title="Toggle chat history"
            >
              <Menu className="w-5 h-5 text-purple" />
            </motion.button>

            {/* Sound Toggle Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleSound}
              className="p-2 hover:bg-purple/20 rounded-lg transition-colors"
              title={soundEnabled ? 'Mute sounds' : 'Enable sounds'}
            >
              {soundEnabled ? (
                <Volume2 className="w-5 h-5 text-purple" />
              ) : (
                <VolumeX className="w-5 h-5 text-gray-500" />
              )}
            </motion.button>

            {/* Command Palette Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setCommandPaletteOpen(true)}
              className="p-2 hover:bg-purple/20 rounded-lg transition-colors hidden sm:flex"
              title="Command Palette (Ctrl+K)"
            >
              <Command className="w-5 h-5 text-purple" />
            </motion.button>

            {/* Service Browser Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setServiceBrowserOpen(true)}
              className="p-2 hover:bg-purple/20 rounded-lg transition-colors"
              title="Browse Services"
            >
              <Store className="w-5 h-5 text-purple" />
            </motion.button>

            {/* Settings Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSettingsPanelOpen(true)}
              className="p-2 hover:bg-purple/20 rounded-lg transition-colors"
              title="Settings"
            >
              <Settings className="w-5 h-5 text-purple" />
            </motion.button>

            <h1 className="text-2xl font-bold gradient-text animate-shimmer hidden md:block">
              Sentient Exchange Chat
            </h1>
            <MessageSquare className="w-6 h-6 text-purple sm:hidden" />
            {messages.length > 0 && (
              <button
                onClick={handleClearChat}
                className="btn-secondary text-xs px-3 py-2 flex items-center gap-2"
                title="Clear chat"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Clear Chat</span>
              </button>
            )}
          </div>

          {/* Session Wallet */}
          {session && (
            <div className="ml-auto">
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

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onClose={removeToast} />

      {/* Messages Area */}
      <div
        ref={messagesContainerRef}
        onScroll={checkScrollPosition}
        className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent relative"
      >
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
                    messageIndex={i}
                    onCodeCopy={() => success('Code copied to clipboard!')}
                    onCopyMessage={handleCopyMessage}
                    onRegenerate={() => handleRegenerateResponse(i)}
                    onDelete={() => handleDeleteMessage(i)}
                  />

                  {/* Show animated service status indicators */}
                  <AnimatePresence>
                    {serviceStatuses
                      .filter(status => msg.isStreaming)
                      .map((status, j) => (
                        <ServiceIndicator
                          key={`status-${j}`}
                          serviceName={status.serviceName}
                          status={status.status}
                          icon={status.icon}
                          message={status.message}
                          cost={status.cost}
                        />
                      ))}
                  </AnimatePresence>

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

        {/* Scroll to Bottom Button */}
        <AnimatePresence>
          {showScrollButton && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              onClick={scrollToBottom}
              className="fixed bottom-24 right-8 p-3 bg-purple text-white rounded-full shadow-lg shadow-purple/50 hover:shadow-purple/70 hover:scale-110 transition-all duration-200 z-10 backdrop-blur-xl border border-purple/20"
              aria-label="Scroll to bottom"
            >
              <ArrowDown className="w-5 h-5" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>


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

      {/* Modals */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onNewChat={handleNewChat}
        onClearChat={handleClearChat}
        onExportChat={handleExportChat}
        onOpenSettings={() => {
          setCommandPaletteOpen(false);
          setSettingsPanelOpen(true);
        }}
      />

      <ServiceBrowserModal
        isOpen={serviceBrowserOpen}
        onClose={() => setServiceBrowserOpen(false)}
        onUseService={handleUseService}
      />

      <SettingsPanel
        isOpen={settingsPanelOpen}
        onClose={() => setSettingsPanelOpen(false)}
        currentSettings={{
          sound: {
            enabled: soundEnabled,
            volume: 0.3,
          },
        }}
        onUpdateSettings={handleUpdateSettings}
        onExportData={handleExportChat}
        onClearHistory={handleClearAllHistory}
      />
    </div>
  );
}
