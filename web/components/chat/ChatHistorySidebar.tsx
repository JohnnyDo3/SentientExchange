'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  Plus,
  Search,
  Clock,
  Trash2,
  Pin,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface ChatSession {
  id: string;
  title: string;
  preview: string;
  messageCount: number;
  lastActivity: string;
  isPinned?: boolean;
}

interface ChatHistorySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onNewChat: () => void;
  onSelectSession: (sessionId: string) => void;
  currentSessionId?: string;
}

export default function ChatHistorySidebar({
  isOpen,
  onClose,
  onNewChat,
  onSelectSession,
  currentSessionId
}: ChatHistorySidebarProps) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // Mock data - Replace with actual API call
  useEffect(() => {
    if (isOpen) {
      loadSessions();
    }
  }, [isOpen]);

  const loadSessions = async () => {
    setLoading(true);

    try {
      const response = await fetch('/api/chat/sessions');

      if (!response.ok) {
        throw new Error('Failed to fetch sessions');
      }

      const data = await response.json();

      if (data.success) {
        setSessions(data.sessions || []);
      } else {
        console.error('Failed to load sessions:', data.error);
        setSessions([]);
      }
    } catch (error) {
      console.error('Error loading chat sessions:', error);
      setSessions([]);
    }

    setLoading(false);
  };

  const filteredSessions = sessions.filter(
    (session) =>
      session.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      session.preview.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pinnedSessions = filteredSessions.filter((s) => s.isPinned);
  const regularSessions = filteredSessions.filter((s) => !s.isPinned);

  return (
    <>
      {/* Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.div
        initial={{ x: -320 }}
        animate={{ x: isOpen ? 0 : -320 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed left-0 top-0 h-full w-80 bg-black/95 backdrop-blur-xl border-r border-gray-800/50 z-50 flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-800/50">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold gradient-text">Chat History</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-800/50 rounded-lg transition-colors lg:hidden"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* New Chat Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              onNewChat();
              onClose();
            }}
            className="w-full bg-gradient-to-r from-purple to-pink text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2 shadow-lg shadow-purple/30 hover:shadow-purple/50 transition-all"
          >
            <Plus className="w-5 h-5" />
            New Chat
          </motion.button>

          {/* Search */}
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-900/50 border border-gray-800 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-purple/50 transition-colors"
            />
          </div>
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple"></div>
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-500">
              <MessageSquare className="w-12 h-12 mb-2 opacity-50" />
              <p className="text-sm">No conversations yet</p>
            </div>
          ) : (
            <>
              {/* Pinned Sessions */}
              {pinnedSessions.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 px-2 py-1 text-xs font-semibold text-gray-400 uppercase">
                    <Pin className="w-3 h-3" />
                    Pinned
                  </div>
                  {pinnedSessions.map((session) => (
                    <SessionCard
                      key={session.id}
                      session={session}
                      isActive={session.id === currentSessionId}
                      onClick={() => {
                        onSelectSession(session.id);
                        onClose();
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Regular Sessions */}
              {regularSessions.length > 0 && (
                <div>
                  {pinnedSessions.length > 0 && (
                    <div className="px-2 py-1 text-xs font-semibold text-gray-400 uppercase">
                      Recent
                    </div>
                  )}
                  {regularSessions.map((session) => (
                    <SessionCard
                      key={session.id}
                      session={session}
                      isActive={session.id === currentSessionId}
                      onClick={() => {
                        onSelectSession(session.id);
                        onClose();
                      }}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </motion.div>

      {/* Toggle Button (Desktop Only) */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => (isOpen ? onClose() : null)}
        className="hidden lg:block fixed top-24 p-2 bg-purple text-white rounded-r-lg shadow-lg z-40 transition-all hover:shadow-purple/50"
        style={{
          left: isOpen ? '320px' : '0px',
          transition: 'left 0.3s ease-in-out'
        }}
      >
        {isOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </motion.button>
    </>
  );
}

// Session Card Component
interface SessionCardProps {
  session: ChatSession;
  isActive: boolean;
  onClick: () => void;
}

function SessionCard({ session, isActive, onClick }: SessionCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.02, x: 4 }}
      onClick={onClick}
      className={`p-3 rounded-lg mb-2 cursor-pointer transition-all ${
        isActive
          ? 'bg-purple/20 border border-purple/50'
          : 'bg-gray-900/30 border border-gray-800/30 hover:border-purple/30'
      }`}
    >
      <div className="flex items-start gap-3">
        <MessageSquare className={`w-4 h-4 mt-1 flex-shrink-0 ${isActive ? 'text-purple' : 'text-gray-400'}`} />
        <div className="flex-1 min-w-0">
          <h3 className={`text-sm font-semibold truncate ${isActive ? 'text-white' : 'text-gray-300'}`}>
            {session.title}
          </h3>
          <p className="text-xs text-gray-500 truncate mt-1">{session.preview}</p>
          <div className="flex items-center gap-2 mt-2 text-xs text-gray-600">
            <Clock className="w-3 h-3" />
            {session.lastActivity}
            <span>•</span>
            <span>{session.messageCount} messages</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
