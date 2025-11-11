'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Volume2,
  VolumeX,
  Moon,
  Sun,
  Keyboard,
  MessageSquare,
  Download,
  Trash2,
  Bell,
  Eye,
  Zap,
  Settings as SettingsIcon,
} from 'lucide-react';

interface Settings {
  sound: {
    enabled: boolean;
    volume: number;
  };
  theme: 'dark' | 'light' | 'system';
  chat: {
    autoScroll: boolean;
    showTypingIndicator: boolean;
    showTimestamps: boolean;
    animateMessages: boolean;
  };
  notifications: {
    enabled: boolean;
    serviceComplete: boolean;
    serviceError: boolean;
  };
  performance: {
    animationsEnabled: boolean;
    virtualScrolling: boolean;
  };
}

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentSettings: Partial<Settings>;
  onUpdateSettings: (settings: Settings) => void;
  onExportData: () => void;
  onClearHistory: () => void;
}

const DEFAULT_SETTINGS: Settings = {
  sound: {
    enabled: true,
    volume: 0.3,
  },
  theme: 'dark',
  chat: {
    autoScroll: true,
    showTypingIndicator: true,
    showTimestamps: true,
    animateMessages: true,
  },
  notifications: {
    enabled: true,
    serviceComplete: true,
    serviceError: true,
  },
  performance: {
    animationsEnabled: true,
    virtualScrolling: false,
  },
};

export default function SettingsPanel({
  isOpen,
  onClose,
  currentSettings,
  onUpdateSettings,
  onExportData,
  onClearHistory,
}: SettingsPanelProps) {
  const [settings, setSettings] = useState<Settings>({
    ...DEFAULT_SETTINGS,
    ...currentSettings,
  });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Load settings from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('chat-settings');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      } catch (err) {
        console.error('Failed to parse settings:', err);
      }
    }
  }, []);

  const handleUpdateSetting = <K extends keyof Settings>(
    category: K,
    key: keyof Settings[K],
    value: any
  ) => {
    setSettings((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value,
      },
    }));
    setHasUnsavedChanges(true);
  };

  const handleSave = () => {
    localStorage.setItem('chat-settings', JSON.stringify(settings));
    onUpdateSettings(settings);
    setHasUnsavedChanges(false);
  };

  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS);
    setHasUnsavedChanges(true);
  };

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

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
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed right-0 top-0 bottom-0 w-full sm:w-[480px] bg-gray-900/95 backdrop-blur-xl border-l border-gray-800 shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
              <div className="flex items-center gap-3">
                <SettingsIcon className="w-6 h-6 text-purple" />
                <h2 className="text-2xl font-bold gradient-text">Settings</h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
              {/* Sound Settings */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  {settings.sound.enabled ? (
                    <Volume2 className="w-5 h-5 text-purple" />
                  ) : (
                    <VolumeX className="w-5 h-5 text-gray-500" />
                  )}
                  <h3 className="text-lg font-semibold">Sound</h3>
                </div>
                <div className="space-y-3 pl-7">
                  <label className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">Enable sounds</span>
                    <input
                      type="checkbox"
                      checked={settings.sound.enabled}
                      onChange={(e) => handleUpdateSetting('sound', 'enabled', e.target.checked)}
                      className="toggle-checkbox"
                    />
                  </label>
                  {settings.sound.enabled && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-300">Volume</span>
                        <span className="text-sm text-purple font-mono">
                          {Math.round(settings.sound.volume * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={settings.sound.volume}
                        onChange={(e) => handleUpdateSetting('sound', 'volume', parseFloat(e.target.value))}
                        className="w-full accent-purple"
                      />
                    </div>
                  )}
                </div>
              </section>

              {/* Chat Behavior */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <MessageSquare className="w-5 h-5 text-purple" />
                  <h3 className="text-lg font-semibold">Chat Behavior</h3>
                </div>
                <div className="space-y-3 pl-7">
                  <label className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">Auto-scroll to bottom</span>
                    <input
                      type="checkbox"
                      checked={settings.chat.autoScroll}
                      onChange={(e) => handleUpdateSetting('chat', 'autoScroll', e.target.checked)}
                      className="toggle-checkbox"
                    />
                  </label>
                  <label className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">Show typing indicator</span>
                    <input
                      type="checkbox"
                      checked={settings.chat.showTypingIndicator}
                      onChange={(e) => handleUpdateSetting('chat', 'showTypingIndicator', e.target.checked)}
                      className="toggle-checkbox"
                    />
                  </label>
                  <label className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">Show timestamps</span>
                    <input
                      type="checkbox"
                      checked={settings.chat.showTimestamps}
                      onChange={(e) => handleUpdateSetting('chat', 'showTimestamps', e.target.checked)}
                      className="toggle-checkbox"
                    />
                  </label>
                  <label className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">Animate messages</span>
                    <input
                      type="checkbox"
                      checked={settings.chat.animateMessages}
                      onChange={(e) => handleUpdateSetting('chat', 'animateMessages', e.target.checked)}
                      className="toggle-checkbox"
                    />
                  </label>
                </div>
              </section>

              {/* Notifications */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Bell className="w-5 h-5 text-purple" />
                  <h3 className="text-lg font-semibold">Notifications</h3>
                </div>
                <div className="space-y-3 pl-7">
                  <label className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">Enable notifications</span>
                    <input
                      type="checkbox"
                      checked={settings.notifications.enabled}
                      onChange={(e) => handleUpdateSetting('notifications', 'enabled', e.target.checked)}
                      className="toggle-checkbox"
                    />
                  </label>
                  {settings.notifications.enabled && (
                    <>
                      <label className="flex items-center justify-between">
                        <span className="text-sm text-gray-300">Service completed</span>
                        <input
                          type="checkbox"
                          checked={settings.notifications.serviceComplete}
                          onChange={(e) =>
                            handleUpdateSetting('notifications', 'serviceComplete', e.target.checked)
                          }
                          className="toggle-checkbox"
                        />
                      </label>
                      <label className="flex items-center justify-between">
                        <span className="text-sm text-gray-300">Service errors</span>
                        <input
                          type="checkbox"
                          checked={settings.notifications.serviceError}
                          onChange={(e) =>
                            handleUpdateSetting('notifications', 'serviceError', e.target.checked)
                          }
                          className="toggle-checkbox"
                        />
                      </label>
                    </>
                  )}
                </div>
              </section>

              {/* Performance */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Zap className="w-5 h-5 text-purple" />
                  <h3 className="text-lg font-semibold">Performance</h3>
                </div>
                <div className="space-y-3 pl-7">
                  <label className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">Enable animations</span>
                    <input
                      type="checkbox"
                      checked={settings.performance.animationsEnabled}
                      onChange={(e) =>
                        handleUpdateSetting('performance', 'animationsEnabled', e.target.checked)
                      }
                      className="toggle-checkbox"
                    />
                  </label>
                  <label className="flex items-center justify-between">
                    <div>
                      <span className="text-sm text-gray-300">Virtual scrolling</span>
                      <p className="text-xs text-gray-500 mt-0.5">Better for long conversations</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.performance.virtualScrolling}
                      onChange={(e) =>
                        handleUpdateSetting('performance', 'virtualScrolling', e.target.checked)
                      }
                      className="toggle-checkbox"
                    />
                  </label>
                </div>
              </section>

              {/* Data Management */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Download className="w-5 h-5 text-purple" />
                  <h3 className="text-lg font-semibold">Data Management</h3>
                </div>
                <div className="space-y-3 pl-7">
                  <button
                    onClick={onExportData}
                    className="w-full btn-secondary text-sm py-2 flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Export All Data
                  </button>
                  <button
                    onClick={onClearHistory}
                    className="w-full bg-red/10 text-red border border-red/30 hover:bg-red/20 rounded-lg px-4 py-2 text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Clear All History
                  </button>
                </div>
              </section>

              {/* Keyboard Shortcuts Info */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Keyboard className="w-5 h-5 text-purple" />
                  <h3 className="text-lg font-semibold">Keyboard Shortcuts</h3>
                </div>
                <div className="space-y-2 pl-7 text-sm text-gray-400">
                  <div className="flex items-center justify-between">
                    <span>Command Palette</span>
                    <kbd className="px-2 py-1 bg-gray-800 rounded border border-gray-700 text-xs">
                      Ctrl+K
                    </kbd>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Save Settings</span>
                    <kbd className="px-2 py-1 bg-gray-800 rounded border border-gray-700 text-xs">
                      Ctrl+S
                    </kbd>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Close Modal</span>
                    <kbd className="px-2 py-1 bg-gray-800 rounded border border-gray-700 text-xs">
                      Escape
                    </kbd>
                  </div>
                </div>
              </section>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-800 flex items-center justify-between gap-3">
              <button
                onClick={handleReset}
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                Reset to defaults
              </button>
              <div className="flex items-center gap-3">
                <button onClick={onClose} className="btn-secondary text-sm">
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!hasUnsavedChanges}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                    hasUnsavedChanges
                      ? 'bg-purple text-white hover:bg-purple/90'
                      : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
