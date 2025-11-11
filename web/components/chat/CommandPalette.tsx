'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  MessageSquare,
  Trash2,
  Download,
  Settings,
  Home,
  Store,
  BarChart3,
  Zap,
  Clock,
  ArrowRight,
} from 'lucide-react';

interface Command {
  id: string;
  label: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
  category: 'navigation' | 'chat' | 'service' | 'recent';
  keywords?: string[];
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNewChat: () => void;
  onClearChat: () => void;
  onExportChat: () => void;
  onOpenSettings: () => void;
  recentServices?: Array<{ id: string; name: string }>;
}

export default function CommandPalette({
  isOpen,
  onClose,
  onNewChat,
  onClearChat,
  onExportChat,
  onOpenSettings,
  recentServices = [],
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentCommands, setRecentCommands] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load recent commands from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('command-palette-recent');
    if (stored) {
      try {
        setRecentCommands(JSON.parse(stored));
      } catch (err) {
        console.error('Failed to parse recent commands:', err);
      }
    }
  }, []);

  // Save recent command
  const saveRecentCommand = useCallback((commandId: string) => {
    setRecentCommands((prev) => {
      const filtered = prev.filter((id) => id !== commandId);
      const updated = [commandId, ...filtered].slice(0, 5);
      localStorage.setItem('command-palette-recent', JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Define all commands
  const commands: Command[] = [
    // Navigation
    {
      id: 'nav-home',
      label: 'Go to Home',
      description: 'Navigate to homepage',
      icon: Home,
      category: 'navigation',
      action: () => {
        window.location.href = '/';
        saveRecentCommand('nav-home');
      },
      keywords: ['home', 'landing', 'main'],
    },
    {
      id: 'nav-marketplace',
      label: 'Go to Marketplace',
      description: 'Browse all AI services',
      icon: Store,
      category: 'navigation',
      action: () => {
        window.location.href = '/marketplace';
        saveRecentCommand('nav-marketplace');
      },
      keywords: ['marketplace', 'services', 'browse', 'shop'],
    },
    {
      id: 'nav-dashboard',
      label: 'Go to Dashboard',
      description: 'View analytics and metrics',
      icon: BarChart3,
      category: 'navigation',
      action: () => {
        window.location.href = '/dashboard';
        saveRecentCommand('nav-dashboard');
      },
      keywords: ['dashboard', 'analytics', 'metrics', 'stats'],
    },
    // Chat actions
    {
      id: 'chat-new',
      label: 'New Chat',
      description: 'Start a fresh conversation',
      icon: MessageSquare,
      category: 'chat',
      action: () => {
        onNewChat();
        saveRecentCommand('chat-new');
        onClose();
      },
      keywords: ['new', 'chat', 'conversation', 'start', 'fresh'],
    },
    {
      id: 'chat-clear',
      label: 'Clear Chat',
      description: 'Delete current conversation',
      icon: Trash2,
      category: 'chat',
      action: () => {
        onClearChat();
        saveRecentCommand('chat-clear');
        onClose();
      },
      keywords: ['clear', 'delete', 'remove', 'chat', 'conversation'],
    },
    {
      id: 'chat-export',
      label: 'Export Conversation',
      description: 'Download chat as JSON',
      icon: Download,
      category: 'chat',
      action: () => {
        onExportChat();
        saveRecentCommand('chat-export');
        onClose();
      },
      keywords: ['export', 'download', 'save', 'backup', 'json'],
    },
    {
      id: 'chat-settings',
      label: 'Open Settings',
      description: 'Configure preferences',
      icon: Settings,
      category: 'chat',
      action: () => {
        onOpenSettings();
        saveRecentCommand('chat-settings');
        onClose();
      },
      keywords: ['settings', 'preferences', 'config', 'options'],
    },
    // Recent services
    ...recentServices.map((service) => ({
      id: `service-${service.id}`,
      label: `Use ${service.name}`,
      description: 'Insert service prompt',
      icon: Zap,
      category: 'service' as const,
      action: () => {
        // This will be handled by parent component
        saveRecentCommand(`service-${service.id}`);
        onClose();
      },
      keywords: [service.name.toLowerCase(), 'service', 'use'],
    })),
  ];

  // Fuzzy search function
  const fuzzyMatch = (str: string, pattern: string): number => {
    const lowerStr = str.toLowerCase();
    const lowerPattern = pattern.toLowerCase();

    // Exact match gets highest score
    if (lowerStr === lowerPattern) return 1000;
    if (lowerStr.includes(lowerPattern)) return 100;

    // Fuzzy matching
    let score = 0;
    let patternIdx = 0;
    let prevMatchIdx = -1;

    for (let i = 0; i < lowerStr.length && patternIdx < lowerPattern.length; i++) {
      if (lowerStr[i] === lowerPattern[patternIdx]) {
        score += prevMatchIdx === i - 1 ? 5 : 1; // Bonus for consecutive matches
        prevMatchIdx = i;
        patternIdx++;
      }
    }

    return patternIdx === lowerPattern.length ? score : 0;
  };

  // Filter and sort commands
  const filteredCommands = commands
    .map((cmd) => {
      if (!query.trim()) {
        // Show recent commands first when no query
        const isRecent = recentCommands.includes(cmd.id);
        return { cmd, score: isRecent ? 1000 : cmd.category === 'navigation' ? 100 : 10 };
      }

      // Calculate match score
      const labelScore = fuzzyMatch(cmd.label, query);
      const descScore = cmd.description ? fuzzyMatch(cmd.description, query) * 0.5 : 0;
      const keywordScore = cmd.keywords
        ? Math.max(...cmd.keywords.map((kw) => fuzzyMatch(kw, query))) * 0.8
        : 0;

      const totalScore = Math.max(labelScore, descScore, keywordScore);
      return { cmd, score: totalScore };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, filteredCommands.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            filteredCommands[selectedIndex].cmd.action();
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, filteredCommands, onClose]);

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Group commands by category
  const groupedCommands = filteredCommands.reduce((acc, { cmd }) => {
    if (!acc[cmd.category]) {
      acc[cmd.category] = [];
    }
    acc[cmd.category].push(cmd);
    return acc;
  }, {} as Record<string, Command[]>);

  const categoryLabels = {
    recent: 'Recent',
    navigation: 'Navigation',
    chat: 'Chat Actions',
    service: 'Services',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Command Palette */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed top-[15%] left-1/2 -translate-x-1/2 w-full max-w-2xl z-50 px-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="command-palette-title"
            aria-describedby="command-palette-desc"
          >
            <div className="bg-gray-900/95 backdrop-blur-xl border border-gray-800 rounded-xl shadow-2xl overflow-hidden">
              {/* Search Input */}
              <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-800">
                <Search className="w-5 h-5 text-gray-400" aria-hidden="true" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Type a command or search..."
                  className="flex-1 bg-transparent text-white placeholder-gray-500 focus:outline-none text-sm"
                  aria-label="Command search"
                  aria-controls="command-list"
                  aria-activedescendant={filteredCommands[selectedIndex]?.cmd.id}
                  role="combobox"
                  aria-expanded="true"
                  aria-autocomplete="list"
                />
                <kbd className="px-2 py-1 text-xs font-mono text-gray-400 bg-gray-800 rounded border border-gray-700" aria-label="Press Escape to close">
                  ESC
                </kbd>
              </div>
              <span id="command-palette-title" className="sr-only">Command Palette</span>
              <span id="command-palette-desc" className="sr-only">Search and execute commands using keyboard navigation</span>

              {/* Commands List */}
              <div className="max-h-[400px] overflow-y-auto custom-scrollbar" id="command-list" role="listbox" aria-label="Available commands">
                {filteredCommands.length === 0 ? (
                  <div className="px-4 py-12 text-center text-gray-500" role="status">
                    <Search className="w-12 h-12 mx-auto mb-3 opacity-50" aria-hidden="true" />
                    <p className="text-sm">No commands found</p>
                    <p className="text-xs mt-1">Try a different search term</p>
                  </div>
                ) : (
                  <div className="py-2">
                    {Object.entries(groupedCommands).map(([category, cmds]) => (
                      <div key={category} className="mb-2">
                        <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">
                          {categoryLabels[category as keyof typeof categoryLabels]}
                        </div>
                        {cmds.map((cmd, idx) => {
                          const globalIdx = filteredCommands.findIndex((f) => f.cmd.id === cmd.id);
                          const isSelected = globalIdx === selectedIndex;
                          const Icon = cmd.icon;

                          return (
                            <motion.button
                              key={cmd.id}
                              id={cmd.id}
                              onClick={cmd.action}
                              onMouseEnter={() => setSelectedIndex(globalIdx)}
                              whileHover={{ scale: 1.01 }}
                              className={`w-full flex items-center gap-3 px-4 py-3 transition-colors ${
                                isSelected
                                  ? 'bg-purple/20 border-l-2 border-purple'
                                  : 'hover:bg-gray-800/50'
                              }`}
                              role="option"
                              aria-selected={isSelected}
                              aria-label={`${cmd.label}${cmd.description ? `: ${cmd.description}` : ''}`}
                            >
                              <Icon className={`w-5 h-5 ${isSelected ? 'text-purple' : 'text-gray-400'}`} aria-hidden="true" />
                              <div className="flex-1 text-left">
                                <div className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                                  {cmd.label}
                                </div>
                                {cmd.description && (
                                  <div className="text-xs text-gray-500 mt-0.5">{cmd.description}</div>
                                )}
                              </div>
                              {isSelected && <ArrowRight className="w-4 h-4 text-purple" />}
                              {recentCommands.includes(cmd.id) && !query && (
                                <Clock className="w-3 h-3 text-gray-600" />
                              )}
                            </motion.button>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-4 py-3 border-t border-gray-800 flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-gray-800 rounded border border-gray-700">↑</kbd>
                    <kbd className="px-1.5 py-0.5 bg-gray-800 rounded border border-gray-700">↓</kbd>
                    <span>Navigate</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-gray-800 rounded border border-gray-700">↵</kbd>
                    <span>Select</span>
                  </div>
                </div>
                <div className="text-gray-600">{filteredCommands.length} commands</div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
