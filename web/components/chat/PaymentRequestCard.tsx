'use client';

import { motion } from 'framer-motion';
import { CreditCard, ExternalLink, AlertCircle, CheckCircle, XCircle, Clock } from 'lucide-react';

interface PaymentRequestCardProps {
  url: string;
  status: 'checking_health' | 'pending_approval' | 'processing' | 'completed' | 'failed';
  amount?: string;
  recipient?: string;
  signature?: string;
  healthCheckPassed?: boolean;
  error?: string;
  timestamp: string;
  onApprove?: () => void;
  onDecline?: () => void;
}

export default function PaymentRequestCard({
  url,
  status,
  amount,
  recipient,
  signature,
  healthCheckPassed,
  error,
  timestamp,
  onApprove,
  onDecline
}: PaymentRequestCardProps) {
  const getStatusIcon = () => {
    switch (status) {
      case 'checking_health':
        return <Clock className="w-4 h-4 text-yellow animate-pulse" />;
      case 'pending_approval':
        return <AlertCircle className="w-4 h-4 text-yellow" />;
      case 'processing':
        return <Clock className="w-4 h-4 text-blue animate-pulse" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'checking_health':
        return 'Checking if service is healthy...';
      case 'pending_approval':
        return 'Awaiting approval';
      case 'processing':
        return 'Processing payment...';
      case 'completed':
        return 'Payment completed';
      case 'failed':
        return 'Payment failed';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'checking_health':
      case 'processing':
        return 'border-blue/30 bg-blue/5';
      case 'pending_approval':
        return 'border-yellow/30 bg-yellow/5';
      case 'completed':
        return 'border-green/30 bg-green/5';
      case 'failed':
        return 'border-red/30 bg-red/5';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`border rounded-lg p-4 my-2 ${getStatusColor()}`}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple/20 to-pink/20 flex items-center justify-center flex-shrink-0">
          <CreditCard className="w-4 h-4 text-purple" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold text-white">x402 Payment</h3>
            {getStatusIcon()}
            <span className="text-xs text-gray-500">•</span>
            <span className="text-xs text-gray-400">{timestamp}</span>
          </div>
          <p className="text-xs text-gray-400">{getStatusText()}</p>
        </div>
      </div>

      {/* URL */}
      <div className="mb-3">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue hover:text-blue/80 flex items-center gap-1 truncate"
        >
          <span className="truncate">{url}</span>
          <ExternalLink className="w-3 h-3 flex-shrink-0" />
        </a>
      </div>

      {/* Health Check Status */}
      {status !== 'checking_health' && healthCheckPassed !== undefined && (
        <div className={`text-xs mb-3 flex items-center gap-2 ${healthCheckPassed ? 'text-green' : 'text-red'}`}>
          {healthCheckPassed ? (
            <>
              <CheckCircle className="w-3 h-3" />
              <span>Service is healthy</span>
            </>
          ) : (
            <>
              <XCircle className="w-3 h-3" />
              <span>Service failed health check - payment blocked</span>
            </>
          )}
        </div>
      )}

      {/* Payment Details */}
      {amount && recipient && (
        <div className="bg-dark border border-gray-800 rounded-lg p-3 mb-3 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Amount:</span>
            <span className="text-white font-semibold">${amount}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">Recipient:</span>
            <span className="text-gray-300 font-mono truncate ml-2 max-w-[200px]">
              {recipient}
            </span>
          </div>
          {signature && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Signature:</span>
              <a
                href={`https://explorer.solana.com/tx/${signature}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue hover:text-blue/80 font-mono truncate ml-2 max-w-[200px] flex items-center gap-1"
              >
                <span className="truncate">{signature}</span>
                <ExternalLink className="w-3 h-3 flex-shrink-0" />
              </a>
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red/10 border border-red/30 rounded-lg p-3 mb-3">
          <div className="flex items-center gap-2 text-red text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Approval Buttons */}
      {status === 'pending_approval' && onApprove && onDecline && (
        <div className="flex gap-2">
          <button
            onClick={onApprove}
            className="flex-1 btn-primary text-sm py-2"
          >
            Approve ${amount}
          </button>
          <button
            onClick={onDecline}
            className="flex-1 btn-secondary text-sm py-2"
          >
            Decline
          </button>
        </div>
      )}

      {/* Success Message */}
      {status === 'completed' && signature && (
        <div className="text-sm text-green flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          <span>Content unlocked successfully for ${amount}</span>
        </div>
      )}
    </motion.div>
  );
}
