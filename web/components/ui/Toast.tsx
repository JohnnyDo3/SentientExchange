'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react';
import { useEffect } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
  onClose: (id: string) => void;
}

export default function Toast({ id, type, message, duration = 3000, onClose }: ToastProps) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose(id);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [id, duration, onClose]);

  const config = {
    success: {
      icon: CheckCircle,
      className: 'bg-green/20 border-green/50 text-green',
      iconClassName: 'text-green',
    },
    error: {
      icon: XCircle,
      className: 'bg-red/20 border-red/50 text-red',
      iconClassName: 'text-red',
    },
    warning: {
      icon: AlertTriangle,
      className: 'bg-yellow/20 border-yellow/50 text-yellow',
      iconClassName: 'text-yellow',
    },
    info: {
      icon: Info,
      className: 'bg-blue/20 border-blue/50 text-blue',
      iconClassName: 'text-blue',
    },
  };

  const { icon: Icon, className, iconClassName } = config[type];

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      className={`flex items-center gap-3 px-4 py-3 rounded-lg border backdrop-blur-xl shadow-lg min-w-[300px] max-w-md ${className}`}
    >
      <Icon className={`w-5 h-5 flex-shrink-0 ${iconClassName}`} />
      <p className="text-sm font-medium text-white flex-1">{message}</p>
      <button
        onClick={() => onClose(id)}
        className="p-1 hover:bg-white/10 rounded transition-colors"
        aria-label="Close notification"
      >
        <X className="w-4 h-4 text-gray-400" />
      </button>
    </motion.div>
  );
}

// Toast Container Component
interface ToastContainerProps {
  toasts: Array<{ id: string; type: ToastType; message: string; duration?: number }>;
  onClose: (id: string) => void;
}

export function ToastContainer({ toasts, onClose }: ToastContainerProps) {
  return (
    <div className="fixed top-24 right-4 z-50 flex flex-col gap-2">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            id={toast.id}
            type={toast.type}
            message={toast.message}
            duration={toast.duration}
            onClose={onClose}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
